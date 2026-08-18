import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ensureTimesheetSchema, hhmm2min, n0 } from '../timesheet/_utils'

export const dynamic = 'force-dynamic'

// GET /api/gestao-equipe/members/[id]/schedule
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await ensureTimesheetSchema()

    const schedules = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "EmployeeSchedule" WHERE "memberId" = ? ORDER BY "startDate" DESC`,
      params.id
    )

    // Busca dias de cada escala
    const result = await Promise.all(schedules.map(async (s) => {
      const days = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "EmployeeScheduleDay" WHERE "scheduleId" = ? ORDER BY "dayOfWeek" ASC`,
        s.id
      )
      return {
        ...s,
        active: s.active === 1 || s.active === true,
        days: days.map(d => ({ ...d, isWorked: d.isWorked === 1 || d.isWorked === true }))
      }
    }))

    return NextResponse.json(result)
  } catch (e) {
    console.error('[schedule GET]', e)
    return NextResponse.json({ error: 'Erro ao listar escalas' }, { status: 500 })
  }
}

// POST /api/gestao-equipe/members/[id]/schedule
// Body: { name, startDate, endDate?, observations?, days: [{ dayOfWeek, isWorked, entry1..exit3 }] }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureTimesheetSchema()
    const body = await req.json()
    const { name, startDate, endDate, observations, days } = body

    if (!name || !startDate)
      return NextResponse.json({ error: 'name e startDate são obrigatórios.' }, { status: 400 })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
      return NextResponse.json({ error: 'startDate deve ser YYYY-MM-DD.' }, { status: 400 })

    // Verifica se o membro existe
    const member = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id" FROM "TeamMember" WHERE "id" = ?`, params.id
    )
    if (!member.length)
      return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 })

    const id = randomUUID()
    const now = new Date().toISOString()

    // Calcula weeklyMinutes a partir dos dias
    let weeklyMinutes = 0
    const daysArr = Array.isArray(days) ? days : []
    for (const d of daysArr) {
      if (d.isWorked) weeklyMinutes += n0(d.dailyMinutes) || calcDayMinutes(d)
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "EmployeeSchedule" (
        "id","memberId","name","weeklyMinutes","monthlyMinutes",
        "startDate","endDate","observations","active","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,?,?,1,?,?)
    `,
      id, params.id, name, weeklyMinutes, Math.round(weeklyMinutes * 52 / 12),
      startDate, endDate ?? null, observations ?? null, now, now
    )

    // Insere os dias da escala
    for (const d of daysArr) {
      const dayId = randomUUID()
      const dailyMins = d.isWorked ? (n0(d.dailyMinutes) || calcDayMinutes(d)) : 0
      await prisma.$executeRawUnsafe(`
        INSERT INTO "EmployeeScheduleDay" (
          "id","scheduleId","dayOfWeek","isWorked",
          "entry1","exit1","entry2","exit2","entry3","exit3",
          "dailyMinutes","createdAt","updatedAt"
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT ("scheduleId","dayOfWeek") DO UPDATE SET
          "isWorked"     = EXCLUDED."isWorked",
          "entry1"       = EXCLUDED."entry1",
          "exit1"        = EXCLUDED."exit1",
          "entry2"       = EXCLUDED."entry2",
          "exit2"        = EXCLUDED."exit2",
          "entry3"       = EXCLUDED."entry3",
          "exit3"        = EXCLUDED."exit3",
          "dailyMinutes" = EXCLUDED."dailyMinutes",
          "updatedAt"    = EXCLUDED."updatedAt"
      `,
        dayId, id, n0(d.dayOfWeek), d.isWorked ? 1 : 0,
        d.entry1 ?? null, d.exit1 ?? null,
        d.entry2 ?? null, d.exit2 ?? null,
        d.entry3 ?? null, d.exit3 ?? null,
        dailyMins, now, now
      )
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "EmployeeSchedule" WHERE "id" = ?`, id
    )
    const dayRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "EmployeeScheduleDay" WHERE "scheduleId" = ? ORDER BY "dayOfWeek" ASC`, id
    )
    return NextResponse.json({ ...rows[0], days: dayRows }, { status: 201 })
  } catch (e) {
    console.error('[schedule POST]', e)
    return NextResponse.json({ error: 'Erro ao criar escala' }, { status: 500 })
  }
}

function calcDayMinutes(d: any): number {
  let total = 0
  const pairs: [string, string][] = [
    [d.entry1, d.exit1], [d.entry2, d.exit2], [d.entry3, d.exit3]
  ]
  for (const [en, ex] of pairs) {
    if (en && ex) {
      const diff = hhmm2min(ex) - hhmm2min(en)
      if (diff > 0) total += diff
    }
  }
  return total
}
