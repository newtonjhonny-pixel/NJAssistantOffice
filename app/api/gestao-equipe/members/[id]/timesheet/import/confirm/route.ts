import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureTimesheetSchema, hhmm2min, getPlannedMinutes, calcWorked, autoClassify } from '../../_utils'

export const dynamic = 'force-dynamic'

interface ParsedDay {
  date: string
  dayOfWeek: number
  entry1: string | null; exit1: string | null
  entry2: string | null; exit2: string | null
  entry3: string | null; exit3: string | null
  entry4: string | null; exit4: string | null
  isBancoH: boolean
  bSaldo: string | null
  punchCount: number
}

interface ConfirmBody {
  fileName: string
  fileHash: string
  competence: string
  memberId?: string
  days: ParsedDay[]
  bancoHCount: number
  bSaldoFinal: string
  totalPunches: number
  sourceType?: string   // 'PDF_IMPORT' | 'EXCEL_IMPORT'
  importSchedule?: boolean
  schedule?: Array<{
    dayOfWeek: number
    isWorked: boolean
    entry1: string | null; exit1: string | null
    entry2: string | null; exit2: string | null
    dailyMinutes: number
  }>
  scheduleName?: string
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureTimesheetSchema()
    const memberId = params.id
    const body: ConfirmBody = await req.json()

    const {
      fileName, fileHash, competence, days,
      bancoHCount, bSaldoFinal, totalPunches,
      sourceType = 'PDF_IMPORT',
      importSchedule = false, schedule, scheduleName,
    } = body

    if (!days?.length) return NextResponse.json({ error: 'Nenhum dia para importar.' }, { status: 400 })

    const now = new Date().toISOString()
    const batchId = randomUUID()

    // ─── Importar escala (opcional) ─────────────────────────────────────────
    let scheduleId: string | null = null
    if (importSchedule && schedule?.length) {
      const sid = randomUUID()
      const startDate = days[0]?.date ?? `${competence}-01`
      const weeklyMinutes = schedule.filter(d => d.isWorked).reduce((s, d) => s + d.dailyMinutes, 0)
      await prisma.$executeRawUnsafe(
        `INSERT INTO "EmployeeSchedule" ("id","memberId","name","weeklyMinutes","monthlyMinutes","startDate","active","createdAt","updatedAt")
         VALUES (?,?,?,?,?,?,1,?,?)`,
        sid, memberId,
        scheduleName ?? `Importado ${fileName}`,
        weeklyMinutes,
        Math.round(weeklyMinutes * 4.33),
        startDate, now, now
      )
      for (const sd of schedule) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "EmployeeScheduleDay" ("id","scheduleId","dayOfWeek","isWorked","entry1","exit1","entry2","exit2","dailyMinutes","createdAt","updatedAt")
           VALUES (?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT ("scheduleId","dayOfWeek") DO NOTHING`,
          randomUUID(), sid, sd.dayOfWeek, sd.isWorked ? 1 : 0,
          sd.entry1, sd.exit1, sd.entry2, sd.exit2, sd.dailyMinutes, now, now
        )
      }
      scheduleId = sid
    }

    // ─── Importar dias ───────────────────────────────────────────────────────
    let daysProcessed = 0
    let punchesImported = 0

    for (const day of days) {
      const { date, dayOfWeek, entry1, exit1, entry2, exit2, entry3, exit3, entry4, exit4, isBancoH, punchCount } = day

      // Calcula minutos trabalhados
      const workedMinutes = calcWorked({ entry1, exit1, entry2, exit2, entry3, exit3, entry4, exit4 } as any)

      // Previsto (via escala/calendário já existente ou fallback)
      const { plannedMinutes, dayType, scheduleId: existingSchedId } = await getPlannedMinutes(memberId, date)

      const effectiveScheduleId = scheduleId ?? existingSchedId ?? null
      const balanceMinutes = workedMinutes - plannedMinutes
      const classification = isBancoH ? 'BANCO'
        : autoClassify(balanceMinutes, dayType, plannedMinutes, workedMinutes)

      const status = isBancoH ? 'JUSTIFICADO'
        : workedMinutes > 0 ? 'PREENCHIDO'
        : 'NAO_PREENCHIDO'

      const justification = isBancoH ? 'BANCO_HORAS' : null
      const justificationDesc = isBancoH ? 'Banco de Horas (importado do cartão ponto)' : null

      // Check se já existe
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM "DailyTimeRecord" WHERE "memberId" = ? AND "date" = ?`,
        memberId, date
      )

      if (existing.length > 0) {
        // Atualiza — não sobrescreve manual sem sourceType correto
        await prisma.$executeRawUnsafe(`
          UPDATE "DailyTimeRecord" SET
            "entry1"=?, "exit1"=?, "entry2"=?, "exit2"=?,
            "entry3"=?, "exit3"=?, "entry4"=?, "exit4"=?,
            "workedMinutes"=?, "balanceMinutes"=?,
            "classification"=?, "justification"=?, "justificationDesc"=?,
            "status"=?, "source"=?, "sourceType"=?, "importBatchId"=?,
            "scheduleId"=COALESCE("scheduleId",?),
            "updatedAt"=?
          WHERE "memberId"=? AND "date"=?`,
          entry1, exit1, entry2, exit2, entry3, exit3, entry4, exit4,
          workedMinutes, balanceMinutes,
          classification, justification, justificationDesc,
          status, 'IMPORTACAO', sourceType, batchId,
          effectiveScheduleId,
          now,
          memberId, date
        )
      } else {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "DailyTimeRecord"
            ("id","memberId","date","dayOfWeek","competence","dayType","scheduleId",
             "plannedMinutes","entryMode",
             "entry1","exit1","entry2","exit2","entry3","exit3","entry4","exit4",
             "workedMinutes","balanceMinutes",
             "classification","justification","justificationDesc",
             "hasAttachment","status","source","sourceType","importBatchId",
             "createdAt","updatedAt")
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?)`,
          randomUUID(), memberId, date, dayOfWeek, competence, dayType, effectiveScheduleId,
          plannedMinutes, 'MARCACAO',
          entry1, exit1, entry2, exit2, entry3, exit3, entry4, exit4,
          workedMinutes, balanceMinutes,
          classification, justification, justificationDesc,
          status, 'IMPORTACAO', sourceType, batchId,
          now, now
        )
      }

      daysProcessed++
      punchesImported += punchCount
    }

    // ─── Audit log ───────────────────────────────────────────────────────────
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PontoImportBatch"
        ("id","memberId","competence","fileName","fileHash","importedAt",
         "daysProcessed","punchesImported","bancoHCount",
         "method","fileStoredPermanently","observations","createdAt")
      VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?)`,
      batchId, memberId, competence, fileName, fileHash, now,
      daysProcessed, punchesImported, bancoHCount,
      'deterministic_parser',
      `BSaldo final: ${bSaldoFinal}`,
      now
    )

