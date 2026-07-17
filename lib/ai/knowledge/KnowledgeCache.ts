// ─── Camada de Conhecimento · Cache Interno ───────────────────────────────────
// Cache in-memory com TTL por especialista.
// Evita recarregar os mesmos documentos em requisições consecutivas.

import type { KnowledgeDoc } from './KnowledgeTypes'

interface CacheEntry<T> {
  value: T
  expiresAt: number  // Date.now() + ttlMs
  specialist: string
  key: string
}

const DEFAULT_TTL_MS = 5 * 60 * 1000  // 5 minutos

class KnowledgeCache {
  private readonly store = new Map<string, CacheEntry<unknown>>()

  private cacheKey(specialist: string, key: string): string {
    return `${specialist}::${key}`
  }

  // ─── Leitura ─────────────────────────────────────────────────────────────────

  get<T>(specialist: string, key: string): T | null {
    const entry = this.store.get(this.cacheKey(specialist, key)) as CacheEntry<T> | undefined
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(this.cacheKey(specialist, key))
      return null
    }
    return entry.value
  }

  has(specialist: string, key: string): boolean {
    const entry = this.store.get(this.cacheKey(specialist, key))
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.store.delete(this.cacheKey(specialist, key))
      return false
    }
    return true
  }

  // ─── Escrita ─────────────────────────────────────────────────────────────────

  set<T>(specialist: string, key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
    this.store.set(this.cacheKey(specialist, key), {
      value,
      expiresAt: Date.now() + ttlMs,
      specialist,
      key,
    })
  }

  // ─── Invalidação ─────────────────────────────────────────────────────────────

  delete(specialist: string, key: string): void {
    this.store.delete(this.cacheKey(specialist, key))
  }

  clearSpecialist(specialist: string): void {
    const keysToDelete: string[] = []
    this.store.forEach((entry, k) => {
      if ((entry as CacheEntry<unknown>).specialist === specialist) keysToDelete.push(k)
    })
    keysToDelete.forEach(k => this.store.delete(k))
  }

  clearAll(): void {
    this.store.clear()
  }

  // ─── Evict expirados ─────────────────────────────────────────────────────────

  evictExpired(): number {
    let removed = 0
    const now = Date.now()
    const keysToDelete: string[] = []
    this.store.forEach((entry, k) => {
      if (now > (entry as CacheEntry<unknown>).expiresAt) keysToDelete.push(k)
    })
    keysToDelete.forEach(k => { this.store.delete(k); removed++ })
    return removed
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  stats(): { total: number; bySpecialist: Record<string, number> } {
    const bySpecialist: Record<string, number> = {}
    this.store.forEach(entry => {
      const e = entry as CacheEntry<unknown>
      bySpecialist[e.specialist] = (bySpecialist[e.specialist] ?? 0) + 1
    })
    return { total: this.store.size, bySpecialist }
  }
}

// ─── Chaves de cache padronizadas ─────────────────────────────────────────────

export const CACHE_KEYS = {
  officialDocs:  (specialist: string) => `official:${specialist}`,
  userDocs:      (specialist: string, userId?: string) => `user:${specialist}:${userId ?? 'anon'}`,
  memory:        (specialist: string, convId?: string) => `memory:${specialist}:${convId ?? 'global'}`,
  history:       (convId: string) => `history:${convId}`,
  docList:       (specialist: string) => `doclist:${specialist}`,
} as const

// ─── TTLs específicos ─────────────────────────────────────────────────────────

export const CACHE_TTL = {
  officialDocs: 10 * 60 * 1000,   // 10 min — documentos oficiais mudam pouco
  userDocs:      2 * 60 * 1000,   //  2 min — uploads do usuário
  memory:        5 * 60 * 1000,   //  5 min — memória da conversa
  history:       2 * 60 * 1000,   //  2 min — histórico
  docList:      10 * 60 * 1000,   // 10 min — lista de docs indexados
} as const

// Singleton
export const knowledgeCache = new KnowledgeCache()
export type { KnowledgeDoc }
