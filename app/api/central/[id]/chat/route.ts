import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join, extname } from 'path'
import { aiService } from '@/lib/ai/gateway'
import type { AIContentPart, AIMessage } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

// ─── SPECIALIST AUTO-DETECTION ────────────────────────────────────────────────

const SPECIALIST_PATTERNS: [RegExp, string][] = [
  [/cct\b|clt\b|fgts|esocial|férias|rescisão|admissão|holerite|folha.*pagamento|sindicato|convenção.*coletiva|aviso.*prévio|dissídio/i, 'Departamento Pessoal'],
  [/nr-\d|ppra|pcmso|cipa|epi\b|acidente.*trabalho|saúde.*ocupacional|laudo.*médico|cat\b/i, 'Saúde e Segurança do Trabalho'],
  [/processo.*trt|vara.*trabalho|reclamação.*trabalhista|audiência.*trabalhista|ação.*trabalhista/i, 'Jurídico Trabalhista'],
  [/processo.*cível|vara.*cível|tjsp|tribunal.*justiça|apelação.*judicial/i, 'Jurídico Cível'],
  [/nf-e|nfse|ibs\b|cbs\b|sped|icms|iss\b|pis\b|cofins|nota.*fiscal|tributário/i, 'Fiscal e Tributário'],
  [/contrato|aditivo.*contrato|fornecedor|prestador.*serviço|vigência.*contrato|rescisão.*contratual/i, 'Gestão de Contratos'],
  [/balanço|demonstração.*resultado|dre\b|patrimônio.*líquido|plano.*contas|contabilidade/i, 'Contabilidade'],
  [/lgpd|dados.*pessoais|tratamento.*dados|consentimento|privacidade|anpd|dpo\b/i, 'LGPD e Privacidade'],
  [/licitação|pregão|edital.*licitação|lei.*14133|lei.*8666|dispensa.*licitação/i, 'Licitações Públicas'],
  [/compliance|auditoria|controle.*interno|segregação.*funções|sox\b/i, 'Compliance e Auditoria'],
  [/fluxo.*caixa|tesouraria|contas.*pagar|contas.*receber|orçamento.*empresa/i, 'Financeiro'],
  [/cotação|pedido.*compra|requisição.*compra|supply.*chain|sourcing/i, 'Compras e Suprimentos'],
  [/recrutamento|seleção.*pessoal|treinamento|clima.*organizacional|avaliação.*desempenho|headcount/i, 'Recursos Humanos'],
  [/iso\s*\d|norma.*qualidade|certificação|não.*conformidade|auditoria.*qualidade/i, 'Qualidade e ISO'],
  [/milestone|cronograma|gestão.*projeto|pmo\b|escopo.*projeto/i, 'Gestão de Projetos'],
  [/controladoria|orçamento.*empresarial|kpi\b|budget\b|business.*intelligence/i, 'Controladoria'],
]