    // ─── Upsert MonthlyTimeCompetence ────────────────────────────────────────
    const allDays = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DailyTimeRecord" WHERE "memberId"=? AND "competence"=?`,
      memberId, competence
    )
    const totals = allDays.reduce((acc: any, d: any) => {
      acc.planned  += Number(d.plannedMinutes ?? 0)
      acc.worked   += Number(d.workedMinutes ?? 0)
      acc.balance  += Number(d.balanceMinutes ?? 0)
      acc.pending  += d.status === 'NAO_PREENCHIDO' || d.status === 'PENDENTE' ? 1 : 0
      return acc
    }, { planned: 0, worked: 0, balance: 0, pending: 0 })

    const existingComp = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "MonthlyTimeCompetence" WHERE "memberId"=? AND "competence"=?`,
      memberId, competence
    )
    if (existingComp.length) {
      await prisma.$executeRawUnsafe(`
        UPDATE "MonthlyTimeCompetence"
        SET "workedMinutes"=?, "balanceMinutes"=?, "pendingCount"=?, "updatedAt"=?
        WHERE "memberId"=? AND "competence"=?`,
        totals.worked, totals.balance, totals.pending, now,
        memberId, competence
      )
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "MonthlyTimeCompetence"
          ("id","memberId","competence","plannedMinutes","workedMinutes","balanceMinutes","pendingCount","status","createdAt","updatedAt")
        VALUES (?,?,?,?,?,?,?,'ABERTA',?,?)`,
        randomUUID(), memberId, competence,
        totals.planned, totals.worked, totals.balance, totals.pending, now, now
      )
    }

    return NextResponse.json({ ok: true, batchId, daysProcessed, punchesImported, bancoHCount })
  } catch (e: any) {
    console.error('[timesheet/import/confirm POST]', e)
    return NextResponse.json({ error: e.message ?? 'Erro ao confirmar importação.' }, { status: 500 })
  }
}
