import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now  = new Date()
  const { nome, finalidade, responsavel, url, nivelAcesso, observacoes, logoUrl, processosIds, prints, ativo } = body

  await prisma.$executeRawUnsafe(
    `UPDATE "AmbientacaoSystem" SET
       "nome"        = COALESCE(?, nome),
       "finalidade"  = ?,
       "responsavel" = ?,
       "url"         = ?,
       "nivelAcesso" = ?,
       "observacoes" = ?,
       "logoUrl"     = ?,
       "processosIds"= ?,
       "prints"      = ?,
       "ativo"       = COALESCE(?, ativo),
       "updatedAt"   = ?
     WHERE id = ?`,
    nome         ?? null,
    finalidade   !== undefined ? finalidade  : undefined,
    responsavel  !== undefined ? responsavel : undefined,
    url          !== undefined ? url         : undefined,
    nivelAcesso  !== undefined ? nivelAcesso : undefined,
    observacoes  !== undefined ? observacoes : undefined,
    logoUrl      !== undefined ? logoUrl     : undefined,
    processosIds !== undefined ? JSON.stringify(processosIds) : undefined,
    prints       !== undefined ? JSON.stringify(prints)       : undefined,
    ativo        !== undefined ? Boolean(ativo) : null,
    now, params.id,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "AmbientacaoSystem" WHERE id = ?`, params.id
  )
  const r = rows[0]
  return NextResponse.json({
    ...r, ativo: Boolean(r.ativo),
    processosIds: safeJson(r.processosIds as string ?? '[]'),
    prints:       safeJson(r.prints      as string ?? '[]'),
  })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`UPDATE "AmbientacaoSystem" SET ativo = false WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return [] } }
