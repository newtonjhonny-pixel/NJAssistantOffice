import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai/gateway'
import type { AIMessage } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

// ─── SPECIALIST AUTO-DETECTION ───────────────────────────────────────────────

const SPECIALIST_PATTERNS: [RegExp, string][] = [
  [/\b(ccf?t|ccv?|clt|holerite|folha|contracheque|fgts|inss|esocial|e-social|admiss[aã]o|demiss[aã]o|rescis[aã]o|f[eé]rias|aviso.?pr[eé]vio|sindicato|conven[cç][aã]o.?coletiva|homologa[cç][aã]o|ppp|caged|rais|cat\b|afastamento)\b/i, 'Departamento Pessoal'],
  [/\b(nr[-\s]?\d{1,2}|ppra|pcmso|epi|epc|cipa|laudo|ltcat|pgt|higiene.?ocupacional|seguran[cç]a.?trabalho|acid?ente.?trabalho|medicina.?trabalho|est[aá]gio|insalubridade|periculosidade)\b/i, 'Saúde e Segurança do Trabalho'],
  [/\b(processo|trt|tst|reclama[cç][aã]o.?trabalhista|a[cç][aã]o.?trabalhista|audi[eê]ncia|sentença|acórd[aã]o|perito|recurs[ao]|execu[cç][aã]o|advo[ck]ado|petição|jurisprud[eê]ncia|s[uú]mula)\b/i, 'Jurídico Trabalhista'],
  [/\b(contrato|cl[aá]usula|aditivo|fornecedor|presta[cç][aã]o.?servi[cç]o|terceiriz|nota.?de.?empenho|ordem.?de.?servi[cç]o|vigência|rescis[aã]o.?contratual)\b/i, 'Contratos'],
  [/\b(nf-?e|nfs-?e|ibs|cbs|xml|sped|ecf|ecd|efd|obriga[cç][aã]o.?fiscal|apura[cç][aã]o|regime.?tribut|simples.?nacional|lucro.?presumido|lucro.?real|icms|pis|cofins|iss|ipi)\b/i, 'Fiscal'],
  [/\b(tribut|imposto|irpj|irrf|csll|contribui[cç][aã]o|receita.?federal|parcelamento|d[eé]bito.?fiscal|dctfweb|darf|gps|gfip|sefaz)\b/i, 'Tributário'],
  [/\b(balan[cç]o|dre|balancete|ativo|passivo|demonstra[cç][aã]o|cont[aá]bil|plano.?de.?contas|lan[cç]amento|deprecia[cç][aã]o|amortiza[cç][aã]o|provisão|concilia[cç][aã]o|auditoria.?contábil)\b/i, 'Contabilidade'],
  [/\b(or[cç]amento|cronograma|entrega|implanta[cç][aã]o|milestone|escopo|pmbok|agile|sprint|backlog|projeto|ger[eê]ncia.?projeto|prazo.?entrega)\b/i, 'Projetos'],
  [/\b(fluxo.?caixa|contas.?pagar|contas.?receber|cobran[cç]a|inadimpl|boleto|pagamento|receita|despesa|dre.?financeiro|tesouraria|capital.?giro)\b/i, 'Financeiro'],
  [/\b(lgpd|privacidade|dados.?pessoais|compliance|conformidade|política|regulat[oó]rio|due.?diligence|antissuborno|anticorrup[cç][aã]o|ética|canal.?den[uú]ncia)\b/i, 'Compliance'],
  [/\b(licit[aç][aã]o|pregão|edital|proposta|lei.?8666|lei.?14133|dispensa|inexigibilidade|adjudica[cç][aã]o|homologa[cç][aã]o.?licit|concorr[eê]ncia|tomada.?pre[cç]o)\b/i, 'Licitações'],
  [/\b(norma|iso\s?\d{4}|abnt|certifica[cç][aã]o|qualidade|processo.?qualidade|melhoria.?contínua|kaizen|pdca|indicador|kpi|m[eé]trica)\b/i, 'Qualidade'],
  [/\b(rh\b|recursos.?humanos|recrutamento|sele[cç][aã]o|onboarding|treinamento|avalia[cç][aã]o.?desempenho|cargos?.e.?sal[aá]rios|clima.?organizacional|benefícios|plano.?carreira)\b/i, 'Recursos Humanos'],
  [/\b(ti\b|tecnologia|sistema|software|hardware|infraestrutura|servidor|backup|seguran[cç]a.?info|firewall|acesso|banco.?de.?dados|api|deploy|suporte.?t[eé]cnico)\b/i, 'Tecnologia da Informação'],
  [/\b(compras?|aquisi[cç][aã]o|cotação|fornecimento|estoque|almoxarifado|requisição|pedido.?compra|supply|cadeia.?suprimentos)\b/i, 'Compras'],
  [/\b(gest[aã]o|planejamento|estratégia|processos|indicadores|bsc|okr|governan[cç]a|organograma|procedimento|manual|política|regulamento.?interno)\b/i, 'Gestão Empresarial'],
]

