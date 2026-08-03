import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



function normalizeCnpj(value: unknown) {
  if (value == null || value === '') return null
  const digits = String(value).replace(/\D/g, '').slice(0, 14)
  return digits || null
}

function validateCnpj(value: string | null) {
  return !value || value.length === 14
}

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
    const { name, segment, observations } = body
    const cnpj = normalizeCnpj(body.cnpj)
    if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
    if (!validateCnpj(cnpj)) return NextResponse.json({ error: 'Informe um CNPJ válido com 14 dígitos.' }, { status: 400 })
    const id = randomUUID()
    const now = new Date()
    await prisma.$executeRaw`
      INSERT INTO "ClientCompany" ("id","name","cnpj","segment","observations","active","createdAt","updatedAt")
      VALUES (${id}, ${name.trim()}, ${cnpj}, ${segment ?? null}, ${observations ?? null}, true, ${now}, ${now})
    `
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "ClientCompany" WHERE "id" = ${id}`
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[companies POST]', e)
    return NextResponse.json({ error: 'Erro ao criar empresa' }, { status: 500 })
  }
}
