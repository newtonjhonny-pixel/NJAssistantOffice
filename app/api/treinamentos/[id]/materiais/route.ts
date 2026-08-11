import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "TrainingMaterial" WHERE "trainingId" = ? ORDER BY "createdAt"`,
    params.id
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { titulo, tipo = 'LINK', url, descricao } = body
  if (!titulo) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const id  = randomUUID()
  const now = new Date()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "TrainingMaterial" ("id","trainingId","titulo","tipo","url","descricao","createdAt")
     VALUES (?,?,?,?,?,?,?)`,
    id, params.id, titulo, tipo, url ?? null, descricao ?? null, now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "TrainingMaterial" WHERE id = ?`, id
  )
  return NextResponse.json(rows[0], { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const materialId = searchParams.get('materialId')
  if (!materialId) return NextResponse.json({ error: 'materialId obrigatório' }, { status: 400 })
  await prisma.$executeRawUnsafe(
    `DELETE FROM "TrainingMaterial" WHERE id = ? AND "trainingId" = ?`, materialId, params.id
  )
  return NextResponse.json({ ok: true })
}
