// ─── Camada de Conhecimento · Ponto de Entrada ────────────────────────────────

// Manager principal (singleton)
export { KnowledgeManager, knowledgeManager } from './KnowledgeManager'

// Tipos
export type {
  KnowledgeCategory,
  KnowledgeDoc,
  KnowledgeSearchResult,
  KnowledgeMemoryEntry,
  KnowledgeHistoryItem,
  KnowledgeContext,
  KnowledgeSearchOptions,
  KnowledgeLoadOptions,
  GetKnowledgeOptions,
  SearchMode,
  KnowledgeOrigin,
} from './KnowledgeTypes'

// Fontes por especialista
export {
  SPECIALIST_KNOWLEDGE_SOURCES,
  getSpecialistSources,
  getSourceCategories,
  getSourcesByPriority,
} from './KnowledgeSource'
export type { KnowledgeSourceDef, SpecialistKnowledgeSources } from './KnowledgeSource'

// Cache (exposto para diagnóstico / testes)
export { knowledgeCache, CACHE_KEYS, CACHE_TTL } from './KnowledgeCache'

// Loaders individuais (para uso direto quando necessário)
export {
  loadOfficialDocuments,
  loadUserDocuments,
  loadMemory,
  loadHistory,
  loadBaseStats,
} from './KnowledgeLoader'

// Índice / busca
export { hybridSearch, crossSpecialistSearch, generateDocEmbedding } from './KnowledgeIndex'

// Re-exporta memoryManager para acesso unificado via knowledge
export { memoryManager } from '@/lib/ai/memory'
