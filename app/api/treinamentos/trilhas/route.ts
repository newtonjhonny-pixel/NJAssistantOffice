import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cargo  = searchParams.get('cargo')  || ''
  const status = searchParams.get('status') || ''

  let sql = `SELECT t.*, (SELECT COUNT(*) FROM "TrainingTrailItem" i WHERE i."trilhaId" = t.id) AS totalItens
             FROM "TrainingTrail" t WHERE 1=1`
  const params: unknown[] = []
  if (cargo)  { sql += ` AND t.cargo = ?`;  params.push(cargo) }
  if (status) { sql += ` AND t.status = ?`; params.push(status) }
  sql += ` ORDER BY t."updatedAt" DESC`

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(rows.map(r => ({ ...r, obrigatorio: Boolean(r.obrigatorio), totalItens: Number(r.totalItens ?? 0) })))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { titulo, descricao, cargo, obrigatorio = false } = body
  if (!titulo) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const id  = randomUUID()
  const now = new Date()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "TrainingTrail" ("id","titulo","descricao","cargo","status","obrigatorio","createdAt","updatedAt")
     VALUES (?,?,?,?,'ATIVA',?,?,?)`,
    id, titulo, descricao ?? null, cargo ?? null, Boolean(obrigatorio), now, now,
  )

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "TrainingTrail" WHERE id = ?`, id
  )
  return NextResponse.json(rows[0], { status: 201 })
}
