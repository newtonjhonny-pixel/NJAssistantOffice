import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



const TRANSITIONS: Record<string, string> = {
  RASCUNHO:              'EM_ELABORACAO',
  EM_ELABORACAO:         'EM_REVISAO_TECNICA',
  EM_REVISAO_TECNICA:    'EM_REVISAO_QUALIDADE',
  EM_REVISAO_QUALIDADE:  'EM_APROVACAO',
  EM_APROVACAO:          'VIGENTE',
  VIGENTE:               'EM_REVISAO',
  EM_REVISAO:            'EM_REVISAO_TECNICA',
}

const TRANSITION_LABELS: Record<string, string> = {
  RASCUNHO:              'Iniciar Elaboração',
  EM_ELABORACAO:         'Enviar para Revisão Técnica',
  EM_REVISAO_TECNICA:    'Enviar para Revisão de Qualidade',
  EM_REVISAO_QUALIDADE:  'Enviar para Aprovação',
  EM_APROVACAO:          'Publicar (Vigente)',
  VIGENTE:               'Abrir Revisão',
  EM_REVISAO:            'Enviar para Revisão Técnica',
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const docs = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT "workflowStatus", status, version FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  if (!docs.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const current = String(docs[0].workflowStatus ?? 'RASCUNHO')
  const next    = TRANSITIONS[current]
  return NextResponse.json({
    current,
    next: next ?? null,
    nextLabel: next ? TRANSITION_LABELS[current] : null,
    canAdvance: !!next,
    canReject:  current !== 'RASCUNHO' && current !== 'VIGENTE',
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now  = new Date().toISOString()

  const docs = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT "workflowStatus", version FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  if (!docs.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const current = String(docs[0].workflowStatus ?? 'RASCUNHO')
  let   newStatus: string

  if (body.action === 'REJEITAR') {
    newStatus = 'RASCUNHO'
  } else if (body.action === 'CANCELAR') {
    newStatus = 'CANCELADO'
  } else if (body.action === 'OBSOLETO') {
    newStatus = 'OBSOLETO'
  } else {
    // Avançar para o próximo estado
    newStatus = TRANSITIONS[current] ?? current
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "ProcedureDocument" SET "workflowStatus" = ?, "updatedAt" = ? WHERE id = ?`,
    newStatus, now, params.id
  )

  // Se publicando (VIGENTE), atualizar status também
  if (newStatus === 'VIGENTE') {
    await prisma.$executeRawUnsafe(
      `UPDATE "ProcedureDocument" SET status = 'VIGENTE', "updatedAt" = ? WHERE id = ?`,
      now, params.id
    )
  }

  // Registrar no histórico
  const hid = randomUUID()
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProcedureHistory"
      (id, "documentId", "userName", action, "oldWorkflowStatus", "newWorkflowStatus", version, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    hid, params.id,
    body.userName ?? 'Sistema',
    body.action ?? 'AVANCO',
    current,
    newStatus,
    docs[0].version ?? null,
    body.comment ?? null,
  )

  return NextResponse.json({ ok: true, previous: current, current: newStatus })
}
