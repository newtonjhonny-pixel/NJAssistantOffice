import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const now  = new Date()
  const { titulo, descricao, cargo, status } = body

  await prisma.$executeRawUnsafe(
    `UPDATE "TrainingTrail" SET
       "titulo"     = COALESCE(?, titulo),
       "descricao"  = ?,
       "cargo"      = ?,
       "status"     = COALESCE(?, status),
       "updatedAt"  = ?
     WHERE id = ?`,
    titulo ?? null, descricao ?? null, cargo ?? null, status ?? null, now, params.id,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT t.*, (SELECT COUNT(*) FROM "TrainingTrailItem" i WHERE i."trilhaId" = t.id) AS totalItens
     FROM "TrainingTrail" t WHERE t.id = ?`, params.id
  )
  const r = rows[0]
  return NextResponse.json({ ...r, totalItens: Number(r?.totalItens ?? 0) })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "TrainingTrailItem" WHERE "trilhaId" = ?`, params.id)
  await prisma.$executeRawUnsafe(`DELETE FROM "TrainingTrail" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
