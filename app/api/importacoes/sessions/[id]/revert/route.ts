import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema } from '../../../_utils'

export const dynamic = 'force-dynamic'

// POST /api/importacoes/sessions/[id]/revert
// Reverte todos os registros importados nesta sessão.
// source='IMPORTACAO' é usado como filtro de segurança.
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()

    const sessions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "status","module" FROM "ImportSession" WHERE "id" = ?`, params.id
    )
    if (!sessions.length) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    const session = sessions[0]
    if (session.status !== 'CONCLUIDO')
      return NextResponse.json({ error: 'Só é possível reverter sessões concluídas.' }, { status: 409 })

    const records = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id","importedEntityId","importedEntity","memberId","companyId"
       FROM "ImportRecord" WHERE "sessionId" = ? AND "status" = 'IMPORTADO'`,
      params.id
    )

    const now = new Date().toISOString()
    let revertedCount = 0

    for (const rec of records) {
      try {
        await revertEntity(session.module, rec.importedEntity, rec.importedEntityId)
        await prisma.$executeRawUnsafe(
          `UPDATE "ImportRecord" SET "status"='REVERTIDO', "resolvedAt"=? WHERE "id"=?`,
          now, rec.id
        )
        revertedCount++
      } catch { /* best-effort — registro pode ter sido editado manualmente */ }
    }

    // Marca a sessão como revertida
    await prisma.$executeRawUnsafe(
      `UPDATE "ImportSession" SET "status"='CANCELADO', "importedRows"=0, "updatedAt"=? WHERE "id"=?`,
      now, params.id
    )

    return NextResponse.json({ ok: true, revertedCount, total: records.length })
  } catch (e) {
    console.error('[importacoes revert POST]', e)
    return NextResponse.json({ error: 'Erro ao reverter importação' }, { status: 500 })
  }
}

async function revertEntity(module: string, entityType: string | null, entityId: string | null) {
  if (!entityId || !entityType) return

  switch (entityType) {
    case 'DailyTimeRecord':
      // Reseta o registro para NAO_PREENCHIDO em vez de deletar
      await prisma.$executeRawUnsafe(`
        UPDATE "DailyTimeRecord" SET
          "entryMode"='MARCACAO',"entry1"=NULL,"exit1"=NULL,"entry2"=NULL,"exit2"=NULL,
          "entry3"=NULL,"exit3"=NULL,"entry4"=NULL,"exit4"=NULL,
          "totalMinutes"=NULL,"workedMinutes"=0,"balanceMinutes"=0,
          "classification"='SEM_EFEITO',"status"='NAO_PREENCHIDO',
          "source"='MANUAL',"updatedAt"=?
        WHERE "id"=? AND "source"='IMPORTACAO'
      `, new Date().toISOString(), entityId)
      break

    case 'TeamVacation':
      await prisma.$executeRawUnsafe(
        `DELETE FROM "TeamVacation" WHERE "id"=?`, entityId
      )
      break

    case 'HourBankEntry':
      await prisma.$executeRawUnsafe(
        `UPDATE "HourBankEntry" SET "status"='ESTORNADO', "updatedAt"=? WHERE "id"=? AND "observations" LIKE '%Importação%'`,
        new Date().toISOString(), entityId
      )
      break

    case 'TeamTraining':
      await prisma.$executeRawUnsafe(
        `DELETE FROM "TeamTraining" WHERE "id"=?`, entityId
      )
      break

    case 'CompanyOperationalSnapshot':
      // Não deletamos snapshots operacionais — apenas marcamos
      break

    // TeamMember e Company não são deletados automaticamente por segurança
    default:
      break
  }
}
