import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'



export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const headcountUpdatedAt =
      body.headcountActive != null || body.headcountApprentice != null ? now : undefined

    await prisma.$executeRaw`
      UPDATE "MemberCompanyLink" SET
        "memberRole"          = COALESCE(${body.memberRole ?? null},        "memberRole"),
        "headcountActive"     = COALESCE(${body.headcountActive ?? null},   "headcountActive"),
        "headcountApprentice" = COALESCE(${body.headcountApprentice ?? null},"headcountApprentice"),
        "headcountIntern"     = COALESCE(${body.headcountIntern ?? null},   "headcountIntern"),
        "headcountOnLeave"    = COALESCE(${body.headcountOnLeave ?? null},  "headcountOnLeave"),
        "headcountUpdatedAt"  = COALESCE(${headcountUpdatedAt ?? null},     "headcountUpdatedAt"),
        "avgAdmissions"       = COALESCE(${body.avgAdmissions ?? null},     "avgAdmissions"),
        "avgTerminations"     = COALESCE(${body.avgTerminations ?? null},   "avgTerminations"),
        "avgVacations"        = COALESCE(${body.avgVacations ?? null},      "avgVacations"),
        "folhasProcessadas"   = COALESCE(${body.folhasProcessadas ?? null}, "folhasProcessadas"),
        "unions"              = COALESCE(${body.unions ?? null},            "unions"),
        "establishments"      = COALESCE(${body.establishments ?? null},   "establishments"),
        "systemUsed"          = COALESCE(${body.systemUsed ?? null},        "systemUsed"),
        "automationLevel"     = COALESCE(${body.automationLevel ?? null},   "automationLevel"),
        "complexity"          = COALESCE(${body.complexity ?? null},        "complexity"),
        "substitute"          = COALESCE(${body.substitute ?? null},        "substitute"),
        "observations"        = COALESCE(${body.observations ?? null},      "observations"),
        "updatedAt"           = ${now}
      WHERE "id" = ${params.id}
    `
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
