import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const modules = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT m.*,
       COALESCE((
         SELECT json_agg(json_build_object(
           'id', l.id, 'ordem', l.ordem, 'titulo', l.titulo, 'tipo', l.tipo,
           'conteudo', l.conteudo, 'duracao', l.duracao
         ) ORDER BY l.ordem)
         FROM "TrainingLesson" l WHERE l."moduleId" = m.id
       ), '[]'::json) AS lessons
     FROM "TrainingModule" m WHERE m."trainingId" = ? ORDER BY m.ordem`,
    params.id
  )
  return NextResponse.json(modules.map(m => ({
    ...m,
    lessons: safeJson(m.lessons as string ?? '[]'),
    conteudo: m.conteudo ? safeJson(m.conteudo as string) : null,
  })))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body  = await req.json()
  const id    = randomUUID()
  const now   = new Date()

  // Próxima ordem
  const last = await prisma.$queryRawUnsafe<{ maxOrdem: unknown }[]>(
    `SELECT MAX(ordem) AS maxOrdem FROM "TrainingModule" WHERE "trainingId" = ?`, params.id
  )
  const ordem = Number(last[0]?.maxOrdem ?? -1) + 1

  await prisma.$executeRawUnsafe(
    `INSERT INTO "TrainingModule" ("id","trainingId","ordem","titulo","descricao","conteudo","createdAt","updatedAt")
     VALUES (?,?,?,?,?,?,?,?)`,
    id, params.id, ordem,
    body.titulo || 'Novo Módulo',
    body.descricao ?? null,
    body.conteudo ? JSON.stringify(body.conteudo) : null,
    now, now,
  )

  // Atualiza updatedAt do Training
  await prisma.$executeRawUnsafe(
    `UPDATE "Training" SET "updatedAt" = ? WHERE id = ?`, now, params.id
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "TrainingModule" WHERE id = ?`, id
  )
  return NextResponse.json(rows[0], { status: 201 })
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return typeof s === 'string' ? [] : s } }