function detectSpecialist(text: string, provided?: string): string {
  if (provided && provided.trim()) return provided.trim()
  const lower = text.toLowerCase()
  for (const [pattern, name] of SPECIALIST_PATTERNS) {
    if (pattern.test(lower)) return name
  }
  return 'Administrativo'
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

function buildSystem(specialist: string): string {
  return `Você é o Assistente da Entrada do NJ Assistant Office.

## ESPECIALIDADE ATIVA: ${specialist}
Você responde SEMPRE como **Especialista Sênior em ${specialist}**.
Nunca diga "Como assistente de IA…". Use sempre: "Como especialista em ${specialist}…"

## Regras de comportamento

REGRA 1 — Identidade especializada
Você é um especialista sênior em ${specialist}, não um assistente genérico. Toda resposta deve refletir o conhecimento técnico desta área.

REGRA 2 — Prioridade da última mensagem
A mensagem mais recente do usuário sempre tem prioridade. Se corrigir, aceite imediatamente.

REGRA 3 — Nunca defenda a primeira análise
Você pode estar errado. Se o usuário corrigir qualquer dado, assuma como verdadeiro e ajuste.

REGRA 4 — Converse, não apenas analise
Você é um copiloto conversacional. Pode e deve fazer perguntas curtas para entender melhor.

REGRA 5 — Só sugira ação se fizer sentido
Antes de sugerir tarefa ou ação, verifique se o documento realmente exige intervenção.
Se for informativo: "Este documento possui caráter informativo e não exige ação."

REGRA 6 — Nunca repita análises anteriores
Se o usuário continuar conversando após uma análise, responda apenas ao que foi perguntado.

REGRA 7 — Memória da conversa
Você lembra de tudo que foi dito nesta conversa. Se o usuário disse "não quero criar tarefa", já sabe disso.

REGRA 8 — Mude de opinião com naturalidade
Ao receber informação nova: "Entendido. Considerando isso, minha recomendação muda para: [nova recomendação]."

REGRA 9 — Documentos fora da especialidade
Se o documento não tiver relação com ${specialist}, informe isso claramente como especialista e indique qual área seria adequada.

## Formato das respostas
- Seja conciso. Evite parágrafos longos desnecessários.
- Use linguagem profissional mas natural.
- Quando sugerir resposta de e-mail: --- RESPOSTA SUGERIDA ---
- Quando sugerir tarefa: --- TAREFA SUGERIDA --- com Título, Descrição, Prioridade e Prazo.
- Responda sempre em português brasileiro.`
}

// ─── PROMPTS POR MODO ─────────────────────────────────────────────────────────

function buildPrompts(specialist: string): Record<string, string> {
  return {
    analyze:
      `Analise este documento como Especialista Sênior em ${specialist}. Identifique: tipo de demanda, empresa, responsável, prazo, prioridade, riscos e ações necessárias. Se não tiver relação com ${specialist}, informe claramente qual área é adequada. Seja direto e objetivo.`,
    summarize:
      `Como especialista em ${specialist}, crie um resumo executivo objetivo deste documento em até 5 linhas.`,
    'suggest-reply':
      'Crie uma resposta profissional e cordial para este e-mail. Comece com "--- RESPOSTA SUGERIDA ---" e escreva o texto completo em formato de e-mail.',
    'suggest-task':
      `Como especialista em ${specialist}, verifique se este documento exige uma tarefa. Se sim:\n--- TAREFA SUGERIDA ---\nTítulo: ...\nDescrição: ...\nPrioridade: (URGENTE/ALTA/MEDIA/BAIXA)\nPrazo sugerido: ...\nResponsável sugerido: ...\nSe não exigir ação, explique por quê.`,
    'suggest-pending':
      `Como especialista em ${specialist}, verifique se há algo pendente que exija acompanhamento. Se sim, descreva o que está pendente, quem resolve e o prazo.`,
    'suggest-conference':
      `Como especialista em ${specialist}, analise se este documento requer reunião ou conferência. Se sim, sugira objetivo, participantes e pauta.`,
    'identify-deadline':
      'Identifique todos os prazos mencionados neste documento. Para cada um: data, o que deve ser feito, urgência e consequências do não cumprimento.',
    'identify-responsible':
      `Como especialista em ${specialist}, identifique quem deve ser o responsável por tratar este documento.`,
    risks:
      `Como especialista em ${specialist}, identifique os riscos presentes neste documento. Para cada risco: descrição, impacto, urgência e mitigação.`,
    'analyze-attachments':
      `Como especialista em ${specialist}, analise os anexos deste documento. Para cada anexo: tipo, informações relevantes, pendências e riscos. Ao final, faça um resumo e indique próximas ações.`,
  }
}

// ─── FALLBACK (sem OpenAI) ────────────────────────────────────────────────────

function buildFallback(mode: string, message: string, title: string, content: string): string {
  const lc = (content + title + message).toLowerCase()

  // Detecta se o assunto parece ser de DP
  const dpKeywords = ['férias', 'rescisão', 'admissão', 'folha', 'esocial', 'holerite', 'clt', 'colaborador', 'funcionário', 'contrato de trabalho', 'convenção coletiva', 'afastamento', 'atestado', 'ponto', 'hora extra', 'aviso prévio', 'fgts', 'inss', 'dp', 'departamento pessoal']
  const isDP = dpKeywords.some(k => lc.includes(k))

  if (mode === 'suggest-reply') {
    return `--- RESPOSTA SUGERIDA ---\n\nPrezado(a),\n\nAgradeço pelo contato referente a "${title}".\n\nInformamos que sua solicitação foi recebida e será analisada pelo setor responsável. Retornaremos em breve.\n\nAtenciosamente,\nDepartamento Pessoal\n\n*(Configure OPENAI_API_KEY para respostas geradas pela IA real.)*`
  }
  if (mode === 'suggest-task') {
    if (!isDP) return `Não identifiquei relação direta deste documento com as atividades do Departamento Pessoal.\n\nNão vejo necessidade de criar tarefa. Recomendo apenas arquivar ou encaminhar ao setor responsável.\n\n*(Configure OPENAI_API_KEY para análise com IA real.)*`
    return `--- TAREFA SUGERIDA ---\nTítulo: Analisar: ${title}\nDescrição: Verificar e tratar a solicitação recebida referente a "${title}".\nPrioridade: ${lc.includes('urgent') || lc.includes('prazo') ? 'ALTA' : 'MEDIA'}\nPrazo sugerido: Em até 3 dias úteis\nResponsável sugerido: Analista de DP\n\n*(Configure OPENAI_API_KEY para sugestões personalizadas pela IA real.)*`
  }
  if (mode === 'identify-deadline') {
    const hasPrazo = lc.includes('prazo') || lc.includes('até') || lc.includes('vencimento') || lc.includes('data limite')
    return hasPrazo
      ? `Identifiquei possíveis referências a prazos neste documento. Recomendo revisão manual para confirmar as datas exatas.\n\n*(Configure OPENAI_API_KEY para extração precisa pela IA real.)*`
      : `Não foram identificados prazos explícitos neste documento.\n\n*(Configure OPENAI_API_KEY para análise detalhada com IA real.)*`
  }
  if (mode === 'summarize') {
    return `**Resumo de "${title}"**\n\nDocumento recebido${isDP ? ' com possível relação ao Departamento Pessoal' : ''}. O conteúdo requer triagem e encaminhamento ao responsável.\n\n*(Configure OPENAI_API_KEY para resumos gerados pela IA real.)*`
  }
  if (mode === 'analyze') {
    if (!isDP) return `Este documento aparentemente não possui relação direta com as atividades do Departamento Pessoal.\n\nRecomendo apenas arquivar ou encaminhar ao setor Fiscal/Contábil, caso necessário.\n\nNão identifiquei necessidade de criação de tarefa.\n\n*(Configure OPENAI_API_KEY para análise detalhada com IA real.)*`
    return `**Análise de "${title}"**\n\nConteúdo identificado como potencialmente relacionado ao Departamento Pessoal. Recomendo leitura completa para identificar a ação necessária.\n\n*(Configure OPENAI_API_KEY para análise detalhada com IA real.)*`
  }
  return `Recebi sua mensagem sobre "${title}".\n\nPara uma análise mais precisa e conversacional, configure a variável OPENAI_API_KEY no ambiente.\n\nPosso tentar ajudar com o que tiver disponível.`
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const chats = await prisma.centralChat.findMany({
    where: { itemId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(chats)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { message, mode, specialist: clientSpecialist } = body as { message: string; mode?: string; specialist?: string }

  const item = await prisma.centralItem.findUnique({
    where: { id: params.id },
    // Fetch all chat history so the AI has full conversation memory
    include: { attachments: true, chats: { orderBy: { createdAt: 'asc' } } },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ── Detect specialist ─────────────────────────────────────────────────────
  const contextForDetection = [
    item.title, item.subject, item.pastedContent, item.summary, item.keywords,
    ...item.attachments.map(a => a.fileName),
  ].filter(Boolean).join(' ')
  const specialist = detectSpecialist(contextForDetection, clientSpecialist)
  const SYSTEM   = buildSystem(specialist)
  const PROMPTS  = buildPrompts(specialist)

  // Save user message first
  await prisma.centralChat.create({
    data: { itemId: params.id, role: 'user', content: message, mode: mode || null },
  })

  // ── Read attachment content for AI context ────────────────────────────────
  const TEXT_EXTS  = new Set(['.txt', '.csv', '.xml'])
  const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

  const attachmentTextParts: string[] = []
  const imageContextParts: AIContentPart[] = []

  for (const a of item.attachments) {
    const ext = extname(a.fileName).toLowerCase()
    if (TEXT_EXTS.has(ext)) {
      try {
        const raw = await readFile(join(process.cwd(), 'public', a.filePath), 'utf-8')
        attachmentTextParts.push(`\n--- CONTEÚDO: ${a.fileName} ---\n${raw.substring(0, 2000)}`)
      } catch { /* skip unreadable */ }
    } else if (IMAGE_EXTS.has(ext)) {
      try {
        const buf      = await readFile(join(process.cwd(), 'public', a.filePath))
        const mime     = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : `image/${ext.slice(1)}`
        const dataUrl  = `data:${mime};base64,${buf.toString('base64')}`
        imageContextParts.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'high' } })
      } catch { /* skip unreadable */ }
    } else {
      attachmentTextParts.push(`📎 ${a.fileName} (${a.fileType}, ${(a.fileSize / 1024).toFixed(1)} KB)`)
    }
  }

  // ── Document context (injected once as the first user turn) ──────────────
  const docContext = [
    item.pastedContent && `CONTEÚDO DO DOCUMENTO:\n${item.pastedContent.substring(0, 3000)}`,
    item.subject       && `ASSUNTO: ${item.subject}`,
    item.senderName    && `REMETENTE: ${item.senderName}${item.senderEmail ? ` <${item.senderEmail}>` : ''}`,
    item.company       && `EMPRESA: ${item.company}`,
    attachmentTextParts.length && `ANEXOS:\n${attachmentTextParts.join('\n')}`,
  ].filter(Boolean).join('\n')
    || `TÍTULO: ${item.title}`

  // ── Full conversation history (gives the AI memory of the whole session) ─
  // Exclude the message we just saved (it'll be the final user turn below)
  const previousChats = item.chats.map(c => ({
    role: c.role as 'user' | 'assistant',
    content: c.content,
  }))

  // ── Current user turn ─────────────────────────────────────────────────────
  const modePrompt = mode ? PROMPTS[mode] : null
  const currentUserContent = modePrompt
    ? `${modePrompt}\n\n---\n\n${docContext}`
    : message

  // ── First user turn: text context + images (if any) ──────────────────────
  const firstUserContent: string | AIContentPart[] = imageContextParts.length > 0
    ? [
        { type: 'text', text: `Contexto do documento que vamos analisar:\n\n${docContext}\n\nImagens anexadas (analise-as quando solicitado):` } as AIContentPart,
        ...imageContextParts.slice(0, 4),
      ]
    : `Contexto do documento que vamos analisar:\n\n${docContext}`

  // ── Build messages array ──────────────────────────────────────────────────
  const messages = [
    { role: 'system'    as const, content: SYSTEM },
    { role: 'user'      as const, content: firstUserContent },
    { role: 'assistant' as const, content: 'Entendido. Recebi o documento e estou pronto para ajudar. Pode me fazer perguntas ou usar os botões de ação rápida.' },
    ...previousChats,
    { role: 'user'      as const, content: currentUserContent },
  ]

  let response: string
  let aiPowered = false

  if (aiService.isConfigured()) {
    try {
      const result = await aiService.ask({
        module: 'central.chat',
        specialist,
        systemPrompt: SYSTEM,
        message: currentUserContent,
        history: messages.slice(1, -1) as AIMessage[],
        maxTokens: 1200,
      })
      response = result.content
      aiPowered = result.aiPowered
    } catch {
      response = buildFallback(mode || 'free', message, item.title, item.pastedContent || '')
    }
  } else {
    response = buildFallback(mode || 'free', message, item.title, item.pastedContent || '')
  }

  // Save assistant response
  const saved = await prisma.centralChat.create({
    data: { itemId: params.id, role: 'assistant', content: response, mode: mode || null },
  })

  // Log to history
  const actionLabels: Record<string, string> = {
    analyze:               'IA analisou a entrada',
    summarize:             'IA criou resumo',
    'suggest-reply':       'IA sugeriu resposta',
    'suggest-task':        'IA sugeriu tarefa',
    'suggest-pending':     'IA sugeriu pendência',
    'suggest-conference':  'IA sugeriu conferência',
    'identify-deadline':   'IA identificou prazos',
    'identify-responsible':'IA identificou responsável',
    risks:                 'IA identificou riscos',
    'analyze-attachments': 'IA analisou anexos',
  }
  await prisma.centralHistory.create({
    data: {
      itemId: params.id,
      action: actionLabels[mode || ''] || 'IA respondeu',
      detail: `${aiPowered ? 'IA real' : 'Simulação'} · ${(mode || 'pergunta livre').replace('-', ' ')}`,
    },
  })

  // On full analyze with real AI: persist summary
  if (mode === 'analyze' && aiPowered) {
    await prisma.centralItem.update({
      where: { id: params.id },
      data: { status: 'ANALYZED', aiPowered: true, summary: response.substring(0, 500) },
    })
  }

  return NextResponse.json({ response, id: saved.id, aiPowered, specialist })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.centralChat.deleteMany({ where: { itemId: params.id } })
  return NextResponse.json({ ok: true })
}
