import { callOpenAI, isAIConfigured, ChatMessage } from './openai'
import {
  buildAssistenteSystem,
  buildAnalistaSystem,
  buildRedatorSystem,
  buildPendenciasSystem,
  buildCoordinatorSystem,
  buildTaskAnalysisPrompt,
  TaskContext,
  SystemContext,
} from './prompts'
import { prisma } from '@/lib/prisma'

export interface AgentResponse {
  agent: string
  agentName: string
  content: string
  icon: string
  aiPowered: boolean
}

const AGENT_META: Record<string, { name: string; icon: string }> = {
  ASSISTENTE: { name: 'Assistente Administrativo', icon: '🗂️' },
  ANALISTA:   { name: 'Analista Administrativo',   icon: '🔍' },
  REDATOR:    { name: 'Redator Administrativo',     icon: '✍️' },
  PENDENCIAS: { name: 'Gestor de Pendências',       icon: '⚠️' },
  COORDENADOR:{ name: 'Coordenador Administrativo', icon: '🎯' },
}

// Monta o contexto do sistema a partir do banco
export async function buildSystemContext(): Promise<SystemContext> {
  const [tasks, inbox] = await Promise.all([
    prisma.task.findMany({ orderBy: { createdAt: 'desc' }, take: 80 }),
    prisma.inboxItem.findMany({ where: { isIgnored: false, taskCreated: false } }),
  ])

  const now = new Date()
  const isActive = (t: { status: string }) => t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA'
  const isOverdue = (t: { dueDate: Date | null; status: string }) =>
    !!t.dueDate && new Date(t.dueDate) < now && isActive(t)

  const open    = tasks.filter(isActive)
  const urgent  = tasks.filter(t => t.priority === 'URGENTE' && isActive(t))
  const overdue = tasks.filter(isOverdue)
  const waiting = tasks.filter(t => t.status === 'AGUARDANDO_RETORNO')
  const completed = tasks.filter(t => t.status === 'CONCLUIDA')

  return {
    today: now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    totalOpen: open.length,
    totalUrgent: urgent.length,
    totalOverdue: overdue.length,
    totalWaiting: waiting.length,
    totalCompleted: completed.length,
    inboxCount: inbox.length,
    urgentList: urgent.slice(0, 8).map(t => ({ title: t.title, person: t.person, dueDate: t.dueDate?.toISOString() ?? null })),
    overdueList: overdue.slice(0, 8).map(t => ({ title: t.title, person: t.person, dueDate: t.dueDate?.toISOString() ?? null })),
    waitingList: waiting.slice(0, 8).map(t => ({ title: t.title, person: t.person, updatedAt: t.updatedAt.toISOString() })),
  }
}

function getSystemPrompt(agent: string, ctx: SystemContext): string {
  switch (agent) {
    case 'ASSISTENTE':  return buildAssistenteSystem(ctx)
    case 'ANALISTA':    return buildAnalistaSystem(ctx)
    case 'REDATOR':     return buildRedatorSystem(ctx)
    case 'PENDENCIAS':  return buildPendenciasSystem(ctx)
    case 'COORDENADOR': return buildCoordinatorSystem(ctx)
    default: return buildAssistenteSystem(ctx)
  }
}

// ─── ROTEAMENTO AUTOMÁTICO ───────────────────────────────────────────────────

function routeByKeywords(msg: string): string {
  const t = msg.toLowerCase()
  if (/e-?mail|carta|cobrança|redigir|texto|comunicado|resposta|notif/.test(t)) return 'REDATOR'
  if (/atras|pendên|venc|retorno|cobrar|prazo|sem moviment/.test(t)) return 'PENDENCIAS'
  if (/analis|demanda|plano|avaliar|estratégi|risco|interpret/.test(t)) return 'ANALISTA'
  if (/agenda|organizar|rotina|horário|agenda|calendário/.test(t)) return 'ASSISTENTE'
  return 'COORDENADOR'
}

export async function getOrchestratedResponse(
  userMessage: string,
  conversationHistory?: ChatMessage[]
): Promise<AgentResponse> {
  let agent: string

  if (isAIConfigured()) {
    try {
      const routing = await callOpenAI([
        {
          role: 'system',
          content:
            'Você é um roteador de agentes administrativos. Dado o pedido do usuário, responda APENAS com um dos seguintes nomes: COORDENADOR, ASSISTENTE, ANALISTA, REDATOR ou PENDENCIAS. Nada mais.',
        },
        { role: 'user', content: userMessage },
      ], { temperature: 0.1, maxTokens: 20 })
      const chosen = routing.trim().toUpperCase().replace(/[^A-ZÇÃÕ]/g, '')
      agent = ['COORDENADOR', 'ASSISTENTE', 'ANALISTA', 'REDATOR', 'PENDENCIAS'].includes(chosen)
        ? chosen
        : routeByKeywords(userMessage)
    } catch {
      agent = routeByKeywords(userMessage)
    }
  } else {
    agent = routeByKeywords(userMessage)
  }

  return getAgentResponse(agent, userMessage, conversationHistory)
}

// ─── RESPOSTA DO AGENTE NO CHAT ──────────────────────────────────────────────

export async function getAgentResponse(
  agent: string,
  userMessage: string,
  conversationHistory?: ChatMessage[]
): Promise<AgentResponse> {
  const meta = AGENT_META[agent] ?? { name: agent, icon: '🤖' }

  if (!isAIConfigured()) {
    return {
      agent,
      agentName: meta.name,
      icon: meta.icon,
      aiPowered: false,
      content: getFallbackResponse(agent, userMessage),
    }
  }

  try {
    const ctx = await buildSystemContext()
    const systemPrompt = getSystemPrompt(agent, ctx)

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory ?? []),
      { role: 'user', content: userMessage },
    ]

    const content = await callOpenAI(messages, { temperature: 0.7, maxTokens: 1500 })

    return { agent, agentName: meta.name, icon: meta.icon, aiPowered: true, content }
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'AI_NOT_CONFIGURED') {
      return {
        agent, agentName: meta.name, icon: meta.icon, aiPowered: false,
        content: getFallbackResponse(agent, userMessage),
      }
    }
    throw err
  }
}

