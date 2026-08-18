import { NextRequest, NextResponse } from 'next/server'
import { prismaSqlite as prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



const MARKER = '__evidencia__'

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

  // Encode evidence metadata into existing columns (no migration needed)
  // fileType = "__evidencia__:TIPO"
  // fileName = title
  // filePath = JSON with extra fields
  // fileSize = 0
  const fileType = `${MARKER}${body.tipo ?? 'OUTRO'}`
  const filePath = JSON.stringify({
    descricao:    body.descricao    ?? '',
    referencia:   body.referencia   ?? '',
    responsavel:  body.responsavel  ?? '',
    periodicidade:body.periodicidade ?? '',
  })

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProcedureAttachment"
       (id, "documentId", "stepId", "fileName", "fileType", "fileSize", "filePath", "createdAt")
     VALUES (?, ?, NULL, ?, ?, 0, ?, ?)`,
    id,
    params.id,
    body.titulo ?? 'Evidência',
    fileType,
    filePath,
    now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment" WHERE id = ?`, id,
  )
  return NextResponse.json(rows[0], { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const evidenciaId = searchParams.get('evidenciaId')
  if (!evidenciaId) return NextResponse.json({ error: 'evidenciaId required' }, { status: 400 })

  await prisma.$executeRawUnsafe(
    `DELETE FROM "ProcedureAttachment"
     WHERE id = ? AND "documentId" = ? AND "fileType" LIKE '${MARKER}%'`,
    evidenciaId,
    params.id,
  )
  return NextResponse.json({ ok: true })
}
