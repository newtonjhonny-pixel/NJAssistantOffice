import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join, extname } from 'path'
import { aiService } from '@/lib/ai/gateway'
import type { AIContentPart as ContentPart, AIMessage } from '@/lib/ai/gateway'

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
  return `Você é o Assistente de Anotações do NJ Assistant Office.

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

REGRA 5 — Nunca repita análises anteriores
Se o usuário continuar conversando, responda apenas ao que foi perguntado.

REGRA 6 — Memória da conversa
Você lembra de tudo que foi dito nesta conversa sobre esta anotação. Use esse contexto ao responder.

REGRA 7 — Mude de opinião com naturalidade
Ao receber informação nova: "Entendido. Considerando isso, minha recomendação muda para: [nova recomendação]."

REGRA 8 — Documentos fora da especialidade
Se a anotação não tiver relação com ${specialist}, informe claramente e indique qual área seria adequada.

## Formato das respostas
- Seja conciso e profissional.
- Use linguagem de um especialista em ${specialist} conversando com um colega.
- Para listas: use marcadores (•).
- Para planos de ação: etapas sequenciais numeradas.
- Para atas: estrutura formal (Data, Participantes, Pauta, Decisões, Próximas ações).
- Para e-mails: estrutura completa (Assunto, Corpo, Encerramento).
- Para relatórios: seções bem definidas.
- Responda sempre em português brasileiro.`
}

// ─── PROMPTS POR MODO ─────────────────────────────────────────────────────────

