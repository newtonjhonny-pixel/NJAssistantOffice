import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT p.*, tm."name" AS memberName, tm."role" AS memberRole, tm."sector" AS memberSector
     FROM "TrainingParticipant" p
     JOIN "TeamMember" tm ON tm.id = p."memberId"
     WHERE p."trainingId" = ?
     ORDER BY p."createdAt"`,
    params.id
  )
  return NextResponse.json(rows.map(normalizeParticipant))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { memberId, instrutorNome, observacoes } = body

  if (!memberId) return NextResponse.json({ error: 'memberId obrigatório' }, { status: 400 })

  // Verifica se já existe
  const existing = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id FROM "TrainingParticipant" WHERE "trainingId" = ? AND "memberId" = ?`,
    params.id, memberId
  )
  if (existing.length) {
    return NextResponse.json({ error: 'Colaborador já é participante' }, { status: 409 })
  }

  const id  = randomUUID()
  const now = new Date()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "TrainingParticipant"
       ("id","trainingId","memberId","status","progresso","cienciaConfirmada","instrutorNome","observacoes","createdAt","updatedAt")
     VALUES (?,?,?,'PENDENTE',0,false,?,?,?,?)`,
    id, params.id, memberId,
    instrutorNome ?? null,
    observacoes   ?? null,
    now, now,
  )

  await prisma.$executeRawUnsafe(
    `INSERT INTO "TrainingHistory" ("id","trainingId","acao","descricao","memberId","createdAt")
     VALUES (?,?,'PARTICIPANTE_ADICIONADO','Participante adicionado',?,?)`,
    randomUUID(), params.id, memberId, now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT p.*, tm."name" AS memberName, tm."role" AS memberRole
     FROM "TrainingParticipant" p
     JOIN "TeamMember" tm ON tm.id = p."memberId"
     WHERE p.id = ?`, id
  )
  return NextResponse.json(normalizeParticipant(rows[0]), { status: 201 })
}

// PATCH: atualizar progresso/status/ciência de um participante
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { memberId, status, progresso, nota, cienciaConfirmada, dataConclusao, instrutorNome, duracaoReal, observacoes } = body

  if (!memberId) return NextResponse.json({ error: 'memberId obrigatório' }, { status: 400 })

  const now = new Date()

  await prisma.$executeRawUnsafe(
    `UPDATE "TrainingParticipant" SET
       "status"             = COALESCE(?, "status"),
       "progresso"          = COALESCE(?, "progresso"),
       "nota"               = COALESCE(?, "nota"),
       "cienciaConfirmada"  = COALESCE(?, "cienciaConfirmada"),
       "dataCiencia"        = CASE WHEN ? = true AND "dataCiencia" IS NULL THEN ? ELSE "dataCiencia" END,
       "dataConclusao"      = COALESCE(?, "dataConclusao"),
       "instrutorNome"      = COALESCE(?, "instrutorNome"),
       "duracaoReal"        = COALESCE(?, "duracaoReal"),
       "observacoes"        = COALESCE(?, "observacoes"),
       "updatedAt"          = ?
     WHERE "trainingId" = ? AND "memberId" = ?`,
    status            ?? null,
    progresso         != null ? Number(progresso) : null,
    nota              != null ? Number(nota)       : null,
    cienciaConfirmada != null ? Boolean(cienciaConfirmada) : null,
    Boolean(cienciaConfirmada), now,
    dataConclusao ?? null,
    instrutorNome ?? null,
    duracaoReal   ?? null,
    observacoes   ?? null,
    now, params.id, memberId,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT p.*, tm."name" AS memberName, tm."role" AS memberRole
     FROM "TrainingParticipant" p
     JOIN "TeamMember" tm ON tm.id = p."memberId"
     WHERE p."trainingId" = ? AND p."memberId" = ?`, params.id, memberId
  )
  return NextResponse.json(normalizeParticipant(rows[0]))
}

function normalizeParticipant(p: Record<string, unknown>) {
  return {
    ...p,
    progresso:         Number(p.progresso ?? 0),
    cienciaConfirmada: Boolean(p.cienciaConfirmada),
  }
}
