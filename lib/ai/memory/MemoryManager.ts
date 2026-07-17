// ─── Camada de Memória · MemoryManager ───────────────────────────────────────
// Orquestrador central da camada de memória.
//
// Três horizontes:
//   short  → janela de mensagens (in-memory, sem DB)
//   medium → memória da sessão/conversa (DB, por conversationId)
//   long   → memória cross-sessão do especialista (DB, conversationId = null)
//
// Fluxo típico após cada resposta do especialista:
//   afterExchange() → extrai → salva medium → [promove long se relevância alta]
//
// Fluxo para montar contexto antes da resposta:
//   getMemoryContext() → lê short + medium + long → retorna MemoryContext

import {
  readMediumTermMemory,
  readLongTermMemory,
  readShortTermHistory,
  saveMemoryEntries,
  promotToLongTerm,
  deleteExpiredMemory,
  memoryStats,
} from './MemoryStore'
import { extractMemoryFromExchange, extractMemoryFromHistory } from './MemoryExtractor'
import { summarizeConversation, needsSummarization } from './MemorySummarizer'
import type {
  MemoryContext,
  MemoryEntry,
  GetMemoryOptions,
  SaveMemoryOptions,
  ShortTermEntry,
  SummarizationResult,
  MemoryExtractionResult,
} from './MemoryTypes'

// ─── Formatação do bloco de contexto ─────────────────────────────────────────

function buildContextBlock(
  shortTerm: ShortTermEntry[],
  mediumTerm: MemoryEntry[],
  longTerm: MemoryEntry[],
): string {
  const parts: string[] = []

  if (longTerm.length > 0) {
    const lines = longTerm.map(e => {
      const label = labelFor(e.type)
      return `${label} ${e.key}: ${e.value}`
    })
    parts.push(`=== MEMÓRIA DO ESPECIALISTA (cross-sessão) ===\n${lines.join('\n')}`)
  }

  if (mediumTerm.length > 0) {
    const lines = mediumTerm.map(e => {
      const label = labelFor(e.type)
      return `${label} ${e.key}: ${e.value}`
    })
    parts.push(`=== MEMÓRIA DA CONVERSA ===\n${lines.join('\n')}`)
  }

  if (shortTerm.length > 0) {
    const recent = shortTerm.slice(-6).map(h => {
      const who = h.role === 'user' ? 'Usuário' : 'Assistente'
      return `${who}: ${h.content.slice(0, 200)}${h.content.length > 200 ? '…' : ''}`
    })
    parts.push(`=== HISTÓRICO RECENTE ===\n${recent.join('\n')}`)
  }

  return parts.join('\n\n')
}

function labelFor(type: string): string {
  const map: Record<string, string> = {
    topic:      '💡',
    entity:     '🏷️',
    preference: '⚙️',
    decision:   '✅',
    summary:    '📋',
    context:    '🔍',
  }
  return map[type] ?? '•'
}

// ─── MemoryManager ────────────────────────────────────────────────────────────

export class MemoryManager {

  // ── getMemoryContext: ponto de entrada principal ────────────────────────────
  // Monta o MemoryContext completo para ser usado pelo KnowledgeManager ou pelo
  // pipeline de raciocínio dos especialistas.

  async getMemoryContext(
    specialist: string,
    conversationId: string | null,
    options: GetMemoryOptions = {},
  ): Promise<MemoryContext> {
    const {
      includeShortTerm  = true,
      includeMediumTerm = true,
      includeLongTerm   = true,
      shortTermLimit    = 20,
      mediumTermLimit   = 25,
      longTermLimit     = 10,
      minRelevance      = 0.3,
    } = options

    const [shortTerm, mediumTerm, longTerm] = await Promise.all([
      includeShortTerm && conversationId
        ? readShortTermHistory(conversationId, shortTermLimit)
        : Promise.resolve([] as ShortTermEntry[]),

      includeMediumTerm && conversationId
        ? readMediumTermMemory(specialist, conversationId, mediumTermLimit, minRelevance)
        : Promise.resolve([] as MemoryEntry[]),

      includeLongTerm
        ? readLongTermMemory(specialist, longTermLimit, Math.max(minRelevance, 0.5))
        : Promise.resolve([] as MemoryEntry[]),
    ])

    const contextBlock = buildContextBlock(shortTerm, mediumTerm, longTerm)

    return {
      specialist,
      conversationId,
      shortTerm,
      mediumTerm,
      longTerm,
      contextBlock,
      totalEntries: mediumTerm.length + longTerm.length,
      buildAt: new Date(),
    }
  }

