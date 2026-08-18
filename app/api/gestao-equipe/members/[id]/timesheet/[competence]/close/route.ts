import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ensureTimesheetSchema, n0, min2hhmm } from '../../_utils'

export const dynamic = 'force-dynamic'

// ─── Lógica de validação compartilhada ───────────────────────────────────────

function buildPreview(days: any[], compStatus: string) {
  let plannedMinutes = 0, workedMinutes = 0, bankCreditMinutes = 0, bankDebitMinutes = 0
  let overtimeMinutes = 0, abonoMinutes = 0, pendingCount = 0
  let incompletePunches = 0, pendingClassification = 0, pendingJustification = 0

  for (const d of days) {
    plannedMinutes  += n0(d.plannedMinutes)
    workedMinutes   += n0(d.workedMinutes)
    const bal = n0(d.balanceMinutes)

    switch (d.classification) {
      case 'BANCO':
        // Tolerância legal: variações de até 10 min (±) não vão para banco
        if (Math.abs(bal) >= 11) {
          if (bal > 0) bankCreditMinutes += bal; else bankDebitMinutes += Math.abs(bal)
        }
        break
      case 'HORA_EXTRA': overtimeMinutes += bal; break
      case 'ABONADO':    abonoMinutes += Math.abs(bal); break
    }
    if (d.status === 'NAO_PREENCHIDO' || d.status === 'PENDENTE') pendingCount++
    // Classificação pendente só conta se o saldo estiver fora da tolerância de 10 min
    if (d.classification === 'PENDENTE' && Math.abs(bal) > 10) pendingClassification++

    // batida incompleta: entrada sem saída (ou vice-versa) em dias úteis
    const isWorkDay = !['DOMINGO', 'FERIADO', 'FOLGA'].includes(d.dayType)
    if (isWorkDay) {
      for (const [en, ex] of [
        [d.entry1, d.exit1], [d.entry2, d.exit2],
        [d.entry3, d.exit3], [d.entry4, d.exit4],
      ] as [string|null, string|null][]) {
        if ((en && !ex) || (!en && ex)) { incompletePunches++; break }
      }
    }

    // justificativa obrigatória em dias úteis sem batidas
    if (isWorkDay && n0(d.plannedMinutes) > 0 && n0(d.workedMinutes) === 0 && !d.justification) {
      pendingJustification++
    }
  }

  const balanceMinutes = workedMinutes - plannedMinutes
  const bankNetMinutes = bankCreditMinutes - bankDebitMinutes

  // Validações críticas (bloqueiam o fechamento)
  const criticalErrors: string[] = []
  if (days.length === 0) criticalErrors.push('Nenhum dia gerado para esta competência.')
  if (incompletePunches > 0) criticalErrors.push(`${incompletePunches} batida(s) incompleta(s) (entrada sem saída ou vice-versa).`)
  if (pendingClassification > 0) criticalErrors.push(`${pendingClassification} dia(s) com classificação PENDENTE.`)
  if (pendingJustification > 0) criticalErrors.push(`${pendingJustification} dia(s) útil(eis) sem batida e sem justificativa.`)
  if (compStatus === 'FECHADA') criticalErrors.push('Competência já está fechada. Reabra antes de fechar novamente.')

  // Alertas não bloqueantes
  const warnings: string[] = []
  if (pendingCount > 0) warnings.push(`${pendingCount} dia(s) ainda pendente(s) de preenchimento.`)

  return {
    summary: {
      plannedMinutes, workedMinutes, balanceMinutes,
      bankCreditMinutes, bankDebitMinutes, bankNetMinutes,
      overtimeMinutes, abonoMinutes,
      pendingCount, incompletePunches, pendingClassification, pendingJustification,
      plannedHHMM: min2hhmm(plannedMinutes),
      workedHHMM:  min2hhmm(workedMinutes),
      balanceHHMM: min2hhmm(balanceMinutes),
      bankCreditHHMM: min2hhmm(bankCreditMinutes),
      bankDebitHHMM:  min2hhmm(bankDebitMinutes),
      bankNetHHMM:    `${bankNetMinutes >= 0 ? '+' : ''}${min2hhmm(bankNetMinutes)}`,
      overtimeHHMM: min2hhmm(overtimeMinutes),
      abonoHHMM:    min2hhmm(abonoMinutes),
    },
    criticalErrors,
    warnings,
    canClose: criticalErrors.length === 0,
  }
}

