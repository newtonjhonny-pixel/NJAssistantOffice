import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

function hasOwn(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key)
}

function nullableInt(value: unknown) {
  if (value == null || value === '') return null
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function nullableFloat(value: unknown) {
  if (value == null || value === '') return null
  const parsed = Number.parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function nullableText(value: unknown) {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}


export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as Record<string, unknown>
    const now = new Date().toISOString()
    const currentRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "MemberCompanyLink" WHERE "id" = ${params.id}
    `
    if (!currentRows.length) return NextResponse.json({ error: 'Vínculo não encontrado' }, { status: 404 })

    const headcountUpdatedAt =
      hasOwn(body, 'headcountActive') || hasOwn(body, 'headcountApprentice') || hasOwn(body, 'headcountIntern') || hasOwn(body, 'headcountOnLeave')
        ? now
        : undefined

    const data: Record<string, unknown> = { updatedAt: now }
    if (hasOwn(body, 'memberRole')) data.memberRole = nullableText(body.memberRole)
    if (hasOwn(body, 'headcountActive')) data.headcountActive = nullableInt(body.headcountActive)
    if (hasOwn(body, 'headcountApprentice')) data.headcountApprentice = nullableInt(body.headcountApprentice)
    if (hasOwn(body, 'headcountIntern')) data.headcountIntern = nullableInt(body.headcountIntern)
    if (hasOwn(body, 'headcountOnLeave')) data.headcountOnLeave = nullableInt(body.headcountOnLeave)
    if (headcountUpdatedAt) data.headcountUpdatedAt = headcountUpdatedAt
    if (hasOwn(body, 'avgAdmissions')) data.avgAdmissions = nullableFloat(body.avgAdmissions)
    if (hasOwn(body, 'avgTerminations')) data.avgTerminations = nullableFloat(body.avgTerminations)
    if (hasOwn(body, 'avgVacations')) data.avgVacations = nullableFloat(body.avgVacations)
    if (hasOwn(body, 'folhasProcessadas')) data.folhasProcessadas = nullableInt(body.folhasProcessadas)
    if (hasOwn(body, 'unions')) data.unions = nullableInt(body.unions)
    if (hasOwn(body, 'establishments')) data.establishments = nullableInt(body.establishments) ?? 1
    if (hasOwn(body, 'systemUsed')) data.systemUsed = nullableText(body.systemUsed)
    if (hasOwn(body, 'automationLevel')) data.automationLevel = nullableText(body.automationLevel)
    if (hasOwn(body, 'complexity')) data.complexity = nullableText(body.complexity)
    if (hasOwn(body, 'substitute')) data.substitute = nullableText(body.substitute)
    if (hasOwn(body, 'observations')) data.observations = nullableText(body.observations)

    await (prisma as any).memberCompanyLink.update({
      where: { id: params.id },
      data,
    })
    const rows = await prisma.$queryRaw<any[]>`
      SELECT l.*, c."name" as "companyName", c."cnpj", c."segment"
      FROM "MemberCompanyLink" l
      JOIN "ClientCompany" c ON c."id" = l."companyId"
      WHERE l."id" = ${params.id}
    `
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[member-companies PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.$executeRaw`DELETE FROM "MemberCompanyLink" WHERE "id" = ${params.id}`
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 })
  }
}