// ─── ANÁLISE COMPLETA DE TAREFA ──────────────────────────────────────────────

export async function analyzeTask(taskId: string): Promise<AgentResponse[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      history:       { orderBy: { createdAt: 'desc' }, take: 10 },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!task) return []

  const taskCtx: TaskContext = {
    title:       task.title,
    description: task.description,
    origin:      task.origin,
    priority:    task.priority,
    status:      task.status,
    person:      task.person,
    responsible: task.responsible,
    dueDate:     task.dueDate?.toISOString()    ?? null,
    receivedAt:  task.receivedAt?.toISOString() ?? null,
    observations: task.observations,
    history: task.history.map(h => ({
      action:      h.action,
      description: h.description,
      createdAt:   h.createdAt.toISOString(),
    })),
    statusHistory: task.statusHistory.map(h => ({
      statusAnterior: h.statusAnterior,
      statusNovo:     h.statusNovo,
      observacao:     h.observacao,
      responsavel:    h.responsavel,
      waitingFor:     h.waitingFor,
      waitingReason:  h.waitingReason,
      createdAt:      h.createdAt.toISOString(),
    })),
  }

  const agents = ['ASSISTENTE', 'ANALISTA', 'PENDENCIAS', 'REDATOR', 'COORDENADOR']

  if (!isAIConfigured()) {
    return agents.map(agent => {
      const meta = AGENT_META[agent]
      return {
        agent,
        agentName: meta.name,
        icon: meta.icon,
        aiPowered: false,
        content: getFallbackTaskAnalysis(agent, taskCtx),
      }
    })
  }

  const ctx = await buildSystemContext()

  const results = await Promise.all(
    agents.map(async (agent) => {
      const meta = AGENT_META[agent]
      try {
        const systemPrompt = getSystemPrompt(agent, ctx)
        const userPrompt = buildTaskAnalysisPrompt(agent, taskCtx, ctx)
        const content = await callOpenAI([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ], { temperature: 0.6, maxTokens: 1200 })
        return { agent, agentName: meta.name, icon: meta.icon, aiPowered: true, content }
      } catch {
        return {
          agent, agentName: meta.name, icon: meta.icon, aiPowered: false,
          content: getFallbackTaskAnalysis(agent, taskCtx),
        }
      }
    })
  )

  return results
}

// ─── RESUMO INTELIGENTE DO DIA ───────────────────────────────────────────────

export async function getDailySummary(): Promise<AgentResponse> {
  const meta = AGENT_META['COORDENADOR']

  if (!isAIConfigured()) {
    const ctx = await buildSystemContext()
    return {
      agent: 'COORDENADOR',
      agentName: meta.name,
      icon: meta.icon,
      aiPowered: false,
      content: getFallbackDailySummary(ctx),
    }
  }

  try {
    const ctx = await buildSystemContext()
    const systemPrompt = buildCoordinatorSystem(ctx)
    const userPrompt = `Gere o Resumo Inteligente do Dia para Newton.
Seja direto e prático. Estruture assim:
1. **Situação atual** — panorama em 2-3 frases
2. **Prioridades imediatas** — máximo 5 itens, ordenados por urgência
3. **O que pode aguardar** — tarefas que podem ser postergadas hoje
4. **Alertas críticos** — pendências que representam risco real
5. **Recomendação do dia** — frase final de orientação estratégica`

    const content = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.6, maxTokens: 1000 })

    return { agent: 'COORDENADOR', agentName: meta.name, icon: meta.icon, aiPowered: true, content }
  } catch {
    const ctx = await buildSystemContext()
    return {
      agent: 'COORDENADOR', agentName: meta.name, icon: meta.icon, aiPowered: false,
      content: getFallbackDailySummary(ctx),
    }
  }
}

// ─── ANÁLISE DE PENDÊNCIAS ───────────────────────────────────────────────────

export async function analyzePending(taskId: string): Promise<AgentResponse> {
  const meta = AGENT_META['PENDENCIAS']
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { history: { orderBy: { createdAt: 'desc' }, take: 5 } },
  })
  if (!task) throw new Error('Tarefa não encontrada')

  const taskCtx: TaskContext = {
    title: task.title,
    description: task.description,
    origin: task.origin,
    priority: task.priority,
    status: task.status,
    person: task.person,
    dueDate: task.dueDate?.toISOString() ?? null,
    observations: task.observations,
    history: task.history.map(h => ({ action: h.action, description: h.description, createdAt: h.createdAt.toISOString() })),
  }

  if (!isAIConfigured()) {
    return {
      agent: 'PENDENCIAS', agentName: meta.name, icon: meta.icon, aiPowered: false,
      content: getFallbackTaskAnalysis('PENDENCIAS', taskCtx),
    }
  }

  try {
    const ctx = await buildSystemContext()
    const systemPrompt = buildPendenciasSystem(ctx)
    const userPrompt = buildTaskAnalysisPrompt('PENDENCIAS', taskCtx, ctx)
    const content = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.5, maxTokens: 1000 })
    return { agent: 'PENDENCIAS', agentName: meta.name, icon: meta.icon, aiPowered: true, content }
  } catch {
    return {
      agent: 'PENDENCIAS', agentName: meta.name, icon: meta.icon, aiPowered: false,
      content: getFallbackTaskAnalysis('PENDENCIAS', taskCtx),
    }
  }
}

