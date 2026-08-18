import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureProcessFlowchartSchema } from '../_utils'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; fid: string } }

// GET /api/processes/[id]/flowcharts/[fid]
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    await ensureProcessFlowchartSchema()
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ProcessFlowchart" WHERE "id" = ? AND "processId" = ? LIMIT 1`,
      params.fid, params.id
    )
    if (!rows.length) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[flowcharts/[fid] GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar fluxograma' }, { status: 500 })
  }
}

// PATCH /api/processes/[id]/flowcharts/[fid]
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await ensureProcessFlowchartSchema()
    const body = await req.json()
    const now = new Date().toISOString()
    const fields: string[] = []
    const vals: any[] = []

    const map: Record<string, any> = {
      name:                body.name,
      type:                body.type,
      description:         body.description,
      version:             body.version,
      status:              body.status,
      content:             body.content,
      procedureDocumentId: body.procedureDocumentId,
      responsible:         body.responsible,
      systems:             body.systems !== undefined
                             ? (body.systems ? JSON.stringify(body.systems) : null)
                             : undefined,
    }

    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) { fields.push(`"${k}" = ?`); vals.push(v) }
    }

    if (!fields.length)
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

    fields.push(`"updatedAt" = ?`)
    vals.push(now, params.fid, params.id)

    await prisma.$executeRawUnsafe(
      `UPDATE "ProcessFlowchart" SET ${fields.join(', ')} WHERE "id" = ? AND "processId" = ?`,
      ...vals
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ProcessFlowchart" WHERE "id" = ?`, params.fid
    )
    return NextResponse.json(rows[0] ?? { error: 'Não encontrado.' })
  } catch (e) {
    console.error('[flowcharts/[fid] PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar fluxograma' }, { status: 500 })
  }
}

// DELETE /api/processes/[id]/flowcharts/[fid]
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    await ensureProcessFlowchartSchema()
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ProcessFlowchart" WHERE "id" = ? AND "processId" = ?`,
      params.fid, params.id
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[flowcharts/[fid] DELETE]', e)
    return NextResponse.json({ error: 'Erro ao excluir fluxograma' }, { status: 500 })
  }
}
