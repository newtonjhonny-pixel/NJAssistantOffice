import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT c.*, p.name AS processName, p.code AS processCode,
        r.title AS riskTitle, r.code AS riskCode
     FROM "Control" c
     LEFT JOIN "Process" p ON p.id = c."processId"
     LEFT JOIN "Risk"    r ON r.id = c."riskId"
     WHERE c.id = ?`, params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now  = new Date().toISOString()

  await prisma.$executeRawUnsafe(
    `UPDATE "Control" SET
      title = ?, description = ?, type = ?, category = ?,
      "processId" = ?, "riskId" = ?, responsible = ?,
      frequency = ?, status = ?,
      "lastExecution" = ?, "nextExecution" = ?,
      evidence = ?, effectiveness = ?, notes = ?, "updatedAt" = ?
    WHERE id = ?`,
    body.title         ?? null,
    body.description   ?? null,
    body.type          ?? 'PREVENTIVO',
    body.category      ?? 'PROCESSO',
    body.processId     || null,
    body.riskId        || null,
    body.responsible   ?? null,
    body.frequency     ?? 'MENSAL',
    body.status        ?? 'ATIVO',
    body.lastExecution ?? null,
    body.nextExecution ?? null,
    body.evidence      ?? null,
    body.effectiveness ?? 'NAO_AVALIADO',
    body.notes         ?? null,
    now, params.id,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT c.*, p.name AS processName, p.code AS processCode,
        r.title AS riskTitle, r.code AS riskCode
     FROM "Control" c
     LEFT JOIN "Process" p ON p.id = c."processId"
     LEFT JOIN "Risk"    r ON r.id = c."riskId"
     WHERE c.id = ?`, params.id
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "Control" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