// ─── ANÁLISE DE PROJETO ──────────────────────────────────────────────────────

const PROJECT_MANAGER_SYSTEM = `Você é um Gerente de Projetos Sênior, especialista em planejamento, cronogramas, gestão de riscos, acompanhamento de entregas, organização de equipes e melhoria contínua. Analise os dados do projeto enviados pelo sistema, identifique riscos, gargalos, prioridades e oportunidades de melhoria. Nunca altere o projeto automaticamente. Apenas produza recomendações claras, objetivas e profissionais. Responda em português brasileiro. Use formatação markdown.`

export interface ProjectAnalysisInput {
  name: string
  description: string | null
  objective: string | null
  responsible: string | null
  status: string
  priority: string
  startDate: string | null
  dueDate: string | null
  progress: number
  totalDays: number | null
  elapsedDays: number | null
  remainDays: number | null
  totalTasks: number
  doneTasks: number
  stages: {
    name: string; status: string; startDate: string | null; dueDate: string | null
    progress: number; tasks: {
      title: string; description: string | null; responsible: string | null
      priority: string; status: string; dueDate: string | null; progress: number
    }[]
  }[]
  milestones: {
    title: string; status: string; dueDate: string | null
    completedAt: string | null; description: string | null
  }[]
}

function buildProjectPrompt(p: ProjectAnalysisInput): string {
  const fmt = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'

  const STATUS_PT: Record<string, string> = {
    PLANEJADO: 'Planejado', EM_ANDAMENTO: 'Em andamento', PAUSADO: 'Pausado',
    ATRASADO: 'Atrasado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
    NAO_INICIADA: 'Não iniciada', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
    AGUARDANDO: 'Aguardando', ATRASADA: 'Atrasada',
    PENDENTE: 'Pendente', AGUARDANDO_RETORNO: 'Aguardando retorno',
  }
  const PRIO_PT: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }

  const st = (v: string) => STATUS_PT[v] ?? v
  const pr = (v: string) => PRIO_PT[v] ?? v

  let txt = `=== DADOS DO PROJETO PARA ANÁLISE ===\n\n`
  txt += `INFORMAÇÕES GERAIS\n`
  txt += `- Nome: ${p.name}\n`
  if (p.description) txt += `- Descrição: ${p.description}\n`
  if (p.objective)   txt += `- Objetivo: ${p.objective}\n`
  txt += `- Responsável: ${p.responsible ?? 'Não definido'}\n`
  txt += `- Status: ${st(p.status)}\n`
  txt += `- Prioridade: ${pr(p.priority)}\n`
  txt += `- Início: ${fmt(p.startDate)} | Prazo: ${fmt(p.dueDate)}\n`
  txt += `- Dias totais: ${p.totalDays ?? '?'} | Decorridos: ${p.elapsedDays ?? '?'} | `
  txt += p.remainDays !== null
    ? (p.remainDays < 0 ? `EM ATRASO: ${Math.abs(p.remainDays)} dias\n` : `Restantes: ${p.remainDays} dias\n`)
    : 'Sem prazo definido\n'
  txt += `- Progresso geral: ${p.progress}% (${p.doneTasks}/${p.totalTasks} tarefas concluídas)\n\n`

  txt += `ETAPAS (${p.stages.length} etapas)\n`
  p.stages.forEach((s, i) => {
    const sDone = s.tasks.filter(t => t.status === 'CONCLUIDA').length
    const sProg = s.tasks.length > 0 ? Math.round((sDone / s.tasks.length) * 100) : s.progress
    const lateStage = s.dueDate && new Date(s.dueDate) < new Date() && s.status !== 'CONCLUIDA'
    txt += `\nEtapa ${i + 1}: ${s.name}${lateStage ? ' ⚠️ ATRASADA' : ''}\n`
    txt += `  Status: ${st(s.status)} | ${fmt(s.startDate)} → ${fmt(s.dueDate)} | Progresso: ${sProg}%\n`
    txt += `  Tarefas: ${s.tasks.length} (${sDone} concluídas)\n`
    s.tasks.forEach(t => {
      const late = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'CONCLUIDA'
      txt += `  - [${st(t.status)}] ${t.title}${late ? ' ⚠️ ATRASADA' : ''}\n`
      txt += `    Prioridade: ${pr(t.priority)} | Resp: ${t.responsible ?? 'N/D'} | Prazo: ${fmt(t.dueDate)}\n`
      if (t.description) txt += `    Obs: ${t.description.slice(0, 120)}\n`
    })
  })

  txt += `\nENTREGAS (${p.milestones.length} entregas)\n`
  p.milestones.forEach(m => {
    const late = m.dueDate && new Date(m.dueDate) < new Date() && m.status === 'PENDENTE'
    txt += `- ${m.title}${late ? ' ⚠️ ATRASADA' : ''}\n`
    txt += `  Status: ${st(m.status)} | Prevista: ${fmt(m.dueDate)}`
    if (m.completedAt) txt += ` | Realizada: ${fmt(m.completedAt)}`
    txt += '\n'
    if (m.description) txt += `  Obs: ${m.description}\n`
  })

  txt += `\n=== RELATÓRIO SOLICITADO ===\n`
  txt += `Produza um relatório executivo completo com EXATAMENTE estas 10 seções em markdown:\n\n`
  txt += `## 1. Resumo Executivo\n`
  txt += `## 2. Saúde do Projeto\n(classifique como 🟢 Saudável / 🟡 Atenção / 🔴 Crítico com justificativa)\n`
  txt += `## 3. Riscos Encontrados\n`
  txt += `## 4. Gargalos\n`
  txt += `## 5. Top 5 Prioridades Imediatas\n(ordenadas da mais urgente à menos urgente)\n`
  txt += `## 6. Avaliação do Cronograma\n(responda claramente: SIM o projeto terminará no prazo, ou NÃO, e explique)\n`
  txt += `## 7. Sugestões de Melhoria\n`
  txt += `## 8. Indicadores\n`
  txt += `(use barras ASCII: ████████░░ 80% — mostre Projeto, Etapas e Tarefas)\n`
  txt += `## 9. Parecer do Coordenador\n(em primeira pessoa, como se você fosse o coordenador do projeto)\n`
  txt += `## 10. Plano de Ação\n(divida em: **Hoje**, **Esta semana**, **Próxima semana**, **Até a entrega**)\n`

  return txt
}

