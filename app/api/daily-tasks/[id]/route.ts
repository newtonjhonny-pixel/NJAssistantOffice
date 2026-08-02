import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "DailyTask" WHERE "id" = ${params.id}`
    if (!rows[0]) return NextResponse.json({ error: 'NÃ£o encontrado' }, { status: 404 })

    const items = await prisma.$queryRaw<any[]>`
      SELECT * FROM "DailyTaskItem" WHERE "dailyTaskId" = ${params.id} ORDER BY "order" ASC, "createdAt" ASC
    `
    const history = await prisma.$queryRaw<any[]>`
      SELECT * FROM "DailyTaskHistory" WHERE "dailyTaskId" = ${params.id} ORDER BY "createdAt" DESC
    `

    const total     = items.length
    const done      = items.filter((i: any) => i.status === 'CONCLUIDO').length
    const cancelled = items.filter((i: any) => i.status === 'CANCELADO').length
    const valid     = total - cancelled
    const pct       = valid > 0 ? Math.round((done / valid) * 100) : 0

    return NextResponse.json({
      ...rows[0],
      items: items.map((i: any) => ({ ...i, required: Boolean(i.required) })),
      history,
      _stats: {
        total, done, cancelled,
        pending:     items.filter((i: any) => i.status === 'PENDENTE').length,
        inProgress:  items.filter((i: any) => i.status === 'EM_ANDAMENTO').length,
        postponed:   items.filter((i: any) => i.status === 'ADIADO').length,
        notDone:     items.filter((i: any) => i.status === 'NAO_REALIZADO').length,
        completionPct: pct,
      },
    })
  } catch (e) {
    console.error('[daily-tasks GET id]', e)
    return NextResponse.json({ error: 'Erro ao carregar tarefa diÃ¡ria' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const now  = new Date().toISOString()

    await prisma.$executeRaw`
      UPDATE "DailyTask" SET
        "title"         = COALESCE(${body.title        ?? null}, "title"),
        "objective"     = COALESCE(${body.objective    ?? null}, "objective"),
        "responsible"   = COALESCE(${body.responsible  ?? null}, "responsible"),
        "status"        = COALESCE(${body.status       ?? null}, "status"),
        "initialNotes"  = COALESCE(${body.initialNotes ?? null}, "initialNotes"),
        "finalNotes"    = COALESCE(${body.finalNotes   ?? null}, "finalNotes"),
        "summary"       = COALESCE(${body.summary      ?? null}, "summary"),
        "updatedAt"     = ${now}
      WHERE "id" = ${params.id}
    `

    if (body.status) {
      await prisma.$executeRaw`
        INSERT INTO "DailyTaskHistory" ("id","dailyTaskId","action","description","createdAt")
        VALUES (${randomUUID()}, ${params.id}, 'STATUS', ${'Status alterado para: ' + body.status}, ${now})
      `
    }

    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "DailyTask" WHERE "id" = ${params.id}`
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[daily-tasks PATCH id]', e)
    return NextResponse.json({ error: 'Erro ao atualizar tarefa diÃ¡ria' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.$executeRaw`DELETE FROM "DailyTask" WHERE "id" = ${params.id}`
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[daily-tasks DELETE id]', e)
    return NextResponse.json({ error: 'Erro ao excluir tarefa diÃ¡ria' }, { status: 500 })
  }
}
