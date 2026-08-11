/**
 * GET    /api/gestao-equipe/dp-activities/[id]  ? detalhes
 * PUT    /api/gestao-equipe/dp-activities/[id]  ? atualizar
 * DELETE /api/gestao-equipe/dp-activities/[id]  ? desativar (soft delete)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureCapacitySchema } from '@/lib/team/capacity/ensureCapacitySchema'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await ensureCapacitySchema()

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DpActivityInstance" WHERE "id" = ?`,
      params.id
    )
    if (!rows.length) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const r = rows[0]
    return NextResponse.json({
      id:             r.id,
      linkId:         r.linkId,
      processCode:    r.processCode,
      catalogId:      r.catalogId ?? null,
      activityName:   r.activityName,
      executionType:  r.executionType,
      volume:         Number(r.volume ?? 1),
      avgTimeMinutes: Number(r.avgTimeMinutes ?? 0),
      requiredLevel:  r.requiredLevel,
      observations:   r.observations ?? null,
    })
  } catch (e) {
    console.error('[dp-activities/[id] GET]', e)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureCapacitySchema()

    const body = await req.json()
    const {
      activityName, executionType, volume, avgTimeMinutes,
      requiredLevel, processCode, observations,
    } = body

    const VALID_EXEC  = ['MANUAL', 'ASSISTIDA', 'AUTOMATIZADA', 'AUTOMATICA_EXCECOES']
    const VALID_LEVEL = ['ASSISTENTE', 'ANALISTA', 'COORDENACAO', 'COMPARTILHADO']

    const now = new Date().toISOString()

    const sets: string[] = []
    const vals: unknown[] = []

    if (activityName)               { sets.push('"activityName" = ?');   vals.push(activityName) }
    if (processCode)                { sets.push('"processCode" = ?');     vals.push(processCode) }
    if (VALID_EXEC.includes(executionType)) { sets.push('"executionType" = ?'); vals.push(executionType) }
    if (volume      !== undefined)  { sets.push('"volume" = ?');          vals.push(Number(volume)) }
    if (avgTimeMinutes !== undefined) { sets.push('"avgTimeMinutes" = ?'); vals.push(Number(avgTimeMinutes)) }
    if (VALID_LEVEL.includes(requiredLevel)) { sets.push('"requiredLevel" = ?'); vals.push(requiredLevel) }
    if (observations !== undefined) { sets.push('"observations" = ?');    vals.push(observations ?? null) }

    if (sets.length === 0) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })

    sets.push('"updatedAt" = ?')
    vals.push(now)
    vals.push(params.id)

    await prisma.$executeRawUnsafe(
      `UPDATE "DpActivityInstance" SET ${sets.join(', ')} WHERE "id" = ?`,
      ...vals
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[dp-activities/[id] PUT]', e)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await ensureCapacitySchema()

    // Soft delete ? mantém registro para histórico
    await prisma.$executeRawUnsafe(
      `UPDATE "DpActivityInstance" SET "active" = 0, "updatedAt" = ? WHERE "id" = ?`,
      new Date().toISOString(), params.id
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[dp-activities/[id] DELETE]', e)
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}
