// ─── Camada de Memória · Tipos e Interfaces ───────────────────────────────────

// ─── Horizontes de memória ────────────────────────────────────────────────────

export type MemoryHorizon =
  | 'short'   // Janela atual (in-memory, sem DB — últimas N mensagens)
  | 'medium'  // Sessão atual (DB, associado ao conversationId)
  | 'long'    // Cross-sessão (DB, conversationId = null — global ao especialista)

// ─── Tipos de entrada de memória ─────────────────────────────────────────────

export type MemoryEntryType =
  | 'topic'       // Tópico principal abordado
  | 'entity'      // Entidade mencionada (empresa, pessoa, cargo, data)
  | 'preference'  // Preferência ou estilo do usuário
  | 'decision'    // Decisão tomada ou orientação dada
  | 'summary'     // Resumo de conversa longa
  | 'context'     // Contexto geral relevante

// ─── Entrada de memória ───────────────────────────────────────────────────────

export interface MemoryEntry {
  key: string
  value: string
  type: MemoryEntryType
  relevance: number       // 0.0 – 1.0
  horizon: MemoryHorizon
  expiresAt?: Date        // null = sem expiração
}

// ─── Entrada de memória persistida (DB) ──────────────────────────────────────

export interface PersistedMemoryEntry extends MemoryEntry {
  id: string
  specialist: string
  conversationId: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── Contexto de memória montado para o modelo ───────────────────────────────

export interface MemoryContext {
  specialist: string
  conversationId: string | null
  shortTerm: ShortTermEntry[]   // janela de mensagens recentes
  mediumTerm: MemoryEntry[]     // memória da sessão
  longTerm: MemoryEntry[]       // memória cross-sessão
  // Bloco de texto pronto para injetar no system prompt
  contextBlock: string
  totalEntries: number
  buildAt: Date
}

// ─── Entrada de memória de curto prazo (janela de mensagens) ─────────────────

export interface ShortTermEntry {
  role: 'user' | 'assistant'
  content: string
  specialist: string | null
  createdAt: Date
}

// ─── Resultado da extração de memória ────────────────────────────────────────

export interface MemoryExtractionResult {
  entries: Array<Omit<MemoryEntry, 'horizon' | 'expiresAt'>>
  rawResponse: string
  success: boolean
  error?: string
}

// ─── Resultado da sumarização ────────────────────────────────────────────────

export interface SummarizationResult {
  summary: string
  keyPoints: string[]
  success: boolean
  error?: string
}

// ─── Opções de recuperação de memória ────────────────────────────────────────

export interface GetMemoryOptions {
  includeShortTerm?: boolean      // default true
  includeMediumTerm?: boolean     // default true
  includeLongTerm?: boolean       // default true
  shortTermLimit?: number         // default 20 mensagens
  mediumTermLimit?: number        // default 25 entradas
  longTermLimit?: number          // default 10 entradas
  minRelevance?: number           // filtrar por relevância mínima (default 0.3)
}

// ─── Opções de salvamento de memória ─────────────────────────────────────────

export interface SaveMemoryOptions {
  horizon?: MemoryHorizon         // default 'medium'
  overwrite?: boolean             // atualizar se key já existe (default true)
  ttlDays?: number                // expiração em dias (null = sem expiração)
}
