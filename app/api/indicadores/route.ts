import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Indicator" (
      id           TEXT PRIMARY KEY,
      code         TEXT,
      name         TEXT NOT NULL,
      description  TEXT,
      unit         TEXT NOT NULL DEFAULT '%',
      frequency    TEXT NOT NULL DEFAULT 'MENSAL',
      category     TEXT NOT NULL DEFAULT 'QUALIDADE',
      "processId"    TEXT,
      responsible  TEXT,
      target       REAL,
      minimum      REAL,
      maximum      REAL,
      "currentValue" REAL,
      status       TEXT NOT NULL DEFAULT 'SEM_DADOS',
      "lastMeasuredAt" TEXT,
      trend        TEXT,
      notes        TEXT,
      "createdAt"    TEXT NOT NULL,
      "updatedAt"    TEXT NOT NULL
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "IndicatorMeasurement" (
      id          TEXT PRIMARY KEY,
      "indicatorId" TEXT NOT NULL,
      value       REAL NOT NULL,
      "measuredAt"  TEXT NOT NULL,
      notes       TEXT,
      "createdAt"   TEXT NOT NULL
    )
  `)
}

import { calcStatus } from './utils'

export async function GET(req: NextRequest) {
  await ensureTable()
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')    || ''
  const category  = searchParams.get('category')  || ''
  const processId = searchParams.get('processId') || ''

  let sql = `SELECT i.*, p.name AS processName, p.code AS processCode
    FROM "Indicator" i
    LEFT JOIN "Process" p ON p.id = i."processId"
    WHERE 1=1`
  const params: unknown[] = []

  if (status)    { sql += ` AND i.status = ?`;    params.push(status) }
  if (category)  { sql += ` AND i.category = ?`;  params.push(category) }
  if (processId) { sql += ` AND i."processId" = ?`; params.push(processId) }

  sql += ` ORDER BY i."createdAt" DESC`

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(rows.map(r => ({
    ...r,
    target:       r.target       != null ? Number(r.target)       : null,
    minimum:      r.minimum      != null ? Number(r.minimum)      : null,
    maximum:      r.maximum      != null ? Number(r.maximum)      : null,
    currentValue: r.currentValue != null ? Number(r.currentValue) : null,
  })))
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const body = await req.json()
  const id   = randomUUID()
  const now  = new Date()

  const rows = await prisma.$queryRawUnsafe<{ cnt: unknown }[]>(`SELECT COUNT(*) AS cnt FROM "Indicator"`)
  const n    = Number(rows[0]?.cnt ?? 0) + 1
  const code = body.code || `IND-${String(n).padStart(3, '0')}`

  const target  = body.target       != null ? Number(body.target)       : null
  const minimum = body.minimum      != null ? Number(body.minimum)      : null
  const maximum = body.maximum      != null ? Number(body.maximum)      : null
  const curVal  = body.currentValue != null ? Number(body.currentValue) : null
  const status  = calcStatus(curVal, target, minimum)

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Indicator"
      (id, code, name, description, unit, frequency, category, "processId",
       responsible, target, minimum, maximum, "currentValue", status,
       "lastMeasuredAt", trend, notes, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, code,
    body.name        || 'Novo Indicador',
    body.description || null,
    body.unit        || '%',
    body.frequency   || 'MENSAL',
    body.category    || 'QUALIDADE',
    body.processId   || null,
    body.responsible || null,
    target, minimum, maximum, curVal, status,
    body.lastMeasuredAt || null,
    body.trend          || null,
    body.notes          || null,
    now, now,
  )

  const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "Indicator" WHERE id = ?`, id
  )
  return NextResponse.json(result[0], { status: 201 })
}
