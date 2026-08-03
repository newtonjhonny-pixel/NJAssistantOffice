import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'



export async function PATCH(req: Request, { params }: { params: { id: string; processId: string } }) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const critical = body.isCritical != null ? Boolean(body.isCritical) : null

    await prisma.$executeRaw`
      UPDATE "MemberCompanyProcess" SET
        "volume"          = COALESCE(${body.volume ?? null},          "volume"),
        "complexity"      = COALESCE(${body.complexity ?? null},      "complexity"),
        "automationLevel" = COALESCE(${body.automationLevel ?? null}, "automationLevel"),
        "avgTimeMinutes"  = COALESCE(${body.avgTimeMinutes ?? null},  "avgTimeMinutes"),
        "isCritical"      = COALESCE(${critical},                     "isCritical"),
        "observations"    = COALESCE(${body.observations ?? null},    "observations"),
        "updatedAt"       = ${now}
      WHERE "id" = ${params.processId} AND "linkId" = ${params.id}
    `

    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "MemberCompanyProcess" WHERE "id" = ${params.processId}
    `
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[processes PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar processo' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string; processId: string } }) {
  try {
    await prisma.$executeRaw`
      DELETE FROM "MemberCompanyProcess" WHERE "id" = ${params.processId} AND "linkId" = ${params.id}
    `
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao remover processo' }, { status: 500 })
  }
}
