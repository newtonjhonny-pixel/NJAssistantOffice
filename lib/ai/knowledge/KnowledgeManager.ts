// ─── Camada de Conhecimento · KnowledgeManager ────────────────────────────────
// Orquestrador central da camada de conhecimento.
// Conecta Base Oficial, Documentos do Usuário, Memória e Histórico
// e monta o contexto completo para alimentar o modelo de linguagem.
//
// Fluxo por requisição:
//   load() → search() → getMemoryContext() → buildContext() → getKnowledge()

import { knowledgeCache, CACHE_KEYS } from './KnowledgeCache'
import { memoryManager } from '@/lib/ai/memory'
import type { MemoryContext } from '@/lib/ai/memory'
import {
  loadOfficialDocuments,
  loadUserDocuments,
  loadMemory,
  loadHistory,
  loadBaseStats,
} from './KnowledgeLoader'
import { hybridSearch } from './KnowledgeIndex'
import type {
  KnowledgeDoc,
  KnowledgeSearchResult,
  KnowledgeMemoryEntry,
  KnowledgeHistoryItem,
  KnowledgeContext,
  KnowledgeSearchOptions,
  KnowledgeLoadOptions,
  GetKnowledgeOptions,
  SearchMode,
} from './KnowledgeTypes'

// ─── Helpers de formatação ────────────────────────────────────────────────────

function buildContextBlock(docs: KnowledgeSearchResult[]): string {
  if (!docs.length) return ''

  const blocks = docs.map((d, i) => {
    const header = [
      `[${i + 1}] ${d.title}`,
      d.version  ? `(v${d.version})`    : '',
      d.source   ? `— Fonte: ${d.source}` : '',
      d.searchMode === 'semantic' ? `[semântica: ${(d.score * 100).toFixed(0)}%]` : '',
    ].filter(Boolean).join(' ')

    const body = (d.content ?? '').slice(0, 1800)
    return `${header}\n${body}`
  })

  return [
    '=== BASE DE CONHECIMENTO DO ESPECIALISTA ===',
    blocks.join('\n\n---\n\n'),
    '=== FIM DA BASE ===',
  ].join('\n\n')
}

function buildMemoryBlock(entries: KnowledgeMemoryEntry[]): string {
  if (!entries.length) return ''

  const lines = entries.map(e => {
    const prefix = e.type === 'summary' ? '📋 Resumo' :
                   e.type === 'entity'  ? '🏷️ Entidade' :
                   e.type === 'preference' ? '⚙️ Preferência' : '💡 Tópico'
    return `${prefix} — ${e.key}: ${e.value}`
  })

  return ['=== MEMÓRIA DA CONVERSA ===', lines.join('\n'), '=== FIM DA MEMÓRIA ==='].join('\n')
}

function buildHistoryBlock(items: KnowledgeHistoryItem[]): string {
  if (!items.length) return ''

  const lines = items.slice(-10).map(h => {
    const prefix = h.role === 'user' ? 'Usuário' : 'Assistente'
    return `${prefix}: ${h.content.slice(0, 300)}${h.content.length > 300 ? '…' : ''}`
  })

  return ['=== HISTÓRICO RECENTE ===', lines.join('\n'), '=== FIM DO HISTÓRICO ==='].join('\n')
}

// ─── KnowledgeManager ────────────────────────────────────────────────────────

export class KnowledgeManager {

  // ── load: carrega todos os docs do especialista (com cache) ─────────────────

  async load(
    specialist: string,
    options: KnowledgeLoadOptions = {},
  ): Promise<KnowledgeDoc[]> {
    const cacheKey = CACHE_KEYS.officialDocs(specialist)

    if (!options.forceRefresh && knowledgeCache.has(specialist, cacheKey)) {
      return knowledgeCache.get<KnowledgeDoc[]>(specialist, cacheKey) ?? []
    }

    const [official, user] = await Promise.all([
      loadOfficialDocuments(specialist, options),
      loadUserDocuments(specialist, undefined, options),
    ])

    const all = [...official, ...user]
    return all
  }

  // ── search: busca híbrida no especialista ───────────────────────────────────

  async search(
    specialist: string,
    query: string,
    options: KnowledgeSearchOptions = {},
  ): Promise<KnowledgeSearchResult[]> {
    return hybridSearch(specialist, query, {
      limit:      options.limit     ?? 5,
      threshold:  options.threshold ?? 0.20,
      categories: options.categories,
      mode:       options.mode      ?? 'hybrid',
    })
  }

  // ── searchBySpecialist: alias semântico de search ──────────────────────────

  async searchBySpecialist(
    specialistId: string,
    query: string,
    options: KnowledgeSearchOptions = {},
  ): Promise<KnowledgeSearchResult[]> {
    return this.search(specialistId, query, options)
  }

  // ── loadUserDocuments: documentos enviados pelo usuário ─────────────────────