function buildPrompts(specialist: string): Record<string, string> {
  return {
    analyze:
      `Analise esta anotação como Especialista Sênior em ${specialist}. Identifique: tema principal, pontos críticos, riscos, pendências e ações necessárias. Seja direto e objetivo.`,

    improve:
      `Como especialista em ${specialist}, melhore o texto desta anotação. Torne-o mais claro, objetivo e profissional, mantendo o mesmo significado e tom. Preserve estrutura de listas e tópicos. Retorne apenas o texto melhorado.`,

    rewrite:
      `Como especialista em ${specialist}, reescreva esta anotação de forma completamente profissional e formal, adequada para um documento corporativo. Mantenha todas as informações, mas eleve o nível técnico e a linguagem.`,

    grammar:
      `Corrija todos os erros de português desta anotação (ortografia, gramática, pontuação, concordância). Mantenha o estilo e tom originais. Retorne apenas o texto corrigido.`,

    summarize:
      `Como especialista em ${specialist}, faça um resumo executivo desta anotação em até 8 linhas. Capture os pontos mais importantes, decisões, prazos e próximas ações.`,

    checklist:
      `Como especialista em ${specialist}, transforme o conteúdo desta anotação em uma lista de verificação (checklist) com itens acionáveis e específicos da área de ${specialist}. Formato:\n☐ item 1\n☐ item 2`,

    'action-plan':
      `Como especialista em ${specialist}, crie um plano de ação estruturado baseado nesta anotação no formato 5W2H simplificado. Liste cada ação com: O quê, Quem, Quando e Como. Seja prático.`,

    risks:
      `Como especialista em ${specialist}, identifique todos os riscos presentes nesta anotação. Para cada risco: descrição, impacto, urgência e mitigação recomendada.`,

    pending:
      `Como especialista em ${specialist}, identifique todas as pendências e itens que requerem acompanhamento. Para cada pendência: o que está pendente, quem resolve e prazo sugerido.`,

    responsible:
      `Como especialista em ${specialist}, identifique os responsáveis mencionados ou implícitos nesta anotação e as ações que cada um deve tomar.`,

    'extract-tasks':
      `Analise esta anotação e extraia todas as tarefas e ações que precisam ser executadas.

Use OBRIGATORIAMENTE o marcador --- TAREFAS EXTRAÍDAS --- antes da lista.

Para cada tarefa, use este formato exato:
TAREFA: [título da tarefa]
PRAZO: [data ou "Não definido"]
PRIORIDADE: [BAIXA | MEDIA | ALTA | URGENTE]
---

Seja específico. Extraia apenas tarefas concretas e acionáveis.`,

    pop:
      `Como especialista em ${specialist}, transforme o conteúdo desta anotação em um POP (Procedimento Operacional Padrão) completo. Estrutura: Título, Objetivo, Escopo, Responsáveis, Materiais/Recursos necessários, Passo a passo (numerado e detalhado), Pontos de controle, Registros necessários.`,

    'work-instruction':
      `Como especialista em ${specialist}, transforme o conteúdo desta anotação em uma Instrução de Trabalho (IT) completa. Estrutura: Código/Título, Objetivo, Aplicação, Pré-requisitos, Instruções detalhadas passo a passo, Pontos de atenção, Revisões.`,

    flow:
      `Como especialista em ${specialist}, descreva o fluxo do processo presente nesta anotação. Para cada etapa: responsável, atividade, entradas, saídas e ponto de decisão (se houver). Use linguagem clara para posterior criação de fluxograma.`,

    schedule:
      `Como especialista em ${specialist}, crie um cronograma detalhado baseado nesta anotação. Para cada atividade: nome, responsável, início previsto, fim previsto e dependências.`,

    presentation:
      `Como especialista em ${specialist}, estruture o conteúdo desta anotação como roteiro para uma apresentação profissional. Sugira: título, objetivo da apresentação, slides (nome + pontos principais de cada slide), conclusão e mensagem final.`,

    email:
      `Como especialista em ${specialist}, transforme esta anotação em um e-mail profissional e formal. Inclua: Assunto claro, Corpo bem estruturado, Encerramento cordial. Adapte o tom ao conteúdo.`,

    report:
      `Como especialista em ${specialist}, transforme esta anotação em um relatório profissional. Inclua: Título, Introdução/Contexto, Desenvolvimento (com seções), Conclusão e Recomendações.`,

    minutes:
      `Como especialista em ${specialist}, transforme esta anotação em uma ata de reunião formal. Estrutura: Data, Participantes, Pauta, Discussões e Decisões, Próximas Ações e Responsáveis, Encerramento.`,

    contract:
      `Como especialista em ${specialist}, estruture o conteúdo desta anotação como base para um contrato ou termo de acordo. Identifique as partes, objeto, obrigações de cada parte, prazos, condições e cláusulas relevantes para a área de ${specialist}.`,

    training:
      `Como especialista em ${specialist}, estruture o conteúdo desta anotação como material de treinamento. Inclua: título, objetivo do treinamento, público-alvo, conteúdo programático (módulos e tópicos), metodologia sugerida e avaliação.`,

    procedure:
      `Como especialista em ${specialist}, converta esta anotação em um procedimento corporativo formal. Estrutura: Finalidade, Abrangência, Definições, Responsabilidades, Procedimento (detalhado), Controles e Indicadores, Referências normativas.`,

    legislation:
      `Como especialista em ${specialist}, identifique toda a legislação, normas e regulamentações relacionadas ao conteúdo desta anotação. Para cada norma: nome, número/código, o que determina e como se aplica a este contexto.`,

    organize:
      `Como especialista em ${specialist}, reorganize e estruture esta anotação de forma lógica e hierárquica. Agrupe informações relacionadas, crie seções com títulos, ordene por relevância.`,

    'suggest-title':
      `Analise o conteúdo desta anotação e sugira 3 títulos claros e objetivos.

Use OBRIGATORIAMENTE o marcador --- TÍTULOS SUGERIDOS --- antes da lista.

Formato:
1. [Título opção 1]
2. [Título opção 2]
3. [Título opção 3]

Os títulos devem ser concisos (máx. 60 caracteres) e refletir o tema principal.`,

    'suggest-tags':
      `Analise esta anotação e sugira tags relevantes para categorização.

Use OBRIGATORIAMENTE o marcador --- TAGS SUGERIDAS --- antes das tags.

Formato:
[tag1], [tag2], [tag3], [tag4], [tag5]

Sugira entre 3 e 8 tags relacionadas à área de ${specialist}. Use letras minúsculas e hífen no lugar de espaços.`,
  }
}

