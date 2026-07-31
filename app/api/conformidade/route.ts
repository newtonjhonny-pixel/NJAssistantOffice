import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ComplianceObligation" (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      legalBasis  TEXT,
      category    TEXT NOT NULL DEFAULT 'OUTROS',
      responsible TEXT,
      frequency   TEXT NOT NULL DEFAULT 'MENSAL',
      dueDate     TEXT,
      status      TEXT NOT NULL DEFAULT 'PENDENTE',
      description TEXT,
      notes       TEXT,
      processId   TEXT,
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    )
  `)
}

export async function GET(req: NextRequest) {
  await ensureTable()
  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')   || ''
  const category = searchParams.get('category') || ''

  let sql = `SELECT c.*, p.name AS processName, p.code AS processCode
    FROM "ComplianceObligation" c
    LEFT JOIN "Process" p ON p.id = c.processId
    WHERE 1=1`
  const params: unknown[] = []

  if (status)   { sql += ` AND c.status = ?`;   params.push(status) }
  if (category) { sql += ` AND c.category = ?`; params.push(category) }

  sql += ` ORDER BY c.dueDate ASC, c.createdAt DESC`

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const body = await req.json()
  const id  = randomUUID()
  const now = new Date().toISOString()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ComplianceObligation"
      (id, title, legalBasis, category, responsible, frequency,
       dueDate, status, description, notes, processId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    body.title       || 'Nova Obrigação',
    body.legalBasis  || null,
    body.category    || 'OUTROS',
    body.responsible || null,
    body.frequency   || 'MENSAL',
    body.dueDate     || null,
    body.status      || 'PENDENTE',
    body.description || null,
    body.notes       || null,
    body.processId   || null,
    now, now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ComplianceObligation" WHERE id = ?`, id
  )
  return NextResponse.json(rows[0], { status: 201 })
}
