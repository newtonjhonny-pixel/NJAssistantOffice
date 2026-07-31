import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Evidence" (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'DOCUMENTO',
      description  TEXT,
      "processId"    TEXT,
      "documentId"   TEXT,
      responsible  TEXT,
      "evidenceDate" TEXT,
      status       TEXT NOT NULL DEFAULT 'PENDENTE',
      "expiresAt"    TEXT,
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

  let sql = `SELECT e.*, p.name AS processName, p.code AS processCode
    FROM "Evidence" e
    LEFT JOIN "Process" p ON p.id = e."processId"
    WHERE 1=1`
  const params: unknown[] = []

  if (status)    { sql += ` AND e.status = ?`;    params.push(status) }
  if (type)      { sql += ` AND e.type = ?`;      params.push(type) }
  if (processId) { sql += ` AND e."processId" = ?`; params.push(processId) }

  sql += ` ORDER BY e."createdAt" DESC`

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const body = await req.json()
  const id  = randomUUID()
  const now = new Date()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Evidence"
      (id, title, type, description, "processId", "documentId", responsible,
       "evidenceDate", status, "expiresAt", notes, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    body.title        || 'Nova Evidência',
    body.type         || 'DOCUMENTO',
    body.description  || null,
    body.processId    || null,
    body.documentId   || null,
    body.responsible  || null,
    body.evidenceDate || null,
    body.status       || 'PENDENTE',
    body.expiresAt    || null,
    body.notes        || null,
    now, now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "Evidence" WHERE id = ?`, id
  )
  return NextResponse.json(rows[0], { status: 201 })
}