function buildProjectFallback(p: ProjectAnalysisInput): string {
  const lateStages   = p.stages.filter(s => s.dueDate && new Date(s.dueDate) < new Date() && s.status !== 'CONCLUIDA')
  const noResp       = p.stages.flatMap(s => s.tasks).filter(t => !t.responsible && t.status !== 'CONCLUIDA')
  const lateTasks    = p.stages.flatMap(s => s.tasks).filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'CONCLUIDA')
  const isLate       = p.remainDays !== null && p.remainDays < 0
  const health       = isLate || lateStages.length > 0 ? '🔴 Crítico' : p.progress < 30 && (p.elapsedDays ?? 0) > (p.totalDays ?? 999) / 2 ? '🟡 Atenção' : '🟢 Saudável'
  const bar          = (v: number) => '█'.repeat(Math.round(v / 10)) + '░'.repeat(10 - Math.round(v / 10)) + ` ${v}%`
  const stagesDone   = p.stages.filter(s => s.status === 'CONCLUIDA').length
  const stagesPct    = p.stages.length > 0 ? Math.round((stagesDone / p.stages.length) * 100) : 0

  return `## 1. Resumo Executivo

O projeto **${p.name}** apresenta **${p.progress}% de conclusão** com ${p.doneTasks} de ${p.totalTasks} tarefas concluídas.
${isLate ? `⚠️ O projeto está com **${Math.abs(p.remainDays ?? 0)} dia(s) de atraso**.` : p.remainDays !== null ? `Restam **${p.remainDays} dias** para o prazo final.` : 'Sem prazo definido.'}
Existem **${lateStages.length} etapa(s) atrasada(s)** e **${lateTasks.length} tarefa(s) com prazo vencido**.

## 2. Saúde do Projeto

**${health}**
${health.includes('Crítico') ? 'O projeto apresenta atrasos relevantes que exigem ação imediata.' : health.includes('Atenção') ? 'O projeto está progredindo mas requer monitoramento próximo.' : 'O projeto está no caminho certo.'}

## 3. Riscos Encontrados

${lateStages.length > 0 ? `- ⚠️ ${lateStages.length} etapa(s) com prazo vencido\n` : ''}\
${lateTasks.length > 0  ? `- ⚠️ ${lateTasks.length} tarefa(s) com prazo vencido\n` : ''}\
${noResp.length > 0     ? `- ⚠️ ${noResp.length} tarefa(s) sem responsável definido\n` : ''}\
${p.milestones.filter(m => !m.dueDate && m.status === 'PENDENTE').length > 0 ? `- ⚠️ Entregas sem data prevista definida\n` : ''}\
- Acompanhamento regular é essencial para manter o projeto no prazo

## 4. Gargalos

${p.stages.filter(s => s.status === 'NAO_INICIADA').map(s => `- Etapa **${s.name}** ainda não iniciada`).join('\n') || '- Nenhum gargalo crítico identificado com os dados disponíveis'}

## 5. Top 5 Prioridades Imediatas

${p.stages.flatMap(s => s.tasks)
  .filter(t => t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA')
  .sort((a, b) => {
    const pMap: Record<string, number> = { URGENTE: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 }
    return (pMap[b.priority] ?? 0) - (pMap[a.priority] ?? 0)
  })
  .slice(0, 5)
  .map((t, i) => `${i + 1}. **${t.title}** (${t.priority === 'URGENTE' ? 'Urgente' : t.priority === 'ALTA' ? 'Alta' : 'Média'})`)
  .join('\n') || '- Nenhuma tarefa pendente encontrada'}

## 6. Avaliação do Cronograma

**${isLate ? 'NÃO' : p.progress >= 80 ? 'SIM' : p.remainDays !== null && p.remainDays < 14 && p.progress < 70 ? 'NÃO (risco alto)' : 'SIM (com esforço)'}**
${isLate ? `O projeto já ultrapassou o prazo em ${Math.abs(p.remainDays ?? 0)} dia(s).` : `Com ${p.progress}% concluído e ${p.remainDays ?? '?'} dia(s) restantes, o cumprimento do prazo depende do ritmo atual ser mantido.`}

## 7. Sugestões de Melhoria

- Revisar o planejamento das etapas com maior atraso
- Garantir que todas as tarefas tenham responsável definido
- Realizar reuniões de acompanhamento semanais
- Atualizar o status das entregas conforme realizado

## 8. Indicadores

**Projeto:**  ${bar(p.progress)}
**Etapas:**   ${bar(stagesPct)}
**Tarefas:**  ${bar(p.progress)}

## 9. Parecer do Coordenador

"Se eu fosse o coordenador deste projeto, neste momento concentraria esforços em ${lateStages[0] ? `concluir a etapa **${lateStages[0].name}** urgentemente` : lateTasks[0] ? `resolver a tarefa **${lateTasks[0].title}**` : 'manter o ritmo atual de progresso'}. Com ${p.progress}% concluído, ${isLate ? 'o projeto precisa recuperar o atraso imediatamente' : 'ainda é possível entregar dentro do prazo com esforço disciplinado'}."

## 10. Plano de Ação

**Hoje:**
${lateTasks.slice(0, 2).map(t => `- Resolver tarefa: ${t.title}`).join('\n') || '- Revisar o status atual do projeto'}

**Esta semana:**
${lateStages.slice(0, 2).map(s => `- Avançar na etapa: ${s.name}`).join('\n') || '- Avançar nas etapas em andamento'}

**Próxima semana:**
- Revisar progresso e atualizar cronograma
- Validar entregas pendentes

**Até a entrega:**
- Garantir conclusão de todas as etapas
- Realizar testes e validações finais

---
💡 *Configure a variável **OPENAI_API_KEY** no **.env** para análise com IA real.*`
}

