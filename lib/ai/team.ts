import { aiService } from '@/lib/ai/gateway'

const TEAM_SYSTEM = `Você é o Coordenador de Equipe do Newton, especialista em gestão de pessoas, Departamento Pessoal e rotinas administrativas.
Você auxilia na gestão de colaboradores: feedbacks estruturados, direcionamento de atividades, planos de treinamento e diretrizes operacionais.
Responda sempre em português brasileiro, de forma profissional, objetiva e estruturada.
Use ** para negrito. Organize em seções claras quando pertinente.
Nunca invente dados — baseie-se apenas nas informações fornecidas.`

export interface TeamMemberContext {
  name: string
  role: string
  sector?: string | null
  status?: string
}

export async function generateFeedbackAI(member: TeamMemberContext, type: string, context: string): Promise<{ content: string; aiPowered: boolean }> {
  const TYPE_LABELS: Record<string, string> = {
    POSITIVO: 'Feedback Positivo',
    MELHORIA: 'Feedback de Melhoria',
    ALINHAMENTO: 'Alinhamento',
    DESENVOLVIMENTO: 'Desenvolvimento',
    RECONHECIMENTO: 'Reconhecimento',
    CORRECAO_CONDUTA: 'Correção de Conduta',
    ADVERTENCIA_VERBAL: 'Advertência Verbal',
  }
  const typeLabel = TYPE_LABELS[type] ?? type

  if (!aiService.isConfigured()) {
    return {
      aiPowered: false,
      content: `**${typeLabel} — ${member.name}**

**Cargo/Função:** ${member.role}${member.sector ? ` | ${member.sector}` : ''}

**Contexto informado:** ${context}

**Pontos positivos identificados:**
- [Preencher com base na observação]

**Pontos de melhoria:**
- [Preencher com base na situação observada]

**Orientação dada:**
- [Descrever a orientação fornecida ao colaborador]

**Ação acordada:**
- [Registrar compromisso assumido pelo colaborador]

⚠️ Configure a OPENAI_API_KEY para gerar feedbacks com inteligência artificial.`,
    }
  }

  const prompt = `Gere um feedback estruturado do tipo "${typeLabel}" para o colaborador abaixo.

**Colaborador:** ${member.name}
**Cargo:** ${member.role}${member.sector ? ` | Setor: ${member.sector}` : ''}

**Contexto / Situação observada:**
${context}

Estruture o feedback com:
1. **Situação observada** — descrição clara do que foi observado
2. **Pontos positivos** — o que o colaborador fez bem (mesmo em feedbacks de melhoria, reconheça o que foi positivo)
3. **Pontos de melhoria** — o que precisa ser aprimorado (se aplicável ao tipo)
4. **Orientação dada** — o que foi orientado ao colaborador
5. **Ação acordada** — compromisso ou próximo passo definido
6. **Acompanhamento** — como e quando será acompanhado

Seja profissional, empático e construtivo.`

  const result = await aiService.ask({
    module: 'team.feedback',
    specialist: 'Coordenador de Equipe',
    systemPrompt: TEAM_SYSTEM,
    message: prompt,
  })
  return { content: result.content, aiPowered: result.aiPowered }
}

export async function generateDirectionAI(member: TeamMemberContext, title: string, description: string, priority: string, complexity: string): Promise<{ content: string; aiPowered: boolean }> {
  if (!aiService.isConfigured()) {
    return {
      aiPowered: false,
      content: `**Direcionamento: ${title}**

**Para:** ${member.name} — ${member.role}
**Prioridade:** ${priority} | **Complexidade:** ${complexity}

**Objetivo:**
${description}

**Orientações sugeridas:**
1. Entenda o contexto completo da atividade antes de iniciar
2. Planeje as etapas de execução
3. Identifique possíveis impedimentos antecipadamente
4. Mantenha comunicação regular sobre o andamento
5. Documente os resultados ao finalizar

**Resultado esperado:**
[Descreva o resultado esperado ao concluir]

⚠️ Configure a OPENAI_API_KEY para gerar direcionamentos com inteligência artificial.`,
    }
  }

  const PRIORITY: Record<string, string> = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' }
  const COMPLEXITY: Record<string, string> = { SIMPLES: 'Simples', MEDIA: 'Média', COMPLEXA: 'Complexa' }

  const prompt = `Crie um direcionamento de atividade detalhado para o colaborador abaixo.

**Colaborador:** ${member.name} — ${member.role}${member.sector ? ` | ${member.sector}` : ''}
**Atividade:** ${title}
**Descrição:** ${description}
**Prioridade:** ${PRIORITY[priority] ?? priority}
**Complexidade:** ${COMPLEXITY[complexity] ?? complexity}

Gere:
1. **Contexto e objetivo** — por que essa atividade é importante
2. **Orientações de execução** — passo a passo para realizar a atividade
3. **Pontos de atenção** — riscos, cuidados e validações necessárias
4. **Resultado esperado** — o que deve ser entregue ao concluir
5. **Como reportar** — como o colaborador deve comunicar o andamento e a conclusão

Seja claro, objetivo e adequado ao nível de complexidade da tarefa.`

  const result = await aiService.ask({
    module: 'team.direction',
    specialist: 'Coordenador de Equipe',
    systemPrompt: TEAM_SYSTEM,
    message: prompt,
  })
  return { content: result.content, aiPowered: result.aiPowered }
}

