import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

// PATCH /api/gestao-equipe/work-calendar/[entryId]
export async function PATCH(req: Request, { params }: { params: { entryId: string } }) {
  try {
    const body = await req.json()
    const now = new Date().toISOString()
    const fields: string[] = []
    const vals: any[] = []

    const map: Record<string, any> = {
      description: body.description,
      type: body.type,
      uf: body.uf,
      municipio: body.municipio,
      ibgeCode: body.ibgeCode,
      country: body.country,
      origin: body.origin,
      companyId: body.companyId,
      unitId: body.unitId,
      isWorked: body.isWorked !== undefined ? (body.isWorked ? 1 : 0) : undefined,
      observations: body.observations,
      active: body.active !== undefined ? (body.active ? 1 : 0) : undefined,
    }

    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) { fields.push(`"${k}" = ?`); vals.push(v) }
    }

    if (!fields.length)
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

    fields.push(`"updatedAt" = ?`); vals.push(now); vals.push(params.entryId)

    await prisma.$executeRawUnsafe(
      `UPDATE "WorkCalendarEntry" SET ${fields.join(', ')} WHERE "id" = ?`,
      ...vals
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "WorkCalendarEntry" WHERE "id" = ?`, params.entryId
    )
    return NextResponse.json(rows[0] ?? { error: 'Não encontrado.' })
  } catch (e) {
    console.error('[work-calendar PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar entrada' }, { status: 500 })
  }
}

// DELETE /api/gestao-equipe/work-calendar/[entryId]
export async function DELETE(_: Request, { params }: { params: { entryId: string } }) {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "WorkCalendarEntry" WHERE "id" = ?`, params.entryId
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[work-calendar DELETE]', e)
    return NextResponse.json({ error: 'Erro ao deletar entrada' }, { status: 500 })
  }
}
