import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'
import {
  calcCompanyICO, calcBand, BAND_LABELS, DEFAULT_BAND_CONFIG,
  type BandConfig,
} from '@/lib/team/capacity/calculateICO'

export const dynamic = 'force-dynamic'

// ─── ensureSchema ─────────────────────────────────────────────────────────────

async function ensureSchema() {
  const sqls = [
    `ALTER TABLE "MemberCompanyLink" ADD COLUMN "payrollType"   TEXT`,
    `ALTER TABLE "MemberCompanyLink" ADD COLUMN "avgPromotions" REAL`,
    `ALTER TABLE "MemberCompanyLink" ADD COLUMN "avgTransfers"  REAL`,
    `ALTER TABLE "MemberCompanyLink" ADD COLUMN "cctCount"      INTEGER DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS "IcoHistory" (
      "id"            TEXT PRIMARY KEY,
      "memberId"      TEXT NOT NULL,
      "yearMonth"     TEXT NOT NULL,
      "icoPoints"     REAL NOT NULL,
      "icoPercent"    REAL NOT NULL,
      "band"          TEXT NOT NULL,
      "companyCount"  INTEGER NOT NULL DEFAULT 0,
      "employeeCount" INTEGER NOT NULL DEFAULT 0,
      "snapshot"      TEXT,
      "createdAt"     TEXT NOT NULL,
      UNIQUE ("memberId", "yearMonth")
    )`,
  ]
  for (const sql of sqls) {
    try { await prisma.$executeRawUnsafe(sql) } catch { /* já existe */ }
  }
}

// ─── INE (reutiliza lógica central exportada de calculateICO) ─────────────────

