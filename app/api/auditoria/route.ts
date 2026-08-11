import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuditRecord" (
      id           TEXT PRIMARY KEY,
      code         TEXT,
      title        TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'INTERNA',
      scope        TEXT,
      "processId"    TEXT,
      auditor      TEXT,
      auditee      TEXT,
      "plannedDate"  TEXT,
      "executedDate" TEXT,
      status       TEXT NOT NULL DEFAULT 'PLANEJADA',
      result       TEXT,
      findings     TEXT,
      "nonConformities" TEXT,
      opportunities   TEXT,
      "actionPlan"   TEXT,
      "nextAudit"    TEXT,
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

  let sql = `SELECT a.*, p.name AS processName, p.code AS processCode
    FROM "AuditRecord" a
    LEFT JOIN "Process" p ON p.id = a."processId"
    WHERE 1=1`
  const params: unknown[] = []

  if (status)    { sql += ` AND a.status = ?`;    params.push(status) }
  if (type)      { sql += ` AND a.type = ?`;      params.push(type) }
  if (processId) { sql += ` AND a."processId" = ?`; params.push(processId) }

  sql += ` ORDER BY a."plannedDate" DESC, a."createdAt" DESC`

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await ensureTable()
  const body = await req.json()
  const id   = randomUUID()
  const now  = new Date()

  const rows = await prisma.$queryRawUnsafe<{ cnt: unknown }[]>(`SELECT COUNT(*) AS cnt FROM "AuditRecord"`)
  const n    = Number(rows[0]?.cnt ?? 0) + 1
  const code = body.code || `AUD-${String(n).padStart(3, '0')}`

  await prisma.$executeRawUnsafe(
    `INSERT INTO "AuditRecord"
      (id, code, title, type, scope, "processId", auditor, auditee,
       "plannedDate", "executedDate", status, result, findings,
       "nonConformities", opportunities, "actionPlan", "nextAudit", notes, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, code,
    body.title           || 'Nova Auditoria',
    body.type            || 'INTERNA',
    body.scope           || null,
    body.processId       || null,
    body.auditor         || null,
    body.auditee         || null,
    body.plannedDate     || null,
    body.executedDate    || null,
    body.status          || 'PLANEJADA',
    body.result          || null,
    body.findings        || null,
    body.nonConformities || null,
    body.opportunities   || null,
    body.actionPlan      || null,
    body.nextAudit       || null,
    body.notes           || null,
    now, now,
  )

  const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "AuditRecord" WHERE id = ?`, id
  )
  return NextResponse.json(result[0], { status: 201 })
}
