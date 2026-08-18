/**
 * GET  /api/gestao-equipe/importacoes-ponto/[id]   — detalhes do lote
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureTimesheetSchema } from '../../members/[id]/timesheet/_utils'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureTimesheetSchema()
    const lote = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "PontoLote" WHERE "id"=?`, params.id
    )
    if (!lote.length) return NextResponse.json({ error: 'Lote não encontrado.' }, { status: 404 })

    const batches = await prisma.$queryRawUnsafe<any[]>(`
      SELECT b.*, m.name AS memberName
      FROM "PontoImportBatch" b
      LEFT JOIN "TeamMember" m ON m.id = b."memberId"
      WHERE b."loteId" = ?
      ORDER BY b."createdAt"
    `, params.id)

    return NextResponse.json({
      lote: {
        ...lote[0],
        totalFiles:          Number(lote[0].totalFiles ?? 0),
        totalCollaboradores: Number(lote[0].totalCollaboradores ?? 0),
        totalDias:           Number(lote[0].totalDias ?? 0),
        totalBatidas:        Number(lote[0].totalBatidas ?? 0),
        totalConflitos:      Number(lote[0].totalConflitos ?? 0),
        totalRejeitados:     Number(lote[0].totalRejeitados ?? 0),
      },
      batches: batches.map(b => ({
        ...b,
        daysProcessed:   Number(b.daysProcessed ?? 0),
        punchesImported: Number(b.punchesImported ?? 0),
        bancoHCount:     Number(b.bancoHCount ?? 0),
      })),
    })
  } catch (e: any) {
    console.error('[importacoes-ponto/[id] GET]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
