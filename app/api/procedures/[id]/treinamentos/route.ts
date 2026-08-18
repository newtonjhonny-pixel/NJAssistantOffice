import { NextRequest, NextResponse } from 'next/server'
import { prismaSqlite as prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



const MARKER = '__treinamento__'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment"
     WHERE "documentId" = ? AND "fileType" LIKE '${MARKER}%'
     ORDER BY "createdAt" ASC`,
    params.id,
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const id   = randomUUID()
  const now  = new Date().toISOString()

  // fileType = "__treinamento__:MODALIDADE"
  // fileName = título do treinamento
  // filePath = JSON com campos extras
  const fileType = `${MARKER}${body.modalidade ?? 'PRESENCIAL'}`
  const filePath = JSON.stringify({
    participante:   body.participante  ?? '',
    cargo:          body.cargo         ?? '',
    data:           body.data          ?? '',
    cargaHoraria:   body.cargaHoraria  ?? '',
    instrutor:      body.instrutor     ?? '',
    status:         body.status        ?? 'PENDENTE',
    observacoes:    body.observacoes   ?? '',
  })

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProcedureAttachment"
       (id, "documentId", "stepId", "fileName", "fileType", "fileSize", "filePath", "createdAt")
     VALUES (?, ?, NULL, ?, ?, 0, ?, ?)`,
    id, params.id,
    body.titulo ?? 'Treinamento',
    fileType, filePath, now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment" WHERE id = ?`, id,
  )
  return NextResponse.json(rows[0], { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { treinamentoId, ...updates } = body
  if (!treinamentoId) return NextResponse.json({ error: 'treinamentoId required' }, { status: 400 })

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment" WHERE id = ? AND "documentId" = ?`,
    treinamentoId, params.id,
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row = rows[0]
  const fileType = `${MARKER}${updates.modalidade ?? (row.fileType as string).replace(MARKER, '')}`
  let extra: Record<string, unknown> = {}
  try { extra = JSON.parse(row.filePath as string) } catch { /* ignore */ }
  const merged = { ...extra, ...updates }
  delete merged.modalidade
  delete merged.titulo
  delete merged.treinamentoId

  await prisma.$executeRawUnsafe(
    `UPDATE "ProcedureAttachment" SET "fileName" = ?, "fileType" = ?, "filePath" = ? WHERE id = ?`,
    updates.titulo ?? row.fileName,
    fileType,
    JSON.stringify(merged),
    treinamentoId,
  )

  const updated = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment" WHERE id = ?`, treinamentoId,
  )
  return NextResponse.json(updated[0])
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const treinamentoId = searchParams.get('treinamentoId')
  if (!treinamentoId) return NextResponse.json({ error: 'treinamentoId required' }, { status: 400 })

  await prisma.$executeRawUnsafe(
    `DELETE FROM "ProcedureAttachment"
     WHERE id = ? AND "documentId" = ? AND "fileType" LIKE '${MARKER}%'`,
    treinamentoId, params.id,
  )
  return NextResponse.json({ ok: true })
}
