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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const items = await prisma.$queryRaw<any[]>`
      SELECT * FROM "DailyTaskItem" WHERE "dailyTaskId" = ${params.id} ORDER BY "order" ASC, "createdAt" ASC
    `
    return NextResponse.json(items.map((i: any) => ({ ...i, required: Boolean(i.required) })))
  } catch (e) {
    console.error('[daily-task items GET]', e)
    return NextResponse.json({ error: 'Erro ao listar itens' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { title, description, category, priority = 'MEDIA', plannedTime, responsible, required = false, origin = 'MANUAL' } = body

    if (!title) return NextResponse.json({ error: 'title Ã© obrigatÃ³rio' }, { status: 400 })

    // Next order
    const orderRows = await prisma.$queryRaw<any[]>`
      SELECT COALESCE(MAX("order"), -1) + 1 AS next FROM "DailyTaskItem" WHERE "dailyTaskId" = ${params.id}
    `
    const nextOrder = Number(orderRows[0]?.next ?? 0)

    const id  = randomUUID()
    const now = new Date().toISOString()

    await prisma.$executeRaw`
      INSERT INTO "DailyTaskItem"
        ("id","dailyTaskId","order","title","description","category","priority","status","plannedTime","responsible","required","origin","createdAt","updatedAt")
      VALUES
        (${id}, ${params.id}, ${nextOrder}, ${title}, ${description ?? null}, ${category ?? null},
         ${priority}, 'PENDENTE', ${plannedTime ?? null}, ${responsible ?? null},
         ${required ? 1 : 0}, ${origin}, ${now}, ${now})
    `

    await recalcPct(params.id, now)

    await prisma.$executeRaw`
      INSERT INTO "DailyTaskHistory" ("id","dailyTaskId","action","description","createdAt")
      VALUES (${randomUUID()}, ${params.id}, 'ITEM_CRIADO', ${'Item adicionado: ' + title}, ${now})
    `

    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "DailyTaskItem" WHERE "id" = ${id}`
    return NextResponse.json({ ...rows[0], required: Boolean(rows[0]?.required) }, { status: 201 })
  } catch (e) {
    console.error('[daily-task items POST]', e)
    return NextResponse.json({ error: 'Erro ao criar item' }, { status: 500 })
  }
}