function detectSpecialist(text: string, provided?: string): string {
  if (provided && provided.trim()) return provided.trim()
  for (const [pattern, specialist] of SPECIALIST_PATTERNS) {
    if (pattern.test(text)) return specialist
  }
  return 'Administrativo'
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

function buildSystem(specialist: string): string {
  return `Você é o Assistente da Tarefa do NJ Assistant Office.

## ESPECIALIDADE ATIVA: ${specialist}
Você responde SEMPRE como **Especialista Sênior em ${specialist}**.
Nunca diga "Como assistente de IA…". Use sempre: "Como especialista em ${specialist}…"

## O que você sabe sobre esta tarefa
Você recebe automaticamente o contexto completo: título, descrição, observações, histórico de alterações, histórico de status, responsável, prazo, prioridade, status atual, evidências e conversa completa. O usuário não precisa repetir essas informações.

## Regras de comportamento

REGRA 1 — Identidade especializada
Você é especialista sênior em ${specialist}. Toda resposta reflete o conhecimento técnico desta área, sua legislação, suas práticas e seus riscos.

REGRA 2 — Prioridade da última mensagem
A mensagem mais recente do usuário sempre tem prioridade absoluta. Se ele corrigir uma informação, aceite imediatamente.

REGRA 3 — Nunca defenda sua primeira análise
Você pode estar errado. O usuário conhece o processo e a empresa. Se corrigir qualquer dado, assuma a nova informação como verdadeira.

REGRA 4 — Converse naturalmente
Você é um copiloto conversacional. Pode fazer perguntas curtas para entender melhor o contexto antes de responder.

REGRA 5 — Só sugira ação se fizer sentido
Antes de sugerir criar tarefa, pendência ou conferência, verifique se realmente faz sentido para o contexto de ${specialist}.

REGRA 6 — Nunca repita análises anteriores
Se o usuário continuar conversando, responda apenas ao que foi perguntado, sem repetir o que já foi dito.

REGRA 7 — Memória da conversa
Você lembra de tudo que foi dito nesta conversa sobre esta tarefa. Use esse contexto ao responder.

REGRA 8 — Mude de opinião com naturalidade
Ao receber informação nova: "Entendido. Considerando isso, minha recomendação muda para: [nova recomendação]."

REGRA 9 — Expertise especializada
Ao responder, demonstre conhecimento técnico profundo em ${specialist}: cite legislação aplicável, normas, prazos legais, riscos específicos da área, boas práticas e jurisprudência quando relevante.

## Formato das respostas
- Seja conciso, profissional e objetivo.
- Use linguagem de especialista em ${specialist} conversando com um colega.
- Para checklists: use marcadores (•) com itens numerados.
- Para planos de ação: liste etapas sequenciais com responsável e prazo.
- Para pareceres: use Ementa, Análise e Conclusão.
- Para cronogramas: use etapas numeradas com datas.
- Responda sempre em português brasileiro.`
}

// ─── PROMPTS POR MODO ─────────────────────────────────────────────────────────

function buildPrompts(specialist: string): Record<string, string> {
  return {
    'analyze':
      `Como especialista em ${specialist}, analise esta tarefa de forma completa. Identifique: natureza da demanda, complexidade, riscos específicos da área de ${specialist}, prazo legal se houver, responsável adequado, próximos passos concretos e pontos de atenção. Seja direto e objetivo.`,

    'technical-opinion':
      `Como especialista em ${specialist}, elabore um parecer técnico completo sobre esta tarefa. Estruture em: Ementa (uma linha), Relatório dos fatos, Fundamentação técnica (cite legislação, normas e práticas da área de ${specialist} quando aplicável), Conclusão e recomendação objetiva.`,

    'action-plan':
      `Como especialista em ${specialist}, crie um plano de ação estruturado no formato 5W2H para esta tarefa: O quê, Por quê, Quem, Quando, Onde, Como e Quanto (se aplicável). Liste cada ação numerada com responsável e prazo. Personalize com as práticas de ${specialist}.`,

    'identify-risks':
      `Como especialista em ${specialist}, identifique todos os riscos desta tarefa. Para cada risco informe: descrição técnica, impacto (Alto/Médio/Baixo), probabilidade, prazo crítico e ação mitigadora. Inclua riscos legais, operacionais, de conformidade e específicos de ${specialist}.`,

    'identify-pending':
      `Como especialista em ${specialist}, identifique todas as pendências desta tarefa. Liste: o que está faltando, quem deve providenciar, prazo sugerido e impacto caso não seja resolvido. Seja específico para o contexto de ${specialist}.`,

    'identify-responsible':
      `Como especialista em ${specialist}, analise o contexto desta tarefa e indique: quem deveria ser o responsável ideal (perfil, cargo ou departamento), por quê essa escolha é tecnicamente adequada, e quais competências são necessárias para executar a tarefa com excelência.`,

    'send-demand':
      `Como especialista em ${specialist}, elabore uma demanda profissional e clara para o responsável por esta tarefa.

Use OBRIGATORIAMENTE o marcador --- DEMANDA GERADA --- antes do texto.

Estrutura:
Assunto: Demanda – [título personalizado conforme o tipo de tarefa]

Olá, [nome do responsável].

Foi atribuída a você a seguinte demanda:

**Tarefa:** [título completo]

**Objetivo**
[Descreva o objetivo específico, personalizado para ${specialist}. Nunca use texto genérico.]

**Atividades**
[Liste de 3 a 6 atividades práticas e específicas para ${specialist}, numeradas]

**Prazo**
[Data de prazo formatada, ou "Sem prazo definido"]

**Prioridade**
[Prioridade da tarefa]

**Observações**
[Inclua observações da tarefa se houver, ou omita se não houver]

Após concluir, atualize o status da tarefa no sistema e registre qualquer inconsistência encontrada.`,

    'generate-reply':
      `Como especialista em ${specialist}, gere uma resposta profissional e objetiva para esta tarefa. A resposta deve ser clara, cordial, tecnicamente fundamentada em ${specialist} e resolver a demanda apresentada.`,

    'generate-email':
      `Como especialista em ${specialist}, elabore um e-mail profissional relacionado ao contexto desta tarefa. Inclua: assunto sugerido, corpo do e-mail com saudação, desenvolvimento técnico fundamentado em ${specialist}, e encerramento. Use linguagem formal e adequada ao tema.`,

    'improve-description':
      `Como especialista em ${specialist}, melhore a descrição desta tarefa para que fique clara, completa e profissional. A nova descrição deve: explicar o contexto, o objetivo, as atividades esperadas e o critério de conclusão. Use terminologia adequada de ${specialist}.`,

    'create-checklist':
      `Como especialista em ${specialist}, crie um checklist completo e específico para esta tarefa. Liste todos os itens que devem ser verificados, documentos necessários, aprovações requeridas e critérios de conformidade. Organize por categorias se necessário. Seja específico para o contexto de ${specialist}.`,

    'create-schedule':
      `Como especialista em ${specialist}, crie um cronograma detalhado para execução desta tarefa. Inclua etapas numeradas, prazo estimado para cada etapa, dependências entre etapas e marcos importantes. Considere as práticas e prazos legais de ${specialist}.`,

    'suggest-priority':
      `Como especialista em ${specialist}, analise o contexto desta tarefa e sugira a prioridade mais adequada (URGENTE, ALTA, MÉDIA ou BAIXA). Justifique sua sugestão considerando: impacto legal, risco operacional, prazos e complexidade específicos de ${specialist}.`,

    'suggest-deadline':
      `Como especialista em ${specialist}, sugira o prazo mais adequado para conclusão desta tarefa. Leve em conta: prazos legais aplicáveis em ${specialist}, complexidade da execução, dependências e riscos de atraso. Justifique tecnicamente.`,

    'suggest-correction':
      `Como especialista em ${specialist}, identifique o que está incorreto ou incompleto nesta tarefa e sugira as correções necessárias. Para cada ponto: descreva o problema, o impacto e a correção recomendada conforme as práticas de ${specialist}.`,

    'summarize':
      `Como especialista em ${specialist}, faça um resumo executivo desta tarefa em até 8 linhas. Inclua: o que é, quem é o responsável, prazo, status atual, riscos principais de ${specialist} e próxima ação recomendada.`,
  }
}

// ─── FALLBACK ─────────────────────────────────────────────────────────────────

function buildFallback(mode: string, title: string, specialist: string, responsible?: string | null): string {
  if (mode === 'send-demand') {
    const resp = responsible || 'Responsável'
    return `--- DEMANDA GERADA ---\n\nAssunto: Demanda – ${title}\n\nOlá, ${resp}.\n\nFoi atribuída a você a seguinte demanda:\n\n**Tarefa:** ${title}\n\n**Objetivo**\nExecutar a atividade descrita conforme os procedimentos de ${specialist}.\n\n**Atividades**\n1. Analisar a demanda recebida\n2. Reunir a documentação necessária\n3. Executar o procedimento aplicável em ${specialist}\n4. Registrar evidências da execução\n5. Atualizar o status da tarefa no sistema\n\n*(Configure OPENAI_API_KEY para demandas personalizadas pela IA.)*`
  }
  if (mode === 'identify-risks') {
    return `**Riscos identificados — ${specialist}**\n\n• Risco de prazo: verifique se há prazo legal associado em ${specialist}.\n• Risco de conformidade: verifique alinhamento à legislação vigente de ${specialist}.\n• Risco operacional: avalie dependências de terceiros.\n\n*(Configure OPENAI_API_KEY para análise completa.)*`
  }
  if (mode === 'summarize') {
    return `**Resumo — ${title}**\n\nTarefa registrada aguardando análise por especialista em ${specialist}. Verifique status, prazo e responsável.\n\n*(Configure OPENAI_API_KEY para resumos gerados pela IA.)*`
  }
  if (mode === 'analyze') {
    return `**Análise — ${title}**\n\nTarefa identificada para análise em ${specialist}. Configure OPENAI_API_KEY para análise detalhada com riscos, prazos legais e próximos passos.\n\nSugestão imediata: verifique o prazo, o status atual e a legislação aplicável de ${specialist}.`
  }
  return `Recebi sua mensagem sobre "${title}" (${specialist}).\n\nConfigure OPENAI_API_KEY para análises, documentos e consultas de legislação com IA especialista.`
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const chats = await prisma.taskChat.findMany({
    where: { taskId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(chats)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { message, mode, specialist: providedSpecialist } = body as {
    message: string; mode?: string; specialist?: string
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      attachments:   { orderBy: { createdAt: 'asc' } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      history:       { orderBy: { createdAt: 'desc' }, take: 10 },
      chats:         { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Detect specialist from task context
  const taskText = [task.title, task.description, task.observations, task.origin].filter(Boolean).join(' ')
  const specialist = detectSpecialist(taskText, providedSpecialist)
  const SYSTEM     = buildSystem(specialist)
  const PROMPTS    = buildPrompts(specialist)

  // Save user message
  await prisma.taskChat.create({
    data: { taskId: params.id, role: 'user', content: message, mode: mode || null },
  })

  // ── Build task context ─────────────────────────────────────────────────────
  const statusHistoryText = task.statusHistory
    .map(s => `[${new Date(s.createdAt).toLocaleDateString('pt-BR')}] ${s.statusAnterior} → ${s.statusNovo}: "${s.observacao}" (por: ${s.responsavel})${s.waitingFor ? ` — aguardando: ${s.waitingFor}` : ''}`)
    .join('\n') || 'Nenhuma alteração de status ainda.'

  const recentHistory = task.history
    .slice(0, 5)
    .map(h => `• ${h.action}: ${h.description}`)
    .join('\n') || ''

  const taskContext = [
    `TÍTULO: ${task.title}`,
    task.description  && `DESCRIÇÃO: ${task.description}`,
    task.origin       && `ORIGEM: ${task.origin}`,
    `PRIORIDADE: ${task.priority}`,
    `STATUS ATUAL: ${task.status}`,
    task.responsible  && `RESPONSÁVEL: ${task.responsible}`,
    task.person       && `PESSOA/SOLICITANTE: ${task.person}`,
    task.dueDate      && `PRAZO: ${new Date(task.dueDate).toLocaleDateString('pt-BR')}`,
    task.receivedAt   && `RECEBIDA EM: ${new Date(task.receivedAt).toLocaleDateString('pt-BR')}`,
    task.observations && `OBSERVAÇÕES: ${task.observations}`,
    task.attachments.length && `EVIDÊNCIAS: ${task.attachments.length} arquivo(s) anexado(s)`,
    `\nHISTÓRICO DE STATUS:\n${statusHistoryText}`,
    recentHistory && `\nÚLTIMAS ALTERAÇÕES:\n${recentHistory}`,
  ].filter(Boolean).join('\n')

  const previousChats = task.chats.map(c => ({
    role: c.role as 'user' | 'assistant',
    content: c.content,
  }))

  const modePrompt  = mode ? PROMPTS[mode] : null
  const userContent = modePrompt
    ? `${modePrompt}\n\n---\n\nContexto da tarefa:\n${taskContext}`
    : message

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system',    content: SYSTEM },
    { role: 'user',      content: `Contexto da tarefa que vamos trabalhar:\n\n${taskContext}` },
    { role: 'assistant', content: `Entendido. Tenho acesso completo a esta tarefa. Como especialista em ${specialist}, estou pronto para ajudar. Use uma ação rápida ou faça uma pergunta.` },
    ...previousChats,
    { role: 'user',      content: userContent },
  ]

  let response: string
  let aiPowered = false

  if (aiService.isConfigured()) {
    try {
      const result = await aiService.ask({
        module: 'tasks.chat',
        specialist,
        systemPrompt: SYSTEM,
        message: userContent,
        history: messages.slice(1, -1) as AIMessage[],
        maxTokens: 1500,
      })
      response  = result.content
      aiPowered = result.aiPowered
    } catch {
      response = buildFallback(mode || 'free', task.title, specialist, task.responsible)
    }
  } else {
    response = buildFallback(mode || 'free', task.title, specialist, task.responsible)
  }

  const saved = await prisma.taskChat.create({
    data: { taskId: params.id, role: 'assistant', content: response, mode: mode || null },
  })

  const actionLabels: Record<string, string> = {
    'analyze':              'IA analisou a tarefa',
    'technical-opinion':    'IA gerou parecer técnico',
    'action-plan':          'IA criou plano de ação',
    'identify-risks':       'IA identificou riscos',
    'identify-pending':     'IA identificou pendências',
    'identify-responsible': 'IA identificou responsável',
    'send-demand':          'IA gerou demanda para o responsável',
    'generate-reply':       'IA gerou resposta',
    'generate-email':       'IA gerou e-mail',
    'improve-description':  'IA melhorou a descrição',
    'create-checklist':     'IA criou checklist',
    'create-schedule':      'IA criou cronograma',
    'suggest-priority':     'IA sugeriu prioridade',
    'suggest-deadline':     'IA sugeriu prazo',
    'suggest-correction':   'IA sugeriu correção',
    'summarize':            'IA resumiu a tarefa',
  }

  await prisma.taskHistory.create({
    data: {
      taskId:      params.id,
      action:      'IA',
      description: actionLabels[mode || ''] || `IA (${specialist}) respondeu no Assistente da Tarefa`,
    },
  })

  return NextResponse.json({ response, id: saved.id, aiPowered, specialist })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.taskChat.deleteMany({ where: { taskId: params.id } })
  return NextResponse.json({ ok: true })
}
