// ─── Camada de Memória · Extração por IA ─────────────────────────────────────
// Usa GPT para extrair tópicos, entidades, preferências e decisões de um trecho
// de conversa. Chamado de forma assíncrona (fire-and-forget) após cada resposta.

import { aiService } from '@/lib/ai/gateway'
import type { MemoryExtractionResult, MemoryEntryType } from './MemoryTypes'

// ─── Prompt de extração ───────────────────────────────────────────────────────

function buildExtractionPrompt(
  specialist: string,
  userMessage: string,
  assistantMessage: string,
): string {
  return `Você é um analisador de conversas. Analise o trecho abaixo e extraia informações relevantes para memorizar sobre o usuário e o contexto.

ESPECIALISTA: ${specialist}
USUÁRIO: ${userMessage.slice(0, 600)}
ASSISTENTE: ${assistantMessage.slice(0, 600)}

Extraia APENAS informações que sejam úteis para personalizar respostas futuras nesta conversa.
Exemplos do que extrair:
- empresa ou setor do usuário ("entity")
- cargo ou função do usuário ("entity")
- tema principal da dúvida ("topic")
- decisão ou orientação dada ("decision")
- preferência de formato ou detalhe ("preference")

NÃO extraia informações óbvias, redundantes ou sem contexto real.
Seja conciso: value com no máximo 120 caracteres.

Responda APENAS o JSON abaixo, sem markdown:
{
  "memories": [
    { "key": "...", "value": "...", "type": "topic|entity|preference|decision", "relevance": 0.0-1.0 }
  ]
}`
}

// ─── Extração ─────────────────────────────────────────────────────────────────

export async function extractMemoryFromExchange(
  specialist: string,
  userMessage: string,
  assistantMessage: string,
): Promise<MemoryExtractionResult> {
  try {
    const result = await aiService.ask({
      module:      'memory.extract',
      specialist,
      message:     buildExtractionPrompt(specialist, userMessage, assistantMessage),
      maxTokens:   500,
      temperature: 0,
    })

    const rawResponse = result.content.trim()
    const cleaned     = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/,      '')
      .trim()

    const parsed = JSON.parse(cleaned) as {
      memories?: Array<{ key: string; value: string; type: string; relevance: number }>
    }

    const entries = (parsed.memories ?? [])
      .filter(m => m.key && m.value && m.relevance >= 0 && m.relevance <= 1)
      .map(m => ({
        key:       m.key.toLowerCase().replace(/\s+/g, '_').slice(0, 60),
        value:     m.value.slice(0, 120),
        type:      validateType(m.type),
        relevance: Math.round(m.relevance * 100) / 100,
      }))

    return { entries, rawResponse, success: true }
  } catch (err) {
    return {
      entries:     [],
      rawResponse: '',
      success:     false,
      error:       err instanceof Error ? err.message : 'unknown',
    }
  }
}

// ─── Extração de múltiplas trocas (batch) ─────────────────────────────────────

export async function extractMemoryFromHistory(
  specialist: string,
  messages: Array<{ role: string; content: string }>,
): Promise<MemoryExtractionResult> {
  if (messages.length < 2) {
    return { entries: [], rawResponse: '', success: true }
  }

  const transcript = messages
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'USUÁRIO' : 'ASSISTENTE'}: ${m.content.slice(0, 300)}`)
    .join('\n')

  return extractMemoryFromExchange(specialist, transcript, '')
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function validateType(raw: string): MemoryEntryType {
  const valid: MemoryEntryType[] = ['topic', 'entity', 'preference', 'decision', 'summary', 'context']
  return valid.includes(raw as MemoryEntryType) ? (raw as MemoryEntryType) : 'topic'
}
