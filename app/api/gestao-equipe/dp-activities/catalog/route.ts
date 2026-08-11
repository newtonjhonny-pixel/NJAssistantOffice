/**
 * GET /api/gestao-equipe/dp-activities/catalog
 *   Retorna catálogo de processos e atividades DP.
 *   ?processCode=FOLHA  → filtra por processo
 *
 * POST /api/gestao-equipe/dp-activities/catalog
 *   Adiciona processo ou atividade customizada ao catálogo.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureCapacitySchema } from '@/lib/team/capacity/ensureCapacitySchema'
import { DP_PROCESS_CATALOG } from '@/lib/team/capacity/CapacityEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await ensureCapacitySchema()

    const { searchParams } = new URL(req.url)
    const processCode = searchParams.get('processCode')

    // Processos
    const processRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id","code","name","description","category","order","active"
       FROM "DpProcessCatalog"
       WHERE "active" = 1
       ORDER BY "order"`
    )

    // Atividades
    let activityRows: any[]
    if (processCode) {
      activityRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id","processCode","name","description","suggestedLevel","defaultExecution","defaultTimeMin","order","active"
         FROM "DpActivityCatalog"
         WHERE "processCode" = ? AND "active" = 1
         ORDER BY "order"`,
        processCode
      )
    } else {
      activityRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id","processCode","name","description","suggestedLevel","defaultExecution","defaultTimeMin","order","active"
         FROM "DpActivityCatalog"
         WHERE "active" = 1
         ORDER BY "processCode", "order"`
      )
    }

    // Agrupar atividades por processCode
    const activitiesByProcess: Record<string, any[]> = {}
    for (const a of activityRows) {
      if (!activitiesByProcess[a.processCode]) activitiesByProcess[a.processCode] = []
      activitiesByProcess[a.processCode].push({
        id:               a.id,
        processCode:      a.processCode,
        name:             a.name,
        description:      a.description ?? null,
        suggestedLevel:   a.suggestedLevel,
        defaultExecution: a.defaultExecution,
        defaultTimeMin:   Number(a.defaultTimeMin ?? 30),
        order:            Number(a.order ?? 0),
      })
    }

    const processes = processRows.map(p => ({
      id:          p.id,
      code:        p.code,
      name:        p.name,
      description: p.description ?? null,
      category:    p.category ?? 'DP',
      order:       Number(p.order ?? 0),
      activities:  activitiesByProcess[p.code] ?? [],
    }))

    return NextResponse.json({ processes, activitiesByProcess })
  } catch (e) {
    console.error('[dp-activities/catalog GET]', e)
    return NextResponse.json({ error: 'Erro ao carregar catálogo' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await ensureCapacitySchema()

    const body = await req.json()
    const { type } = body  // 'process' | 'activity'

    if (type === 'process') {
      const { code, name, description } = body
      if (!code || !name) return NextResponse.json({ error: 'code e name obrigatórios' }, { status: 400 })

      const maxOrder = await prisma.$queryRawUnsafe<any[]>(
        `SELECT MAX("order") as m FROM "DpProcessCatalog"`
      )
      const order = Number(maxOrder[0]?.m ?? 0) + 1
      const id = crypto.randomUUID()

      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "DpProcessCatalog" ("id","code","name","description","category","order","active","createdAt")
         VALUES (?,?,?,?,?,?,?,?)`,
        id, code.toUpperCase(), name, description ?? null, 'DP', order, 1, new Date().toISOString()
      )
      return NextResponse.json({ ok: true, id })
    }

    if (type === 'activity') {
      const { processCode, name, description, suggestedLevel, defaultExecution, defaultTimeMin } = body
      if (!processCode || !name) return NextResponse.json({ error: 'processCode e name obrigatórios' }, { status: 400 })

      const maxOrder = await prisma.$queryRawUnsafe<any[]>(
        `SELECT MAX("order") as m FROM "DpActivityCatalog" WHERE "processCode" = ?`, processCode
      )
      const order = Number(maxOrder[0]?.m ?? 0) + 1
      const id = crypto.randomUUID()

      await prisma.$executeRawUnsafe(
        `INSERT INTO "DpActivityCatalog"
         ("id","processCode","name","description","suggestedLevel","defaultExecution","defaultTimeMin","order","active")
         VALUES (?,?,?,?,?,?,?,?,?)`,
        id, processCode, name, description ?? null,
        suggestedLevel ?? 'ASSISTENTE',
        defaultExecution ?? 'MANUAL',
        Number(defaultTimeMin ?? 30),
        order, 1
      )
      return NextResponse.json({ ok: true, id })
    }

    return NextResponse.json({ error: 'type deve ser "process" ou "activity"' }, { status: 400 })
  } catch (e) {
    console.error('[dp-activities/catalog POST]', e)
    return NextResponse.json({ error: 'Erro ao criar item no catálogo' }, { status: 500 })
  }
}
