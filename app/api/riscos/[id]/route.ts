import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcLevel } from '../utils'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT r.*, p.name AS processName, p.code AS processCode
     FROM "Risk" r
     LEFT JOIN "Process" p ON p.id = r.processId
     WHERE r.id = ?`, params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const r = rows[0]
  return NextResponse.json({
    ...r,
    probability: Number(r.probability),
    impact:      Number(r.impact),
    residualProbability: r.residualProbability != null ? Number(r.residualProbability) : null,
    residualImpact:      r.residualImpact      != null ? Number(r.residualImpact)      : null,
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now  = new Date().toISOString()
  const prob = Number(body.probability) || 3
  const imp  = Number(body.impact)      || 3
  const level = calcLevel(prob, imp)
  const resProbability = body.residualProbability != null ? Number(body.residualProbability) : null
  const resImpact      = body.residualImpact      != null ? Number(body.residualImpact)      : null
  const resLevel       = (resProbability && resImpact) ? calcLevel(resProbability, resImpact) : null

  await prisma.$executeRawUnsafe(
    `UPDATE "Risk" SET
      title = ?, description = ?, category = ?, processId = ?,
      probability = ?, impact = ?, riskLevel = ?,
      cause = ?, effect = ?, currentControl = ?,
      treatmentType = ?, actionPlan = ?, responsible = ?,
      dueDate = ?, status = ?,
      residualProbability = ?, residualImpact = ?, residualLevel = ?,
      notes = ?, updatedAt = ?
    WHERE id = ?`,
    body.title          ?? null,
    body.description    ?? null,
    body.category       ?? 'OPERACIONAL',
    body.processId      || null,
    prob, imp, level,
    body.cause          ?? null,
    body.effect         ?? null,
    body.currentControl ?? null,
    body.treatmentType  ?? 'MITIGAR',
    body.actionPlan     ?? null,
    body.responsible    ?? null,
    body.dueDate        ?? null,
    body.status         ?? 'IDENTIFICADO',
    resProbability, resImpact, resLevel,
    body.notes ?? null,
    now, params.id,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT r.*, p.name AS processName, p.code AS processCode
     FROM "Risk" r LEFT JOIN "Process" p ON p.id = r.processId
     WHERE r.id = ?`, params.id
  )
  const r = rows[0]
  return NextResponse.json({
    ...r,
    probability: Number(r.probability),
    impact:      Number(r.impact),
    residualProbability: r.residualProbability != null ? Number(r.residualProbability) : null,
    residualImpact:      r.residualImpact      != null ? Number(r.residualImpact)      : null,
  })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "Risk" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
