import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { calcStatus } from '../../utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body  = await req.json()
  const id    = randomUUID()
  const now   = new Date().toISOString()
  const value = Number(body.value)
  const measuredAt = body.measuredAt || now

  await prisma.$executeRawUnsafe(
    `INSERT INTO "IndicatorMeasurement" (id, indicatorId, value, measuredAt, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id, params.id, value, measuredAt, body.notes || null, now,
  )

  // Fetch indicator to calc new status and trend
  const inds = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "Indicator" WHERE id = ?`, params.id
  )
  if (!inds.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const ind = inds[0]

  const prevVal = ind.currentValue != null ? Number(ind.currentValue) : null
  const target  = ind.target       != null ? Number(ind.target)       : null
  const minimum = ind.minimum      != null ? Number(ind.minimum)      : null
  const status  = calcStatus(value, target, minimum)
  const trend   = prevVal === null ? null : value > prevVal ? 'SUBINDO' : value < prevVal ? 'CAINDO' : 'ESTAVEL'

  await prisma.$executeRawUnsafe(
    `UPDATE "Indicator" SET currentValue = ?, status = ?, trend = ?, lastMeasuredAt = ?, updatedAt = ? WHERE id = ?`,
    value, status, trend, measuredAt, now, params.id,
  )

  return NextResponse.json({ id, value, status, trend })
}