export async function analyzeProject(input: ProjectAnalysisInput): Promise<{ content: string; aiPowered: boolean }> {
  if (!isAIConfigured()) {
    return { content: buildProjectFallback(input), aiPowered: false }
  }

  try {
    const userPrompt = buildProjectPrompt(input)
    const content = await callOpenAI([
      { role: 'system', content: PROJECT_MANAGER_SYSTEM },
      { role: 'user',   content: userPrompt },
    ], { temperature: 0.5, maxTokens: 3000 })
    return { content, aiPowered: true }
  } catch (err) {
    if (err instanceof Error && err.message === 'AI_NOT_CONFIGURED') {
      return { content: buildProjectFallback(input), aiPowered: false }
    }
    throw err
  }
}

// ─── FALLBACKS (sem chave configurada) ──────────────────────────────────────

function getFallbackResponse(agent: string, msg: string): string {
  const lower = msg.toLowerCase()
  if (agent === 'ASSISTENTE') {
    return `Sou o **Assistente Administrativo**.\n\nPosso ajudá-lo a organizar sua rotina, identificar prioridades e sugerir a execução do dia.\n\n💡 Para ativar respostas com Inteligência Artificial real, configure a variável **OPENAI_API_KEY** no arquivo **.env** do projeto.`
  }
  if (agent === 'ANALISTA') {
    return `Sou o **Analista Administrativo**.\n\nPosso interpretar demandas, sugerir planos de ação e identificar riscos.\n\n💡 Configure a variável **OPENAI_API_KEY** no **.env** para análises com IA real.`
  }
  if (agent === 'REDATOR') {
    return `Sou o **Redator Administrativo**.\n\nPosso redigir e-mails, cobranças, comunicados e mensagens profissionais.\n\n💡 Configure a variável **OPENAI_API_KEY** no **.env** para geração de textos com IA real.\n\n⚠️ Nenhuma mensagem é enviada automaticamente.`
  }
  if (agent === 'PENDENCIAS') {
    return `Sou o **Gestor de Pendências**.\n\nMonitoro atividades atrasadas, sem movimentação e aguardando retorno.\n\n💡 Configure a variável **OPENAI_API_KEY** no **.env** para análises inteligentes de pendências.`
  }
  return `Sou o **Coordenador Administrativo**.\n\nAnaliso o cenário completo e defino prioridades estratégicas.\n\n💡 Configure a variável **OPENAI_API_KEY** no **.env** para ativar a IA real.`
}

function getFallbackTaskAnalysis(agent: string, task: TaskContext): string {
  const PRIORITY: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }
  const STATUS: Record<string, string> = {
    PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em andamento',
    AGUARDANDO_RETORNO: 'Aguardando retorno', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada'
  }
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  const base = `**Tarefa:** ${task.title}\n**Prioridade:** ${PRIORITY[task.priority]}\n**Status:** ${STATUS[task.status]}${task.person ? `\n**Responsável:** ${task.person}` : ''}${isOverdue ? '\n⚠️ **Prazo vencido**' : ''}\n\n`

  const notice = `\n\n---\n💡 *Configure a variável **OPENAI_API_KEY** no **.env** para ativar análise com IA real.*`

  if (agent === 'ASSISTENTE') return base + `**Sugestão de organização:**\n1. Verifique todos os dados relacionados a esta tarefa\n2. Confirme as partes envolvidas\n3. Defina um prazo realista de resolução\n4. Registre atualizações no sistema` + notice
  if (agent === 'ANALISTA') return base + `**Plano de ação sugerido:**\n1. Levantamento de informações relevantes\n2. Identificação dos responsáveis\n3. Avaliação de impacto\n4. Definição de próximos passos\n5. Acompanhamento até conclusão\n\n**Possíveis riscos:** Prazo vencido ou próximo do vencimento pode gerar impactos operacionais.` + notice
  if (agent === 'REDATOR') return base + `**Sugestão de resposta:**\n\n---\nPrezado(a) ${task.person ?? '[Nome]'},\n\nInformamos que a atividade "${task.title}" está sendo acompanhada e tomamos as providências necessárias.\n\nRetornaremos com atualização em breve.\n\nAtenciosamente,\nNewton — Gestão Administrativa\n---\n\n⚠️ Revise e adapte antes de enviar.` + notice
  if (agent === 'PENDENCIAS') {
    const risk = task.priority === 'URGENTE' || isOverdue ? '🔴 Crítico' : task.status === 'AGUARDANDO_RETORNO' ? '🟡 Atenção' : '🟢 Monitorar'
    return base + `**Nível de risco:** ${risk}\n\n**Análise:** ${isOverdue ? 'Esta atividade está com prazo vencido e requer ação imediata.' : task.status === 'AGUARDANDO_RETORNO' ? 'Esta atividade aguarda retorno e deve ser cobrada em breve.' : 'Atividade dentro do prazo, mas deve ser monitorada.'}\n\n**Próxima ação:** ${task.person ? `Contatar ${task.person} para obter atualização.` : 'Identificar responsável e solicitar atualização.'}` + notice
  }
  return base + `**Avaliação estratégica:**\n\nEsta tarefa deve ser tratada com prioridade ${PRIORITY[task.priority].toLowerCase()}. ${isOverdue ? 'O prazo vencido exige ação imediata.' : 'Monitore o progresso regularmente.'}\n\n**Recomendação:** ${task.priority === 'URGENTE' ? 'Resolva hoje.' : task.priority === 'ALTA' ? 'Resolva esta semana.' : 'Agende para resolução nos próximos dias.'}` + notice
}

