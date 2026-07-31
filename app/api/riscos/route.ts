import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { calcLevel } from './utils'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Risk" (
      id            TEXT PRIMARY KEY,
      code          TEXT,
      title         TEXT NOT NULL,
      description   TEXT,
      category      TEXT NOT NULL DEFAULT 'OPERACIONAL',
      "processId"     TEXT,
      probability   INTEGER NOT NULL DEFAULT 3,
      impact        INTEGER NOT NULL DEFAULT 3,
      "riskLevel"     TEXT NOT NULL DEFAULT 'MEDIO',
      cause         TEXT,
      effect        TEXT,
      "currentControl" TEXT,
      "treatmentType" TEXT NOT NULL DEFAULT 'MITIGAR',
      "actionPlan"    TEXT,
      responsible   TEXT,
      "dueDate"       TEXT,
      status        TEXT NOT NULL DEFAULT 'IDENTIFICADO',
      "residualProbability" INTEGER,
      "residualImpact"      INTEGER,
      "residualLevel"       TEXT,
      notes         TEXT,
      "createdAt"     TEXT NOT NULL,
      "updatedAt"     TEXT NOT NULL
    )
  `)
}

export async function GET(req: NextRequest) {
  await ensureTable()
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')    || ''
  const category  = searchParams.get('category')  || ''
  const processId = searchParams.get('processId') || ''

  let sql = `SELECT r.*, p.name AS processName, p.code AS processCode
    FROM "Risk" r
    LEFT JOIN "Process" p ON p.id = r."processId"
    WHERE 1=1`
  const params: unknown[] = []

  if (status)    { sql += ` AND r.status = ?`;    params.push(status) }
  if (category)  { sql += ` AND r.category = ?`;  params.push(category) }
  if (processId) { sql += ` AND r."processId" = ?`; params.push(processId) }

  sql += ` ORDER BY r.impact DESC, r.probability DESC, r."createdAt" DESC`

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(rows.map(r => ({
    ...r,
    probability: Number(r.probability),
    impact:      Number(r.impact),
    residualProbability: r.residualProbability != null ? Number(r.residualProbability) : null,
    residualImpact:      r.residualImpact      != null ? Number(r.residualImpact)      : null,
  })))
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const body = await req.json()
  const id   = randomUUID()
  const now  = new Date()
  const prob = Number(body.probability) || 3
  const imp  = Number(body.impact)      || 3
  const level = calcLevel(prob, imp)

  // auto-increment code
  const rows = await prisma.$queryRawUnsafe<{ cnt: unknown }[]>(`SELECT COUNT(*) AS cnt FROM "Risk"`)
  const n = Number(rows[0]?.cnt ?? 0) + 1
  const code = body.code || `RISK-${String(n).padStart(3, '0')}`

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Risk"
      (id, code, title, description, category, "processId", probability, impact, "riskLevel",
       cause, effect, "currentControl", "treatmentType", "actionPlan", responsible,
       "dueDate", status, "residualProbability", "residualImpact", "residualLevel", notes, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, code,
    body.title        || 'Novo Risco',
    body.description  || null,
    body.category     || 'OPERACIONAL',
    body.processId    || null,
    prob, imp, level,
    body.cause        || null,
    body.effect       || null,
    body.currentControl || null,
    body.treatmentType || 'MITIGAR',
    body.actionPlan   || null,
    body.responsible  || null,
    body.dueDate      || null,
    body.status       || 'IDENTIFICADO',
    body.residualProbability != null ? Number(body.residualProbability) : null,
    body.residualImpact      != null ? Number(body.residualImpact)      : null,
    body.residualLevel       || null,
    body.notes        || null,
    now, now,
  )

  const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "Risk" WHERE id = ?`, id
  )
  return NextResponse.json(result[0], { status: 201 })
}
