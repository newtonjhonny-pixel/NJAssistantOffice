import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT c.*, p.name AS processName, p.code AS processCode
     FROM "ComplianceObligation" c
     LEFT JOIN "Process" p ON p.id = c."processId"
     WHERE c.id = ?`, params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now = new Date()

  await prisma.$executeRawUnsafe(
    `UPDATE "ComplianceObligation" SET
      title = ?, "legalBasis" = ?, category = ?, responsible = ?,
      frequency = ?, "dueDate" = ?, status = ?, description = ?, notes = ?, "processId" = ?, "updatedAt" = ?
    WHERE id = ?`,
    body.title       ?? null,
    body.legalBasis  ?? null,
    body.category    ?? 'OUTROS',
    body.responsible ?? null,
    body.frequency   ?? 'MENSAL',
    body.dueDate     ?? null,
    body.status      ?? 'PENDENTE',
    body.description ?? null,
    body.notes       ?? null,
    body.processId   || null,
    now, params.id,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT c.*, p.name AS processName, p.code AS processCode
     FROM "ComplianceObligation" c
     LEFT JOIN "Process" p ON p.id = c."processId"
     WHERE c.id = ?`, params.id
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "ComplianceObligation" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
