import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT a.*, p.name AS processName, p.code AS processCode
     FROM "AuditRecord" a LEFT JOIN "Process" p ON p.id = a."processId"
     WHERE a.id = ?`, params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now  = new Date().toISOString()

  await prisma.$executeRawUnsafe(
    `UPDATE "AuditRecord" SET
      title = ?, type = ?, scope = ?, "processId" = ?,
      auditor = ?, auditee = ?, "plannedDate" = ?, "executedDate" = ?,
      status = ?, result = ?, findings = ?,
      "nonConformities" = ?, opportunities = ?,
      "actionPlan" = ?, "nextAudit" = ?, notes = ?, "updatedAt" = ?
    WHERE id = ?`,
    body.title           ?? null,
    body.type            ?? 'INTERNA',
    body.scope           ?? null,
    body.processId       || null,
    body.auditor         ?? null,
    body.auditee         ?? null,
    body.plannedDate     ?? null,
    body.executedDate    ?? null,
    body.status          ?? 'PLANEJADA',
    body.result          ?? null,
    body.findings        ?? null,
    body.nonConformities ?? null,
    body.opportunities   ?? null,
    body.actionPlan      ?? null,
    body.nextAudit       ?? null,
    body.notes           ?? null,
    now, params.id,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT a.*, p.name AS processName, p.code AS processCode
     FROM "AuditRecord" a LEFT JOIN "Process" p ON p.id = a."processId"
     WHERE a.id = ?`, params.id
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "AuditRecord" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
