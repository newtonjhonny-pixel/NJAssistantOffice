import { callOpenAI, isAIConfigured } from '@/lib/ai/openai'
import { buildSystemContext } from '@/lib/ai/agents'
import { buildRedatorSystem } from '@/lib/ai/prompts'

export interface EmailAnalysis {
  summary: string
  suggestedTaskTitle: string
  suggestedPriority: string
  suggestedDueDate: string | null
  suggestedResponse: string
  requiresAction: boolean
  risks: string
  aiPowered: boolean
}

function localAnalysis(subject: string, body: string, sender: string): EmailAnalysis {
  const lower = (subject + ' ' + body).toLowerCase()

  let suggestedPriority = 'MEDIA'
  if (/urgent|urgente|imediato|hoje|asap|prazo|vencendo/i.test(lower)) suggestedPriority = 'URGENTE'
  else if (/importante|atenção|prioridade|necessário|preciso/i.test(lower)) suggestedPriority = 'ALTA'
  else if (/quando puder|sem pressa|informativo|fyi/i.test(lower)) suggestedPriority = 'BAIXA'

  const requiresAction = /responda|confirme|retorne|envie|preciso|aguardo|solicito|por favor/i.test(lower)

  return {
    summary: `E-mail de ${sender} sobre: ${subject}. ${requiresAction ? 'Requer ação.' : 'Informativo.'}`,
    suggestedTaskTitle: `Tratar e-mail: ${subject}`.slice(0, 100),
    suggestedPriority,
    suggestedDueDate: null,
    suggestedResponse: `Prezado(a) ${sender},\n\nObrigado pelo contato. Analisarei sua mensagem e retornarei em breve.\n\nAtenciosamente,\nNewton`,
    requiresAction,
    risks: requiresAction ? 'E-mail requer resposta — risco de atraso se não tratado hoje.' : '',
    aiPowered: false,
  }
}

export async function analyzeEmail(
  subject: string,
  body: string,
  sender: string,
  senderEmail: string
): Promise<EmailAnalysis> {
  if (!isAIConfigured()) {
    return localAnalysis(subject, body, sender)
  }

  try {
    const ctx = await buildSystemContext()
    const systemPrompt = buildRedatorSystem(ctx)

    const userPrompt = `Analise o e-mail abaixo e responda em JSON com exatamente estas chaves:
{
  "summary": "resumo em 1-2 frases do conteúdo e intenção do e-mail",
  "suggestedTaskTitle": "título curto da tarefa sugerida (max 80 chars)",
  "suggestedPriority": "URGENTE|ALTA|MEDIA|BAIXA",
  "suggestedDueDate": "YYYY-MM-DD ou null",
  "suggestedResponse": "texto completo de resposta profissional em português",
  "requiresAction": true|false,
  "risks": "riscos identificados ou string vazia"
}

De: ${sender} <${senderEmail}>
Assunto: ${subject}

${body.slice(0, 2000)}`

    const raw = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.4, maxTokens: 800 }
    )

    // Extrair JSON da resposta (pode vir com ```json ... ```)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON não encontrado na resposta')

    const parsed = JSON.parse(jsonMatch[0])
    return { ...parsed, aiPowered: true }
  } catch {
    return localAnalysis(subject, body, sender)
  }
}
