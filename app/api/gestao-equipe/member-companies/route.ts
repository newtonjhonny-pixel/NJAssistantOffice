import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

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


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const memberId = searchParams.get('memberId')
    const companyId = searchParams.get('companyId')

    let rows: any[]
    if (memberId) {
      rows = await prisma.$queryRaw`
        SELECT l.*, c."name" as "companyName", c."cnpj", c."segment"
        FROM "MemberCompanyLink" l
        JOIN "ClientCompany" c ON c."id" = l."companyId"
        WHERE l."memberId" = ${memberId}
        ORDER BY c."name" ASC
      `
    } else if (companyId) {
      rows = await prisma.$queryRaw`
        SELECT l.*, m."name" as "memberName", m."role" as "memberRole_"
        FROM "MemberCompanyLink" l
        JOIN "TeamMember" m ON m."id" = l."memberId"
        WHERE l."companyId" = ${companyId}
        ORDER BY m."name" ASC
      `
    } else {
      rows = await prisma.$queryRaw`
        SELECT l.*, c."name" as "companyName", m."name" as "memberName"
        FROM "MemberCompanyLink" l
        JOIN "ClientCompany" c ON c."id" = l."companyId"
        JOIN "TeamMember" m ON m."id" = l."memberId"
        ORDER BY m."name", c."name"
      `
    }
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[member-companies GET]', e)
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const memberId = nullableText(body.memberId)
    const companyId = nullableText(body.companyId)

    if (!memberId || !companyId)
      return NextResponse.json({ error: 'memberId e companyId são obrigatórios' }, { status: 400 })

    const memberRows = await prisma.$queryRaw<{ id: string; status: string }[]>`
      SELECT "id", "status" FROM "TeamMember" WHERE "id" = ${memberId}
    `
    if (!memberRows.length) return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })
    if (memberRows[0].status === 'INATIVO') return NextResponse.json({ error: 'Colaborador inativo não pode receber novo vínculo' }, { status: 400 })

    const companyRows = await prisma.$queryRaw<{ id: string; active: boolean }[]>`
      SELECT "id", "active" FROM "ClientCompany" WHERE "id" = ${companyId}
    `
    if (!companyRows.length) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    if (!companyRows[0].active) return NextResponse.json({ error: 'Empresa inativa não pode ser vinculada' }, { status: 400 })

    // Check duplicate
    const dup = await prisma.$queryRaw<any[]>`
      SELECT "id" FROM "MemberCompanyLink" WHERE "memberId" = ${memberId} AND "companyId" = ${companyId}
    `
    if (dup.length) return NextResponse.json({ error: 'Vínculo já existe para este colaborador e empresa' }, { status: 409 })

    const id = randomUUID()
    const now = new Date().toISOString()
    const headcountActive = nullableInt(body.headcountActive)
    const headcountApprentice = nullableInt(body.headcountApprentice)
    const headcountIntern = nullableInt(body.headcountIntern)
    const headcountOnLeave = nullableInt(body.headcountOnLeave)
    const avgAdmissions = nullableFloat(body.avgAdmissions)
    const avgTerminations = nullableFloat(body.avgTerminations)
    const avgVacations = nullableFloat(body.avgVacations)
    const folhasProcessadas = nullableInt(body.folhasProcessadas)
    const unions = nullableInt(body.unions)
    const establishments = nullableInt(body.establishments) ?? 1
    const headcountUpdatedAt = (headcountActive != null || headcountApprentice != null) ? now : null
    const startDateVal = body.startDate ? new Date(body.startDate) : null

    await prisma.$executeRaw`
      INSERT INTO "MemberCompanyLink" (
        "id","memberId","companyId","memberRole",
        "headcountActive","headcountApprentice","headcountIntern","headcountOnLeave","headcountUpdatedAt",
        "avgAdmissions","avgTerminations","avgVacations",
        "folhasProcessadas","unions","establishments",
        "systemUsed","automationLevel","complexity",
        "startDate","substitute","observations",
        "createdAt","updatedAt"
      ) VALUES (
        ${id}, ${memberId}, ${companyId}, ${nullableText(body.memberRole)},
        ${headcountActive ?? null}, ${headcountApprentice ?? null}, ${headcountIntern ?? null}, ${headcountOnLeave ?? null}, ${headcountUpdatedAt},
        ${avgAdmissions ?? null}, ${avgTerminations ?? null}, ${avgVacations ?? null},
        ${folhasProcessadas ?? null}, ${unions ?? null}, ${establishments},
        ${nullableText(body.systemUsed)}, ${nullableText(body.automationLevel)}, ${nullableText(body.complexity)},
        ${startDateVal}, ${nullableText(body.substitute)}, ${nullableText(body.observations)},
        ${now}, ${now}
      )
    `

    const rows = await prisma.$queryRaw<any[]>`
      SELECT l.*, c."name" as "companyName", c."cnpj", c."segment"
      FROM "MemberCompanyLink" l
      JOIN "ClientCompany" c ON c."id" = l."companyId"
      WHERE l."id" = ${id}
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[member-companies POST]', e)
    return NextResponse.json({ error: 'Erro ao vincular empresa' }, { status: 500 })
  }
}
