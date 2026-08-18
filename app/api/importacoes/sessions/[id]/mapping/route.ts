import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema } from '../../../_utils'

export const dynamic = 'force-dynamic'

// PATCH /api/importacoes/sessions/[id]/mapping
// Body: { mappings: [{source, system, confidence, notes}] }
// Salva o mapeamento revisado pelo usuário.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()
    const { mappings } = await req.json()
    if (!Array.isArray(mappings))
      return NextResponse.json({ error: 'mappings deve ser um array.' }, { status: 400 })

    const session = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "status" FROM "ImportSession" WHERE "id" = ?`, params.id
    )
    if (!session.length) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    if (['CONCLUIDO', 'IMPORTANDO', 'CANCELADO'].includes(session[0].status))
      return NextResponse.json({ error: `Não é possível alterar mapeamento (status: ${session[0].status})` }, { status: 409 })

    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(
      `UPDATE "ImportSession" SET "mappingJson" = ?, "status" = 'AGUARDANDO_REVISAO', "updatedAt" = ? WHERE "id" = ?`,
      JSON.stringify(mappings), now, params.id
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[importacoes mapping PATCH]', e)
    return NextResponse.json({ error: 'Erro ao salvar mapeamento' }, { status: 500 })
  }
}
