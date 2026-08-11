import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "AmbientacaoSystem" WHERE ativo = true ORDER BY nome`
  )
  return NextResponse.json(rows.map(r => ({
    ...r,
    ativo:       Boolean(r.ativo),
    processosIds: safeJson(r.processosIds as string ?? '[]'),
    prints:       safeJson(r.prints      as string ?? '[]'),
  })))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nome, finalidade, responsavel, url, nivelAcesso, observacoes, logoUrl, processosIds = [], prints = [] } = body
  if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const id  = randomUUID()
  const now = new Date()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "AmbientacaoSystem"
       ("id","nome","finalidade","responsavel","url","nivelAcesso","observacoes","logoUrl","processosIds","prints","ativo","createdAt","updatedAt")
     VALUES (?,?,?,?,?,?,?,?,?,?,true,?,?)`,
    id, nome,
    finalidade   ?? null,
    responsavel  ?? null,
    url          ?? null,
    nivelAcesso  ?? null,
    observacoes  ?? null,
    logoUrl      ?? null,
    JSON.stringify(processosIds),
    JSON.stringify(prints),
    now, now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "AmbientacaoSystem" WHERE id = ?`, id
  )
  const r = rows[0]
  return NextResponse.json({
    ...r, ativo: true,
    processosIds: safeJson(r.processosIds as string ?? '[]'),
    prints:       safeJson(r.prints      as string ?? '[]'),
  }, { status: 201 })
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return [] } }
