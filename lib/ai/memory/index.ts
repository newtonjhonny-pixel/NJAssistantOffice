// ─── Camada de Memória · Ponto de Entrada ─────────────────────────────────────

// Manager principal (singleton)
export { MemoryManager, memoryManager } from './MemoryManager'

// Tipos
export type {
  MemoryHorizon,
  MemoryEntryType,
  MemoryEntry,
  PersistedMemoryEntry,
  MemoryContext,
  ShortTermEntry,
  MemoryExtractionResult,
  SummarizationResult,
  GetMemoryOptions,
  SaveMemoryOptions,
} from './MemoryTypes'

// Store (para uso direto quando necessário)
export {
  readMediumTermMemory,
  readLongTermMemory,
  readShortTermHistory,
  saveMemoryEntries,
  promotToLongTerm,
  deleteConversationMemory,
  deleteExpiredMemory,
  memoryStats,
} from './MemoryStore'

// Extrator
export { extractMemoryFromExchange, extractMemoryFromHistory } from './MemoryExtractor'

// Sumarizador
export {
  summarizeConversation,
  needsSummarization,
  SUMMARIZATION_THRESHOLD,
  SUMMARIZATION_WINDOW,
} from './MemorySummarizer'
