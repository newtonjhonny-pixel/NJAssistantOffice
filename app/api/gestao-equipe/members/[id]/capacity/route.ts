import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'



// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Link {
  id: string; companyId: string; companyName: string; segment: string | null
  memberRole: string | null
  headcountActive: number | null; headcountApprentice: number | null
  headcountIntern: number | null; headcountOnLeave: number | null
  avgAdmissions: number | null; avgTerminations: number | null; avgVacations: number | null
  folhasProcessadas: number | null; unions: number | null; establishments: number | null
  automationLevel: string | null; complexity: string | null
}

interface Process {
  id: string; linkId: string; processType: string
  volume: number | null; complexity: string | null; automationLevel: string | null
  avgTimeMinutes: number | null; isCritical: number | boolean
}

interface Config {
  weightEmployee: number; weightCompany: number; weightProcess: number
  weightVolume: number; weightComplexity: number; weightManual: number; weightCritical: number
  capacityRef: number
  bandGreen: number; bandBlue: number; bandYellow: number; bandOrange: number
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const COMPLEXITY_MULT: Record<string, number> = {
  BAIXA: 0, MEDIA: 1, ALTA: 2, MUITO_ALTA: 3,
}

function complexityScore(level: string | null, weight: number): number {
  return ((COMPLEXITY_MULT[level ?? ''] ?? 0) / 3) * weight
}

function isManual(level: string | null): boolean {
  return level === 'MANUAL'
}

function band(pct: number, cfg: Config): string {
  if (pct <= cfg.bandGreen)  return 'green'
  if (pct <= cfg.bandBlue)   return 'blue'
  if (pct <= cfg.bandYellow) return 'yellow'
  if (pct <= cfg.bandOrange) return 'orange'
  return 'critical'
}

const BAND_LABELS: Record<string, string> = {
  green:    'DisponÃ­vel',
  blue:     'Equilibrado',
  yellow:   'AtenÃ§Ã£o',
  orange:   'Sobrecarga',
  critical: 'Sobrecarga CrÃ­tica',
}

// â”€â”€â”€ Route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    // Load config
    const cfgRows = await prisma.$queryRaw<Config[]>`
      SELECT * FROM "CapacityConfig" WHERE "active" = 1 LIMIT 1
    `
    const cfg: Config = cfgRows[0] ?? {
      weightEmployee: 1, weightCompany: 5, weightProcess: 2, weightVolume: 0.5,
      weightComplexity: 3, weightManual: 2, weightCritical: 3, capacityRef: 100,
      bandGreen: 70, bandBlue: 85, bandYellow: 100, bandOrange: 120,
    }

    // Load company links
    const links = await prisma.$queryRaw<Link[]>`
      SELECT l.*, c."name" as "companyName", c."segment"
      FROM "MemberCompanyLink" l
      JOIN "ClientCompany" c ON c."id" = l."companyId"
      WHERE l."memberId" = ${params.id}
    `

    // Load all processes for this member's links (via JOIN)
    const processes = await prisma.$queryRaw<Process[]>`
      SELECT p.*
      FROM "MemberCompanyProcess" p
      JOIN "MemberCompanyLink" l ON l."id" = p."linkId"
      WHERE l."memberId" = ${params.id}
    `

    const processByLink = processes.reduce<Record<string, Process[]>>((acc, p) => {
      if (!acc[p.linkId]) acc[p.linkId] = []
      acc[p.linkId].push(p)
      return acc
    }, {})

    // â”€â”€â”€ Calculate per company â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let totalScore = 0
    const breakdown = links.map(l => {
      let score = 0

      // Base: empresa
      score += cfg.weightCompany

      // Headcount
      const active = l.headcountActive ?? 0
      const apprentice = l.headcountApprentice ?? 0
      const intern = l.headcountIntern ?? 0
      score += (active + apprentice + intern) * cfg.weightEmployee

      // Volumes mensais aggregados (link level)
      const vol = (l.avgAdmissions ?? 0) + (l.avgTerminations ?? 0) + (l.avgVacations ?? 0)
      score += vol * cfg.weightVolume

      // Complexidade da empresa
      score += complexityScore(l.complexity, cfg.weightComplexity)

      // AutomaÃ§Ã£o manual da empresa
      if (isManual(l.automationLevel)) score += cfg.weightManual

      // Processos detalhados
      const procs = processByLink[l.id] ?? []
      let processScore = 0
      for (const p of procs) {
        let ps = cfg.weightProcess
        ps += (p.volume ?? 0) * cfg.weightVolume
        ps += complexityScore(p.complexity, cfg.weightComplexity)
        if (isManual(p.automationLevel)) ps += cfg.weightManual
        if (p.isCritical) ps += cfg.weightCritical
        processScore += ps
      }
      score += processScore

      totalScore += score

      return {
        companyId: l.companyId,
        companyName: l.companyName,
        segment: l.segment,
        score: Math.round(score * 10) / 10,
        headcount: active + apprentice + intern,
        processCount: procs.length,
        complexity: l.complexity,
        automationLevel: l.automationLevel,
      }
    })

    const pct = cfg.capacityRef > 0 ? (totalScore / cfg.capacityRef) * 100 : 0
    const pctRounded = Math.round(pct * 10) / 10

    return NextResponse.json({
      memberId: params.id,
      totalScore: Math.round(totalScore * 10) / 10,
      capacityRef: cfg.capacityRef,
      capacityPct: pctRounded,
      band: band(pctRounded, cfg),
      bandLabel: BAND_LABELS[band(pctRounded, cfg)],
      config: cfg,
      breakdown,
    })
  } catch (e) {
    console.error('[capacity GET]', e)
    return NextResponse.json({ error: 'Erro ao calcular capacidade' }, { status: 500 })
  }
}
