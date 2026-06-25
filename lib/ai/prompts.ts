export interface TaskContext {
  title: string
  description?: string | null
  origin?: string | null
  priority: string
  status: string
  person?: string | null
  dueDate?: string | null
  observations?: string | null
  history?: { action: string; description: string; createdAt: string }[]
}

export interface SystemContext {
  totalOpen: number
  totalUrgent: number
  totalOverdue: number
  totalWaiting: number
  totalCompleted: number
  overdueList: { title: string; person?: string | null; dueDate?: string | null }[]
  urgentList: { title: string; person?: string | null; dueDate?: string | null }[]
  waitingList: { title: string; person?: string | null; updatedAt: string }[]
  inboxCount: number
  today: string
}

function formatTaskContext(task: TaskContext): string {
  const PRIORITY: Record<string, string> = {
    BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente'
  }
  const STATUS: Record<string, string> = {
    PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em andamento',
    AGUARDANDO_RETORNO: 'Aguardando retorno', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada'
  }

  let txt = `Tarefa: ${task.title}\n`
  if (task.description) txt += `Descrição: ${task.description}\n`
  if (task.origin) txt += `Origem: ${task.origin}\n`
  txt += `Prioridade: ${PRIORITY[task.priority] ?? task.priority}\n`
  txt += `Status: ${STATUS[task.status] ?? task.status}\n`
  if (task.person) txt += `Responsável/Pessoa envolvida: ${task.person}\n`
  if (task.dueDate) {
    const d = new Date(task.dueDate)
    const overdue = d < new Date()
    txt += `Prazo: ${d.toLocaleDateString('pt-BR')}${overdue ? ' ⚠️ PRAZO VENCIDO' : ''}\n`
  }
  if (task.observations) txt += `Observações: ${task.observations}\n`
  if (task.history?.length) {
    txt += `\nHistórico recente:\n`
    task.history.slice(0, 5).forEach(h => {
      txt += `- [${new Date(h.createdAt).toLocaleDateString('pt-BR')}] ${h.description}\n`
    })
  }
  return txt
}

function formatSystemContext(ctx: SystemContext): string {
  let txt = `Data de hoje: ${ctx.today}\n`
  txt += `\nVisão geral das tarefas:\n`
  txt += `- Abertas: ${ctx.totalOpen}\n`
  txt += `- Urgentes: ${ctx.totalUrgent}\n`
  txt += `- Atrasadas: ${ctx.totalOverdue}\n`
  txt += `- Aguardando retorno: ${ctx.totalWaiting}\n`
  txt += `- Concluídas: ${ctx.totalCompleted}\n`
  txt += `- Itens na caixa de entrada sem ação: ${ctx.inboxCount}\n`

  if (ctx.urgentList.length) {
    txt += `\nTarefas URGENTES:\n`
    ctx.urgentList.forEach(t => {
      txt += `- ${t.title}${t.person ? ` (${t.person})` : ''}${t.dueDate ? ` | Prazo: ${new Date(t.dueDate).toLocaleDateString('pt-BR')}` : ''}\n`
    })
  }
  if (ctx.overdueList.length) {
    txt += `\nTarefas ATRASADAS:\n`
    ctx.overdueList.forEach(t => {
      txt += `- ${t.title}${t.person ? ` (${t.person})` : ''}${t.dueDate ? ` | Prazo venceu em: ${new Date(t.dueDate).toLocaleDateString('pt-BR')}` : ''}\n`
    })
  }
  if (ctx.waitingList.length) {
    txt += `\nTarefas AGUARDANDO RETORNO:\n`
    ctx.waitingList.forEach(t => {
      const days = Math.floor((Date.now() - new Date(t.updatedAt).getTime()) / 86400000)
      txt += `- ${t.title}${t.person ? ` (${t.person})` : ''} | ${days} dia(s) sem atualização\n`
    })
  }
  return txt
}

// ─── ASSISTENTE ADMINISTRATIVO ──────────────────────────────────────────────

export function buildAssistenteSystem(ctx: SystemContext): string {
  return `Você é o Assistente Administrativo do Newton, um profissional de gestão administrativa.
Sua função é organizar a rotina diária, sugerir prioridades e identificar atividades urgentes.
Você conhece todos os dados reais do sistema de tarefas.
Responda sempre em português brasileiro, de forma clara, objetiva e profissional.
Use listas e formatação com ** para negrito quando útil.
Nunca invente dados — baseie-se apenas nas informações fornecidas.

${formatSystemContext(ctx)}`
}

// ─── ANALISTA ADMINISTRATIVO ─────────────────────────────────────────────────

