import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



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
    const {
      memberId, companyId, memberRole,
      headcountActive, headcountApprentice, headcountIntern, headcountOnLeave,
      avgAdmissions, avgTerminations, avgVacations,
      folhasProcessadas, unions, establishments,
      systemUsed, automationLevel, complexity,
      startDate, substitute, observations,
    } = body

    if (!memberId || !companyId)
      return NextResponse.json({ error: 'memberId e companyId sÃ£o obrigatÃ³rios' }, { status: 400 })

    // Check duplicate
    const dup = await prisma.$queryRaw<any[]>`
      SELECT "id" FROM "MemberCompanyLink" WHERE "memberId" = ${memberId} AND "companyId" = ${companyId}
    `
    if (dup.length) return NextResponse.json({ error: 'VÃ­nculo jÃ¡ existe' }, { status: 409 })

    const id = randomUUID()
    const now = new Date().toISOString()
    const headcountUpdatedAt = (headcountActive != null || headcountApprentice != null) ? now : null
    const startDateVal = startDate ? new Date(startDate).toISOString() : null

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
        ${id}, ${memberId}, ${companyId}, ${memberRole ?? null},
        ${headcountActive ?? null}, ${headcountApprentice ?? null}, ${headcountIntern ?? null}, ${headcountOnLeave ?? null}, ${headcountUpdatedAt},
        ${avgAdmissions ?? null}, ${avgTerminations ?? null}, ${avgVacations ?? null},
        ${folhasProcessadas ?? null}, ${unions ?? null}, ${establishments ?? 1},
        ${systemUsed ?? null}, ${automationLevel ?? null}, ${complexity ?? null},
        ${startDateVal}, ${substitute ?? null}, ${observations ?? null},
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
