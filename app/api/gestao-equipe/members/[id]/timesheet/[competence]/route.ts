import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureTimesheetSchema, n0, min2hhmm } from '../_utils'

export const dynamic = 'force-dynamic'

// GET /api/gestao-equipe/members/[id]/timesheet/[competence]
// Retorna: { competence: MonthlyTimeCompetence, days: DailyTimeRecord[], summary }
export async function GET(
  _: Request,
  { params }: { params: { id: string; competence: string } }
) {
  try {
    await ensureTimesheetSchema()

    if (!/^\d{4}-\d{2}$/.test(params.competence))
      return NextResponse.json({ error: 'Competência deve ser YYYY-MM.' }, { status: 400 })

    // Busca ou cria a competência mensal
    let compRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MonthlyTimeCompetence" WHERE "memberId" = ? AND "competence" = ?`,
      params.id, params.competence
    )

    let comp = compRows[0] ?? null

    // Busca os registros diários
    const days = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DailyTimeRecord" WHERE "memberId" = ? AND "competence" = ? ORDER BY "date" ASC`,
      params.id, params.competence
    )

    // Summary calculado on-the-fly
    const summary = buildSummary(days)

    return NextResponse.json({
      competence: comp,
      days: days.map(normalizeDay),
      summary,
    })
  } catch (e) {
    console.error('[timesheet GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar ponto' }, { status: 500 })
  }
}

function normalizeDay(d: any) {
  return {
    ...d,
    hasAttachment: d.hasAttachment === 1 || d.hasAttachment === true,
  }
}

function buildSummary(days: any[]) {
  let plannedMinutes = 0, workedMinutes = 0, balanceMinutes = 0
  let bankCreditMinutes = 0, bankDebitMinutes = 0, overtimeMinutes = 0
  let abonoMinutes = 0, compensationMinutes = 0, pendingCount = 0

  for (const d of days) {
    plannedMinutes += n0(d.plannedMinutes)
    workedMinutes += n0(d.workedMinutes)
    // balanceMinutes é calculado após o loop como Banco+ − Banco−

    const bal = n0(d.balanceMinutes)
    switch (d.classification) {
      case 'BANCO':
        // Tolerância legal: variações de até 10 min (±) não vão para banco
        if (Math.abs(bal) >= 11) {
          if (bal > 0) bankCreditMinutes += bal; else bankDebitMinutes += Math.abs(bal)
        }
        break
      case 'HORA_EXTRA':  overtimeMinutes += bal; break
      case 'ABONADO':     abonoMinutes += Math.abs(bal); break
      case 'COMPENSACAO': compensationMinutes += Math.abs(bal); break
    }
    // Pendente = dia útil com jornada prevista, sem classificação finalizada
    // E com saldo fora da tolerância legal (>10 min para mais ou para menos)
    const isRestDay = ['DOMINGO', 'FERIADO', 'FOLGA', 'SABADO'].includes(d.dayType)
    const classifiedFinal = d.classification && d.classification !== 'PENDENTE'
    const withinTolerance = Math.abs(bal) <= 10
    if (!isRestDay && n0(d.plannedMinutes) > 0 && !classifiedFinal && !withinTolerance) pendingCount++
  }

  // Saldo = Banco+ − Banco− (somente horas fora da tolerância de 10 min)
  balanceMinutes = bankCreditMinutes - bankDebitMinutes

  return {
    plannedMinutes,    plannedHHMM: min2hhmm(plannedMinutes),
    workedMinutes,     workedHHMM:  min2hhmm(workedMinutes),
    balanceMinutes,    balanceHHMM: min2hhmm(balanceMinutes),
    bankCreditMinutes, bankCreditHHMM: min2hhmm(bankCreditMinutes),
    bankDebitMinutes,  bankDebitHHMM:  min2hhmm(bankDebitMinutes),
    overtimeMinutes,   overtimeHHMM:   min2hhmm(overtimeMinutes),
    abonoMinutes,      abonoHHMM:      min2hhmm(abonoMinutes),
    compensationMinutes, compensationHHMM: min2hhmm(compensationMinutes),
    pendingCount,
    totalDays: days.length,
    workedDays: days.filter(d => n0(d.workedMinutes) > 0).length,
  }
}
