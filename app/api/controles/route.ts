import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Control" (
      id           TEXT PRIMARY KEY,
      code         TEXT,
      title        TEXT NOT NULL,
      description  TEXT,
      type         TEXT NOT NULL DEFAULT 'PREVENTIVO',
      category     TEXT NOT NULL DEFAULT 'PROCESSO',
      "processId"    TEXT,
      "riskId"       TEXT,
      responsible  TEXT,
      frequency    TEXT NOT NULL DEFAULT 'MENSAL',
      status       TEXT NOT NULL DEFAULT 'ATIVO',
      "lastExecution" TEXT,
      "nextExecution" TEXT,
      evidence     TEXT,
      effectiveness TEXT NOT NULL DEFAULT 'NAO_AVALIADO',
      notes        TEXT,
      "createdAt"    TEXT NOT NULL,
      "updatedAt"    TEXT NOT NULL
    )
  `)
}

export async function GET(req: NextRequest) {
  await ensureTable()
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')    || ''
  const type      = searchParams.get('type')      || ''
  const processId = searchParams.get('processId') || ''

  let sql = `SELECT c.*, p.name AS processName, p.code AS processCode,
      r.title AS riskTitle, r.code AS riskCode
    FROM "Control" c
    LEFT JOIN "Process" p ON p.id = c."processId"
    LEFT JOIN "Risk"    r ON r.id = c."riskId"
    WHERE 1=1`
  const params: unknown[] = []

  if (status)    { sql += ` AND c.status = ?`;    params.push(status) }
  if (type)      { sql += ` AND c.type = ?`;      params.push(type) }
  if (processId) { sql += ` AND c."processId" = ?`; params.push(processId) }

  sql += ` ORDER BY c."nextExecution" ASC, c."createdAt" DESC`

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const body = await req.json()
  const id   = randomUUID()
  const now  = new Date()

  const rows = await prisma.$queryRawUnsafe<{ cnt: unknown }[]>(`SELECT COUNT(*) AS cnt FROM "Control"`)
  const n    = Number(rows[0]?.cnt ?? 0) + 1
  const code = body.code || `CTRL-${String(n).padStart(3, '0')}`

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Control"
      (id, code, title, description, type, category, "processId", "riskId",
       responsible, frequency, status, "lastExecution", "nextExecution",
       evidence, effectiveness, notes, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, code,
    body.title         || 'Novo Controle',
    body.description   || null,
    body.type          || 'PREVENTIVO',
    body.category      || 'PROCESSO',
    body.processId     || null,
    body.riskId        || null,
    body.responsible   || null,
    body.frequency     || 'MENSAL',
    body.status        || 'ATIVO',
    body.lastExecution || null,
    body.nextExecution || null,
    body.evidence      || null,
    body.effectiveness || 'NAO_AVALIADO',
    body.notes         || null,
    now, now,
  )

  const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "Control" WHERE id = ?`, id
  )
  return NextResponse.json(result[0], { status: 201 })
}
