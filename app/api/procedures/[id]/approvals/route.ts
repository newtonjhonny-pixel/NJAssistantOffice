import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



const WORKFLOW_ORDER = [
  'RASCUNHO', 'EM_ELABORACAO', 'EM_REVISAO_TECNICA', 'EM_REVISAO_JURIDICA',
  'EM_REVISAO_QUALIDADE', 'EM_APROVACAO', 'APROVADO', 'VIGENTE',
  'EM_REVISAO', 'OBSOLETO', 'CANCELADO',
]

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureApproval" WHERE "documentId" = ? ORDER BY step ASC, "createdAt" DESC`,
    params.id
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const id   = randomUUID()
  const now  = new Date().toISOString()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProcedureApproval"
      (id, "documentId", step, role, "approverName", status, decision, comment, "decidedAt", deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, params.id,
    body.step         ?? 0,
    body.role         ?? 'Aprovador',
    body.approverName ?? null,
    body.status       ?? 'PENDENTE',
    body.decision     ?? null,
    body.comment      ?? null,
    body.decision     ? now : null,
    body.deadline     ?? null,
  )

  // Se aprovado, avança o workflowStatus do documento
  if (body.decision === 'APROVADO' && body.nextWorkflowStatus) {
    const doc = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT workflowStatus, version FROM "ProcedureDocument" WHERE id = ?`, params.id
    )
    const prev = doc[0] ?? {}
    await prisma.$executeRawUnsafe(
      `UPDATE "ProcedureDocument" SET "workflowStatus" = ?, "updatedAt" = ? WHERE id = ?`,
      body.nextWorkflowStatus, now, params.id
    )
    const hid = randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProcedureHistory"
        (id, "documentId", "userName", action, "oldWorkflowStatus", "newWorkflowStatus", version, comment)
       VALUES (?, ?, ?, 'APROVACAO', ?, ?, ?, ?)`,
      hid, params.id,
      body.approverName ?? 'Sistema',
      prev.workflowStatus ?? null,
      body.nextWorkflowStatus,
      prev.version ?? null,
      body.comment ?? null,
    )
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureApproval" WHERE id = ?`, id
  )
  return NextResponse.json(rows[0], { status: 201 })
}
