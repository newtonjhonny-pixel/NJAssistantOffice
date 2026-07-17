import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { summary } = body as { summary: string }

  if (!summary) return NextResponse.json({ error: 'summary obrigatório' }, { status: 400 })

  const SYSTEM = `Você é um consultor sênior de gestão de projetos com especialização em PMO corporativo.
Analise os dados fornecidos e produza um relatório executivo em português brasileiro.
Seja direto, preciso e profissional. Use formatação com **negrito** para destacar pontos críticos.
Organize em seções claras numeradas.`

  const USER = `Analise os seguintes dados consolidados de projetos e forneça:

1. **Resumo Executivo** — panorama geral em 2-3 parágrafos
2. **Principais Riscos** — top 3 riscos identificados
3. **Projetos Críticos** — que exigem atenção imediata e por quê
4. **Projetos em Atraso** — análise da situação
5. **Sugestões de Priorização** — quais focar primeiro
6. **Recomendações para Reduzir Atrasos** — ações concretas
7. **Estimativa de Conclusão** — perspectiva geral
8. **Recomendações ao Gestor** — próximos passos objetivos

Dados dos projetos:
${summary}`

  if (!aiService.isConfigured()) {
    const fallback = `**Resumo Executivo**
A análise dos projetos foi processada com base nos dados fornecidos. Configure a chave OPENAI_API_KEY no arquivo .env para obter análises reais com IA.

**Principais Riscos**
- Projetos com prazo vencido representam risco de não-entrega
- Baixo percentual de conclusão em projetos prioritários
- Acúmulo de tarefas sem movimentação

**Recomendações ao Gestor**
Revise os projetos atrasados e estabeleça prioridades claras para a equipe.

⚠️ *IA não configurada. Adicione OPENAI_API_KEY ao .env para análises reais.*`
    return NextResponse.json({ content: fallback, aiPowered: false, aiConfigured: false })
  }

  try {
    const result = await aiService.ask({
      module: 'projects.relatorios.analyze',
      specialist: 'PMO corporativo',
      systemPrompt: SYSTEM,
      message: USER,
      maxTokens: 2000,
      temperature: 0.6,
    })
    return NextResponse.json({ content: result.content, aiPowered: result.aiPowered, aiConfigured: true })
  } catch (err) {
    console.error('[relatorios/analyze]', err)
    return NextResponse.json({ error: 'Erro ao analisar', aiConfigured: true }, { status: 500 })
  }
}
