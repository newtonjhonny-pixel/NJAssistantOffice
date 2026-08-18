import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT e.*, p.name AS processName, p.code AS processCode
     FROM "Evidence" e
     LEFT JOIN "Process" p ON p.id = e."processId"
     WHERE e.id = ?`, params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now = new Date() // Date: colunas TIMESTAMP (Prisma) nao aceitam text no PostgreSQL

  await prisma.$executeRawUnsafe(
    `UPDATE "Evidence" SET
      title = ?, type = ?, description = ?, "processId" = ?, "documentId" = ?,
      responsible = ?, "evidenceDate" = ?, status = ?, "expiresAt" = ?, notes = ?, "updatedAt" = ?
    WHERE id = ?`,
    body.title        ?? null,
    body.type         ?? 'DOCUMENTO',
    body.description  ?? null,
    body.processId    || null,
    body.documentId   || null,
    body.responsible  ?? null,
    body.evidenceDate ?? null,
    body.status       ?? 'PENDENTE',
    body.expiresAt    ?? null,
    body.notes        ?? null,
    now, params.id,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT e.*, p.name AS processName, p.code AS processCode
     FROM "Evidence" e
     LEFT JOIN "Process" p ON p.id = e."processId"
     WHERE e.id = ?`, params.id
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "Evidence" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
