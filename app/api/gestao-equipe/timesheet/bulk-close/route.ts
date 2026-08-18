import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ensureTimesheetSchema, n0, min2hhmm } from '../../members/[id]/timesheet/_utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gestao-equipe/timesheet/bulk-close
 * Body: { competence: string; memberIds: string[]; closedBy?: string }
 *
 * Fecha individualmente cada membro — erros de um não afetam os demais.
 */
export async function POST(req: Request) {
  try {
    await ensureTimesheetSchema()
    const body = await req.json()
    const { competence, memberIds, closedBy = 'sistema' } = body

    if (!competence || !/^\d{4}-\d{2}$/.test(competence))
      return NextResponse.json({ error: 'Competência inválida.' }, { status: 400 })
    if (!Array.isArray(memberIds) || memberIds.length === 0)
      return NextResponse.json({ error: 'Nenhum colaborador selecionado.' }, { status: 400 })

    const results: Array<{
      memberId: string; memberName: string
      success: boolean; skipped: boolean; reason?: string
      bankHoursEntryId?: string | null
      summary?: any
    }> = []

    for (const memberId of memberIds) {
      // Nome do membro
      const memberRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "name" FROM "TeamMember" WHERE "id" = ? LIMIT 1`, memberId
      )
      const memberName = memberRows[0]?.name ?? memberId

      try {
        // Verifica status atual
        const compRows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "MonthlyTimeCompetence" WHERE "memberId" = ? AND "competence" = ?`,
          memberId, competence
        )
        if (compRows.length && compRows[0].status === 'FECHADA') {
          results.push({ memberId, memberName, success: false, skipped: true, reason: 'Competência já está fechada.' })
          continue
        }

        // Dias da competência
        const days = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "DailyTimeRecord" WHERE "memberId" = ? AND "competence" = ?`,
          memberId, competence
        )
        if (days.length === 0) {
          results.push({ memberId, memberName, success: false, skipped: false, reason: 'Nenhum dia gerado para esta competência.' })
          continue
        }

        // Valida pendências críticas
        let pendingClass = 0, incompletePunches = 0, pendingJustification = 0
        for (const d of days) {
          if (d.classification === 'PENDENTE') pendingClass++
          const isWorkDay = !['DOMINGO', 'FERIADO', 'FOLGA'].includes(d.dayType)
          if (isWorkDay) {
            for (const [en, ex] of [[d.entry1, d.exit1], [d.entry2, d.exit2]] as [string|null,string|null][]) {
              if ((en && !ex) || (!en && ex)) { incompletePunches++; break }
            }
            if (n0(d.plannedMinutes) > 0 && n0(d.workedMinutes) === 0 && !d.justification) pendingJustification++
          }
        }

        const errors: string[] = []
        if (incompletePunches > 0) errors.push(`${incompletePunches} batida(s) incompleta(s)`)
        if (pendingClass > 0) errors.push(`${pendingClass} dia(s) com classificação pendente`)
        if (pendingJustification > 0) errors.push(`${pendingJustification} dia(s) sem justificativa`)

        if (errors.length > 0) {
          results.push({ memberId, memberName, success: false, skipped: false, reason: errors.join('; ') })
          continue
        }

        // Consolida totais
        let plannedMinutes = 0, workedMinutes = 0, balanceMinutes = 0
        let bankCreditMinutes = 0, bankDebitMinutes = 0
        let overtimeMinutes = 0, abonoMinutes = 0, compensationMinutes = 0, pendingCount = 0

        for (const d of days) {
          plannedMinutes += n0(d.plannedMinutes)
          workedMinutes  += n0(d.workedMinutes)
          balanceMinutes += n0(d.balanceMinutes)
          const bal = n0(d.balanceMinutes)
          switch (d.classification) {
            case 'BANCO':
              if (bal > 0) bankCreditMinutes += bal; else bankDebitMinutes += Math.abs(bal)
              break
            case 'HORA_EXTRA': overtimeMinutes += bal; break
            case 'ABONADO':    abonoMinutes    += Math.abs(bal); break
            case 'COMPENSACAO': compensationMinutes += Math.abs(bal); break
          }
          if (d.status === 'NAO_PREENCHIDO' || d.status === 'PENDENTE') pendingCount++
        }

        // nowIso  -> colunas TEXT      ("DailyTimeRecord", "MonthlyTimeCompetence")
        // nowDate -> colunas TIMESTAMP ("HourBankEntry", gerenciada pelo Prisma)
        const nowIso  = new Date().toISOString()
        const nowDate = new Date()

        // Banco de Horas — evita duplicidade
        let bankHoursEntryId: string | null = null
        if (bankCreditMinutes > 0 || bankDebitMinutes > 0) {
          const existingBH = await prisma.$queryRawUnsafe<any[]>(
            `SELECT "id" FROM "HourBankEntry"
             WHERE "memberId" = ? AND "competence" = ? AND "type" = 'LANCAMENTO' AND "status" = 'ATIVO'`,
            memberId, competence
          )
          if (!existingBH.length) {
            bankHoursEntryId = randomUUID()
            await prisma.$executeRawUnsafe(`
              INSERT INTO "HourBankEntry"
                ("id","memberId","entryDate","competence","type","creditMinutes","debitMinutes",
                 "responsible","observations","status","createdAt","updatedAt")
              VALUES (?,?,?,?,'LANCAMENTO',?,?,?,?,'ATIVO',?,?)
            `, bankHoursEntryId, memberId, nowDate, competence,
               bankCreditMinutes, bankDebitMinutes, closedBy,
               `Fechamento geral — Ponto ${competence}`, nowDate, nowDate)
          } else {
            bankHoursEntryId = existingBH[0].id
            await prisma.$executeRawUnsafe(`
              UPDATE "HourBankEntry" SET
                "creditMinutes" = ?, "debitMinutes" = ?, "observations" = ?, "updatedAt" = ?
              WHERE "id" = ?
            `, bankCreditMinutes, bankDebitMinutes,
               `Fechamento geral (atualizado) — Ponto ${competence}`, nowDate, bankHoursEntryId)
          }
        }

        // Marca dias como FECHADO
        await prisma.$executeRawUnsafe(
          `UPDATE "DailyTimeRecord" SET "status"='FECHADO', "updatedAt"=?
           WHERE "memberId"=? AND "competence"=? AND "status"!='FECHADO'`,
          nowIso, memberId, competence
        )

        // Upsert competência mensal
        const compId = compRows.length ? compRows[0].id : randomUUID()
        if (compRows.length) {
          await prisma.$executeRawUnsafe(`
            UPDATE "MonthlyTimeCompetence" SET
              "plannedMinutes"=?,"workedMinutes"=?,"balanceMinutes"=?,
              "bankCreditMinutes"=?,"bankDebitMinutes"=?,
              "overtimeMinutes"=?,"abonoMinutes"=?,"compensationMinutes"=?,
              "pendingCount"=?,"status"='FECHADA',"closedAt"=?,"closedBy"=?,
              "bankHoursEntryId"=?,"updatedAt"=?
            WHERE "id"=?
          `, plannedMinutes, workedMinutes, balanceMinutes,
             bankCreditMinutes, bankDebitMinutes, overtimeMinutes,
             abonoMinutes, compensationMinutes, pendingCount,
             nowIso, closedBy, bankHoursEntryId, nowIso, compId)
        } else {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "MonthlyTimeCompetence"
              ("id","memberId","competence","plannedMinutes","workedMinutes","balanceMinutes",
               "bankCreditMinutes","bankDebitMinutes","overtimeMinutes","abonoMinutes","compensationMinutes",
               "pendingCount","status","closedAt","closedBy","bankHoursEntryId","createdAt","updatedAt")
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'FECHADA',?,?,?,?,?)
          `, compId, memberId, competence,
             plannedMinutes, workedMinutes, balanceMinutes,
             bankCreditMinutes, bankDebitMinutes, overtimeMinutes,
             abonoMinutes, compensationMinutes, pendingCount,
             nowIso, closedBy, bankHoursEntryId, nowIso, nowIso)
        }

        results.push({
          memberId, memberName, success: true, skipped: false,
          bankHoursEntryId,
          summary: {
            plannedHHMM: min2hhmm(plannedMinutes),
            workedHHMM:  min2hhmm(workedMinutes),
            bankCreditHHMM: min2hhmm(bankCreditMinutes),
            bankDebitHHMM:  min2hhmm(bankDebitMinutes),
          }
        })
      } catch (err) {
        console.error(`[bulk-close] erro membro ${memberId}:`, err)
        results.push({ memberId, memberName, success: false, skipped: false, reason: 'Erro interno ao fechar.' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount    = results.filter(r => !r.success && !r.skipped).length
    const skippedCount = results.filter(r => r.skipped).length

    return NextResponse.json({
      competence,
      total: memberIds.length,
      successCount, failCount, skippedCount,
      results,
    })
  } catch (e) {
    console.error('[bulk-close POST]', e)
    return NextResponse.json({ error: 'Erro no fechamento geral' }, { status: 500 })
  }
}
