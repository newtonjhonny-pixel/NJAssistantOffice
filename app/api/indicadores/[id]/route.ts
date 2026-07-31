import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcStatus } from '../utils'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT i.*, p.name AS processName, p.code AS processCode
     FROM "Indicator" i LEFT JOIN "Process" p ON p.id = i.processId
     WHERE i.id = ?`, params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const r = rows[0]
  const measurements = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "IndicatorMeasurement" WHERE indicatorId = ? ORDER BY measuredAt DESC LIMIT 12`, params.id
  )
  return NextResponse.json({
    ...r,
    target: r.target != null ? Number(r.target) : null,
    minimum: r.minimum != null ? Number(r.minimum) : null,
    maximum: r.maximum != null ? Number(r.maximum) : null,
    currentValue: r.currentValue != null ? Number(r.currentValue) : null,
    measurements: measurements.map(m => ({ ...m, value: Number(m.value) })),
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now  = new Date().toISOString()

  const target  = body.target       != null ? Number(body.target)       : null
  const minimum = body.minimum      != null ? Number(body.minimum)      : null
  const maximum = body.maximum      != null ? Number(body.maximum)      : null
  const curVal  = body.currentValue != null ? Number(body.currentValue) : null
  const status  = calcStatus(curVal, target, minimum)

  await prisma.$executeRawUnsafe(
    `UPDATE "Indicator" SET
      name = ?, description = ?, unit = ?, frequency = ?, category = ?,
      processId = ?, responsible = ?,
      target = ?, minimum = ?, maximum = ?, currentValue = ?, status = ?,
      lastMeasuredAt = ?, trend = ?, notes = ?, updatedAt = ?
    WHERE id = ?`,
    body.name        ?? null,
    body.description ?? null,
    body.unit        ?? '%',
    body.frequency   ?? 'MENSAL',
    body.category    ?? 'QUALIDADE',
    body.processId   || null,
    body.responsible ?? null,
    target, minimum, maximum, curVal, status,
    body.lastMeasuredAt ?? null,
    body.trend          ?? null,
    body.notes          ?? null,
    now, params.id,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT i.*, p.name AS processName, p.code AS processCode
     FROM "Indicator" i LEFT JOIN "Process" p ON p.id = i.processId
     WHERE i.id = ?`, params.id
  )
  const r = rows[0]
  return NextResponse.json({
    ...r,
    target: r.target != null ? Number(r.target) : null,
    minimum: r.minimum != null ? Number(r.minimum) : null,
    maximum: r.maximum != null ? Number(r.maximum) : null,
    currentValue: r.currentValue != null ? Number(r.currentValue) : null,
  })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "IndicatorMeasurement" WHERE indicatorId = ?`, params.id)
  await prisma.$executeRawUnsafe(`DELETE FROM "Indicator" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
