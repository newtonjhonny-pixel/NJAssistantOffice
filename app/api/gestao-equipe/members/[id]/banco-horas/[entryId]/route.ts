import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



export async function PATCH(req: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    const body = await req.json()
    const now = new Date()
    const entryDateValue = body.entryDate
      ? new Date(String(body.entryDate).includes('T') ? body.entryDate : body.entryDate + 'T00:00:00.000Z')
      : null
    await prisma.$executeRaw`
      UPDATE "HourBankEntry" SET
        "entryDate"     = COALESCE(${entryDateValue}, "entryDate"),
        "competence"    = COALESCE(${body.competence   ?? null}, "competence"),
        "type"          = COALESCE(${body.type         ?? null}, "type"),
        "creditMinutes" = COALESCE(${body.creditMinutes != null ? body.creditMinutes : null}, "creditMinutes"),
        "debitMinutes"  = COALESCE(${body.debitMinutes  != null ? body.debitMinutes  : null}, "debitMinutes"),
        "responsible"   = COALESCE(${body.responsible  ?? null}, "responsible"),
        "observations"  = COALESCE(${body.observations ?? null}, "observations"),
        "status"        = COALESCE(${body.status       ?? null}, "status"),
        "updatedAt"     = ${now}
      WHERE "id" = ${params.entryId} AND "memberId" = ${params.id}
    `
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "HourBankEntry" WHERE "id" = ${params.entryId}`
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error('[banco-horas PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar lançamento' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string; entryId: string } }) {
  try {
    const now = new Date()
    // Soft delete (estorno)
    await prisma.$executeRaw`
      UPDATE "HourBankEntry" SET "status" = 'ESTORNADO', "updatedAt" = ${now}
      WHERE "id" = ${params.entryId} AND "memberId" = ${params.id}
    `
    await prisma.$executeRaw`
      INSERT INTO "TeamHistory" ("id","memberId","type","title","description","createdAt")
      VALUES (${randomUUID()}, ${params.id}, 'BANCO_HORAS', 'Lançamento estornado',
        ${'Entrada ID: ' + params.entryId}, ${now})
    `
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao estornar lançamento' }, { status: 500 })
  }
}