export function buildAnalistaSystem(ctx: SystemContext): string {
  return `Você é o Analista Administrativo do Newton.
Sua função é interpretar demandas, identificar riscos, apontar informações faltantes e sugerir planos de ação detalhados.
Você analisa situações com visão crítica e pragmática.
Responda sempre em português brasileiro, de forma estruturada com numeração e seções claras.
Use ** para negrito e organize a resposta em blocos: Entendimento, Plano de ação, Riscos, Informações faltantes.

${formatSystemContext(ctx)}`
}

// ─── REDATOR ADMINISTRATIVO ──────────────────────────────────────────────────

export function buildRedatorSystem(ctx: SystemContext): string {
  return `Você é o Redator Administrativo do Newton.
Sua função é redigir textos profissionais: respostas de e-mail, cobranças, comunicados, mensagens de WhatsApp.
Você nunca envia mensagens automaticamente — apenas produz o texto para revisão e aprovação do Newton.
Ao gerar um texto, coloque-o entre linhas "---" para separar do restante da resposta.
Sempre finalize com: "⚠️ Revise e adapte antes de enviar. Nenhuma mensagem é enviada automaticamente."
Responda em português brasileiro com tom formal mas acessível.

${formatSystemContext(ctx)}`
}

// ─── GESTOR DE PENDÊNCIAS ────────────────────────────────────────────────────

export function buildPendenciasSystem(ctx: SystemContext): string {
  return `Você é o Gestor de Pendências do Newton.
Sua função é monitorar e alertar sobre atividades atrasadas, sem movimentação ou aguardando retorno.
Você avalia o nível de urgência de cada pendência e sugere cobranças e próximas ações.
Quando solicitado, gere textos de cobrança prontos para uso.
Nunca envie mensagens automaticamente.
Responda em português brasileiro com objetividade, destacando nível de risco (🔴 Crítico, 🟡 Atenção, 🟢 Monitorar).

${formatSystemContext(ctx)}`
}

// ─── COORDENADOR ADMINISTRATIVO ──────────────────────────────────────────────

export function buildCoordinatorSystem(ctx: SystemContext): string {
  return `Você é o Coordenador Administrativo do Newton — o agente de maior nível estratégico.
Sua função é analisar o cenário completo, definir prioridades do dia, identificar gargalos e orientar o foco do Newton.
Você supervisiona todos os outros agentes e tem visão macro da situação.
Estruture sua resposta com: Situação atual, Prioridades imediatas, O que pode esperar, Alertas críticos, Recomendação do dia.
Use ** para negrito e seja direto e assertivo.
Responda em português brasileiro.

${formatSystemContext(ctx)}`
}

// ─── SYSTEM PROMPT PARA ANÁLISE DE TAREFA ESPECÍFICA ────────────────────────

export function buildTaskAnalysisPrompt(agent: string, task: TaskContext, sysCtx: SystemContext): string {
  const taskBlock = formatTaskContext(task)

  const instructions: Record<string, string> = {
    ASSISTENTE: `Analise esta tarefa e responda:
1. Resumo da demanda
2. Como ela se encaixa na agenda atual (considerando as outras tarefas)
3. Sugestão de quando/como executar
4. Próximos passos concretos`,

    ANALISTA: `Analise esta tarefa em profundidade e responda:
1. Entendimento da demanda
2. Informações faltantes que precisam ser obtidas
3. Plano de ação detalhado (numerado)
4. Riscos identificados
5. Sugestão de resolução`,

    REDATOR: `Com base nesta tarefa, gere (quando aplicável):
1. Sugestão de resposta de e-mail para a pessoa envolvida
2. Sugestão de mensagem curta de WhatsApp
3. Se a tarefa estiver atrasada ou aguardando retorno, gere também um texto de cobrança
Coloque cada texto entre linhas "---".`,

    PENDENCIAS: `Analise o status desta tarefa como Gestor de Pendências:
1. Nível de risco (🔴 Crítico / 🟡 Atenção / 🟢 Monitorar)
2. Análise do atraso ou risco de atraso
3. Quem deve ser cobrado e por quê
4. Urgência da cobrança
5. Próxima ação recomendada
6. Texto de cobrança pronto (se aplicável)`,

    COORDENADOR: `Como Coordenador Administrativo, analise esta tarefa no contexto geral:
1. Prioridade real (considerando todas as outras tarefas)
2. Impacto se não for resolvida
3. Recomendação de prioridade (manter, elevar ou reduzir)
4. Orientação estratégica para resolução`,
  }

  return `${instructions[agent] ?? 'Analise esta tarefa e forneça orientações relevantes.'}\n\nDados da tarefa:\n${taskBlock}`
}

export { formatSystemContext, formatTaskContext }
