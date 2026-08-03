import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'



function normalizeCnpj(value: unknown) {
  if (value == null || value === '') return null
  const digits = String(value).replace(/\D/g, '').slice(0, 14)
  return digits || null
}

function validateCnpj(value: string | null) {
  return !value || value.length === 14
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "ClientCompany" WHERE "id" = ${params.id}`
    if (!rows.length) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (e) {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { name, segment, observations, active } = body
    const hasCnpj = Object.prototype.hasOwnProperty.call(body, 'cnpj')
    const cnpj = normalizeCnpj(body.cnpj)
    if (!validateCnpj(cnpj)) return NextResponse.json({ error: 'Informe um CNPJ válido com 14 dígitos.' }, { status: 400 })
    const updated = await prisma.clientCompany.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(hasCnpj && { cnpj }),
        ...(segment !== undefined && { segment }),
        ...(observations !== undefined && { observations }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    })
    return NextResponse.json(updated)
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
