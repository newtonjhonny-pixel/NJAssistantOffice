import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [counts, porStatus, porTipo, recentes] = await Promise.all([
    // Contagens gerais
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN tipo = 'TREINAMENTO' THEN 1 ELSE 0 END)  AS totalTreinamentos,
        SUM(CASE WHEN tipo = 'AMBIENTACAO'  THEN 1 ELSE 0 END)  AS totalAmbientacoes,
        SUM(CASE WHEN status = 'ATIVO'      THEN 1 ELSE 0 END)  AS ativos,
        SUM(CASE WHEN status = 'RASCUNHO'   THEN 1 ELSE 0 END)  AS rascunhos,
        SUM(CASE WHEN obrigatorio = true    THEN 1 ELSE 0 END)  AS obrigatorios,
        (SELECT COUNT(*) FROM "TrainingParticipant") AS totalParticipacoes,
        (SELECT COUNT(*) FROM "TrainingParticipant" WHERE status = 'CONCLUIDO') AS concluidos,
        (SELECT COUNT(*) FROM "TrainingParticipant" WHERE status = 'EM_ANDAMENTO') AS emAndamento,
        (SELECT COUNT(*) FROM "TrainingTrail") AS totalTrilhas,
        (SELECT COUNT(*) FROM "AmbientacaoSystem" WHERE ativo = true) AS totalSistemas
      FROM "Training"
    `),

    // Por status
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT status, COUNT(*) AS cnt FROM "Training" GROUP BY status
    `),

    // Por tipo
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT tipo, COUNT(*) AS cnt FROM "Training" GROUP BY tipo
    `),

    // 5 mais recentes
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT t.id, t.titulo, t.tipo, t.modalidade, t.status, t.updatedAt,
        (SELECT COUNT(*) FROM "TrainingParticipant" p WHERE p."trainingId" = t.id) AS participantes
      FROM "Training" t ORDER BY t."updatedAt" DESC LIMIT 5
    `),
  ])

  const c = counts[0] ?? {}
  return NextResponse.json({
    counts: {
      total:              Number(c.total              ?? 0),
      totalTreinamentos:  Number(c.totalTreinamentos  ?? 0),
      totalAmbientacoes:  Number(c.totalAmbientacoes  ?? 0),
      ativos:             Number(c.ativos             ?? 0),
      rascunhos:          Number(c.rascunhos          ?? 0),
      obrigatorios:       Number(c.obrigatorios       ?? 0),
      totalParticipacoes: Number(c.totalParticipacoes ?? 0),
      concluidos:         Number(c.concluidos         ?? 0),
      emAndamento:        Number(c.emAndamento        ?? 0),
      totalTrilhas:       Number(c.totalTrilhas       ?? 0),
      totalSistemas:      Number(c.totalSistemas      ?? 0),
    },
    porStatus: porStatus.map(r => ({ status: r.status, total: Number(r.cnt) })),
    porTipo:   porTipo.map(r   => ({ tipo: r.tipo,     total: Number(r.cnt) })),
    recentes: recentes.map(r => ({
      ...r,
      participantes: Number(r.participantes ?? 0),
    })),
  })
}
