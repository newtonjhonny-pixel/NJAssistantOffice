import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ensureProcessFlowchartSchema } from '../../_utils'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; fid: string } }

// POST /api/processes/[id]/flowcharts/[fid]/duplicate
// Duplica um fluxograma. Se o original for AS_IS, o novo tipo é TO_BE (e vice-versa).
// Body opcional: { targetType, name }
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    await ensureProcessFlowchartSchema()

    const body = await req.json().catch(() => ({}))

    const origRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ProcessFlowchart" WHERE "id" = ? AND "processId" = ? LIMIT 1`,
      params.fid, params.id
    )
    if (!origRows.length)
      return NextResponse.json({ error: 'Fluxograma de origem não encontrado.' }, { status: 404 })

    const orig = origRows[0]

    // Determina o tipo do duplicado
    let targetType: string = body.targetType ?? (orig.type === 'AS_IS' ? 'TO_BE' : orig.type)
    const targetName: string = body.name ?? `${orig.name} (cópia)`

    const newId = randomUUID()
    const now = new Date().toISOString()

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProcessFlowchart" (
        "id","processId","type","name","description","version","status",
        "content","procedureDocumentId","responsible","systems","duplicatedFromId","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?,?,?)`,
      newId, params.id, targetType, targetName,
      orig.description ?? null,
      orig.version ?? '1.0',
      'RASCUNHO',
      orig.content ?? null,
      orig.responsible ?? null,
      orig.systems ?? null,
      params.fid,
      now, now
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ProcessFlowchart" WHERE "id" = ?`, newId
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[flowcharts/duplicate POST]', e)
    return NextResponse.json({ error: 'Erro ao duplicar fluxograma' }, { status: 500 })
  }
}
