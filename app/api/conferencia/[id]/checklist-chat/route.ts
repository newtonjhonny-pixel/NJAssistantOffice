import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai/gateway'
import type { AIMessage } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

// ─── SPECIALIST MAP ───────────────────────────────────────────────────────────

const PROCESS_SPECIALIST: Record<string, string> = {
  FOLHA:        'Folha de Pagamento e Departamento Pessoal',
  RESCISAO:     'Rescisão Contratual e Departamento Pessoal',
  FERIAS:       'Férias e Departamento Pessoal',
  ADMISSAO:     'Admissão e Departamento Pessoal',
  BENEFICIOS:   'Benefícios e Departamento Pessoal',
  ENCARGOS:     'Encargos Sociais e Tributários',
  PAGAMENTO:    'Pagamentos e Financeiro',
  MOVIMENTACAO: 'Movimentação de Pessoal e RH',
  PONTO:        'Controle de Ponto e Departamento Pessoal',
  ESOCIAL:      'eSocial e Obrigações Acessórias',
  FGTS:         'FGTS e Departamento Pessoal',
  IRRF:         'IRRF e Tributário',
  DCTFWEB:      'DCTFWeb e Obrigações Fiscais',
  OUTROS:       'Administrativo',
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

function buildSystem(specialist: string, processType: string): string {
  return `Você é o Assistente de Checklist do NJ Assistant Office.

## ESPECIALIDADE ATIVA: ${specialist}
Você responde SEMPRE como **Especialista Sênior em ${specialist}**.
Esta é uma conferência do tipo: **${processType}**.
Nunca diga "Como assistente de IA…". Use sempre: "Como especialista em ${specialist}…"

## Regras de comportamento

REGRA 1 — Identidade especializada
Você é especialista sênior em ${specialist}. Toda resposta reflete conhecimento técnico desta área.

REGRA 2 — Foco no checklist
Você analisa os itens do checklist, seus status, anotações e inconsistências.
Identifique riscos, lacunas e sugira melhorias com base na sua especialidade.

REGRA 3 — Prioridade da última mensagem
A mensagem mais recente do usuário sempre tem prioridade.

REGRA 4 — Converse naturalmente
Você é um copiloto conversacional. Pode fazer perguntas curtas antes de responder.

REGRA 5 — Memória da conversa
Você lembra de tudo que foi dito nesta conversa sobre este checklist.

REGRA 6 — Mude de opinião com naturalidade
Ao receber informação nova: "Entendido. Considerando isso, minha avaliação muda para: [nova avaliação]."

## Formato das respostas
- Seja conciso e técnico.
- Use linguagem de especialista em ${specialist}.
- Para listas: marcadores (•).
- Para planos: etapas numeradas.
- Responda sempre em português brasileiro.`
}

// ─── PROMPTS POR MODO ─────────────────────────────────────────────────────────

function buildPrompts(specialist: string): Record<string, string> {
  return {
    'analyze-checklist':
      `Como especialista em ${specialist}, analise este checklist completo. Para cada item não conforme ou pendente, indique o risco e a ação corretiva necessária. Ao final, dê um parecer geral do nível de conformidade.`,

    'suggest-items':
      `Como especialista em ${specialist}, com base no tipo de conferência e nos itens já existentes, sugira itens adicionais importantes que deveriam constar neste checklist mas não estão presentes. Justifique cada sugestão.`,

    'identify-risks':
      `Como especialista em ${specialist}, identifique todos os riscos presentes neste checklist considerando: itens não conformes, itens pendentes, inconsistências e anotações. Para cada risco: descrição, impacto, urgência e mitigação.`,

    'suggest-annotation':
      `Como especialista em ${specialist}, com base no conteúdo deste checklist e nos itens não conformes ou pendentes, sugira anotações técnicas detalhadas que deveriam ser registradas em cada item problemático. Use linguagem formal e técnica.`,

    'generate-opinion':
      `Como especialista em ${specialist}, gere um parecer técnico completo sobre esta conferência. Inclua: situação geral, itens críticos, nível de conformidade (percentual), riscos identificados, recomendações e conclusão. Use linguagem formal.`,

    'suggest-correction':
      `Como especialista em ${specialist}, para cada item não conforme identificado neste checklist, sugira a ação corretiva específica, o responsável mais adequado e o prazo recomendado para correção.`,

    'summarize-checklist':
      `Como especialista em ${specialist}, crie um resumo executivo deste checklist em até 10 linhas. Inclua: total de itens, percentual de conformidade, principais não conformidades e status geral da conferência.`,

    'review-item':
      `Como especialista em ${specialist}, revise cada item do checklist criticamente. Identifique itens com descrição vaga, mal estruturados ou que precisam de maior detalhamento para uma conferência eficaz.`,
  }
}

// ─── CHECKLIST CONTEXT BUILDER ────────────────────────────────────────────────

function buildChecklistContext(conf: {
  title: string
  processType: string
  competence: string | null
  companyUnit: string | null
  analystName: string | null
  coordinatorName: string | null
  status: string
  checklist: Array<{ description: string; result: string; notes: string | null }>
  issues: Array<{ title: string; severity: string; correctionStatus: string }>
}): string {
  const RESULT_PT: Record<string, string> = {
    CONFORME: 'Conforme', NAO_CONFORME: 'Não Conforme',
    NAO_APLICA: 'Não se aplica', PENDENTE_ANALISE: 'Pendente de análise',
  }
  const STATUS_PT: Record<string, string> = {
    PENDENTE: 'Pendente', EM_CONFERENCIA: 'Em conferência',
    COM_INCONSISTENCIA: 'Com inconsistência', AGUARDANDO_CORRECAO: 'Aguardando correção',
    CORRIGIDO: 'Corrigido', APROVADO: 'Aprovado', REPROVADO: 'Reprovado',
  }

  const checklistText = conf.checklist.map((item, i) =>
    `${i + 1}. ${item.description}\n   Status: ${RESULT_PT[item.result] ?? item.result}${item.notes ? `\n   Anotação: ${item.notes}` : ''}`
  ).join('\n')

  const conforme    = conf.checklist.filter(i => i.result === 'CONFORME').length
  const naoConforme = conf.checklist.filter(i => i.result === 'NAO_CONFORME').length
  const pendente    = conf.checklist.filter(i => i.result === 'PENDENTE_ANALISE').length

  return [
    `CONFERÊNCIA: ${conf.title}`,
    `TIPO: ${conf.processType}`,
    conf.competence   && `COMPETÊNCIA: ${conf.competence}`,
    conf.companyUnit  && `EMPRESA: ${conf.companyUnit}`,
    conf.analystName  && `ANALISTA: ${conf.analystName}`,
    conf.coordinatorName && `COORDENADOR: ${conf.coordinatorName}`,
    `STATUS: ${STATUS_PT[conf.status] ?? conf.status}`,
    `\nRESUMO DO CHECKLIST:`,
    `Total de itens: ${conf.checklist.length} | Conformes: ${conforme} | Não conformes: ${naoConforme} | Pendentes: ${pendente}`,
    `\nITENS DO CHECKLIST:\n${checklistText || '(nenhum item cadastrado)'}`,
    conf.issues.length > 0 && `\nINCONSISTÊNCIAS REGISTRADAS:\n${conf.issues.map(i => `• ${i.title} (${i.severity}) — ${i.correctionStatus}`).join('\n')}`,
  ].filter(Boolean).join('\n')
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const chats = await prisma.conferenceChat.findMany({
    where: { conferenceId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(chats)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { message, mode } = body as { message: string; mode?: string }

  const conf = await prisma.conference.findUnique({
    where: { id: params.id },
    include: {
      checklist: { orderBy: { order: 'asc' } },
      issues:    { orderBy: { createdAt: 'desc' } },
      chats:     { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!conf) return NextResponse.json({ error: 'Conferência não encontrada' }, { status: 404 })

  const specialist = PROCESS_SPECIALIST[conf.processType] ?? 'Administrativo'
  const SYSTEM     = buildSystem(specialist, conf.processType)
  const PROMPTS    = buildPrompts(specialist)

  // Save user message
  await prisma.conferenceChat.create({
    data: { conferenceId: params.id, role: 'user', content: message, mode: mode || null },
  })

  const checklistContext = buildChecklistContext({
    title:           conf.title,
    processType:     conf.processType,
    competence:      conf.competence,
    companyUnit:     conf.companyUnit,
    analystName:     conf.analystName,
    coordinatorName: conf.coordinatorName,
    status:          conf.status,
    checklist:       conf.checklist.map(i => ({
      description: i.description,
      result:      i.result,
      notes:       i.notes,
    })),
    issues: conf.issues.map(i => ({
      title:            i.title,
      severity:         i.severity,
      correctionStatus: i.correctionStatus,
    })),
  })

  const previousChats = conf.chats.map(c => ({
    role:    c.role as 'user' | 'assistant',
    content: c.content,
  }))

  const modePrompt        = mode ? PROMPTS[mode] : null
  const currentUserContent = modePrompt
    ? `${modePrompt}\n\n---\n\nChecklist:\n${checklistContext}`
    : message

  const messages = [
    { role: 'system'    as const, content: SYSTEM },
    { role: 'user'      as const, content: `Contexto do checklist que vamos analisar:\n\n${checklistContext}` },
    { role: 'assistant' as const, content: `Entendido. Tenho acesso completo a este checklist de ${specialist}. Como posso ajudar?` },
    ...previousChats,
    { role: 'user'      as const, content: currentUserContent },
  ]

  let response: string
  let aiPowered = false

  if (aiService.isConfigured()) {
    try {
      const result = await aiService.ask({
        module: 'conferencia.checklist-chat',
        specialist,
        systemPrompt: SYSTEM,
        message: currentUserContent,
        history: messages.slice(1, -1) as AIMessage[],
        maxTokens: 1600,
      })
      response  = result.content
      aiPowered = result.aiPowered
    } catch {
      response = `Recebi sua solicitação sobre o checklist de "${conf.title}".\n\nConfigure OPENAI_API_KEY para análises geradas por IA.`
    }
  } else {
    response = `Recebi sua solicitação sobre o checklist de "${conf.title}".\n\nConfigure OPENAI_API_KEY para análises geradas por IA especializada em ${specialist}.`
  }

  const saved = await prisma.conferenceChat.create({
    data: { conferenceId: params.id, role: 'assistant', content: response, mode: mode || null },
  })

  // Log to history
  const modeLabels: Record<string, string> = {
    'analyze-checklist': 'IA analisou o checklist',
    'suggest-items':     'IA sugeriu itens para o checklist',
    'identify-risks':    'IA identificou riscos no checklist',
    'suggest-annotation':'IA sugeriu anotações para os itens',
    'generate-opinion':  'IA gerou parecer da conferência',
    'suggest-correction':'IA sugeriu correções',
    'summarize-checklist':'IA criou resumo do checklist',
    'review-item':       'IA revisou os itens do checklist',
  }

  await prisma.conferenceHistory.create({
    data: {
      conferenceId: params.id,
      type:         'IA_ANALISE',
      title:        modeLabels[mode || ''] || 'IA respondeu no Assistente de Checklist',
    },
  })

  return NextResponse.json({ response, id: saved.id, aiPowered, specialist })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.conferenceChat.deleteMany({ where: { conferenceId: params.id } })
  return NextResponse.json({ ok: true })
}
