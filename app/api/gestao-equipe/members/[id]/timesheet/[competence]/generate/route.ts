import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import {
  ensureTimesheetSchema, datesOfMonth, dateToDayOfWeek,
  getPlannedMinutes, autoClassify, n0
} from '../../_utils'

export const dynamic = 'force-dynamic'

// POST /api/gestao-equipe/members/[id]/timesheet/[competence]/generate
// Gera os registros diários para o mês (apenas datas que ainda não existem).
// Body opcional: { overwrite: false }
export async function POST(
  req: Request,
  { params }: { params: { id: string; competence: string } }
) {
  try {
    await ensureTimesheetSchema()

    if (!/^\d{4}-\d{2}$/.test(params.competence))
      return NextResponse.json({ error: 'Competência deve ser YYYY-MM.' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const overwrite = body.overwrite === true

    // Verifica se a competência está fechada
    const compRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MonthlyTimeCompetence" WHERE "memberId" = ? AND "competence" = ?`,
      params.id, params.competence
    )
    if (compRows.length && compRows[0].status === 'FECHADA')
      return NextResponse.json({ error: 'Competência fechada. Reabra antes de gerar.' }, { status: 409 })

    const dates = datesOfMonth(params.competence)
    const now = new Date().toISOString()
    let created = 0, skipped = 0

    for (const date of dates) {
      // Verifica se já existe
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id", "status" FROM "DailyTimeRecord" WHERE "memberId" = ? AND "date" = ?`,
        params.id, date
      )

      if (existing.length && !overwrite) { skipped++; continue }

      const dow = dateToDayOfWeek(date)
      const { plannedMinutes, dayType, calendarEntryId, scheduleId } = await getPlannedMinutes(params.id, date)

      const dayStatus = plannedMinutes === 0 && dayType !== 'UTIL' ? 'NAO_PREENCHIDO' : 'NAO_PREENCHIDO'

      if (existing.length && overwrite) {
        // Só atualiza campos de planejamento, não sobrescreve batidas já lançadas
        const ex = existing[0]
        if (ex.status === 'FECHADO' || ex.status === 'CONFERIDO') { skipped++; continue }
        await prisma.$executeRawUnsafe(`
          UPDATE "DailyTimeRecord" SET
            "dayType" = ?, "calendarEntryId" = ?, "scheduleId" = ?,
            "plannedMinutes" = ?, "updatedAt" = ?
          WHERE "memberId" = ? AND "date" = ?
        `, dayType, calendarEntryId, scheduleId, plannedMinutes, now, params.id, date)
        skipped++
      } else {
        const id = randomUUID()
        await prisma.$executeRawUnsafe(`
          INSERT INTO "DailyTimeRecord" (
            "id","memberId","date","dayOfWeek","competence","dayType",
            "calendarEntryId","scheduleId","plannedMinutes",
            "entryMode","workedMinutes","balanceMinutes",
            "classification","status","source","createdAt","updatedAt"
          ) VALUES (?,?,?,?,?,?,?,?,?,'MARCACAO',0,0,'SEM_EFEITO','NAO_PREENCHIDO','MANUAL',?,?)
        `,
          id, params.id, date, dow, params.competence, dayType,
          calendarEntryId ?? null, scheduleId ?? null, plannedMinutes,
          now, now
        )
        created++
      }
    }

    // Cria ou atualiza MonthlyTimeCompetence
    await upsertMonthlyCompetence(params.id, params.competence, now)

    return NextResponse.json({ created, skipped, total: dates.length })
  } catch (e) {
    console.error('[timesheet generate POST]', e)
    return NextResponse.json({ error: 'Erro ao gerar ponto mensal' }, { status: 500 })
  }
}

async function upsertMonthlyCompetence(memberId: string, competence: string, now: string) {
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id" FROM "MonthlyTimeCompetence" WHERE "memberId" = ? AND "competence" = ?`,
    memberId, competence
  )
  if (!existing.length) {
    const id = randomUUID()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "MonthlyTimeCompetence" (
        "id","memberId","competence","status","createdAt","updatedAt"
      ) VALUES (?,?,?,'ABERTA',?,?)
    `, id, memberId, competence, now, now)
  }
}
