import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const docs = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  if (!docs.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const doc = docs[0]

  const steps = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureStep" WHERE documentId = ? ORDER BY "order" ASC`, params.id
  )
  const checklistItems = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureChecklistItem" WHERE documentId = ? ORDER BY "order" ASC`, params.id
  )
  const attachments = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment" WHERE documentId = ? ORDER BY createdAt ASC`, params.id
  )

  return NextResponse.json({ ...doc, steps, checklistItems, attachments })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now = new Date().toISOString()
  // type só é atualizado quando explicitamente enviado (migração de legado)
  const typeClause = body.type ? ', type = ?' : ''
  const typeParam  = body.type ? [body.type] : []

  await prisma.$executeRawUnsafe(
    `UPDATE "ProcedureDocument" SET
      title = ?, process = ?, department = ?, responsible = ?,
      objective = ?, application = ?, systemsUsed = ?, description = ?,
      responsibilities = ?, attentionPoints = ?, risks = ?, expectedResult = ?,
      notes = ?, processId = ?, "docStatus" = ?, version = ?${typeClause}, updatedAt = ?
    WHERE id = ?`,
    body.title          ?? null,
    body.process        ?? null,
    body.department     ?? null,
    body.responsible    ?? null,
    body.objective      ?? null,
    body.application    ?? null,
    body.systemsUsed    ?? null,
    body.description    ?? null,
    body.responsibilities ?? null,
    body.attentionPoints  ?? null,
    body.risks          ?? null,
    body.expectedResult ?? null,
    body.notes          ?? null,
    body.processId      || null,
    body.status         ?? 'VIGENTE',
    body.version        ?? 'v1.0',
    ...typeParam,
    now,
    params.id,
  )
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  const steps = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureStep" WHERE documentId = ? ORDER BY "order" ASC`, params.id
  )
  const checklistItems = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureChecklistItem" WHERE documentId = ? ORDER BY "order" ASC`, params.id
  )
  const attachments = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment" WHERE documentId = ? ORDER BY createdAt ASC`, params.id
  )
  return NextResponse.json({ ...rows[0], steps, checklistItems, attachments })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "ProcedureDocument" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
