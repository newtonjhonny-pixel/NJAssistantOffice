/**
 * GET  /api/gestao-equipe/dp-activities?linkId=xxx
 *   Lista atividades cadastradas para um vínculo.
 *
 * POST /api/gestao-equipe/dp-activities
 *   Cria nova instância de atividade para um vínculo.
 *   Body: { linkId, processCode, activityName, executionType, volume, avgTimeMinutes, requiredLevel, catalogId?, observations? }
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureCapacitySchema } from '@/lib/team/capacity/ensureCapacitySchema'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await ensureCapacitySchema()

    const { searchParams } = new URL(req.url)
    const linkId = searchParams.get('linkId')
    if (!linkId) return NextResponse.json({ error: 'linkId obrigatório' }, { status: 400 })

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
         a."id", a."linkId", a."processCode", a."catalogId",
         a."activityName", a."executionType",
         a."volume", a."avgTimeMinutes", a."requiredLevel",
         a."observations", a."active", a."createdAt", a."updatedAt"
       FROM "DpActivityInstance" a
       WHERE a."linkId" = ? AND a."active" = 1
       ORDER BY a."processCode", a."activityName"`,
      linkId
    )

    const activities = rows.map(r => ({
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

    // Agrupar por processo para facilitar a UI
    const byProcess: Record<string, typeof activities> = {}
    for (const a of activities) {
      if (!byProcess[a.processCode]) byProcess[a.processCode] = []
      byProcess[a.processCode].push(a)
    }

    return NextResponse.json({ activities, byProcess })
  } catch (e) {
    console.error('[dp-activities GET]', e)
    return NextResponse.json({ error: 'Erro ao carregar atividades' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await ensureCapacitySchema()

    const body = await req.json()
    const {
      linkId, processCode, activityName, executionType,
      volume, avgTimeMinutes, requiredLevel, catalogId, observations,
    } = body

    if (!linkId || !processCode || !activityName || !executionType) {
      return NextResponse.json({ error: 'linkId, processCode, activityName e executionType obrigatórios' }, { status: 400 })
    }

    const VALID_EXEC = ['MANUAL', 'ASSISTIDA', 'AUTOMATIZADA', 'AUTOMATICA_EXCECOES']
    const VALID_LEVEL = ['ASSISTENTE', 'ANALISTA', 'COORDENACAO', 'COMPARTILHADO']
    if (!VALID_EXEC.includes(executionType)) {
      return NextResponse.json({ error: 'executionType inválido' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const id  = crypto.randomUUID()

    await prisma.$executeRawUnsafe(
      `INSERT INTO "DpActivityInstance"
       ("id","linkId","processCode","catalogId","activityName","executionType",
        "volume","avgTimeMinutes","requiredLevel","observations","active","createdAt","updatedAt")
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, linkId, processCode,
      catalogId ?? null,
      activityName, executionType,
      Number(volume ?? 1),
      Number(avgTimeMinutes ?? 0),
      VALID_LEVEL.includes(requiredLevel) ? requiredLevel : 'ASSISTENTE',
      observations ?? null,
      1, now, now
    )

    return NextResponse.json({ ok: true, id })
  } catch (e) {
    console.error('[dp-activities POST]', e)
    return NextResponse.json({ error: 'Erro ao criar atividade' }, { status: 500 })
  }
}

