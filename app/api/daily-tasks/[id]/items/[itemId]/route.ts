import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



async function recalcPct(dailyTaskId: string, now: string) {
  const items = await prisma.$queryRaw<any[]>`
    SELECT "status" FROM "DailyTaskItem" WHERE "dailyTaskId" = ${dailyTaskId}
  `
  const total     = items.length
  const done      = items.filter((i: any) => i.status === 'CONCLUIDO').length
  const cancelled = items.filter((i: any) => i.status === 'CANCELADO').length
  const valid     = total - cancelled
  const pct       = valid > 0 ? Math.round((done / valid) * 100) : 0
  await prisma.$executeRaw`
    UPDATE "DailyTask" SET "completionPct" = ${pct}, "updatedAt" = ${now} WHERE "id" = ${dailyTaskId}
  `
  return pct
}

export async function PATCH(req: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    const body = await req.json()
    const now  = new Date().toISOString()

    // Auto timestamps on status change
    let startedAt:   string | null = body.startedAt   ?? null
    let completedAt: string | null = body.completedAt ?? null

    if (body.status === 'EM_ANDAMENTO' && !startedAt) startedAt = now
    if (body.status === 'CONCLUIDO'    && !completedAt) completedAt = now

    await prisma.$executeRaw`
      UPDATE "DailyTaskItem" SET
        "title"       = COALESCE(${body.title       ?? null}, "title"),
        "description" = COALESCE(${body.description ?? null}, "description"),
        "category"    = COALESCE(${body.category    ?? null}, "category"),
        "priority"    = COALESCE(${body.priority    ?? null}, "priority"),
        "status"      = COALESCE(${body.status      ?? null}, "status"),
        "plannedTime" = COALESCE(${body.plannedTime ?? null}, "plannedTime"),
        "startedAt"   = COALESCE(${startedAt},               "startedAt"),
        "completedAt" = COALESCE(${completedAt},             "completedAt"),
        "responsible" = COALESCE(${body.responsible ?? null}, "responsible"),
        "notes"       = COALESCE(${body.notes       ?? null}, "notes"),
        "required"    = COALESCE(${body.required != null ? (body.required ? 1 : 0) : null}, "required"),
        "order"       = COALESCE(${body.order       ?? null}, "order"),
        "updatedAt"   = ${now}
      WHERE "id" = ${params.itemId} AND "dailyTaskId" = ${params.id}
    `

    await recalcPct(params.id, now)

    if (body.status) {
      await prisma.$executeRaw`
        INSERT INTO "DailyTaskHistory" ("id","dailyTaskId","action","description","createdAt")
        VALUES (${randomUUID()}, ${params.id}, 'ITEM_STATUS',
          ${'Item ' + params.itemId + ' â†’ ' + body.status}, ${now})
      `
    }

    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "DailyTaskItem" WHERE "id" = ${params.itemId}`
    return NextResponse.json({ ...rows[0], required: Boolean(rows[0]?.required) })
  } catch (e) {
    console.error('[daily-task item PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    const now = new Date().toISOString()
    // Get title for history
    const rows = await prisma.$queryRaw<any[]>`SELECT "title" FROM "DailyTaskItem" WHERE "id" = ${params.itemId}`
    await prisma.$executeRaw`DELETE FROM "DailyTaskItem" WHERE "id" = ${params.itemId} AND "dailyTaskId" = ${params.id}`
    await recalcPct(params.id, now)
    await prisma.$executeRaw`
      INSERT INTO "DailyTaskHistory" ("id","dailyTaskId","action","description","createdAt")
      VALUES (${randomUUID()}, ${params.id}, 'ITEM_EXCLUIDO', ${'Item excluÃ­do: ' + (rows[0]?.title ?? '')}, ${now})
    `
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[daily-task item DELETE]', e)
    return NextResponse.json({ error: 'Erro ao excluir item' }, { status: 500 })
  }
}
