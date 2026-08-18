import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { hhmm2min, n0 } from '../../timesheet/_utils'

export const dynamic = 'force-dynamic'

// PATCH /api/gestao-equipe/members/[id]/schedule/[scheduleId]
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "EmployeeSchedule" WHERE "id" = ? AND "memberId" = ?`,
      params.scheduleId, params.id
    )
    if (!rows.length)
      return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 })

    const fields: string[] = []
    const vals: any[] = []

    const map: Record<string, any> = {
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate !== undefined ? (body.endDate ?? null) : undefined,
      observations: body.observations,
      active: body.active !== undefined ? (body.active ? 1 : 0) : undefined,
    }
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) { fields.push(`"${k}" = ?`); vals.push(v) }
    }

    // Recalcula weeklyMinutes se os dias foram enviados
    const daysArr = Array.isArray(body.days) ? body.days : null
    if (daysArr) {
      let wm = 0
      for (const d of daysArr) {
        if (d.isWorked) wm += n0(d.dailyMinutes) || calcDayMinutes(d)
      }
      fields.push(`"weeklyMinutes" = ?`); vals.push(wm)
      fields.push(`"monthlyMinutes" = ?`); vals.push(Math.round(wm * 52 / 12))
    }

    if (fields.length) {
      fields.push(`"updatedAt" = ?`); vals.push(now); vals.push(params.scheduleId)
      await prisma.$executeRawUnsafe(
        `UPDATE "EmployeeSchedule" SET ${fields.join(', ')} WHERE "id" = ?`,
        ...vals
      )
    }

    // Atualiza dias se enviados
    if (daysArr) {
      for (const d of daysArr) {
        const dailyMins = d.isWorked ? (n0(d.dailyMinutes) || calcDayMinutes(d)) : 0
        const existing = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "id" FROM "EmployeeScheduleDay" WHERE "scheduleId" = ? AND "dayOfWeek" = ?`,
          params.scheduleId, n0(d.dayOfWeek)
        )
        if (existing.length) {
          await prisma.$executeRawUnsafe(`
            UPDATE "EmployeeScheduleDay" SET
              "isWorked" = ?, "entry1" = ?, "exit1" = ?,
              "entry2" = ?, "exit2" = ?, "entry3" = ?, "exit3" = ?,
              "dailyMinutes" = ?, "updatedAt" = ?
            WHERE "id" = ?
          `,
            d.isWorked ? 1 : 0,
            d.entry1 ?? null, d.exit1 ?? null,
            d.entry2 ?? null, d.exit2 ?? null,
            d.entry3 ?? null, d.exit3 ?? null,
            dailyMins, now, existing[0].id
          )
        } else {
          const dayId = randomUUID()
          await prisma.$executeRawUnsafe(`
            INSERT INTO "EmployeeScheduleDay" (
              "id","scheduleId","dayOfWeek","isWorked",
              "entry1","exit1","entry2","exit2","entry3","exit3",
              "dailyMinutes","createdAt","updatedAt"
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
          `,
            dayId, params.scheduleId, n0(d.dayOfWeek), d.isWorked ? 1 : 0,
            d.entry1 ?? null, d.exit1 ?? null,
            d.entry2 ?? null, d.exit2 ?? null,
            d.entry3 ?? null, d.exit3 ?? null,
            dailyMins, now, now
          )
        }
      }
    }

    const updated = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "EmployeeSchedule" WHERE "id" = ?`, params.scheduleId
    )
    const dayRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "EmployeeScheduleDay" WHERE "scheduleId" = ? ORDER BY "dayOfWeek" ASC`, params.scheduleId
    )
    return NextResponse.json({ ...updated[0], days: dayRows })
  } catch (e) {
    console.error('[schedule PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar escala' }, { status: 500 })
  }
}

// DELETE /api/gestao-equipe/members/[id]/schedule/[scheduleId]
export async function DELETE(
  _: Request,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "EmployeeSchedule" WHERE "id" = ? AND "memberId" = ?`,
      params.scheduleId, params.id
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[schedule DELETE]', e)
    return NextResponse.json({ error: 'Erro ao deletar escala' }, { status: 500 })
  }
}

function calcDayMinutes(d: any): number {
  let total = 0
  const pairs: [string, string][] = [[d.entry1, d.exit1], [d.entry2, d.exit2], [d.entry3, d.exit3]]
  for (const [en, ex] of pairs) {
    if (en && ex) { const diff = hhmm2min(ex) - hhmm2min(en); if (diff > 0) total += diff }
  }
  return total
}
