/**
 * POST /api/gestao-equipe/importacoes-ponto/confirm
 * Confirma o lote de importação — grava batidas em cada colaborador
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureTimesheetSchema, hhmm2min, getPlannedMinutes, calcWorked, autoClassify } from '../../members/[id]/timesheet/_utils'
import type { ParsedColaborador, ParsedDay } from '../route'

export const dynamic = 'force-dynamic'

interface ConfirmBody {
  colaboradores: ParsedColaborador[]
  importedBy?: string
}

// Gera código do lote: IMP-PONTO-YYYYMM-NNN
async function generateLoteCode(): Promise<string> {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) AS cnt FROM "PontoLote" WHERE "code" LIKE ?`,
    `IMP-PONTO-${ym}-%`
  )
  const n = Number(existing[0]?.cnt ?? 0) + 1
  return `IMP-PONTO-${ym}-${String(n).padStart(3, '0')}`
}

async function importColaborador(
  col: ParsedColaborador,
  loteId: string,
  batchId: string,
  now: string,
  sourceType: string
): Promise<{ days: number; punches: number; bancoH: number }> {
  if (!col.memberId) return { days: 0, punches: 0, bancoH: 0 }
  const { memberId, competence, days, schedule, bancoHCount, bSaldoFinal, totalPunches, fileName, fileHash, periodoStart } = col

  // ── Importar escala ────────────────────────────────────────────────────────
  // Só cria nova escala se a vigente for diferente (ou não existir).
  // Nome descritivo baseado nos horários reais do cartão.
  let scheduleId: string | null = null
  const workedDays = schedule.filter(s => s.isWorked && s.entry1)
  if (workedDays.length > 0) {
    try {
      // Representação canônica da escala para comparar com a vigente
      // Usa § como separador para não conflitar com HH:MM (dois-pontos)
      const canonical = workedDays
        .map(s => `${s.dayOfWeek}§${s.entry1}§${s.exit1}§${s.entry2 ?? ''}§${s.exit2 ?? ''}`)
        .sort()
        .join('|')

      // Busca a escala ativa mais recente deste colaborador que possua dias cadastrados.
      // O EXISTS reproduz o INNER JOIN original (escalas sem dias são ignoradas) e é
      // portável entre SQLite (dev) e PostgreSQL (produção).
      const activeScheds = await prisma.$queryRawUnsafe<any[]>(`
        SELECT es."id"
        FROM "EmployeeSchedule" es
        WHERE es."memberId" = ?
          AND es."active" = 1
          AND EXISTS (
            SELECT 1 FROM "EmployeeScheduleDay" esd WHERE esd."scheduleId" = es."id"
          )
        ORDER BY es."startDate" DESC
        LIMIT 1
      `, memberId)

      // Compara assinatura — se idêntica, reutiliza; se diferente, cria nova
      let sameSchedule = false
      if (activeScheds.length > 0) {
        const schedDayRows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT "dayOfWeek","entry1","exit1","entry2","exit2"
          FROM "EmployeeScheduleDay"
          WHERE "scheduleId" = ?
          ORDER BY "dayOfWeek" ASC
        `, activeScheds[0].id)

        // Assinatura montada em JS (sem GROUP_CONCAT/STRING_AGG) — mesmo formato de antes
        const existingSig = schedDayRows
          .map(d => [
            String(d.dayOfWeek ?? ''),
            d.entry1 ?? '',
            d.exit1  ?? '',
            d.entry2 ?? '',
            d.exit2  ?? '',
          ].join('§'))
          .sort()
          .join('|')

        sameSchedule = existingSig === canonical
        if (sameSchedule) scheduleId = activeScheds[0].id
      }

      if (!sameSchedule) {
        // Nome: "07:42-12:00/13:00-17:30" baseado no horário da Segunda (ou primeiro dia útil)
        const ref = schedule.find(s => s.isWorked && s.entry1) ?? workedDays[0]
        const nameParts = [`${ref.entry1}-${ref.exit1}`]
        if (ref.entry2 && ref.exit2) nameParts.push(`${ref.entry2}-${ref.exit2}`)
        const scheduleName = nameParts.join(' / ')

        const weeklyMinutes = workedDays.reduce((a, s) => a + s.dailyMinutes, 0)
        // Data de início: primeiro dia do período importado
        const startDate = periodoStart || days[0]?.date || `${competence}-01`

        const sid = randomUUID()
        await prisma.$executeRawUnsafe(`
          INSERT INTO "EmployeeSchedule"
            ("id","memberId","name","weeklyMinutes","monthlyMinutes","startDate","active","createdAt","updatedAt")
          VALUES (?,?,?,?,?,?,1,?,?)`,
          sid, memberId, scheduleName,
          weeklyMinutes, Math.round(weeklyMinutes * 4.33), startDate, now, now
        )
        for (const sd of schedule) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "EmployeeScheduleDay"
              ("id","scheduleId","dayOfWeek","isWorked","entry1","exit1","entry2","exit2","dailyMinutes","createdAt","updatedAt")
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            randomUUID(), sid, sd.dayOfWeek, sd.isWorked ? 1 : 0,
            sd.entry1, sd.exit1, sd.entry2, sd.exit2, sd.dailyMinutes, now, now
          )
        }
        scheduleId = sid
      }
    } catch (e) {
      console.warn('[importacoes-ponto/confirm] escala:', (e as any)?.message)
      /* segue sem escala */
    }
  }

  let daysProcessed = 0; let punchesImported = 0

  for (const day of days) {
    const { date, dayOfWeek, entry1, exit1, entry2, exit2, entry3, exit3, entry4, exit4, isBancoH, punchCount } = day
    const workedMinutes = calcWorked({ entry1, exit1, entry2, exit2, entry3, exit3, entry4, exit4 } as any)
    const { plannedMinutes, dayType, scheduleId: existSchedId } = await getPlannedMinutes(memberId, date)
    const effectiveSched = scheduleId ?? existSchedId ?? null
    const balanceMinutes = workedMinutes - plannedMinutes
    const classification = isBancoH ? 'BANCO' : autoClassify(balanceMinutes, dayType, plannedMinutes, workedMinutes)
    const status = isBancoH ? 'JUSTIFICADO' : workedMinutes > 0 ? 'PREENCHIDO' : 'NAO_PREENCHIDO'
    const justification = isBancoH ? 'BANCO_HORAS' : null
    const justificationDesc = isBancoH ? 'Banco de Horas (importado)' : null

    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "DailyTimeRecord" WHERE "memberId"=? AND "date"=?`, memberId, date
    )

    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE "DailyTimeRecord" SET
          "entry1"=?,"exit1"=?,"entry2"=?,"exit2"=?,
          "entry3"=?,"exit3"=?,"entry4"=?,"exit4"=?,
          "workedMinutes"=?,"balanceMinutes"=?,
          "classification"=?,"justification"=?,"justificationDesc"=?,
          "status"=?,"source"=?,"sourceType"=?,"importBatchId"=?,
          "scheduleId"=COALESCE("scheduleId",?),"updatedAt"=?
        WHERE "memberId"=? AND "date"=?`,
        entry1,exit1,entry2,exit2,entry3,exit3,entry4,exit4,
        workedMinutes,balanceMinutes,
        classification,justification,justificationDesc,
        status,'IMPORTACAO',sourceType,batchId,
        effectiveSched, now, memberId, date
      )
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "DailyTimeRecord"
          ("id","memberId","date","dayOfWeek","competence","dayType","scheduleId",
           "plannedMinutes","entryMode","entry1","exit1","entry2","exit2",
           "entry3","exit3","entry4","exit4","workedMinutes","balanceMinutes",
           "classification","justification","justificationDesc",
           "hasAttachment","status","source","sourceType","importBatchId","createdAt","updatedAt")
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?)`,
        randomUUID(),memberId,date,dayOfWeek,competence,dayType,effectiveSched,
        plannedMinutes,'MARCACAO',
        entry1,exit1,entry2,exit2,entry3,exit3,entry4,exit4,
        workedMinutes,balanceMinutes,
        classification,justification,justificationDesc,
        status,'IMPORTACAO',sourceType,batchId,now,now
      )
    }
    daysProcessed++; punchesImported += punchCount
  }

  // Audit por colaborador
  await prisma.$executeRawUnsafe(`
    INSERT INTO "PontoImportBatch"
      ("id","loteId","memberId","memberName","competence","fileName","fileHash","importedAt",
       "daysProcessed","punchesImported","bancoHCount","method","fileStoredPermanently","observations","createdAt")
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'deterministic_parser',0,?,?)`,
    batchId, loteId, memberId, col.nome, competence, fileName, fileHash, now,
    daysProcessed, punchesImported, bancoHCount,
    `BSaldo: ${bSaldoFinal}`, now
  )

  // Upsert MonthlyTimeCompetence
  const allDays = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "workedMinutes", "balanceMinutes", "plannedMinutes", "status" FROM "DailyTimeRecord" WHERE "memberId"=? AND "competence"=?`,
    memberId, competence
  )
  const totals = allDays.reduce((a,d) => ({
    planned: a.planned + Number(d.plannedMinutes??0),
    worked:  a.worked  + Number(d.workedMinutes??0),
    balance: a.balance + Number(d.balanceMinutes??0),
    pending: a.pending + (['NAO_PREENCHIDO','PENDENTE'].includes(d.status) ? 1 : 0),
  }), { planned:0, worked:0, balance:0, pending:0 })

  const ec = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM "MonthlyTimeCompetence" WHERE "memberId"=? AND "competence"=?`, memberId, competence
  )
  if (ec.length) {
    await prisma.$executeRawUnsafe(`
      UPDATE "MonthlyTimeCompetence" SET "workedMinutes"=?,"balanceMinutes"=?,"pendingCount"=?,"updatedAt"=?
      WHERE "memberId"=? AND "competence"=?`,
      totals.worked, totals.balance, totals.pending, now, memberId, competence
    )
  } else {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "MonthlyTimeCompetence"
        ("id","memberId","competence","plannedMinutes","workedMinutes","balanceMinutes","pendingCount","status","createdAt","updatedAt")
      VALUES (?,?,?,?,?,?,?,'ABERTA',?,?)`,
      randomUUID(), memberId, competence, totals.planned, totals.worked, totals.balance, totals.pending, now, now
    )
  }

  return { days: daysProcessed, punches: punchesImported, bancoH: bancoHCount }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTimesheetSchema()
    const body: ConfirmBody = await req.json()
    const { colaboradores, importedBy } = body

    if (!colaboradores?.length) return NextResponse.json({ error: 'Nenhum colaborador para importar.' }, { status: 400 })

    const now = new Date().toISOString()
    const loteId = randomUUID()
    const code = await generateLoteCode()
    const ext = colaboradores[0]?.fileName?.split('.').pop()?.toLowerCase() ?? 'pdf'
    const sourceType = ext === 'pdf' ? 'PDF_IMPORT' : ext === 'xlsx' || ext === 'xls' ? 'EXCEL_IMPORT' : 'PDF_IMPORT'

    // Cria o lote
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PontoLote"
        ("id","code","status","totalFiles","totalCollaboradores","importedBy","createdAt","updatedAt")
      VALUES (?,?,'PROCESSANDO',?,?,?,?,?)`,
      loteId, code,
      new Set(colaboradores.map(c => c.fileName)).size,
      colaboradores.length,
      importedBy ?? null, now, now
    )

    let totalDias = 0; let totalBatidas = 0; let totalConflitos = 0; let totalRejeitados = 0

    // Importa apenas colaboradores encontrados
    for (const col of colaboradores) {
      if (col.status === 'nao_encontrado') { totalRejeitados++; continue }
      if (col.status === 'conflito') { totalConflitos++ }
      const batchId = randomUUID()
      const res = await importColaborador(col, loteId, batchId, now, sourceType)
      totalDias    += res.days
      totalBatidas += res.punches
    }

    // Atualiza totais do lote
    await prisma.$executeRawUnsafe(`
      UPDATE "PontoLote" SET
        "status"='IMPORTADO',
        "totalDias"=?,"totalBatidas"=?,"totalConflitos"=?,"totalRejeitados"=?,
        "importedAt"=?,"updatedAt"=?
      WHERE "id"=?`,
      totalDias, totalBatidas, totalConflitos, totalRejeitados, now, now, loteId
    )

    return NextResponse.json({
      ok: true, loteId, code,
      totalDias, totalBatidas, totalConflitos, totalRejeitados,
      totalImportados: colaboradores.filter(c => c.status !== 'nao_encontrado').length,
    })
  } catch (e: any) {
    console.error('[importacoes-ponto/confirm POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao confirmar lote.' }, { status: 500 })
  }
}
