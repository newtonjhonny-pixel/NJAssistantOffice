import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureTimesheetSchema, n0, min2hhmm } from '../../members/[id]/timesheet/_utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gestao-equipe/timesheet/overview?competence=YYYY-MM
 *
 * Retorna lista de todos os colaboradores ativos com seus totais e status
 * para a competência solicitada. Usado pela tela de Fechamento Geral.
 */
export async function GET(req: Request) {
  try {
    await ensureTimesheetSchema()
    const { searchParams } = new URL(req.url)
    const competence = searchParams.get('competence')
    if (!competence || !/^\d{4}-\d{2}$/.test(competence))
      return NextResponse.json({ error: 'Competência inválida (YYYY-MM).' }, { status: 400 })

    // Todos os membros ativos
    const members = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id", "name", "role", "sector", "status" FROM "TeamMember"
       WHERE "status" = 'ATIVO' ORDER BY "name" ASC`
    )

    // Competências mensais
    const comps = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MonthlyTimeCompetence" WHERE "competence" = ?`, competence
    )
    const compMap = new Map(comps.map((c: any) => [c.memberId, c]))

    // Registros diários agrupados por membro
    const allDays = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "memberId",
         SUM("plannedMinutes")  AS planned,
         SUM("workedMinutes")   AS worked,
         SUM(CASE WHEN "classification"='BANCO' AND "balanceMinutes">0 THEN "balanceMinutes" ELSE 0 END) AS bankCredit,
         SUM(CASE WHEN "classification"='BANCO' AND "balanceMinutes"<0 THEN ABS("balanceMinutes") ELSE 0 END) AS bankDebit,
         SUM(CASE WHEN "classification"='HORA_EXTRA' THEN "balanceMinutes" ELSE 0 END) AS overtime,
         COUNT(CASE WHEN "status" IN ('NAO_PREENCHIDO','PENDENTE') THEN 1 END) AS pending,
         COUNT(CASE WHEN "classification"='PENDENTE' THEN 1 END) AS pendingClass,
         COUNT(*) AS totalDays
       FROM "DailyTimeRecord"
       WHERE "competence" = ?
       GROUP BY "memberId"`,
      competence
    )
    const daysMap = new Map(allDays.map((d: any) => [d.memberId, d]))

    // Batidas incompletas por membro (entry sem exit ou vice-versa)
    const incompletePunches = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "memberId", COUNT(*) AS cnt
       FROM "DailyTimeRecord"
       WHERE "competence" = ?
         AND "dayType" NOT IN ('DOMINGO','FERIADO','FOLGA')
         AND (
           ("entry1" IS NOT NULL AND "exit1" IS NULL) OR ("entry1" IS NULL AND "exit1" IS NOT NULL) OR
           ("entry2" IS NOT NULL AND "exit2" IS NULL) OR ("entry2" IS NULL AND "exit2" IS NOT NULL)
         )
       GROUP BY "memberId"`,
      competence
    )
    const incMap = new Map(incompletePunches.map((r: any) => [r.memberId, Number(r.cnt)]))

    const result = members.map((m: any) => {
      const comp  = compMap.get(m.id)
      const days  = daysMap.get(m.id)
      const inc   = incMap.get(m.id) ?? 0
      const status = comp?.status ?? 'ABERTA'

      const planned    = n0(days?.planned)
      const worked     = n0(days?.worked)
      const bankCredit = n0(days?.bankCredit)
      const bankDebit  = n0(days?.bankDebit)
      const overtime   = n0(days?.overtime)
      const pending    = n0(days?.pending)
      const pendingClass = n0(days?.pendingClass)

      // Apto = tem dias gerados, sem batidas incompletas, sem classificação pendente
      const hasIssues = !days || Number(days.totalDays) === 0 || inc > 0 || pendingClass > 0
      const ready = !hasIssues && status !== 'FECHADA'

      return {
        memberId:   m.id,
        memberName: m.name,
        role:       m.role,
        sector:     m.sector,
        status,
        ready,
        hasIssues,
        plannedMinutes:    planned,
        workedMinutes:     worked,
        bankCreditMinutes: bankCredit,
        bankDebitMinutes:  bankDebit,
        overtimeMinutes:   overtime,
        pendingCount:      pending,
        pendingClassCount: pendingClass,
        incompletePunches: inc,
        totalDays:         Number(days?.totalDays ?? 0),
        // formatted
        plannedHHMM:    min2hhmm(planned),
        workedHHMM:     min2hhmm(worked),
        bankCreditHHMM: min2hhmm(bankCredit),
        bankDebitHHMM:  min2hhmm(bankDebit),
        overtimeHHMM:   min2hhmm(overtime),
      }
    })

    return NextResponse.json({ competence, members: result })
  } catch (e) {
    console.error('[timesheet overview GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar overview' }, { status: 500 })
  }
}
