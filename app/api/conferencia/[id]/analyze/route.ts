import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeConference, ConferenceAnalysisInput } from '@/lib/ai/agents'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { analysisType = 'COMPLETA' } = await req.json().catch(() => ({}))

  const conf = await prisma.conference.findUnique({
    where: { id: params.id },
    include: {
      checklist: { orderBy: { order: 'asc' } },
      issues:    { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!conf) return NextResponse.json({ error: 'Conferência não encontrada' }, { status: 404 })

  const input: ConferenceAnalysisInput = {
    title:             conf.title,
    processType:       conf.processType,
    competence:        conf.competence,
    companyUnit:       conf.companyUnit,
    analystName:       conf.analystName,
    coordinatorName:   conf.coordinatorName,
    conferenceDate:    conf.conferenceDate?.toISOString()    ?? null,
    correctionDueDate: conf.correctionDueDate?.toISOString() ?? null,
    status:            conf.status,
    priority:          conf.priority,
    description:       conf.description,
    notes:             conf.notes,
    checklist: conf.checklist.map(i => ({
      description:          i.description,
      result:               i.result,
      notes:                i.notes,
      correctionResponsible:i.correctionResponsible,
      correctionDueDate:    i.correctionDueDate?.toISOString() ?? null,
    })),
    issues: conf.issues.map(i => ({
      title:                i.title,
      description:          i.description,
      severity:             i.severity,
      impact:               i.impact,
      probableCause:        i.probableCause,
      recommendedSolution:  i.recommendedSolution,
      correctionStatus:     i.correctionStatus,
      correctionResponsible:i.correctionResponsible,
    })),
  }

  const result = await analyzeConference(input, analysisType)

  // Save analysis
  const analysis = await prisma.conferenceAiAnalysis.create({
    data: {
      conferenceId: params.id,
      analysisType,
      content:      result.content,
      aiPowered:    result.aiPowered,
    },
  })

  await prisma.conferenceHistory.create({
    data: {
      conferenceId: params.id,
      type:         'IA_ANALISE',
      title:        'Análise de IA gerada',
      description:  `Tipo: ${analysisType}${result.aiPowered ? ' (OpenAI)' : ' (modo local)'}.`,
    },
  })

  return NextResponse.json({ ...result, analysisId: analysis.id })
}
