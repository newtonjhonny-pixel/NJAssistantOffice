import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'


interface Config {
  weightEmployee: number; weightCompany: number; weightProcess: number
  weightVolume: number; weightComplexity: number; weightManual: number; weightCritical: number
  capacityRef: number
  bandGreen: number; bandBlue: number; bandYellow: number; bandOrange: number
}

const COMPLEXITY_MULT: Record<string, number> = { BAIXA: 0, MEDIA: 1, ALTA: 2, MUITO_ALTA: 3 }
function complexityScore(level: string | null, weight: number): number {
  return ((COMPLEXITY_MULT[level ?? ''] ?? 0) / 3) * weight
}

function calcBand(pct: number, cfg: Config): string {
  if (pct <= cfg.bandGreen)  return 'green'
  if (pct <= cfg.bandBlue)   return 'blue'
  if (pct <= cfg.bandYellow) return 'yellow'
  if (pct <= cfg.bandOrange) return 'orange'
  return 'critical'
}

const BAND_LABELS: Record<string, string> = {
  green: 'DisponÃ­vel', blue: 'Equilibrado', yellow: 'AtenÃ§Ã£o',
  orange: 'Sobrecarga', critical: 'Sobrecarga CrÃ­tica',
}

export async function GET() {
  try {
    // Config
    const cfgRows = await prisma.$queryRaw<Config[]>`
      SELECT * FROM "CapacityConfig" WHERE "active" = true LIMIT 1
    `
    const cfg: Config = cfgRows[0] ?? {
      weightEmployee: 1, weightCompany: 5, weightProcess: 2, weightVolume: 0.5,
      weightComplexity: 3, weightManual: 2, weightCritical: 3, capacityRef: 100,
      bandGreen: 70, bandBlue: 85, bandYellow: 100, bandOrange: 120,
    }

    // All active members
    const members = await prisma.$queryRaw<any[]>`
      SELECT "id","name","role","sector","unit","status"
      FROM "TeamMember"
      WHERE "status" = 'ATIVO'
      ORDER BY "name"
    `

    // All links with companies (for active members)
    const links = await prisma.$queryRaw<any[]>`
      SELECT l.*, c."name" as "companyName", c."segment"
      FROM "MemberCompanyLink" l
      JOIN "ClientCompany" c ON c."id" = l."companyId"
      JOIN "TeamMember" m ON m."id" = l."memberId"
      WHERE m."status" = 'ATIVO'
    `

    // All processes for those links
    const processes = await prisma.$queryRaw<any[]>`
      SELECT p.*
      FROM "MemberCompanyProcess" p
      JOIN "MemberCompanyLink" l ON l."id" = p."linkId"
      JOIN "TeamMember" m ON m."id" = l."memberId"
      WHERE m."status" = 'ATIVO'
    `

    // Index
    const linksByMember = links.reduce<Record<string, any[]>>((acc, l) => {
      if (!acc[l.memberId]) acc[l.memberId] = []
      acc[l.memberId].push(l)
      return acc
    }, {})
    const processByLink = processes.reduce<Record<string, any[]>>((acc, p) => {
      if (!acc[p.linkId]) acc[p.linkId] = []
      acc[p.linkId].push(p)
      return acc
    }, {})

    // Calculate per member
    const memberResults = members.map(m => {
      const memberLinks = linksByMember[m.id] ?? []
      let totalScore = 0
      let totalHeadcount = 0
      let totalProcesses = 0

      const linkBreakdown = memberLinks.map(l => {
        let score = cfg.weightCompany
        const headcount = (l.headcountActive ?? 0) + (l.headcountApprentice ?? 0) + (l.headcountIntern ?? 0)
        score += headcount * cfg.weightEmployee
        score += ((l.avgAdmissions ?? 0) + (l.avgTerminations ?? 0) + (l.avgVacations ?? 0)) * cfg.weightVolume
        score += complexityScore(l.complexity, cfg.weightComplexity)
        if (l.automationLevel === 'MANUAL') score += cfg.weightManual

        const procs = processByLink[l.id] ?? []
        for (const p of procs) {
          score += cfg.weightProcess
          score += (p.volume ?? 0) * cfg.weightVolume
          score += complexityScore(p.complexity, cfg.weightComplexity)
          if (p.automationLevel === 'MANUAL') score += cfg.weightManual
          if (p.isCritical) score += cfg.weightCritical
        }

        totalScore += score
        totalHeadcount += headcount
        totalProcesses += procs.length
        return { companyId: l.companyId, companyName: l.companyName, score: Math.round(score * 10) / 10 }
      })

      const pct = cfg.capacityRef > 0 ? (totalScore / cfg.capacityRef) * 100 : 0
      const pctRounded = Math.round(pct * 10) / 10
      const band = calcBand(pctRounded, cfg)

      return {
        id: m.id, name: m.name, role: m.role, sector: m.sector, unit: m.unit,
        companyCount: memberLinks.length,
        totalHeadcount, totalProcesses,
        totalScore: Math.round(totalScore * 10) / 10,
        capacityPct: pctRounded, band, bandLabel: BAND_LABELS[band],
        linkBreakdown,
      }
    })

    // Team summary
    const bandCounts = { green: 0, blue: 0, yellow: 0, orange: 0, critical: 0 }
    for (const m of memberResults) bandCounts[m.band as keyof typeof bandCounts]++

    const totalHeadcount = memberResults.reduce((s, m) => s + m.totalHeadcount, 0)
    const avgCapacity = memberResults.length > 0
      ? Math.round(memberResults.reduce((s, m) => s + m.capacityPct, 0) / memberResults.length * 10) / 10
      : 0

    return NextResponse.json({
      config: cfg,
      summary: {
        totalMembers: memberResults.length,
        totalHeadcount,
        avgCapacity,
        bandCounts,
      },
      members: memberResults,
    })
  } catch (e) {
    console.error('[dimensionamento GET]', e)
    return NextResponse.json({ error: 'Erro ao calcular dimensionamento' }, { status: 500 })
  }
}
