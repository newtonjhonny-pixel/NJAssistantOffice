import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import {
  calcCompanyICO, calcBand, BAND_LABELS, DEFAULT_BAND_CONFIG,
  type BandConfig,
} from '@/lib/team/capacity/calculateICO'

export const dynamic = 'force-dynamic'

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    // Configuração de faixas (capacityRef e bandas podem ser ajustados pelo gestor)
    const cfgRows = await prisma.$queryRaw<any[]>`
      SELECT "capacityRef","bandGreen","bandBlue","bandYellow","bandOrange"
      FROM "CapacityConfig" WHERE "active" = true LIMIT 1
    `
    const rawCfg = cfgRows[0]
    const bandCfg: BandConfig = rawCfg ? {
      bandGreen:  Number(rawCfg.bandGreen),
      bandBlue:   Number(rawCfg.bandBlue),
      bandYellow: Number(rawCfg.bandYellow),
      bandOrange: Number(rawCfg.bandOrange),
    } : DEFAULT_BAND_CONFIG
    const capacityRef = rawCfg ? Number(rawCfg.capacityRef) : 100

    // Carregar vínculos com empresas
    const links = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        l."id", l."companyId", l."memberRole",
        l."headcountActive", l."headcountApprentice", l."headcountIntern", l."headcountOnLeave",
        l."avgAdmissions", l."avgTerminations", l."avgVacations",
        l."unions", l."establishments",
        l."complexity", l."automationLevel",
        c."name" AS "companyName", c."segment"
      FROM "MemberCompanyLink" l
      JOIN "ClientCompany" c ON c."id" = l."companyId"
      WHERE l."memberId" = ?
    `, params.id)

    // ── Calcular usando função central ────────────────────────────────────────
    let totalScore = 0

    const breakdown = links.map(l => {
      const result = calcCompanyICO(l)
      totalScore += result.score

      return {
        companyId:      l.companyId,
        companyName:    l.companyName,
        segment:        l.segment ?? null,
        memberRole:     l.memberRole ?? null,
        score:          result.score,
        cargaBase:      result.cargaBase,
        fatorPapel:     result.fatorPapel,
        fatorComplexidade: result.fatorComplexidade,
        fatorAutomacao: result.fatorAutomacao,
        headcount:      Number(l.headcountActive ?? 0),
        complexity:     l.complexity ?? null,
        automationLevel: l.automationLevel ?? null,
        // Memória de cálculo para "Ver cálculo"
        memoria:        result.memoria,
      }
    })

    // ICO = totalScore; capacidade (%) = ICO (ref = 100 pts = 100%)
    const capacityPct = capacityRef > 0 ? (totalScore / capacityRef) * 100 : 0
    const band        = calcBand(capacityPct, bandCfg)

    return NextResponse.json({
      memberId:     params.id,
      totalScore:   Math.round(totalScore * 100) / 100,
      capacityRef,
      capacityPct:  Math.round(capacityPct * 100) / 100,
      band,
      bandLabel:    BAND_LABELS[band],
      breakdown,
    })
  } catch (e) {
    console.error('[capacity GET]', e)
    return NextResponse.json({ error: 'Erro ao calcular capacidade' }, { status: 500 })
  }
}
