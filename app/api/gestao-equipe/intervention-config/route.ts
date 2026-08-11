/**
 * GET  /api/gestao-equipe/intervention-config
 *   Retorna os parÃ¢metros de intervenÃ§Ã£o humana por tipo de execuÃ§Ã£o.
 *
 * PUT  /api/gestao-equipe/intervention-config
 *   Atualiza um ou mais parÃ¢metros.
 *   Body: [{ executionType: string; interventionPct: number }]
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureCapacitySchema } from '@/lib/team/capacity/ensureCapacitySchema'
import { DEFAULT_INTERVENTION_CONFIGS } from '@/lib/team/capacity/CapacityEngine'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureCapacitySchema()

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id","executionType","interventionPct","label","description","updatedAt"
       FROM "InterventionConfig" ORDER BY
         CASE "executionType"
           WHEN 'MANUAL'               THEN 1
           WHEN 'ASSISTIDA'            THEN 2
           WHEN 'AUTOMATIZADA'         THEN 3
           WHEN 'AUTOMATICA_EXCECOES'  THEN 4
           ELSE 5
         END`
    )

    // Garantir que todos os 4 tipos estejam presentes (mesmo sem registro no banco)
    const map: Record<string, any> = {}
    for (const r of rows) map[r.executionType] = r

    const result = Object.values(DEFAULT_INTERVENTION_CONFIGS).map(def => ({
      ...(map[def.executionType] ?? {}),
      executionType:   def.executionType,
      label:           map[def.executionType]?.label           ?? def.label,
      interventionPct: map[def.executionType]?.interventionPct ?? def.interventionPct,
      description:     map[def.executionType]?.description     ?? def.description,
    }))

    return NextResponse.json({ configs: result })
  } catch (e) {
    console.error('[intervention-config GET]', e)
    return NextResponse.json({ error: 'Erro ao carregar configuraÃ§Ãµes' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    await ensureCapacitySchema()

    const body = await req.json() as { executionType: string; interventionPct: number }[]
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'Payload invÃ¡lido' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updated: string[] = []

    for (const item of body) {
      const pct = Number(item.interventionPct)
      if (!item.executionType || isNaN(pct) || pct < 0 || pct > 100) continue

      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "InterventionConfig" WHERE "executionType" = ?`,
        item.executionType
      )

      if (existing.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "InterventionConfig" SET "interventionPct" = ?, "updatedAt" = ? WHERE "executionType" = ?`,
          pct, now, item.executionType
        )
      } else {
        const def = DEFAULT_INTERVENTION_CONFIGS[item.executionType as keyof typeof DEFAULT_INTERVENTION_CONFIGS]
        await prisma.$executeRawUnsafe(
          `INSERT INTO "InterventionConfig" ("id","executionType","interventionPct","label","description","updatedAt")
           VALUES (?,?,?,?,?,?)`,
          crypto.randomUUID(),
          item.executionType,
          pct,
          def?.label ?? item.executionType,
          def?.description ?? null,
          now
        )
      }
      updated.push(item.executionType)
    }

    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    console.error('[intervention-config PUT]', e)
    return NextResponse.json({ error: 'Erro ao atualizar configuraÃ§Ãµes' }, { status: 500 })
  }
}

