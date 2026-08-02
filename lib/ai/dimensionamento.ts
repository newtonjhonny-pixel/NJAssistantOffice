import { aiService } from '@/lib/ai/gateway'

const SYSTEM = `Você é o Especialista em Dimensionamento de Equipes do Newton, com profundo conhecimento em Departamento Pessoal, gestão de capacidade operacional e planejamento de equipes.
Analise os dados fornecidos e gere um relatório gerencial objetivo, prático e baseado em dados.
Responda sempre em português brasileiro, de forma profissional e estruturada.
Use ** para negrito. Organize em seções claras. Seja direto — evite textos genéricos.
Nunca invente dados — baseie-se apenas nas informações fornecidas.`

export interface DimMemberData {
  name: string
  role: string
  sector?: string | null
  capacityPct: number
  bandLabel: string
  companyCount: number
  totalHeadcount: number
  totalProcesses: number
  linkBreakdown: { companyName: string; score: number }[]
}

export interface DimSummaryData {
  totalMembers: number
  totalHeadcount: number
  avgCapacity: number
  bandCounts: Record<string, number>
}

export interface DimConfig {
  capacityRef: number
  bandGreen: number
  bandBlue: number
  bandYellow: number
  bandOrange: number
}

export async function generateDimensionamentoAnalysisAI(
  summary: DimSummaryData,
  members: DimMemberData[],
  config: DimConfig,
): Promise<{ content: string; aiPowered: boolean }> {
  const membersText = members.map(m => {
    const breakdown = m.linkBreakdown.map(b => `    • ${b.companyName}: ${b.score} pts`).join('\n')
    return `**${m.name}** (${m.role})
  Capacidade: ${m.capacityPct}% — ${m.bandLabel}
  Empresas: ${m.companyCount} | Empregados: ${m.totalHeadcount} | Processos: ${m.totalProcesses}
${breakdown}`
  }).join('\n\n')

  const bandSummary = Object.entries(summary.bandCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      const labels: Record<string, string> = { green: 'Disponível', blue: 'Equilibrado', yellow: 'Atenção', orange: 'Sobrecarga', critical: 'Crítico' }
      return `${labels[k] ?? k}: ${v}`
    }).join(' | ')

  if (!aiService.isConfigured()) {
    return {
      aiPowered: false,
      content: `**Análise de Dimensionamento da Equipe**

**Visão Geral**
- Colaboradores: ${summary.totalMembers}
- Total de empregados sob gestão: ${summary.totalHeadcount}
- Capacidade média da equipe: ${summary.avgCapacity}%
- Distribuição: ${bandSummary}

**Por Colaborador**
${members.map(m => `- **${m.name}**: ${m.capacityPct}% (${m.bandLabel}) — ${m.companyCount} empresa(s), ${m.totalHeadcount} empregado(s)`).join('\n')}

**Pontos de Atenção**
- [Identificar colaboradores com sobrecarga ou subutilização]
- [Avaliar distribuição de empresas entre a equipe]
- [Verificar concentração de risco em processos críticos]

**Recomendações**
1. [Redistribuição de empresas se necessário]
2. [Capacitação para processos de alta complexidade]
3. [Plano de sucessão para colaboradores sobrecarregados]

⚠️ Configure a OPENAI_API_KEY para gerar análises com inteligência artificial.`,
    }
  }

  const prompt = `Analise o dimensionamento da equipe de Departamento Pessoal abaixo e gere um relatório gerencial.

**Configuração do modelo (referência = ${config.capacityRef} pts)**
Faixas: Disponível ≤${config.bandGreen}% | Equilibrado ≤${config.bandBlue}% | Atenção ≤${config.bandYellow}% | Sobrecarga ≤${config.bandOrange}% | Crítico acima

**Resumo da equipe**
- Colaboradores ativos: ${summary.totalMembers}
- Total de empregados sob gestão: ${summary.totalHeadcount}
- Capacidade média: ${summary.avgCapacity}%
- Distribuição: ${bandSummary}

**Dados por colaborador**
${membersText}

Gere o relatório com:
1. **Diagnóstico geral** — avaliação rápida da saúde operacional da equipe
2. **Análise individual** — para cada colaborador: situação atual, riscos e oportunidades (seja específico com os números)
3. **Riscos operacionais** — concentrações de risco, gargalos, dependências críticas
4. **Recomendações prioritárias** — ações concretas e ordenadas por urgência
5. **Próximos passos** — o que deve ser feito nos próximos 30/60/90 dias

Seja específico, use os dados reais e evite afirmações genéricas.`

  const result = await aiService.ask({
    module: 'team.dimensionamento',
    specialist: 'Especialista em Dimensionamento',
    systemPrompt: SYSTEM,
    message: prompt,
  })
  return { content: result.content, aiPowered: result.aiPowered }
}