// ─── ANÁLISE DE CONFERÊNCIA ──────────────────────────────────────────────────

const CONFERENCE_COORDINATOR_SYSTEM = `Você é um Coordenador Administrativo especialista em conferência de processos trabalhistas, folha de pagamento, rescisão, férias, encargos, benefícios e obrigações acessórias. Analise os dados enviados e produza um relatório completo, objetivo e profissional. Nunca altere dados automaticamente. Responda em português brasileiro. Use formatação markdown.`

export interface ConferenceAnalysisInput {
  title: string
  processType: string
  competence: string | null
  companyUnit: string | null
  analystName: string | null
  coordinatorName: string | null
  conferenceDate: string | null
  correctionDueDate: string | null
  status: string
  priority: string
  description: string | null
  notes: string | null
  checklist: {
    description: string; result: string; notes: string | null
    correctionResponsible: string | null; correctionDueDate: string | null
  }[]
  issues: {
    title: string; description: string | null; severity: string
    impact: string | null; probableCause: string | null
    recommendedSolution: string | null; correctionStatus: string
    correctionResponsible: string | null
  }[]
}

const PROCESS_TYPE_PT: Record<string, string> = {
  FOLHA: 'Folha de Pagamento', RESCISAO: 'Rescisão', FERIAS: 'Férias',
  ADMISSAO: 'Admissão', BENEFICIOS: 'Benefícios', ENCARGOS: 'Encargos',
  PAGAMENTO: 'Pagamento', MOVIMENTACAO: 'Movimentação', PONTO: 'Ponto',
  ESOCIAL: 'eSocial', FGTS: 'FGTS', IRRF: 'IRRF', DCTFWEB: 'DCTFWeb', OUTROS: 'Outros',
}

const CHECKLIST_RESULT_PT: Record<string, string> = {
  CONFORME: 'Conforme', NAO_CONFORME: 'Não conforme',
  NAO_APLICA: 'Não se aplica', PENDENTE_ANALISE: 'Pendente de análise',
}

const SEVERITY_PT: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica' }

function buildConferencePrompt(c: ConferenceAnalysisInput, analysisType: string): string {
  const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
  const nonConformes = c.checklist.filter(i => i.result === 'NAO_CONFORME')
  const pendentes    = c.checklist.filter(i => i.result === 'PENDENTE_ANALISE')

  let txt = `=== DADOS DA CONFERÊNCIA ===\n\n`
  txt += `Título: ${c.title}\n`
  txt += `Tipo de processo: ${PROCESS_TYPE_PT[c.processType] ?? c.processType}\n`
  txt += `Competência: ${c.competence ?? '—'}\n`
  txt += `Empresa/Unidade: ${c.companyUnit ?? '—'}\n`
  txt += `Analista: ${c.analystName ?? '—'}\n`
  txt += `Coordenador: ${c.coordinatorName ?? '—'}\n`
  txt += `Data da conferência: ${fmt(c.conferenceDate)}\n`
  txt += `Prazo para correção: ${fmt(c.correctionDueDate)}\n`
  txt += `Status: ${c.status}\n`
  txt += `Prioridade: ${c.priority}\n`
  if (c.description) txt += `\nDescrição: ${c.description}\n`
  if (c.notes) txt += `Observações: ${c.notes}\n`

  txt += `\n=== CHECKLIST (${c.checklist.length} itens) ===\n`
  c.checklist.forEach((item, i) => {
    txt += `${i + 1}. [${CHECKLIST_RESULT_PT[item.result] ?? item.result}] ${item.description}`
    if (item.notes) txt += ` — ${item.notes}`
    txt += '\n'
  })
  txt += `\nResumo checklist: ${c.checklist.filter(i => i.result === 'CONFORME').length} conformes, ${nonConformes.length} não conformes, ${pendentes.length} pendentes, ${c.checklist.filter(i => i.result === 'NAO_APLICA').length} não se aplicam.\n`

  if (c.issues.length > 0) {
    txt += `\n=== INCONSISTÊNCIAS (${c.issues.length}) ===\n`
    c.issues.forEach((issue, i) => {
      txt += `${i + 1}. ${issue.title} [Gravidade: ${SEVERITY_PT[issue.severity] ?? issue.severity}] [Status: ${issue.correctionStatus}]\n`
      if (issue.description) txt += `   Descrição: ${issue.description}\n`
      if (issue.impact)       txt += `   Impacto: ${issue.impact}\n`
    })
  } else {
    txt += `\n=== INCONSISTÊNCIAS: Nenhuma registrada ===\n`
  }

  const TYPE_INSTRUCTIONS: Record<string, string> = {
    COMPLETA: `Gere um relatório completo de análise da conferência com as seguintes seções numeradas:
## 1. Resumo da Conferência
## 2. Problemas Encontrados
## 3. Riscos
## 4. Causa Provável
## 5. Solução Recomendada
## 6. Prevenção
## 7. Texto para Encaminhamento ao Analista
## 8. Parecer do Coordenador`,

    TEXTO_CORRECAO: `Gere um texto profissional para encaminhar ao analista responsável solicitando correção dos problemas encontrados. O texto deve ser cordial, objetivo e profissional, listando os pontos que precisam ser corrigidos. Use saudação formal, descreva os problemas de forma clara e inclua prazo.`,

    ORIENTACAO_ANALISTA: `Gere uma orientação técnica detalhada para o analista sobre como corrigir os problemas encontrados. Inclua passo a passo, referências legais se aplicável e boas práticas do processo.`,

    PARECER_FINAL: `Gere um parecer técnico formal do coordenador sobre a conferência. Inclua: situação encontrada, conclusão da análise, recomendações finais e se o processo está aprovado, reprovado ou aguardando correção.`,

    PLANO_PREVENCAO: `Gere um plano de prevenção para evitar que os problemas encontrados se repitam. Inclua: causa raiz identificada, medidas preventivas, sugestão de checklist melhorado, treinamento recomendado e indicadores de monitoramento.`,

    CHECKLIST_SUGERIDO: `Gere um checklist completo e detalhado para conferência do processo "${PROCESS_TYPE_PT[c.processType] ?? c.processType}". Liste todos os pontos críticos que devem ser verificados, em ordem lógica, numerados. Para cada item, use o formato: "N. [descrição clara do que verificar]".`,
  }

  txt += `\n=== INSTRUÇÃO ===\n${TYPE_INSTRUCTIONS[analysisType] ?? TYPE_INSTRUCTIONS.COMPLETA}`
  return txt
}

