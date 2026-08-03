import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



function createDate() {
  return new Date()
}

// GET /api/daily-tasks?date=YYYY-MM-DD&responsible=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const date        = searchParams.get('date')
    const responsible = searchParams.get('responsible')

    let query = `SELECT * FROM "DailyTask" WHERE 1=1`
    const params: string[] = []

    if (date) {
      query += ` AND "date" = ?`
      params.push(date)
    }
    if (responsible) {
      query += ` AND "responsible" LIKE ?`
      params.push(`%${responsible}%`)
    }
    query += ` ORDER BY "date" DESC, "createdAt" DESC`

    const rows = await prisma.$queryRawUnsafe<any[]>(query, ...params)

    // Enrich with item counts
    const result = await Promise.all(rows.map(async (dt: any) => {
      const items = await prisma.$queryRaw<any[]>`
        SELECT "status" FROM "DailyTaskItem" WHERE "dailyTaskId" = ${dt.id}
      `
      const total     = items.length
      const done      = items.filter((i: any) => i.status === 'CONCLUIDO').length
      const cancelled = items.filter((i: any) => i.status === 'CANCELADO').length
      const valid     = total - cancelled
      const pct       = valid > 0 ? Math.round((done / valid) * 100) : 0
      return { ...dt, _itemCount: total, _donePct: pct }
    }))

    return NextResponse.json(result)
  } catch (e) {
    console.error('[daily-tasks GET]', e)
    return NextResponse.json({ error: 'Erro ao listar tarefas diárias' }, { status: 500 })
  }
}

// POST /api/daily-tasks
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { date, responsible, title, objective, status = 'ABERTO', initialNotes } = body

    if (!date) return NextResponse.json({ error: 'date é obrigatório' }, { status: 400 })

    const id  = randomUUID()
    const now = createDate()

    await prisma.$executeRaw`
      INSERT INTO "DailyTask" ("id","date","responsible","title","objective","status","initialNotes","completionPct","createdAt","updatedAt")
      VALUES (${id}, ${date}, ${responsible ?? null}, ${title ?? null}, ${objective ?? null},
              ${status}, ${initialNotes ?? null}, 0, ${now}, ${now})
    `

    await prisma.$executeRaw`
      INSERT INTO "DailyTaskHistory" ("id","dailyTaskId","action","description","createdAt")
      VALUES (${randomUUID()}, ${id}, 'CRIACAO', ${'Tarefa diária criada para ' + date}, ${now})
    `

    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "DailyTask" WHERE "id" = ${id}`
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[daily-tasks POST]', e)
    return NextResponse.json({ error: 'Erro ao criar tarefa diária' }, { status: 500 })
  }
}
