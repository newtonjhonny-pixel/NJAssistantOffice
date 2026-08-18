import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema } from '../../_utils'

export const dynamic = 'force-dynamic'

// GET /api/importacoes/sessions/[id]
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()
    const session = await prisma.$queryRawUnsafe<any[]>(
      `SELECT s.*, p."name" AS profileName
       FROM "ImportSession" s
       LEFT JOIN "ImportSourceProfile" p ON p."id" = s."sourceProfileId"
       WHERE s."id" = ?`, params.id
    )
    if (!session.length) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

    const records = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportRecord" WHERE "sessionId" = ? ORDER BY "rowIndex" ASC LIMIT 500`,
      params.id
    )
    const conflicts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportConflict" WHERE "sessionId" = ? ORDER BY "createdAt" ASC`,
      params.id
    )

    return NextResponse.json({ session: session[0], records, conflicts })
  } catch (e) {
    console.error('[importacoes session GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar sessão' }, { status: 500 })
  }
}

// PATCH /api/importacoes/sessions/[id] — reseta sessão para PENDENTE (admin)
export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()
    await prisma.$executeRawUnsafe(
      `UPDATE "ImportSession" SET "status" = 'PENDENTE', "errorMessage" = NULL, "updatedAt" = ? WHERE "id" = ? AND "status" NOT IN ('CONCLUIDO','IMPORTANDO')`,
      new Date().toISOString(), params.id
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[importacoes session PATCH]', e)
    return NextResponse.json({ error: 'Erro ao resetar sessão' }, { status: 500 })
  }
}

// DELETE /api/importacoes/sessions/[id] — cancela sessão pendente
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()
    const session = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "status" FROM "ImportSession" WHERE "id" = ?`, params.id
    )
    if (!session.length) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    if (session[0].status === 'CONCLUIDO')
      return NextResponse.json({ error: 'Sessão concluída não pode ser cancelada. Use reverter.' }, { status: 409 })
    if (session[0].status === 'IMPORTANDO')
      return NextResponse.json({ error: 'Importação em andamento. Aguarde.' }, { status: 409 })

    await prisma.$executeRawUnsafe(
      `UPDATE "ImportSession" SET "status" = 'CANCELADO', "updatedAt" = ? WHERE "id" = ?`,
      new Date().toISOString(), params.id
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[importacoes session DELETE]', e)
    return NextResponse.json({ error: 'Erro ao cancelar sessão' }, { status: 500 })
  }
}
