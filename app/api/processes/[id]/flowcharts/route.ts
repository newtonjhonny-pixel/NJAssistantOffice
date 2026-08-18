import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ensureProcessFlowchartSchema } from './_utils'

export const dynamic = 'force-dynamic'

// GET /api/processes/[id]/flowcharts
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureProcessFlowchartSchema()
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ProcessFlowchart" WHERE "processId" = ? ORDER BY "createdAt" ASC`,
      params.id
    )
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[flowcharts GET]', e)
    return NextResponse.json({ error: 'Erro ao listar fluxogramas' }, { status: 500 })
  }
}

// POST /api/processes/[id]/flowcharts
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureProcessFlowchartSchema()
    const body = await req.json()
    const { name, type = 'OPERACIONAL', description, version = '1.0', responsible, systems } = body

    if (!name?.trim())
      return NextResponse.json({ error: 'name é obrigatório.' }, { status: 400 })

    const VALID_TYPES = ['OPERACIONAL', 'BPMN', 'AS_IS', 'TO_BE', 'SIMPLIFICADO']
    if (!VALID_TYPES.includes(type))
      return NextResponse.json({ error: `type inválido. Use: ${VALID_TYPES.join(', ')}` }, { status: 400 })

    const id = randomUUID()
    const now = new Date().toISOString()

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProcessFlowchart" (
        "id","processId","type","name","description","version","status",
        "content","responsible","systems","createdAt","updatedAt"
      ) VALUES (?,?,?,?,?,?,?,NULL,?,?,?,?)`,
      id, params.id, type, name.trim(),
      description ?? null, version ?? '1.0', 'RASCUNHO',
      responsible ?? null, systems ? JSON.stringify(systems) : null,
      now, now
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ProcessFlowchart" WHERE "id" = ?`, id
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[flowcharts POST]', e)
    return NextResponse.json({ error: 'Erro ao criar fluxograma' }, { status: 500 })
  }
}
