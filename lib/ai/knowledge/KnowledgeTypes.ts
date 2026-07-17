// ─── Camada de Conhecimento · Tipos e Interfaces ──────────────────────────────

import type { SpecialistId } from '@/lib/ai/specialists/types'

// ─── Categorias de conhecimento por especialista ──────────────────────────────

export type KnowledgeCategory =
  // Legislação / Normas
  | 'clt' | 'constituicao' | 'nr' | 'portaria' | 'instrucao_normativa'
  // eSocial
  | 'mos' | 'leiaute' | 'nota_tecnica' | 'evento_esocial' | 'tabela_esocial' | 'faq_esocial'
  // Previdência / Tributação
  | 'fgts' | 'inss' | 'irrf' | 'dctfweb' | 'fgts_digital'
  // Jurídico
  | 'sumula' | 'oj' | 'acordao' | 'jurisprudencia' | 'tst' | 'trt' | 'stf'
  // SST / Medicina
  | 'ltcat' | 'ppp' | 'pgr' | 'cat' | 'pcmso' | 'aso' | 'laudo'
  // Processos / Qualidade
  | 'pop' | 'it' | 'checklist' | 'fluxograma' | 'bpm' | 'iso' | 'indicador'
  // RH / Comportamental
  | 'competencia' | 'onboarding' | 'desligamento' | 'plano_carreira' | 'psicologia'
  // Internos / Usuário
  | 'modelo_interno' | 'documento_usuario' | 'convencao' | 'acordo_coletivo'
  // Genérico
  | 'geral'

// ─── Modos de busca ───────────────────────────────────────────────────────────

export type SearchMode = 'semantic' | 'tfidf' | 'hybrid' | 'recent'

// ─── Tipo de origem do documento ─────────────────────────────────────────────

export type KnowledgeOrigin = 'official' | 'user' | 'internal' | 'cached'

// ─── Documento de conhecimento ────────────────────────────────────────────────

export interface KnowledgeDoc {
  id: string
  specialist: SpecialistId | string
  title: string
  category: KnowledgeCategory | string
  content: string
  source: string | null
  version: string | null
  tags: string | null
  origin: KnowledgeOrigin
  isRevoked: boolean
  hasEmbedding: boolean
  createdAt: Date
  updatedAt: Date
}

// ─── Resultado de busca ───────────────────────────────────────────────────────

export interface KnowledgeSearchResult extends KnowledgeDoc {
  score: number          // 0–1; 1 = máxima relevância
  searchMode: SearchMode
  snippet: string        // trecho de até 300 chars mais relevante
}

// ─── Entrada de memória ───────────────────────────────────────────────────────

export interface KnowledgeMemoryEntry {
  key: string
  value: string
  type: 'topic' | 'entity' | 'preference' | 'summary'
  relevance: number
}

// ─── Item de histórico da conversa ───────────────────────────────────────────

export interface KnowledgeHistoryItem {
  role: 'user' | 'assistant'
  content: string
  specialist: string | null
  createdAt: Date
}

// ─── Contexto montado para envio ao modelo ────────────────────────────────────

export interface KnowledgeContext {
  specialist: string
  query: string
  docs: KnowledgeSearchResult[]
  memory: KnowledgeMemoryEntry[]
  history: KnowledgeHistoryItem[]
  // Bloco de texto pronto para injetar no system prompt
  contextBlock: string
  memoryBlock: string
  historyBlock: string
  // Meta
  searchMode: SearchMode
  totalDocs: number
  hasUserDocs: boolean
  buildAt: Date
}

// ─── Opções de busca ──────────────────────────────────────────────────────────

export interface KnowledgeSearchOptions {
  limit?: number
  threshold?: number          // cosine similarity mínima para semântica (default 0.20)
  categories?: string[]       // filtrar por categorias
  mode?: SearchMode           // forçar modo; default 'hybrid'
  includeRevoked?: boolean    // default false
}

// ─── Opções de carga ─────────────────────────────────────────────────────────

export interface KnowledgeLoadOptions {
  forceRefresh?: boolean      // ignorar cache
  limit?: number              // máx docs a carregar (default 200)
  categories?: string[]       // filtrar categorias
}

// ─── Opções de getKnowledge ──────────────────────────────────────────────────

export interface GetKnowledgeOptions {
  conversationId?: string
  userId?: string
  historyLimit?: number       // default 20
  docLimit?: number           // default 5
  threshold?: number
  searchMode?: SearchMode
  forceRefresh?: boolean
}