function calcINE(score: number): {
  analysts: number; assistants: number; label: string; situation: string; color: string
} {
  if (score < 35)  return { analysts: 1, assistants: 0, label: '1 Analista',                 situation: 'Equipe adequada',         color: 'green'    }
  if (score < 65)  return { analysts: 1, assistants: 0, label: '1 Analista (apoio pontual)', situation: 'Monitorar volume',        color: 'blue'     }
  if (score < 95)  return { analysts: 1, assistants: 1, label: '1 Analista + 1 Assistente',  situation: 'Reforço recomendado',     color: 'yellow'   }
  if (score < 135) return { analysts: 1, assistants: 2, label: '1 Analista + 2 Assistentes', situation: 'Reforço necessário',      color: 'orange'   }
  return             { analysts: 2, assistants: 1, label: '2 Analistas + 1 Assistente',  situation: 'Redistribuição urgente', color: 'critical' }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    await ensureSchema()

    // Configuração de faixas
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

    // Membros ativos
    const members = await prisma.$queryRaw<any[]>`
      SELECT "id","name","role","sector","unit","status"
      FROM "TeamMember" WHERE "status" = 'ATIVO' ORDER BY "name"
    `

    // Vínculos com empresas
    const links = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        l.*,
        c."name" AS "companyName", c."segment"
      FROM "MemberCompanyLink" l
      JOIN "ClientCompany"  c ON c."id" = l."companyId"
      JOIN "TeamMember"     m ON m."id" = l."memberId"
      WHERE m."status" = 'ATIVO'
    `)

    // Banco de horas por colaborador
    let hourBankByMember: Record<string, number> = {}
    try {
      const hb = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "memberId", SUM("hours") AS "totalHours" FROM "HourBankEntry" GROUP BY "memberId"`
      )
      for (const h of hb) hourBankByMember[h.memberId] = Number(h.totalHours ?? 0)
    } catch { /* tabela pode não existir */ }

    const linksByMember = links.reduce<Record<string, any[]>>((acc, l) => {
      (acc[l.memberId] ??= []).push(l); return acc
    }, {})

    // ── Calcular ICO por colaborador usando função central ────────────────────
    const memberResults = members.map(m => {
      const memberLinks = linksByMember[m.id] ?? []
      let totalScore = 0
      let totalHeadcount = 0

      const linkBreakdown = memberLinks.map(l => {
        const result = calcCompanyICO(l)
        totalScore     += result.score
        totalHeadcount += Number(l.headcountActive ?? 0)

        // Breakdown visível nos cards (componentes com pontos > 0)
        const breakdown = result.memoria.componentes
          .filter(c => c.subtotal > 0)
          .map(c => ({ key: c.label, label: c.label, points: Math.round(c.subtotal * 100) / 100 }))

        const ine = calcINE(result.score)

        return {
          companyId:   l.companyId,
          companyName: l.companyName,
          memberRole:  l.memberRole ?? null,
          score:       Math.round(result.score * 100) / 100,
          cargaBase:   Math.round(result.cargaBase * 100) / 100,
          headcount:   Number(l.headcountActive ?? 0),
          ine,
          breakdown,
          memoria:     result.memoria,
        }
      })

      const capacityPct = capacityRef > 0 ? (totalScore / capacityRef) * 100 : 0
      const band        = calcBand(capacityPct, bandCfg)
      const scorePts    = Math.round(totalScore * 100) / 100
      const pctRnd      = Math.round(capacityPct * 100) / 100
      const hourBal     = hourBankByMember[m.id] ?? 0

      return {
        id: m.id, name: m.name, role: m.role,
        sector: m.sector ?? null, unit: m.unit ?? null,
        companyCount: memberLinks.length,
        totalHeadcount,
        totalScore:   scorePts,
        capacityPct:  pctRnd,
        band,
        bandLabel:    BAND_LABELS[band],
        hourBalance:  Math.round(hourBal * 100) / 100,
        linkBreakdown,
      }
    })

    // ── Summary ───────────────────────────────────────────────────────────────
    const bandCounts: Record<string, number> = { green: 0, blue: 0, yellow: 0, orange: 0, critical: 0 }
    for (const m of memberResults) bandCounts[m.band] = (bandCounts[m.band] ?? 0) + 1

    const totalHC  = memberResults.reduce((s, m) => s + m.totalHeadcount, 0)
    const avgScore = memberResults.length
      ? Math.round((memberResults.reduce((s, m) => s + m.totalScore, 0) / memberResults.length) * 100) / 100
      : 0
    const avgCapacity = memberResults.length
      ? Math.round((memberResults.reduce((s, m) => s + m.capacityPct, 0) / memberResults.length) * 100) / 100
      : 0

    const ranked = [...memberResults].sort((a, b) => b.totalScore - a.totalScore)

    return NextResponse.json({
      bandConfig: bandCfg,
      capacityRef,
      summary: { totalMembers: memberResults.length, totalHeadcount: totalHC, avgCapacity, avgScore, bandCounts },
      members: memberResults,
      ranked,
    })
  } catch (e) {
    console.error('[dimensionamento GET]', e)
    return NextResponse.json({ error: 'Erro ao calcular dimensionamento' }, { status: 500 })
  }
}

// ─── POST — snapshot IcoHistory ───────────────────────────────────────────────

export async function POST() {
  try {
    await ensureSchema()
    const now     = new Date()
    const ym      = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const created = now.toISOString()

    const res  = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/gestao-equipe/dimensionamento`)
    const data = await res.json() as any
    if (!data.members) return NextResponse.json({ error: 'Dados indisponíveis' }, { status: 500 })

    let saved = 0
    for (const m of data.members as any[]) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "IcoHistory" ("id","memberId","yearMonth","icoPoints","icoPercent","band","companyCount","employeeCount","snapshot","createdAt")
           VALUES (?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT("memberId","yearMonth") DO UPDATE
           SET "icoPoints"=excluded."icoPoints","icoPercent"=excluded."icoPercent",
               "band"=excluded."band","companyCount"=excluded."companyCount",
               "employeeCount"=excluded."employeeCount","snapshot"=excluded."snapshot"`,
          randomUUID(), m.id, ym,
          m.totalScore, m.capacityPct, m.band,
          m.companyCount, m.totalHeadcount,
          JSON.stringify(m.linkBreakdown ?? []),
          created
        )
        saved++
      } catch { /* skip */ }
    }

    return NextResponse.json({ ok: true, yearMonth: ym, saved })
  } catch (e) {
    console.error('[dimensionamento POST snapshot]', e)
    return NextResponse.json({ error: 'Erro ao salvar snapshot' }, { status: 500 })
  }
}