// ─── FALLBACK (sem OpenAI) ────────────────────────────────────────────────────

function buildFallback(mode: string, title: string): string {
  if (mode === 'extract-tasks') {
    return `--- TAREFAS EXTRAÍDAS ---\n\nTAREFA: Revisar conteúdo de "${title}"\nPRAZO: Não definido\nPRIORIDADE: MEDIA\n---\n\n*(Configure OPENAI_API_KEY para extração inteligente.)*`
  }
  if (mode === 'suggest-title') {
    return `--- TÍTULOS SUGERIDOS ---\n\n1. ${title}\n2. Anotação — ${new Date().toLocaleDateString('pt-BR')}\n3. [Título personalizado]\n\n*(Configure OPENAI_API_KEY para sugestões baseadas em IA.)*`
  }
  if (mode === 'suggest-tags') {
    return `--- TAGS SUGERIDAS ---\n\nanotacao, pendente, revisao\n\n*(Configure OPENAI_API_KEY para sugestões baseadas em IA.)*`
  }
  return `Recebi sua mensagem sobre a anotação "${title}".\n\nConfigure OPENAI_API_KEY para obter análises detalhadas geradas por IA.`
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const messages = await prisma.noteAiMessage.findMany({
    where: { noteId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(messages)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { message, mode, specialist: clientSpecialist } = body as {
    message: string
    mode?: string
    specialist?: string
  }

  const note = await prisma.note.findUnique({
    where: { id: params.id },
    include: {
      tags:        true,
      attachments: true,
      aiMessages:  { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!note) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

  // ── Detect specialist ─────────────────────────────────────────────────────
  const contextForDetection = [
    note.title,
    note.category,
    stripHtmlForAI(note.content),
    note.observations,
    note.tags.map(t => t.name).join(' '),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(note.attachments as any[]).map((a: { fileName: string }) => a.fileName),
  ].filter(Boolean).join(' ')

  const specialist = detectSpecialist(contextForDetection, clientSpecialist)
  const SYSTEM     = buildSystem(specialist)
  const PROMPTS    = buildPrompts(specialist)

  // Save user message
  await prisma.noteAiMessage.create({
    data: { noteId: params.id, role: 'user', content: message, mode: mode || null },
  })

  // ── Read attachment content for AI context ────────────────────────────────
  const TEXT_EXTS  = new Set(['.txt', '.csv', '.xml'])
  const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

  const attachmentTextParts: string[] = []
  const imageContextParts: ContentPart[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of note.attachments as any[]) {
    const ext = extname(a.fileName).toLowerCase()
    if (TEXT_EXTS.has(ext)) {
      try {
        const raw = await readFile(join(process.cwd(), 'public', a.filePath), 'utf-8')
        attachmentTextParts.push(`\n--- CONTEÚDO: ${a.fileName} ---\n${raw.substring(0, 2000)}`)
      } catch { /* skip unreadable */ }
    } else if (IMAGE_EXTS.has(ext)) {
      try {
        const buf     = await readFile(join(process.cwd(), 'public', a.filePath))
        const mime    = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : `image/${ext.slice(1)}`
        const dataUrl = `data:${mime};base64,${buf.toString('base64')}`
        imageContextParts.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'high' } })
      } catch { /* skip unreadable */ }
    } else {
      attachmentTextParts.push(`📎 ${a.fileName} (${a.fileType}, ${(a.fileSize / 1024).toFixed(1)} KB)`)
    }
  }

  // ── Note context ──────────────────────────────────────────────────────────
  const tagsText   = note.tags.map((t: { name: string }) => t.name).join(', ') || 'Nenhuma'
  const noteContext = [
    `TÍTULO: ${note.title}`,
    `CATEGORIA: ${note.category}`,
    `PRIORIDADE: ${note.priority}`,
    `STATUS: ${note.status}`,
    `TAGS: ${tagsText}`,
    note.observations && `OBSERVAÇÕES: ${note.observations}`,
    `CONTEÚDO DA ANOTAÇÃO:\n${stripHtmlForAI(note.content)}`,
    attachmentTextParts.length && `ANEXOS:\n${attachmentTextParts.join('\n')}`,
  ].filter(Boolean).join('\n')

  // ── Conversation history ──────────────────────────────────────────────────
  const previousChats = note.aiMessages.map(c => ({
    role: c.role as 'user' | 'assistant',
    content: c.content,
  }))

  const modePrompt       = mode ? PROMPTS[mode] : null
  const currentUserContent = modePrompt
    ? `${modePrompt}\n\n---\n\nAnotação:\n${noteContext}`
    : message

  // ── First user turn: context + images ────────────────────────────────────
  const firstUserContent: string | ContentPart[] = imageContextParts.length > 0
    ? [
        { type: 'text', text: `Contexto da anotação que vamos trabalhar:\n\n${noteContext}\n\nImagens anexadas:` } as ContentPart,
        ...imageContextParts.slice(0, 4),
      ]
    : `Contexto da anotação que vamos trabalhar:\n\n${noteContext}`

  const messages_ = [
    { role: 'system'    as const, content: SYSTEM },
    { role: 'user'      as const, content: firstUserContent },
    { role: 'assistant' as const, content: 'Entendido. Tenho acesso ao conteúdo completo desta anotação. Como posso ajudar?' },
    ...previousChats,
    { role: 'user'      as const, content: currentUserContent },
  ]

  let response: string
  let aiPowered = false

  if (aiService.isConfigured()) {
    try {
      const result = await aiService.ask({
        module: 'notes.chat',
        specialist,
        systemPrompt: SYSTEM,
        message: currentUserContent,
        history: messages_.slice(1, -1) as AIMessage[],
        maxTokens: 1600,
      })
      response  = result.content
      aiPowered = result.aiPowered
    } catch {
      response = buildFallback(mode || 'free', note.title)
    }
  } else {
    response = buildFallback(mode || 'free', note.title)
  }

  const saved = await prisma.noteAiMessage.create({
    data: { noteId: params.id, role: 'assistant', content: response, mode: mode || null },
  })

  // Log to history
  const actionLabels: Record<string, string> = {
    analyze:           'IA analisou a anotação',
    improve:           'IA melhorou o texto',
    rewrite:           'IA reescreveu profissionalmente',
    grammar:           'IA corrigiu o português',
    summarize:         'IA gerou resumo',
    checklist:         'IA criou checklist',
    'action-plan':     'IA criou plano de ação',
    risks:             'IA identificou riscos',
    pending:           'IA identificou pendências',
    responsible:       'IA identificou responsáveis',
    'extract-tasks':   'IA extraiu tarefas',
    pop:               'IA criou POP',
    'work-instruction':'IA criou Instrução de Trabalho',
    flow:              'IA descreveu fluxo do processo',
    schedule:          'IA criou cronograma',
    presentation:      'IA criou roteiro de apresentação',
    email:             'IA gerou e-mail',
    report:            'IA gerou relatório',
    minutes:           'IA gerou ata de reunião',
    contract:          'IA estruturou contrato',
    training:          'IA criou material de treinamento',
    procedure:         'IA converteu em procedimento',
    legislation:       'IA verificou legislação',
    organize:          'IA organizou a anotação',
    'suggest-title':   'IA sugeriu título',
    'suggest-tags':    'IA sugeriu tags',
  }

  await prisma.noteHistory.create({
    data: {
      noteId: params.id,
      type:   'IA',
      title:  actionLabels[mode || ''] || 'IA respondeu no Assistente',
    },
  })

  return NextResponse.json({ response, id: saved.id, aiPowered, specialist })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.noteAiMessage.deleteMany({ where: { noteId: params.id } })
  return NextResponse.json({ ok: true })
}

function stripHtmlForAI(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
