import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "Training" WHERE id = ?`, id
  )
  if (!rows.length) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const [modules, materials, participants, history] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT m.*, (SELECT COUNT(*) FROM "TrainingLesson" l WHERE l."moduleId" = m.id) AS totalLessons
       FROM "TrainingModule" m WHERE m."trainingId" = ? ORDER BY m."ordem"`, id
    ),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "TrainingMaterial" WHERE "trainingId" = ? ORDER BY "createdAt"`, id
    ),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT p.*, tm."name" AS memberName, tm."role" AS memberRole
       FROM "TrainingParticipant" p
       JOIN "TeamMember" tm ON tm.id = p."memberId"
       WHERE p."trainingId" = ?
       ORDER BY p."createdAt"`, id
    ),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "TrainingHistory" WHERE "trainingId" = ? ORDER BY "createdAt" DESC LIMIT 50`, id
    ),
  ])

  // Busca dados do processo vinculado se existir
  let processData = null
  const t = rows[0]
  if (t.processId) {
    const proc = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, name, code, responsible, department, frequency, objective, description,
              inputs, outputs, tools, sla, risks, observations
       FROM "Process" WHERE id = ?`, t.processId
    )
    if (proc.length) processData = proc[0]
  }

  return NextResponse.json({
    ...normalizeTraining(t),
    modules: modules.map(m => ({ ...m, totalLessons: Number(m.totalLessons ?? 0) })),
    materials,
    participants: participants.map(normalizeParticipant),
    history,
    processData,
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const body = await req.json()

  const existing = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id FROM "Training" WHERE id = ?`, id
  )
  if (!existing.length) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const now = new Date()
  const {
    tipo, modalidade, titulo, subtitulo, objetivo, processId, presentationId,
    departamento, publicoAlvo, responsavel, tags, duracaoMin, status, obrigatorio,
    config, conteudo,
  } = body

  await prisma.$executeRawUnsafe(
    `UPDATE "Training" SET
       "tipo"           = COALESCE(?, "tipo"),
       "modalidade"     = COALESCE(?, "modalidade"),
       "titulo"         = COALESCE(?, "titulo"),
       "subtitulo"      = ?,
       "objetivo"       = ?,
       "processId"      = ?,
       "presentationId" = ?,
       "departamento"   = ?,
       "publicoAlvo"    = ?,
       "responsavel"    = ?,
       "tags"           = ?,
       "duracaoMin"     = ?,
       "status"         = COALESCE(?, "status"),
       "obrigatorio"    = COALESCE(?, "obrigatorio"),
       "config"         = ?,
       "conteudo"       = ?,
       "updatedAt"      = ?
     WHERE id = ?`,
    tipo        ?? null,
    modalidade  ?? null,
    titulo      ?? null,
    subtitulo   !== undefined ? subtitulo    : undefined,
    objetivo    !== undefined ? objetivo     : undefined,
    processId   !== undefined ? processId    : undefined,
    presentationId !== undefined ? presentationId : undefined,
    departamento   !== undefined ? departamento   : undefined,
    publicoAlvo    !== undefined ? publicoAlvo    : undefined,
    responsavel    !== undefined ? responsavel    : undefined,
    tags           !== undefined ? tags           : undefined,
    duracaoMin     !== undefined ? duracaoMin     : undefined,
    status      ?? null,
    obrigatorio !== undefined ? Boolean(obrigatorio) : null,
    config   !== undefined ? (config   ? JSON.stringify(config)   : null) : undefined,
    conteudo !== undefined ? (conteudo ? JSON.stringify(conteudo) : null) : undefined,
    now, id,
  )

  await prisma.$executeRawUnsafe(
    `INSERT INTO "TrainingHistory" ("id","trainingId","acao","descricao","createdAt")
     VALUES (?,?,'EDICAO',?,?)`,
    randomUUID(), id, 'Treinamento atualizado', now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "Training" WHERE id = ?`, id
  )
  return NextResponse.json(normalizeTraining(rows[0]))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const existing = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, titulo FROM "Training" WHERE id = ?`, id
  )
  if (!existing.length) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  await prisma.$executeRawUnsafe(`DELETE FROM "Training" WHERE id = ?`, id)
  return NextResponse.json({ ok: true })
}

function normalizeTraining(r: Record<string, unknown>) {
  return {
    ...r,
    obrigatorio: Boolean(r.obrigatorio),
    config:   r.config   ? safeJson(r.config   as string) : null,
    conteudo: r.conteudo ? safeJson(r.conteudo as string) : null,
  }
}
function normalizeParticipant(p: Record<string, unknown>) {
  return { ...p, progresso: Number(p.progresso ?? 0), cienciaConfirmada: Boolean(p.cienciaConfirmada) }
}
function safeJson(s: string) { try { return JSON.parse(s) } catch { return s } }
