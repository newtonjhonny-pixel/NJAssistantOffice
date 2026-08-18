import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureTimesheetSchema } from '../../_utils'

export const dynamic = 'force-dynamic'

// POST /api/gestao-equipe/members/[id]/timesheet/[competence]/reopen
export async function POST(
  _: Request,
  { params }: { params: { id: string; competence: string } }
) {
  try {
    await ensureTimesheetSchema()

    const compRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MonthlyTimeCompetence" WHERE "memberId" = ? AND "competence" = ?`,
      params.id, params.competence
    )
    if (!compRows.length)
      return NextResponse.json({ error: 'Competência não encontrada.' }, { status: 404 })
    if (compRows[0].status !== 'FECHADA')
      return NextResponse.json({ error: 'Competência não está fechada.' }, { status: 400 })

    // nowIso  -> colunas TEXT      ("MonthlyTimeCompetence", "DailyTimeRecord")
    // nowDate -> colunas TIMESTAMP ("HourBankEntry", gerenciada pelo Prisma)
    const nowIso  = new Date().toISOString()
    const nowDate = new Date()

    // Reabre a competência
    await prisma.$executeRawUnsafe(`
      UPDATE "MonthlyTimeCompetence" SET "status" = 'REABERTA', "updatedAt" = ?
      WHERE "id" = ?
    `, nowIso, compRows[0].id)

    // Reabre os dias que estavam FECHADO → PREENCHIDO (mantém dados)
    await prisma.$executeRawUnsafe(`
      UPDATE "DailyTimeRecord" SET
        "status" = CASE
          WHEN "workedMinutes" > 0 THEN 'PREENCHIDO'
          WHEN "justification" IS NOT NULL THEN 'JUSTIFICADO'
          ELSE 'NAO_PREENCHIDO'
        END,
        "updatedAt" = ?
      WHERE "memberId" = ? AND "competence" = ? AND "status" = 'FECHADO'
    `, nowIso, params.id, params.competence)

    // Estorna o lançamento no Banco de Horas se existir
    if (compRows[0].bankHoursEntryId) {
      await prisma.$executeRawUnsafe(`
        UPDATE "HourBankEntry" SET "status" = 'ESTORNADO', "updatedAt" = ?
        WHERE "id" = ?
      `, nowDate, compRows[0].bankHoursEntryId)
    }

    const updated = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MonthlyTimeCompetence" WHERE "id" = ?`, compRows[0].id
    )
    return NextResponse.json({ competence: updated[0] })
  } catch (e) {
    console.error('[timesheet reopen POST]', e)
    return NextResponse.json({ error: 'Erro ao reabrir competência' }, { status: 500 })
  }
}
