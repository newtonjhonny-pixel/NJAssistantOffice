import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function minutesToHHMM(min: number): string {
  const sign = min < 0 ? '-' : '+'
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`
}

function competenceEndDate(comp: string): Date {
  const [y, m] = comp.split('-').map(Number)
  return new Date(y, m, 0) // last day of month
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function daysLeft(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / 86400000)
}

function calcSituation(days: number, alertDays: number): string {
  if (days < 0)         return 'VENCIDO'
  if (days <= alertDays) return 'ATENCAO'
  return 'REGULAR'
}

// â”€â”€â”€ GET: summary + competences + entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const memberId = params.id

    // Config
    const cfgRows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "HourBankConfig" WHERE "memberId" = ${memberId} LIMIT 1
    `
    const cfg = cfgRows[0] ?? {
      compensationDays: 180, alertDaysBeforeExp: 30, maxCreditHours: null, negativeBalance: false,
    }

    // Entries (ATIVO only)
    const entries = await prisma.$queryRaw<any[]>`
      SELECT * FROM "HourBankEntry"
      WHERE "memberId" = ${memberId} AND "status" = 'ATIVO'
      ORDER BY "entryDate" ASC, "createdAt" ASC
    `

    // Group by competence
    const compMap = new Map<string, { credit: number; debit: number; adjust: number; expired: number }>()
    for (const e of entries) {
      if (!compMap.has(e.competence)) compMap.set(e.competence, { credit: 0, debit: 0, adjust: 0, expired: 0 })
      const c = compMap.get(e.competence)!
      if (e.type === 'LANCAMENTO' || e.type === 'IMPORTACAO') c.credit += e.creditMinutes
      else if (e.type === 'COMPENSACAO') c.debit += e.debitMinutes
      else if (e.type === 'AJUSTE') { c.credit += e.creditMinutes; c.debit += e.debitMinutes; c.adjust += e.creditMinutes - e.debitMinutes }
      else if (e.type === 'VENCIMENTO') c.expired += e.debitMinutes
    }

    // Build competence rows
    const competences = Array.from(compMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([comp, v]) => {
        const endDate = competenceEndDate(comp)
        const expiresAt = addDays(endDate, cfg.compensationDays)
        const dl = daysLeft(expiresAt)
        const balance = v.credit - v.debit - v.expired
        return {
          competence: comp,
          creditMinutes: v.credit,
          debitMinutes: v.debit,
          adjustMinutes: v.adjust,
          expiredMinutes: v.expired,
          balanceMinutes: balance,
          balanceFmt: minutesToHHMM(balance),
          compensateFrom: endDate.toISOString().slice(0, 10),
          compensateTo: expiresAt.toISOString().slice(0, 10),
          daysLeft: dl,
          situation: balance <= 0 ? 'ZERADO' : calcSituation(dl, cfg.alertDaysBeforeExp),
        }
      })

    // Summary
    const totalCredit = competences.reduce((s, c) => s + c.creditMinutes, 0)
    const totalDebit  = competences.reduce((s, c) => s + c.debitMinutes, 0)
    const totalExpired = competences.reduce((s, c) => s + c.expiredMinutes, 0)
    const balance = totalCredit - totalDebit - totalExpired

    // Next expiry: earliest competence with positive balance
    const nextExpiry = competences
      .filter(c => c.balanceMinutes > 0 && c.daysLeft > 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)[0] ?? null

    // Overall situation
    const hasExpired = competences.some(c => c.situation === 'VENCIDO' && c.balanceMinutes < 0)
    const hasAtencao = competences.some(c => c.situation === 'ATENCAO')
    const situation = balance < 0 ? 'NEGATIVO' : hasExpired ? 'VENCIDO' : hasAtencao ? 'ATENCAO' : 'REGULAR'

    // Monthly chart (last 12 months)
    const now = new Date()
    const chartData = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const v = compMap.get(comp) ?? { credit: 0, debit: 0, adjust: 0, expired: 0 }
      const bal = v.credit - v.debit - v.expired
      return { month: comp, credit: v.credit, debit: v.debit + v.expired, balance: bal }
    })

    return NextResponse.json({
      summary: {
        totalCreditMinutes: totalCredit,
        totalDebitMinutes: totalDebit,
        totalExpiredMinutes: totalExpired,
        balanceMinutes: balance,
        balanceFmt: minutesToHHMM(balance),
        nextExpiry,
        situation,
      },
      competences,
      entries: entries.map(e => ({ ...e, creditFmt: minutesToHHMM(e.creditMinutes), debitFmt: minutesToHHMM(e.debitMinutes) })),
      config: { ...cfg, negativeBalance: Boolean(cfg.negativeBalance) },
      chartData,
    })
  } catch (e) {
    console.error('[banco-horas GET]', e)
    return NextResponse.json({ error: 'Erro ao carregar banco de horas' }, { status: 500 })
  }
}

// â”€â”€â”€ POST: new entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const memberId = params.id
    const body = await req.json()
    const { entryDate, competence, type, creditMinutes = 0, debitMinutes = 0, responsible, observations } = body

    if (!entryDate || !competence || !type) {
      return NextResponse.json({ error: 'entryDate, competence e type sÃ£o obrigatÃ³rios' }, { status: 400 })
    }

    const id = randomUUID()
    const now = new Date().toISOString()
    // Ensure entryDate is stored as full ISO datetime (SQLite DATETIME requires it for Prisma deserialization)
    const entryDateISO = entryDate.includes('T') ? entryDate : entryDate + 'T00:00:00.000Z'

    await prisma.$executeRaw`
      INSERT INTO "HourBankEntry"
        ("id","memberId","entryDate","competence","type","creditMinutes","debitMinutes","responsible","observations","status","createdAt","updatedAt")
      VALUES
        (${id}, ${memberId}, ${entryDateISO}, ${competence}, ${type},
         ${creditMinutes}, ${debitMinutes}, ${responsible ?? null}, ${observations ?? null},
         'ATIVO', ${now}, ${now})
    `

    // Audit
    await prisma.$executeRaw`
      INSERT INTO "TeamHistory" ("id","memberId","type","title","description","createdAt")
      VALUES (${randomUUID()}, ${memberId}, 'BANCO_HORAS',
        ${'LanÃ§amento: ' + type},
        ${`CompetÃªncia ${competence} | CrÃ©dito: ${creditMinutes}min | DÃ©bito: ${debitMinutes}min${responsible ? ' | Resp: ' + responsible : ''}`},
        ${now})
    `

    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "HourBankEntry" WHERE "id" = ${id}`
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error('[banco-horas POST]', e)
    return NextResponse.json({ error: 'Erro ao registrar lanÃ§amento' }, { status: 500 })
  }
}
