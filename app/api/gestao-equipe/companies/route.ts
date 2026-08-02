import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



export async function GET() {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "ClientCompany" ORDER BY "name" ASC
    `
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[companies GET]', e)
    return NextResponse.json({ error: 'Erro ao listar empresas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, cnpj, segment, observations } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatÃ³rio' }, { status: 400 })
    const id = randomUUID()
    const now = new Date().toISOString()
    await prisma.$executeRaw`
      INSERT INTO "ClientCompany" ("id","name","cnpj","segment","observations","active","createdAt","updatedAt")
      VALUES (${id}, ${name.trim()}, ${cnpj ?? null}, ${segment ?? null}, ${observations ?? null}, 1, ${now}, ${now})
    `
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "ClientCompany" WHERE "id" = ${id}`
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[companies POST]', e)
    return NextResponse.json({ error: 'Erro ao criar empresa' }, { status: 500 })
  }
}
