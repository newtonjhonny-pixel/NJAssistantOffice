// ─── Camada de Memória · Sumarizador de Conversas ────────────────────────────
// Ativado quando uma conversa ultrapassa o limiar de mensagens.
// Gera um resumo técnico e extrai os pontos-chave para memória de longo prazo.

import { aiService } from '@/lib/ai/gateway'
import type { SummarizationResult } from './MemoryTypes'

// ─── Limiar para sumarizar ────────────────────────────────────────────────────

export const SUMMARIZATION_THRESHOLD = 12   // mensagens mínimas para sumarizar
export const SUMMARIZATION_WINDOW    = 30   // máx de mensagens a incluir no resumo

// ─── Prompt de sumarização ───────────────────────────────────────────────────

function buildSummarizationPrompt(
  specialist: string,
  transcript: string,
): string {
  return `Você é um assistente técnico especializado em ${specialist}.
Analise a conversa abaixo e produza:
1. Um RESUMO técnico conciso (máx 250 chars) dos tópicos abordados.
2. Lista de PONTOS-CHAVE (máx 5 itens, cada um com até 80 chars).

Foque no que é técnico e relevante para futuras consultas do usuário.

CONVERSA:
${transcript}

Responda APENAS o JSON abaixo, sem markdown:
{
  "summary": "...",
  "keyPoints": ["...", "..."]
}`
}

// ─── Sumarização ─────────────────────────────────────────────────────────────

export async function summarizeConversation(
  specialist: string,
  messages: Array<{ role: string; content: string }>,
): Promise<SummarizationResult> {
  if (messages.length < SUMMARIZATION_THRESHOLD) {
    return { summary: '', keyPoints: [], success: true }
  }

  const window = messages.slice(-SUMMARIZATION_WINDOW)
  const transcript = window
    .map(m => `${m.role === 'user' ? 'USUÁRIO' : 'ESPECIALISTA'}: ${m.content.slice(0, 400)}`)
    .join('\n')

  try {
    const result = await aiService.ask({
      module:      'memory.summarize',
      specialist,
      message:     buildSummarizationPrompt(specialist, transcript),
      maxTokens:   300,
      temperature: 0,
    })

    const raw     = result.content.trim()
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed  = JSON.parse(cleaned) as { summary?: string; keyPoints?: string[] }

    return {
      summary:   (parsed.summary ?? '').slice(0, 250),
      keyPoints: (parsed.keyPoints ?? []).slice(0, 5).map(p => p.slice(0, 80)),
      success:   true,
    }
  } catch (err) {
    return {
      summary:   '',
      keyPoints: [],
      success:   false,
      error:     err instanceof Error ? err.message : 'unknown',
    }
  }
}

// ─── Verifica se conversa precisa ser sumarizada ──────────────────────────────

export function needsSummarization(messageCount: number): boolean {
  return messageCount >= SUMMARIZATION_THRESHOLD && messageCount % 10 === 0
}
