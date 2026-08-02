import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureHistory" WHERE "documentId" = ? ORDER BY "createdAt" DESC`,
    params.id
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const id   = randomUUID()
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProcedureHistory"
      (id, "documentId", "userId", "userName", action, field, "oldValue", "newValue",
       comment, "oldWorkflowStatus", "newWorkflowStatus", version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, params.id,
    body.userId   ?? null,
    body.userName ?? 'UsuÃ¡rio',
    body.action,
    body.field              ?? null,
    body.oldValue           ?? null,
    body.newValue           ?? null,
    body.comment            ?? null,
    body.oldWorkflowStatus  ?? null,
    body.newWorkflowStatus  ?? null,
    body.version            ?? null,
  )
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureHistory" WHERE id = ?`, id
  )
  return NextResponse.json(rows[0], { status: 201 })
}
