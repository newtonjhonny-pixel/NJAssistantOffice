import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema } from '../../../_utils'

export const dynamic = 'force-dynamic'

// GET /api/importacoes/sessions/[id]/conflicts
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()
    const rawConflicts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT c.*, r."sourceValuesJson", r."mappedValuesJson", r."rowIndex"
       FROM "ImportConflict" c
       JOIN "ImportRecord" r ON r."id" = c."recordId"
       WHERE c."sessionId" = ?
       ORDER BY c."createdAt" ASC`,
      params.id
    )
    const conflicts = rawConflicts.map(c => ({ ...c, rowIndex: Number(c.rowIndex ?? 0) }))
    return NextResponse.json({ conflicts })
  } catch (e) {
    console.error('[importacoes conflicts GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar conflitos' }, { status: 500 })
  }
}
