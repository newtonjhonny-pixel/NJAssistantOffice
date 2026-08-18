/**
 * POST /api/gestao-equipe/importacoes-ponto/[id]/revert
 * Reverte um lote: apaga registros DailyTimeRecord vinculados a cada PontoImportBatch do lote.
 * Se algum registro foi editado manualmente após a importação, avisa antes de apagar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureTimesheetSchema } from '../../../members/[id]/timesheet/_utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureTimesheetSchema()
    const body = await req.json().catch(() => ({}))
    const force = body.force === true

    const lote = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "PontoLote" WHERE "id"=?`, params.id
    )
    if (!lote.length) return NextResponse.json({ error: 'Lote não encontrado.' }, { status: 404 })
    if (lote[0].status === 'REVERTIDO') return NextResponse.json({ error: 'Lote já foi revertido.' }, { status: 400 })

    // Busca todos os batchIds deste lote
    const batches = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "PontoImportBatch" WHERE "loteId"=?`, params.id
    )
    const batchIds = batches.map(b => b.id)
    if (!batchIds.length) return NextResponse.json({ error: 'Nenhum batch vinculado a este lote.' }, { status: 400 })

    // Busca registros importados por este lote
    const placeholders = batchIds.map(() => '?').join(',')
    const records = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id", "memberId", "date", "source", "sourceType", "importBatchId", "updatedAt", "createdAt"
       FROM "DailyTimeRecord"
       WHERE "importBatchId" IN (${placeholders})`,
      ...batchIds
    )

    // Detecta edições manuais (updatedAt > createdAt + 5 segundos e source foi alterado)
    const editados = records.filter(r => {
      const created = new Date(r.createdAt).getTime()
      const updated = new Date(r.updatedAt).getTime()
      return updated - created > 5000 && r.source !== 'IMPORTACAO'
    })

    if (editados.length > 0 && !force) {
      return NextResponse.json({
        error: `Existem ${editados.length} registros deste lote alterados manualmente após a importação.`,
        editados: editados.length,
        requiresForce: true,
      }, { status: 409 })
    }

    // Remove registros importados
    const recordIds = records.map(r => r.id)
    if (recordIds.length > 0) {
      const rPlaceholders = recordIds.map(() => '?').join(',')
      await prisma.$executeRawUnsafe(
        `DELETE FROM "DailyTimeRecord" WHERE "id" IN (${rPlaceholders})`,
        ...recordIds
      )
    }

    // Atualiza status do lote
    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(
      `UPDATE "PontoLote" SET "status"='REVERTIDO', "updatedAt"=? WHERE "id"=?`, now, params.id
    )

    return NextResponse.json({
      ok: true,
      registrosRemovidos: recordIds.length,
      loteId: params.id,
    })
  } catch (e: any) {
    console.error('[importacoes-ponto/[id]/revert POST]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
