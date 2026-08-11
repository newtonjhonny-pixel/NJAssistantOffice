import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

/**
 * Calcula o indicador de Prontidão de um colaborador.
 * Usa pesos configuráveis da TrainingReadinessConfig (nunca hardcoded).
 * Cargo do membro → busca config específica; fallback para 'global'.
 */
export async function GET(_: NextRequest, { params }: { params: { memberId: string } }) {
  const { memberId } = params

  // Dados do colaborador
  const memberRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, name, role FROM "TeamMember" WHERE id = ?`, memberId
  )
  if (!memberRows.length) return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })
  const member = memberRows[0]

  // Config de prontidão: busca pelo cargo ou global
  const configRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "TrainingReadinessConfig"
     WHERE cargo = ? OR cargo = 'global'
     ORDER BY CASE WHEN cargo = ? THEN 0 ELSE 1 END
     LIMIT 1`,
    member.role, member.role
  )
  const cfg = configRows[0] ?? {
    pesoAmbientacao: 20, pesoTreinamento: 40, pesoPratica: 20, pesoAvaliacao: 20,
    trainingsObrigatorios: null,
  }

  // Participações do membro
  const participacoes = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT p.*, t.tipo, t.modalidade, t.obrigatorio, t.titulo, t.status AS trainingStatus,
            p."nota", p."cienciaConfirmada", p."progresso"
     FROM "TrainingParticipant" p
     JOIN "Training" t ON t.id = p."trainingId"
     WHERE p."memberId" = ?`,
    memberId
  )

  const ambientacoes = participacoes.filter(p => p.tipo === 'AMBIENTACAO')
  const treinamentos = participacoes.filter(p => p.tipo === 'TREINAMENTO')

  // Score ambientação: % das ambientações com ciência confirmada
  const totalAmb    = ambientacoes.length
  const concAmb     = ambientacoes.filter(p => Boolean(p.cienciaConfirmada)).length
  const scoreAmb    = totalAmb ? Math.round((concAmb / totalAmb) * 100) : 0

  // Score treinamento: % concluídos
  const totalTrein  = treinamentos.length
  const concTrein   = treinamentos.filter(p => p.status === 'CONCLUIDO').length
  const scoreTrein  = totalTrein ? Math.round((concTrein / totalTrein) * 100) : 0

  // Score prática: média do progresso dos treinamentos que têm PRATICA no conteúdo
  const comPratica  = treinamentos.filter(p => Number(p.progresso) > 0)
  const scorePrat   = comPratica.length
    ? Math.round(comPratica.reduce((s, p) => s + Number(p.progresso), 0) / comPratica.length)
    : 0

  // Score avaliação: média das notas (0-100, escala 0-10 → *10)
  const comNota     = treinamentos.filter(p => p.nota != null)
  const scoreAval   = comNota.length
    ? Math.round(comNota.reduce((s, p) => s + Number(p.nota) * 10, 0) / comNota.length)
    : 0

  // Ponderação configurável
  const pesoAmb   = Number(cfg.pesoAmbientacao)
  const pesoTrein = Number(cfg.pesoTreinamento)
  const pesoPrat  = Number(cfg.pesoPratica)
  const pesoAval  = Number(cfg.pesoAvaliacao)
  const totalPeso = pesoAmb + pesoTrein + pesoPrat + pesoAval || 100

  const prontidao = Math.round(
    (scoreAmb * pesoAmb + scoreTrein * pesoTrein + scorePrat * pesoPrat + scoreAval * pesoAval)
    / totalPeso
  )

  // Treinamentos obrigatórios pendentes
  let obrigatoriosPendentes: unknown[] = []
  const obrigIds = cfg.trainingsObrigatorios
    ? safeJson(cfg.trainingsObrigatorios as string)
    : []
  if (obrigIds.length) {
    obrigatoriosPendentes = participacoes.filter(
      p => obrigIds.includes(p.trainingId as string) && p.status !== 'CONCLUIDO'
    )
  }

  return NextResponse.json({
    member: { id: member.id, name: member.name, role: member.role },
    prontidao,
    scores: {
      ambientacao: scoreAmb,
      treinamento: scoreTrein,
      pratica:     scorePrat,
      avaliacao:   scoreAval,
    },
    pesos: { pesoAmb, pesoTrein, pesoPrat, pesoAval },
    resumo: {
      totalAmbientacoes: totalAmb,
      ambientacoesComCiencia: concAmb,
      totalTreinamentos: totalTrein,
      treinamentosConcluidos: concTrein,
    },
    participacoes,
    obrigatoriosPendentes,
    config: cfg,
  })
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return [] } }
