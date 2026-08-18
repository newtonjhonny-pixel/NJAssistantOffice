import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema } from '../../../../_utils'

export const dynamic = 'force-dynamic'

// PATCH /api/importacoes/sessions/[id]/conflicts/[cid]
// Body: { resolution: 'SOBRESCREVER' | 'MANTER' | 'IGNORAR', resolvedBy?: string }
export async function PATCH(req: NextRequest, { params }: { params: { id: string; cid: string } }) {
  try {
    await ensureImportSchema()
    const { resolution, resolvedBy } = await req.json()

    if (!['SOBRESCREVER', 'MANTER', 'IGNORAR'].includes(resolution))
      return NextResponse.json({ error: 'resolution deve ser: SOBRESCREVER, MANTER ou IGNORAR' }, { status: 400 })

    const conflict = await prisma.$queryRawUnsafe<any[]>(
      `SELECT c.*, r."mappedValuesJson", r."memberId"
       FROM "ImportConflict" c
       JOIN "ImportRecord" r ON r."id" = c."recordId"
       WHERE c."id" = ? AND c."sessionId" = ?`,
      params.cid, params.id
    )
    if (!conflict.length) return NextResponse.json({ error: 'Conflito não encontrado.' }, { status: 404 })
    if (conflict[0].resolution && conflict[0].resolution !== 'PENDENTE')
      return NextResponse.json({ error: 'Conflito já resolvido.' }, { status: 409 })

    const now = new Date().toISOString()

    await prisma.$executeRawUnsafe(
      `UPDATE "ImportConflict" SET "resolution"=?, "resolvedBy"=?, "resolvedAt"=? WHERE "id"=?`,
      resolution, resolvedBy ?? 'usuário', now, params.cid
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "ImportRecord" SET "resolution"=?, "resolvedAt"=?,
        "status"= CASE WHEN ? = 'IGNORAR' THEN 'IGNORADO' ELSE 'IMPORTADO' END
       WHERE "id"=?`,
      resolution, now, resolution, conflict[0].recordId
    )

    // Se SOBRESCREVER, atualiza o registro de ponto (apenas DailyTimeRecord por ora)
    if (resolution === 'SOBRESCREVER' && conflict[0].conflictType === 'FECHADO') {
      const mapped = JSON.parse(conflict[0].mappedValuesJson ?? '{}')
      // Reabre o dia e aplica os dados importados
      await prisma.$executeRawUnsafe(`
        UPDATE "DailyTimeRecord" SET
          "entry1"=?,"exit1"=?,"entry2"=?,"exit2"=?,
          "entry3"=?,"exit3"=?,"entry4"=?,"exit4"=?,
          "entryMode"='IMPORTACAO',"source"='IMPORTACAO',
          "status"='PREENCHIDO',"updatedAt"=?
        WHERE "memberId"=? AND "date"=?
      `,
        mapped.entrada1||null, mapped.saida1||null,
        mapped.entrada2||null, mapped.saida2||null,
        mapped.entrada3||null, mapped.saida3||null,
        mapped.entrada4||null, mapped.saida4||null,
        now, conflict[0].memberId, mapped.data
      )
    }

    return NextResponse.json({ ok: true, resolution })
  } catch (e) {
    console.error('[importacoes conflict PATCH]', e)
    return NextResponse.json({ error: 'Erro ao resolver conflito' }, { status: 500 })
  }
}
