import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'



export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "ClientCompany" WHERE "id" = ${params.id}`
    if (!rows.length) return NextResponse.json({ error: 'NÃ£o encontrada' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (e) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { name, cnpj, segment, observations, active } = await req.json()
    const now = new Date().toISOString()
    await prisma.$executeRaw`
      UPDATE "ClientCompany"
      SET "name"         = COALESCE(${name ?? null}, "name"),
          "cnpj"         = ${cnpj ?? null},
          "segment"      = ${segment ?? null},
          "observations" = ${observations ?? null},
          "active"       = COALESCE(${active ?? null}, "active"),
          "updatedAt"    = ${now}
      WHERE "id" = ${params.id}
    `
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "ClientCompany" WHERE "id" = ${params.id}`
    return NextResponse.json(rows[0])
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.$executeRaw`DELETE FROM "ClientCompany" WHERE "id" = ${params.id}`
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}