export async function generateTrainingPlanAI(member: TeamMemberContext, topic: string, objective: string): Promise<{ content: string; aiPowered: boolean }> {
  if (!aiService.isConfigured()) {
    return {
      aiPowered: false,
      content: `**Plano de Treinamento: ${topic}**

**Colaborador:** ${member.name} — ${member.role}

**Objetivo:** ${objective}

**Estrutura sugerida:**
1. **Diagnóstico** — nível atual de conhecimento do colaborador
2. **Conteúdo** — tópicos a serem abordados
3. **Metodologia** — como o treinamento será conduzido (prático, teórico, shadowing)
4. **Carga horária estimada** — tempo necessário
5. **Recursos** — materiais, ferramentas ou pessoas envolvidas
6. **Avaliação** — como verificar se o aprendizado foi absorvido
7. **Acompanhamento pós-treinamento** — como consolidar o conhecimento

⚠️ Configure a OPENAI_API_KEY para gerar planos com inteligência artificial.`,
    }
  }

  const prompt = `Crie um plano de treinamento detalhado para o colaborador abaixo.

**Colaborador:** ${member.name} — ${member.role}${member.sector ? ` | ${member.sector}` : ''}
**Tema do treinamento:** ${topic}
**Objetivo:** ${objective}

Estruture o plano com:
1. **Diagnóstico inicial** — avaliação do nível atual de conhecimento
2. **Conteúdo programático** — tópicos em ordem lógica de aprendizado
3. **Metodologia** — abordagem recomendada (prático, teórico, acompanhamento, etc.)
4. **Carga horária estimada** — tempo por módulo e total
5. **Recursos necessários** — materiais, sistemas, pessoas de referência
6. **Exercícios práticos** — como aplicar o aprendizado no dia a dia
7. **Avaliação** — como medir se o treinamento atingiu o objetivo
8. **Acompanhamento** — ações pós-treinamento para consolidar o conhecimento

Seja prático e adequado ao contexto de rotinas administrativas e de DP.`

  const result = await aiService.ask({
    module: 'team.training',
    specialist: 'Coordenador de Equipe',
    systemPrompt: TEAM_SYSTEM,
    message: prompt,
  })
  return { content: result.content, aiPowered: result.aiPowered }
}

export async function generateGuidelineAI(title: string, category: string, reason: string): Promise<{ content: string; aiPowered: boolean }> {
  if (!aiService.isConfigured()) {
    return {
      aiPowered: false,
      content: `**Diretriz: ${title}**

**Categoria:** ${category}

**Motivo:** ${reason}

**Descrição detalhada:**
[Descreva a diretriz com clareza, indicando o que deve ser feito e como]

**Aplicação prática:**
- Situação 1: [Como aplicar]
- Situação 2: [Como aplicar]

**Consequências do não cumprimento:**
[Descrever as consequências]

**Responsável pela fiscalização:**
[Indicar quem monitora o cumprimento]

⚠️ Configure a OPENAI_API_KEY para gerar diretrizes com inteligência artificial.`,
    }
  }

  const CATEGORY: Record<string, string> = {
    PROCESSO: 'Processo', PRAZO: 'Prazo', ATENDIMENTO: 'Atendimento',
    COMUNICACAO: 'Comunicação', CONFERENCIA: 'Conferência', FINANCEIRO: 'Financeiro',
    DEPARTAMENTO_PESSOAL: 'Departamento Pessoal', CONDUTA: 'Conduta',
    QUALIDADE: 'Qualidade', OUTROS: 'Outros',
  }

  const prompt = `Crie uma diretriz operacional estruturada para a equipe.

**Título:** ${title}
**Categoria:** ${CATEGORY[category] ?? category}
**Motivo / Contexto:** ${reason}

Estruture a diretriz com:
1. **Descrição** — o que a diretriz determina de forma clara e objetiva
2. **Aplicação prática** — exemplos concretos de como deve ser aplicada no dia a dia
3. **Quem deve seguir** — equipe ou pessoas específicas
4. **Quando se aplica** — situações em que a diretriz entra em vigor
5. **Como verificar** — como o gestor pode confirmar que está sendo seguida
6. **Consequências** — o que acontece em caso de não cumprimento (se aplicável)

Seja direto, prático e use linguagem acessível à equipe operacional.`

  const result = await aiService.ask({
    module: 'team.guideline',
    specialist: 'Coordenador de Equipe',
    systemPrompt: TEAM_SYSTEM,
    message: prompt,
  })
  return { content: result.content, aiPowered: result.aiPowered }
}