  async loadUserDocuments(
    specialist: string,
    userId?: string,
    options: KnowledgeLoadOptions = {},
  ): Promise<KnowledgeDoc[]> {
    return loadUserDocuments(specialist, userId, options)
  }

  // ── loadOfficialDocuments: base oficial do especialista ─────────────────────

  async loadOfficialDocuments(
    specialist: string,
    options: KnowledgeLoadOptions = {},
  ): Promise<KnowledgeDoc[]> {
    return loadOfficialDocuments(specialist, options)
  }

  // ── buildContext: monta o bloco de contexto a partir de docs + memória + histórico

  buildContext(
    specialist: string,
    query: string,
    docs: KnowledgeSearchResult[],
    memory: KnowledgeMemoryEntry[],
    history: KnowledgeHistoryItem[],
  ): KnowledgeContext {
    const contextBlock = buildContextBlock(docs)
    const memoryBlock  = buildMemoryBlock(memory)
    const historyBlock = buildHistoryBlock(history)

    const searchMode: SearchMode = docs[0]?.searchMode ?? 'recent'
    const hasUserDocs = docs.some(d => d.origin === 'user')

    return {
      specialist,
      query,
      docs,
      memory,
      history,
      contextBlock,
      memoryBlock,
      historyBlock,
      searchMode,
      totalDocs: docs.length,
      hasUserDocs,
      buildAt: new Date(),
    }
  }

  // ── getKnowledge: pipeline completo — o método principal ─────────────────────
  // Reúne tudo: docs, memória, histórico → monta contexto pronto para o modelo.

  async getKnowledge(
    specialist: string,
    query: string,
    options: GetKnowledgeOptions = {},
  ): Promise<KnowledgeContext> {
    const {
      conversationId,
      userId,
      historyLimit  = 20,
      docLimit      = 5,
      threshold     = 0.20,
      searchMode,
      forceRefresh  = false,
    } = options

    // Executa as três buscas em paralelo
    const [docs, memory, history] = await Promise.all([
      this.search(specialist, query, {
        limit:     docLimit,
        threshold,
        mode:      searchMode ?? 'hybrid',
        forceRefresh,
      } as KnowledgeSearchOptions & { forceRefresh?: boolean }),
      loadMemory(specialist, conversationId, { forceRefresh }),
      conversationId
        ? loadHistory(conversationId, historyLimit, { forceRefresh })
        : Promise.resolve([] as KnowledgeHistoryItem[]),
    ])

    return this.buildContext(specialist, query, docs, memory, history)
  }

  // ── getKnowledgeWithMemory: pipeline completo com MemoryManager ──────────────
  // Versão aprimorada de getKnowledge() que usa o MemoryManager centralizado.
  // O comportamento atual de getKnowledge() não é alterado — esta é a nova rota.

  async getKnowledgeWithMemory(
    specialist: string,
    query: string,
    conversationId: string | null,
    options: GetKnowledgeOptions = {},
  ): Promise<KnowledgeContext & { memoryContext: MemoryContext }> {
    const { docLimit = 5, threshold = 0.20, searchMode, forceRefresh = false } = options

    const [docs, memoryCtx] = await Promise.all([
      this.search(specialist, query, {
        limit:     docLimit,
        threshold,
        mode:      searchMode ?? 'hybrid',
        forceRefresh,
      } as KnowledgeSearchOptions & { forceRefresh?: boolean }),
      memoryManager.getMemoryContext(specialist, conversationId, {
        shortTermLimit:  options.historyLimit ?? 20,
        mediumTermLimit: 25,
        longTermLimit:   10,
      }),
    ])

    // Converte MemoryContext → KnowledgeMemoryEntry[] para buildContext()
    const memory: KnowledgeMemoryEntry[] = [
      ...memoryCtx.longTerm,
      ...memoryCtx.mediumTerm,
    ].map(e => ({ key: e.key, value: e.value, type: e.type as KnowledgeMemoryEntry['type'], relevance: e.relevance }))

    const history: KnowledgeHistoryItem[] = memoryCtx.shortTerm.map(h => ({
      role:       h.role,
      content:    h.content,
      specialist: h.specialist,
      createdAt:  h.createdAt,
    }))

    const knowledgeCtx = this.buildContext(specialist, query, docs, memory, history)

    return { ...knowledgeCtx, memoryContext: memoryCtx }
  }

  // ── clearCache: invalida cache do especialista ou de tudo ──────────────────

  clearCache(specialist?: string): void {
    if (specialist) {
      knowledgeCache.clearSpecialist(specialist)
    } else {
      knowledgeCache.clearAll()
    }
  }

  // ── stats: informações sobre a base de um especialista ─────────────────────

  async stats(specialist: string) {
    return loadBaseStats(specialist)
  }

  // ── cacheStats: tamanho atual do cache ─────────────────────────────────────

  cacheStats() {
    return knowledgeCache.stats()
  }
}

// Singleton exportado
export const knowledgeManager = new KnowledgeManager()