  // ── afterExchange: chamado após cada resposta (fire-and-forget) ─────────────
  // Extrai memórias da troca, salva no DB, e promove entradas de alta relevância
  // para memória de longo prazo.

  async afterExchange(
    specialist: string,
    conversationId: string,
    userMessage: string,
    assistantMessage: string,
    messageCount = 0,
  ): Promise<void> {
    try {
      // Extração assíncrona
      const extraction = await extractMemoryFromExchange(
        specialist,
        userMessage,
        assistantMessage,
      )

      if (extraction.success && extraction.entries.length > 0) {
        await saveMemoryEntries(specialist, conversationId, extraction.entries, {
          horizon:   'medium',
          overwrite: true,
          ttlDays:   30,
        })

        // Promove entradas de alta relevância para longo prazo
        await promotToLongTerm(specialist, conversationId, 0.85)
      }

      // Sumariza se a conversa ficou longa
      if (needsSummarization(messageCount)) {
        await this.summarize(specialist, conversationId)
      }
    } catch {
      // Silencioso — memória nunca quebra o fluxo principal
    }
  }

  // ── summarize: sumariza conversa e persiste como memória ────────────────────

  async summarize(
    specialist: string,
    conversationId: string,
  ): Promise<SummarizationResult> {
    try {
      const history = await readShortTermHistory(conversationId, 30)
      const messages = history.map(h => ({ role: h.role, content: h.content }))

      const result = await summarizeConversation(specialist, messages)

      if (result.success && result.summary) {
        const entries = [
          { key: 'resumo_conversa', value: result.summary, type: 'summary' as const, relevance: 0.9 },
          ...result.keyPoints.map((kp, i) => ({
            key:       `ponto_chave_${i + 1}`,
            value:     kp,
            type:      'context' as const,
            relevance: 0.7,
          })),
        ]

        await saveMemoryEntries(specialist, conversationId, entries, {
          horizon:  'medium',
          ttlDays:  60,
        })
      }

      return result
    } catch (err) {
      return {
        summary:   '',
        keyPoints: [],
        success:   false,
        error:     err instanceof Error ? err.message : 'unknown',
      }
    }
  }

  // ── extractFromHistory: extração em batch de todo histórico ─────────────────

  async extractFromHistory(
    specialist: string,
    conversationId: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<MemoryExtractionResult> {
    const result = await extractMemoryFromHistory(specialist, messages)

    if (result.success && result.entries.length > 0) {
      await saveMemoryEntries(specialist, conversationId, result.entries, {
        horizon:  'medium',
        ttlDays:  30,
      })
    }

    return result
  }

  // ── save: persiste entradas manualmente ─────────────────────────────────────

  async save(
    specialist: string,
    conversationId: string | null,
    entries: MemoryEntry[],
    options: SaveMemoryOptions = {},
  ): Promise<void> {
    await saveMemoryEntries(
      specialist,
      conversationId,
      entries.map(({ key, value, type, relevance }) => ({ key, value, type, relevance })),
      options,
    )
  }

  // ── cleanup: remove memórias expiradas ──────────────────────────────────────

  async cleanup(specialist?: string): Promise<number> {
    return deleteExpiredMemory(specialist)
  }

  // ── stats: estatísticas de memória de um especialista ───────────────────────

  async stats(specialist: string) {
    return memoryStats(specialist)
  }

  // ── getContextBlock: retorna apenas o bloco de texto (helper rápido) ─────────

  async getContextBlock(
    specialist: string,
    conversationId: string | null,
    options?: GetMemoryOptions,
  ): Promise<string> {
    const ctx = await this.getMemoryContext(specialist, conversationId, options)
    return ctx.contextBlock
  }
}

// Singleton exportado
export const memoryManager = new MemoryManager()