function buildConferenceFallback(c: ConferenceAnalysisInput, analysisType: string): string {
  const nonConformes = c.issues.filter(i => i.severity === 'CRITICA' || i.severity === 'ALTA')
  const totalIssues  = c.issues.length
  const notOk        = c.checklist.filter(i => i.result === 'NAO_CONFORME').length

  if (analysisType === 'CHECKLIST_SUGERIDO') {
    const checklists: Record<string, string[]> = {
      FOLHA: ['Conferir eventos lançados', 'Conferir base de INSS', 'Conferir base de FGTS', 'Conferir IRRF', 'Conferir descontos', 'Conferir líquidos', 'Conferir admissões no mês', 'Conferir rescisões no mês', 'Conferir férias no mês', 'Conferir horas extras', 'Conferir vale-transporte', 'Conferir vale-alimentação'],
      RESCISAO: ['Conferir motivo da rescisão', 'Conferir aviso-prévio', 'Conferir saldo de salário', 'Conferir férias vencidas e proporcionais', 'Conferir 13º proporcional', 'Conferir descontos', 'Conferir FGTS e multa', 'Conferir prazo de pagamento', 'Conferir eventos enviados ao eSocial'],
      FERIAS: ['Conferir período aquisitivo', 'Conferir período de gozo', 'Conferir 1/3 constitucional', 'Conferir médias de variáveis', 'Conferir descontos', 'Conferir prazo de pagamento (2 dias antes)', 'Conferir recibo de férias', 'Conferir comunicação com antecedência'],
      ADMISSAO: ['Conferir documentos do colaborador', 'Conferir ficha de registro', 'Conferir contrato de trabalho', 'Conferir envio ao eSocial (S-2200)', 'Conferir CTPS', 'Conferir exame admissional', 'Conferir benefícios cadastrados', 'Conferir banco de dados atualizado'],
      ENCARGOS: ['Conferir base de cálculo INSS patronal', 'Conferir base de cálculo FGTS', 'Conferir alíquotas aplicadas', 'Conferir GPS/GRF gerada', 'Conferir competência', 'Conferir vencimento'],
    }
    const items = checklists[c.processType] ?? ['Conferir dados do processo', 'Conferir documentação de suporte', 'Conferir prazos legais', 'Conferir lançamentos realizados', 'Conferir cálculos aplicados', 'Conferir envios obrigatórios']
    return `## Checklist Sugerido — ${PROCESS_TYPE_PT[c.processType] ?? c.processType}\n\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\n---\n💡 *Configure OPENAI_API_KEY para checklist personalizado com IA.*`
  }

  if (analysisType === 'TEXTO_CORRECAO') {
    return `**Texto para Encaminhamento**\n\n---\n\nBom dia, ${c.analystName ?? '[Analista]'}.\n\nDurante a conferência do processo de **${PROCESS_TYPE_PT[c.processType] ?? c.processType}**${c.competence ? ` da competência **${c.competence}**` : ''}, identificamos ${totalIssues > 0 ? `**${totalIssues} ponto(s)** que requer(em) correção` : 'pontos que precisam de revisão'}.\n\n${c.issues.slice(0, 3).map((iss, i) => `${i + 1}. **${iss.title}**${iss.description ? ` — ${iss.description}` : ''}`).join('\n')}\n\nSolicito a gentileza de verificar os pontos acima e realizar as correções necessárias para validação final do processo${c.correctionDueDate ? ` até **${new Date(c.correctionDueDate).toLocaleDateString('pt-BR')}**` : ''}.\n\nQualquer dúvida, fico à disposição.\n\nAtenciosamente,\n${c.coordinatorName ?? 'Coordenador'}\n\n---\n\n💡 *Configure OPENAI_API_KEY para texto personalizado com IA.*`
  }

  if (analysisType === 'PARECER_FINAL') {
    const situacao = totalIssues === 0 ? 'APROVADO' : notOk > 0 ? 'REPROVADO — AGUARDANDO CORREÇÃO' : 'COM RESSALVAS'
    return `## Parecer Técnico do Coordenador\n\n**Processo:** ${PROCESS_TYPE_PT[c.processType] ?? c.processType}${c.competence ? ` — ${c.competence}` : ''}\n**Situação:** ${situacao}\n\n**Análise:**\nForam conferidos ${c.checklist.length} itens do checklist. ${notOk > 0 ? `Identificou-se **${notOk} item(ns) não conforme(s)**` : 'Todos os itens verificados estão conformes'}. ${totalIssues > 0 ? `Foram registradas **${totalIssues} inconsistência(s)**${nonConformes.length > 0 ? `, sendo ${nonConformes.length} de gravidade alta ou crítica` : ''}.` : 'Não foram registradas inconsistências.'}\n\n**Conclusão:**\n${totalIssues === 0 ? 'O processo está em conformidade e pode seguir para aprovação final.' : `O processo requer correção dos pontos indicados antes da aprovação final.`}\n\n---\n💡 *Configure OPENAI_API_KEY para parecer personalizado com IA.*`
  }

  // COMPLETA (fallback)
  return `## 1. Resumo da Conferência\n\nConferência de **${PROCESS_TYPE_PT[c.processType] ?? c.processType}**${c.competence ? ` — competência ${c.competence}` : ''}. Processo analisado pelo coordenador${c.coordinatorName ? ` ${c.coordinatorName}` : ''}. Total de ${c.checklist.length} itens no checklist.\n\n## 2. Problemas Encontrados\n\n${totalIssues > 0 ? c.issues.map((iss, i) => `${i + 1}. **${iss.title}** [${SEVERITY_PT[iss.severity] ?? iss.severity}]${iss.description ? ` — ${iss.description}` : ''}`).join('\n') : '✅ Nenhuma inconsistência registrada.'}\n\n## 3. Riscos\n\n${nonConformes.length > 0 ? `⚠️ Foram identificadas ${nonConformes.length} inconsistência(s) de alta gravidade que podem gerar impactos administrativos, financeiros ou trabalhistas.` : 'Nenhum risco crítico identificado no momento.'}\n\n## 4. Causa Provável\n\n${c.issues[0]?.probableCause ?? 'Análise de causa raiz requer revisão detalhada do processo.'}\n\n## 5. Solução Recomendada\n\n${c.issues[0]?.recommendedSolution ?? 'Revisar os itens não conformes e realizar as correções necessárias antes da aprovação final.'}\n\n## 6. Prevenção\n\n- Reforçar checklist padrão antes do lançamento\n- Realizar dupla conferência em processos críticos\n- Atualizar procedimentos operacionais conforme os erros identificados\n\n## 7. Texto para Encaminhamento\n\nBom dia, ${c.analystName ?? '[Analista]'}.\n\nDurante a conferência do processo de ${PROCESS_TYPE_PT[c.processType] ?? c.processType}${c.competence ? ` da competência ${c.competence}` : ''}, identificamos pontos que requerem correção. Solicito verificação e ajuste para validação final.\n\nAtenciosamente,\n${c.coordinatorName ?? 'Coordenador'}\n\n## 8. Parecer do Coordenador\n\n${totalIssues === 0 ? '✅ Processo conferido e aprovado.' : `⚠️ Processo requer correção de ${totalIssues} ponto(s) antes da aprovação final.`}\n\n---\n💡 *Configure OPENAI_API_KEY para análise com IA real.*`
}