// GET /api/gestao-equipe/members/[id]/timesheet/[competence]/close
// Retorna preview de fechamento e lista de pendências/erros (sem modificar dados)
export async function GET(
  _: Request,
  { params }: { params: { id: string; competence: string } }
) {
  try {
    await ensureTimesheetSchema()

    const compRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MonthlyTimeCompetence" WHERE "memberId" = ? AND "competence" = ?`,
      params.id, params.competence
    )
    const compStatus = compRows[0]?.status ?? 'ABERTA'

    const days = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DailyTimeRecord" WHERE "memberId" = ? AND "competence" = ?`,
      params.id, params.competence
    )

    // Busca nome do membro
    const memberRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "name" FROM "TeamMember" WHERE "id" = ? LIMIT 1`, params.id
    )
    const memberName = memberRows[0]?.name ?? ''

    return NextResponse.json({
      memberName,
      competence: params.competence,
      currentStatus: compStatus,
      ...buildPreview(days, compStatus),
    })
  } catch (e) {
    console.error('[timesheet/close GET]', e)
    return NextResponse.json({ error: 'Erro ao gerar preview de fechamento' }, { status: 500 })
  }
}

// POST /api/gestao-equipe/members/[id]/timesheet/[competence]/close
// Fecha a competência e integra ao Banco de Horas (cria HourBankEntry tipo LANCAMENTO)
export async function POST(
  req: Request,
  { params }: { params: { id: string; competence: string } }
) {
  try {
    await ensureTimesheetSchema()
    const body = await req.json().catch(() => ({}))
    const force: boolean = body.force === true  // true = fechar mesmo com warnings

    const compRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MonthlyTimeCompetence" WHERE "memberId" = ? AND "competence" = ?`,
      params.id, params.competence
    )
    if (compRows.length && compRows[0].status === 'FECHADA')
      return NextResponse.json({ error: 'Competência já está fechada.' }, { status: 409 })

    const days = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DailyTimeRecord" WHERE "memberId" = ? AND "competence" = ?`,
      params.id, params.competence
    )

    // Valida antes de fechar
    const preview = buildPreview(days, compRows[0]?.status ?? 'ABERTA')
    if (preview.criticalErrors.length > 0)
      return NextResponse.json({
        error: `Fechamento bloqueado: ${preview.criticalErrors[0]}`,
        criticalErrors: preview.criticalErrors,
      }, { status: 422 })

    // Consolida totais
    let plannedMinutes = 0, workedMinutes = 0, balanceMinutes = 0
    let bankCreditMinutes = 0, bankDebitMinutes = 0, overtimeMinutes = 0
    let abonoMinutes = 0, compensationMinutes = 0, pendingCount = 0

    for (const d of days) {
      plannedMinutes += n0(d.plannedMinutes)
      workedMinutes  += n0(d.workedMinutes)
      balanceMinutes += n0(d.balanceMinutes)

      const bal = n0(d.balanceMinutes)
      switch (d.classification) {
        case 'BANCO':
          // Tolerância legal: variações de até 10 min (±) não vão para banco
          if (Math.abs(bal) >= 11) {
            if (bal > 0) bankCreditMinutes += bal
            else bankDebitMinutes += Math.abs(bal)
          }
          break
        case 'HORA_EXTRA': overtimeMinutes += bal; break
        case 'ABONADO':    abonoMinutes += Math.abs(bal); break
        case 'COMPENSACAO': compensationMinutes += Math.abs(bal); break
      }
      if (d.status === 'NAO_PREENCHIDO' || d.status === 'PENDENTE') pendingCount++
    }

    // ATENCAO: esta rota grava em tabelas com tipos de data DIFERENTES.
    //   nowIso  -> tabelas criadas por ensureSchema (colunas TEXT):
    //              "DailyTimeRecord", "MonthlyTimeCompetence"
    //   nowDate -> tabelas gerenciadas pelo Prisma (colunas TIMESTAMP):
    //              "HourBankEntry"
    // O PostgreSQL nao faz cast implicito entre os dois. Nao unificar.
    const nowIso  = new Date().toISOString()
    const nowDate = new Date()
    const closedBy = body.closedBy ?? 'sistema'

    // Cria ou ATUALIZA entrada no Banco de Horas (nunca duplica por competência)
    let bankHoursEntryId: string | null = null
    {
      // Busca qualquer entrada ATIVO para esta competência (independente de ter banco ou não)
      const existingBH = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "HourBankEntry"
         WHERE "memberId" = ? AND "competence" = ? AND "type" = 'LANCAMENTO' AND "status" = 'ATIVO'
         LIMIT 1`,
        params.id, params.competence
      )
      if (existingBH.length) {
        // Atualiza com os valores recalculados do fechamento
        bankHoursEntryId = existingBH[0].id
        await prisma.$executeRawUnsafe(`
          UPDATE "HourBankEntry" SET
            "creditMinutes" = ?, "debitMinutes" = ?,
            "responsible" = ?, "observations" = ?, "updatedAt" = ?
          WHERE "id" = ?
        `, bankCreditMinutes, bankDebitMinutes,
           closedBy,
           `Fechamento automático — Ponto ${params.competence}`,
           nowDate, bankHoursEntryId
        )
      } else if (bankCreditMinutes > 0 || bankDebitMinutes > 0) {
        bankHoursEntryId = randomUUID()
        await prisma.$executeRawUnsafe(`
          INSERT INTO "HourBankEntry" (
            "id","memberId","entryDate","competence","type",
            "creditMinutes","debitMinutes","responsible","observations","status","createdAt","updatedAt"
          ) VALUES (?,?,?,?,'LANCAMENTO',?,?,?,?,'ATIVO',?,?)
        `, bankHoursEntryId, params.id, nowDate, params.competence,
           bankCreditMinutes, bankDebitMinutes,
           closedBy,
           `Fechamento automático — Ponto ${params.competence}`,
           nowDate, nowDate
        )
      }
    }

    // Marca todos os dias como FECHADO
    await prisma.$executeRawUnsafe(
      `UPDATE "DailyTimeRecord" SET "status" = 'FECHADO', "updatedAt" = ?
       WHERE "memberId" = ? AND "competence" = ? AND "status" != 'FECHADO'`,
      nowIso, params.id, params.competence
    )

    // Upsert MonthlyTimeCompetence
    const compId = compRows.length ? compRows[0].id : randomUUID()
    if (compRows.length) {
      await prisma.$executeRawUnsafe(`
        UPDATE "MonthlyTimeCompetence" SET
          "plannedMinutes" = ?, "workedMinutes" = ?, "balanceMinutes" = ?,
          "bankCreditMinutes" = ?, "bankDebitMinutes" = ?,
          "overtimeMinutes" = ?, "abonoMinutes" = ?, "compensationMinutes" = ?,
          "pendingCount" = ?, "status" = 'FECHADA',
          "closedAt" = ?, "closedBy" = ?, "bankHoursEntryId" = ?, "updatedAt" = ?
        WHERE "id" = ?
      `,
        plannedMinutes, workedMinutes, balanceMinutes,
        bankCreditMinutes, bankDebitMinutes,
        overtimeMinutes, abonoMinutes, compensationMinutes,
        pendingCount, nowIso, closedBy, bankHoursEntryId, nowIso,
        compId
      )
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "MonthlyTimeCompetence" (
          "id","memberId","competence",
          "plannedMinutes","workedMinutes","balanceMinutes",
          "bankCreditMinutes","bankDebitMinutes","overtimeMinutes","abonoMinutes","compensationMinutes",
          "pendingCount","status","closedAt","closedBy","bankHoursEntryId","createdAt","updatedAt"
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'FECHADA',?,?,?,?,?)
      `,
        compId, params.id, params.competence,
        plannedMinutes, workedMinutes, balanceMinutes,
        bankCreditMinutes, bankDebitMinutes, overtimeMinutes, abonoMinutes, compensationMinutes,
        pendingCount, nowIso, closedBy, bankHoursEntryId, nowIso, nowIso
      )
    }

    const result = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MonthlyTimeCompetence" WHERE "id" = ?`, compId
    )
    return NextResponse.json({
      competence: result[0],
      bankHoursEntryId,
      summary: {
        plannedMinutes, workedMinutes, balanceMinutes,
        bankCreditMinutes, bankDebitMinutes,
        overtimeMinutes, abonoMinutes, compensationMinutes,
        pendingCount,
        balanceHHMM: min2hhmm(balanceMinutes),
        bankCreditHHMM: min2hhmm(bankCreditMinutes),
      }
    })
  } catch (e) {
    console.error('[timesheet close POST]', e)
    return NextResponse.json({ error: 'Erro ao fechar competência' }, { status: 500 })
  }
}
