/**
 * GET /api/gestao-equipe/capacity-engine/[memberId]
 *
 * Retorna o resultado completo do CapacityEngine para um colaborador:
 * - Capacidade produtiva disponível
 * - Carga humana por empresa / processo / atividade
 * - Índice de manualidade e automação (ponderados por esforço)
 * - FTE por nível de função (Analista / Assistente)
 * - Oportunidades de automação (ranking por carga manual)
 * - Memória de cálculo completa por atividade
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureCapacitySchema } from '@/lib/team/capacity/ensureCapacitySchema'
import {
  calculateCompanyLoad,
  calculateMemberCapacity,
  buildInterventionMap,
  DEFAULT_CAPACITY_SETTINGS,
  DP_PROCESS_MAP,
} from '@/lib/team/capacity/CapacityEngine'
import type { DpActivityInstance } from '@/lib/team/capacity/types'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { memberId: string } }) {
  try {
    await ensureCapacitySchema()

    const { memberId } = params

    // ── Membro ──────────────────────────────────────────────────────────────
    const memberRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id","name","role","sector","unit","status"
       FROM "TeamMember" WHERE "id" = ?`,
      memberId
    )
    if (!memberRows.length) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })
    }
    const member = memberRows[0]

    // ── Configurações de capacidade ─────────────────────────────────────────
    const cfgRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "capacityRef","bandGreen","bandBlue","bandYellow","bandOrange",
              "monthlyHours","operationalReserve",
              "bandLow","bandAvailable","bandAdequate","bandHigh","bandLimit"
       FROM "CapacityConfig" WHERE "active" = 1 LIMIT 1`
    )
    const raw = cfgRows[0]
    const capacitySettings = {
      monthlyHours:       Number(raw?.monthlyHours       ?? DEFAULT_CAPACITY_SETTINGS.monthlyHours),
      operationalReserve: Number(raw?.operationalReserve ?? DEFAULT_CAPACITY_SETTINGS.operationalReserve),
      bandLow:            Number(raw?.bandLow            ?? DEFAULT_CAPACITY_SETTINGS.bandLow),
      bandAvailable:      Number(raw?.bandAvailable      ?? DEFAULT_CAPACITY_SETTINGS.bandAvailable),
      bandAdequate:       Number(raw?.bandAdequate       ?? DEFAULT_CAPACITY_SETTINGS.bandAdequate),
      bandHigh:           Number(raw?.bandHigh           ?? DEFAULT_CAPACITY_SETTINGS.bandHigh),
      bandLimit:          Number(raw?.bandLimit          ?? DEFAULT_CAPACITY_SETTINGS.bandLimit),
    }

    // ── Configuração de intervenção ─────────────────────────────────────────
    const interventionRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "executionType","interventionPct" FROM "InterventionConfig"`
    )
    const interventionMap = buildInterventionMap(
      interventionRows.map(r => ({ executionType: r.executionType, interventionPct: Number(r.interventionPct) }))
    )

    // ── Vínculos com empresas ────────────────────────────────────────────────
    const links = await prisma.$queryRawUnsafe<any[]>(
      `SELECT l."id", l."companyId", c."name" AS "companyName"
       FROM "MemberCompanyLink" l
       JOIN "ClientCompany" c ON c."id" = l."companyId"
       WHERE l."memberId" = ?`,
      memberId
    )

    // ── Atividades DP por link ────────────────────────────────────────────────
    const linkIds = links.map(l => l.id)
    let allActivities: DpActivityInstance[] = []

    if (linkIds.length > 0) {
      const placeholders = linkIds.map(() => '?').join(',')
      const actRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id","linkId","processCode","catalogId","activityName",
                "executionType","volume","avgTimeMinutes","requiredLevel","observations"
         FROM "DpActivityInstance"
         WHERE "linkId" IN (${placeholders}) AND "active" = 1`,
        ...linkIds
      )
      allActivities = actRows.map(r => ({
        id:             r.id,
        linkId:         r.linkId,
        processCode:    r.processCode,
        catalogId:      r.catalogId ?? null,
        activityName:   r.activityName,
        executionType:  r.executionType,
        volume:         Number(r.volume ?? 1),
        avgTimeMinutes: Number(r.avgTimeMinutes ?? 0),
        requiredLevel:  r.requiredLevel,
        observations:   r.observations ?? null,
      }))
    }

    // ── Calcular carga por empresa ────────────────────────────────────────────
    const companyLoads = links.map(link => {
      const linkActivities = allActivities.filter(a => a.linkId === link.id)
      return calculateCompanyLoad(
        { id: link.id, companyId: link.companyId, companyName: link.companyName },
        linkActivities,
        interventionMap,
        DP_PROCESS_MAP
      )
    })

    // ── Resultado consolidado ─────────────────────────────────────────────────
    const result = calculateMemberCapacity(
      { id: member.id, name: member.name },
      companyLoads,
      capacitySettings
    )

    return NextResponse.json({
      member:           { id: member.id, name: member.name, role: member.role, sector: member.sector, unit: member.unit },
      capacitySettings,
      interventionMap,
      result,
    })
  } catch (e) {
    console.error('[capacity-engine GET]', e)
    return NextResponse.json({ error: 'Erro ao calcular capacidade' }, { status: 500 })
  }
}