export async function analyzeConference(
  input: ConferenceAnalysisInput,
  analysisType: string = 'COMPLETA'
): Promise<{ content: string; aiPowered: boolean }> {
  if (!isAIConfigured()) {
    return { content: buildConferenceFallback(input, analysisType), aiPowered: false }
  }
  try {
    const userPrompt = buildConferencePrompt(input, analysisType)
    const content = await callOpenAI([
      { role: 'system', content: CONFERENCE_COORDINATOR_SYSTEM },
      { role: 'user',   content: userPrompt },
    ], { temperature: 0.5, maxTokens: 3000 })
    return { content, aiPowered: true }
  } catch (err) {
    if (err instanceof Error && err.message === 'AI_NOT_CONFIGURED') {
      return { content: buildConferenceFallback(input, analysisType), aiPowered: false }
    }
    throw err
  }
}

function getFallbackDailySummary(ctx: SystemContext): string {
  const topItems = [...ctx.urgentList, ...ctx.overdueList]
    .filter((t, i, arr) => arr.findIndex(x => x.title === t.title) === i)
    .slice(0, 5)

  return `**Situação atual**\nVocê tem **${ctx.totalOpen} tarefas abertas**, sendo **${ctx.totalUrgent} urgentes** e **${ctx.totalOverdue} atrasadas**. ${ctx.inboxCount > 0 ? `Há **${ctx.inboxCount} item(ns)** na caixa de entrada sem ação.` : ''}\n\n` +
    (topItems.length ? `**Prioridades imediatas**\n${topItems.map((t, i) => `${i + 1}. ${t.title}${t.person ? ` — ${t.person}` : ''}`).join('\n')}\n\n` : '') +
    `**Alertas críticos**\n${ctx.totalOverdue > 0 ? `⚠️ ${ctx.totalOverdue} tarefa(s) com prazo vencido.\n` : ''}${ctx.totalWaiting > 0 ? `⏳ ${ctx.totalWaiting} tarefa(s) aguardando retorno.\n` : ''}${ctx.totalOverdue === 0 && ctx.totalWaiting === 0 ? '✅ Nenhum alerta crítico no momento.\n' : ''}\n` +
    `**Recomendação do dia**\nConcentre-se nas atividades urgentes e atrasadas. As demais podem ser organizadas ao longo do dia.\n\n---\n💡 *Configure a variável **OPENAI_API_KEY** no **.env** para ativar o resumo com IA real.*`
}
