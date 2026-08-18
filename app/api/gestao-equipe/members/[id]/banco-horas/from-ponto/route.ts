import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import { ensureTimesheetSchema } from '../../timesheet/_utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gestao-equipe/members/[id]/banco-horas/from-ponto
 * Body: { competence: 'YYYY-MM' }
 *
 * Cria ou atualiza um HourBankEntry com o saldo do mês (workedMinutes - plannedMinutes).
 * Saldo positivo → creditMinutes; saldo negativo → debitMinutes.
 * Não fecha a competência — apenas lança no banco de horas.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureTimesheetSchema()
    const { competence } = await req.json()
    if (!competence || !/^\d{4}-\d{2}$/.test(competence))
      return NextResponse.json({ error: 'Competência inválida (YYYY-MM).' }, { status: 400 })

    const memberId = params.id
    // "HourBankEntry" e gerenciada pelo Prisma: entryDate/createdAt/updatedAt sao
    // TIMESTAMP no PostgreSQL, que nao aceita cast implicito de text -> timestamp.
    const now = new Date()

    // Consolida saldo do mês a partir dos registros diários
    const days = await prisma.$queryRawUnsafe<any[]>(
      `SELECT plannedMinutes, workedMinutes FROM "DailyTimeRecord"
       WHERE "memberId" = ? AND "competence" = ?`,
      memberId, competence
    )

    if (days.length === 0)
      return NextResponse.json({ error: 'Nenhum dia encontrado para esta competência.' }, { status: 404 })

    const totalPlanned = days.reduce((s, d) => s + (Number(d.plannedMinutes) || 0), 0)
    const totalWorked  = days.reduce((s, d) => s + (Number(d.workedMinutes)  || 0), 0)
    const saldo        = totalWorked - totalPlanned  // positivo = crédito, negativo = débito

    const creditMinutes = saldo > 0 ? saldo : 0
    const debitMinutes  = saldo < 0 ? Math.abs(saldo) : 0

    // Verifica se já existe lançamento PONTO para esta competência
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "HourBankEntry"
       WHERE "memberId" = ? AND "competence" = ? AND "type" = 'LANCAMENTO' AND "status" = 'ATIVO'
       LIMIT 1`,
      memberId, competence
    )

    let entryId: string
    if (existing.length > 0) {
      entryId = existing[0].id
      await prisma.$executeRawUnsafe(`
        UPDATE "HourBankEntry" SET
          "creditMinutes" = ?, "debitMinutes" = ?,
          "observations" = ?, "updatedAt" = ?
        WHERE "id" = ?
      `, creditMinutes, debitMinutes,
         `Saldo do Ponto — ${competence} (atualizado)`,
         now, entryId
      )
    } else {
      entryId = randomUUID()
      await prisma.$executeRawUnsafe(`
        INSERT INTO "HourBankEntry"
          ("id","memberId","entryDate","competence","type",
           "creditMinutes","debitMinutes","responsible","observations","status","createdAt","updatedAt")
        VALUES (?,?,?,?,'LANCAMENTO',?,?,?,?,'ATIVO',?,?)
      `, entryId, memberId, now, competence,
         creditMinutes, debitMinutes,
         'sistema',
         `Saldo do Ponto — ${competence}`,
         now, now
      )
    }

    const sign = saldo >= 0 ? '+' : '-'
    const h = Math.floor(Math.abs(saldo) / 60)
    const m = Math.abs(saldo) % 60
    const saldoFmt = `${sign}${h}h${m > 0 ? String(m).padStart(2,'0') : ''}`

    return NextResponse.json({
      entryId, competence, saldo, saldoFmt,
      creditMinutes, debitMinutes,
      totalPlanned, totalWorked,
    })
  } catch (e) {
    console.error('[banco-horas/from-ponto POST]', e)
    return NextResponse.json({ error: 'Erro ao lançar no banco de horas.' }, { status: 500 })
  }
}
