import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// ─── GET: listar treinamentos / ambientações ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipo       = searchParams.get('tipo')      || ''  // TREINAMENTO | AMBIENTACAO | ''
  const status     = searchParams.get('status')    || ''
  const modalidade = searchParams.get('modalidade')|| ''
  const q          = searchParams.get('q')         || ''

  let sql = `
    SELECT t.*,
      (SELECT COUNT(*) FROM "TrainingParticipant" p WHERE p."trainingId" = t.id) AS totalParticipantes,
      (SELECT COUNT(*) FROM "TrainingModule"      m WHERE m."trainingId" = t.id) AS totalModulos,
      (SELECT COUNT(*) FROM "TrainingMaterial"    mat WHERE mat."trainingId" = t.id) AS totalMateriais
    FROM "Training" t
    WHERE 1=1`
  const params: unknown[] = []

  if (tipo)       { sql += ` AND t."tipo" = ?`;       params.push(tipo) }
  if (status)     { sql += ` AND t."status" = ?`;     params.push(status) }
  if (modalidade) { sql += ` AND t."modalidade" = ?`; params.push(modalidade) }
  if (q)          { sql += ` AND (t."titulo" LIKE ? OR t."objetivo" LIKE ? OR t."tags" LIKE ?)`
                    params.push(`%${q}%`, `%${q}%`, `%${q}%`) }

  sql += ` ORDER BY t."updatedAt" DESC`

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(rows.map(normalizeTraining))
}

// ─── POST: criar treinamento / ambientação ────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    tipo = 'TREINAMENTO', modalidade = 'COMPLETO',
    titulo, subtitulo, objetivo, processId, presentationId,
    departamento, publicoAlvo, responsavel, tags, duracaoMin,
    obrigatorio = false, config, conteudo,
  } = body

  if (!titulo) {
    return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  }

  const id  = randomUUID()
  const now = new Date()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Training"
       ("id","tipo","modalidade","titulo","subtitulo","objetivo","processId","presentationId",
        "departamento","publicoAlvo","responsavel","tags","duracaoMin","status","obrigatorio",
        "config","conteudo","createdAt","updatedAt")
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, tipo, modalidade,
    titulo,
    subtitulo    ?? null,
    objetivo     ?? null,
    processId    ?? null,
    presentationId ?? null,
    departamento ?? null,
    publicoAlvo  ?? null,
    responsavel  ?? null,
    tags         ?? null,
    duracaoMin   ?? null,
    'RASCUNHO',
    Boolean(obrigatorio),
    config  ? JSON.stringify(config)   : null,
    conteudo ? JSON.stringify(conteudo) : null,
    now, now,
  )

  // Histórico
  await prisma.$executeRawUnsafe(
    `INSERT INTO "TrainingHistory" ("id","trainingId","acao","descricao","createdAt")
     VALUES (?,?,'CRIACAO',?,?)`,
    randomUUID(), id, `${tipo === 'AMBIENTACAO' ? 'Ambientação' : 'Treinamento'} criado: ${titulo}`, now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "Training" WHERE id = ?`, id
  )
  return NextResponse.json(normalizeTraining(rows[0]), { status: 201 })
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function normalizeTraining(r: Record<string, unknown>) {
  return {
    ...r,
    obrigatorio:       Boolean(r.obrigatorio),
    totalParticipantes: Number(r.totalParticipantes ?? 0),
    totalModulos:       Number(r.totalModulos       ?? 0),
    totalMateriais:     Number(r.totalMateriais     ?? 0),
    config:   r.config   ? safeJson(r.config as string)   : null,
    conteudo: r.conteudo ? safeJson(r.conteudo as string) : null,
  }
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return s } }
