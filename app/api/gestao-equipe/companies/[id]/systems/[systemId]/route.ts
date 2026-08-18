import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

// ─── PATCH /api/gestao-equipe/companies/[id]/systems/[systemId] ──────────────

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; systemId: string } }
) {
  try {
    const body = await req.json()
    const { systemName, systemType, vendor, version, isActive, observations } = body

    const sets: string[] = []
    const vals: any[] = []
    const push = (col: string, val: any) => { sets.push(`"${col}" = ?`); vals.push(val) }

    if (systemName   !== undefined) push('systemName',   systemName.trim())
    if (systemType   !== undefined) push('systemType',   systemType ?? null)
    if (vendor       !== undefined) push('vendor',       vendor?.trim() || null)
    if (version      !== undefined) push('version',      version?.trim() || null)
    if (isActive     !== undefined) push('isActive',     isActive ? 1 : 0)
    if (observations !== undefined) push('observations', observations?.trim() || null)

    if (sets.length === 0)
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })

    push('updatedAt', new Date())
    vals.push(params.systemId)

    await prisma.$executeRawUnsafe(
      `UPDATE "CompanySystem" SET ${sets.join(', ')} WHERE "id" = ?`,
      ...vals
    )

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CompanySystem" WHERE "id" = ?`, params.systemId
    )
    if (!rows.length) return NextResponse.json({ error: 'Sistema não encontrado.' }, { status: 404 })
    return NextResponse.json({ ...rows[0], isActive: Boolean(rows[0].isActive) })
  } catch (e) {
    console.error('[systems/[systemId] PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar sistema' }, { status: 500 })
  }
}

// ─── DELETE /api/gestao-equipe/companies/[id]/systems/[systemId] ─────────────

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; systemId: string } }
) {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "CompanySystem" WHERE "id" = ? AND "companyId" = ?`,
      params.systemId, params.id
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[systems/[systemId] DELETE]', e)
    return NextResponse.json({ error: 'Erro ao deletar sistema' }, { status: 500 })
  }
}
