export { AIService, aiService } from './AIService'
export { ConsoleAILogger, aiLogger, buildAIErrorSummary } from './AILogger'
export type { AICallType, AILogEvent, AILogger } from './AILogger'
export { ModelManager, modelManager } from './ModelManager'
export { PromptManager, promptManager } from './PromptManager'
export {
  DEFAULT_CHAT_MODEL_CONFIG,
  DEFAULT_EMBEDDING_MODEL,
  FUTURE_CHAT_MODEL_FALLBACK,
  MODULE_MODEL_CONFIG,
  SPECIALIST_MODEL_CONFIG,
} from './modelConfig'
export type {
  AIAttachment,
  AIAskInput,
  AIAskResult,
  AIContentPart,
  AIContext,
  AIEmbeddingInput,
  AIEmbeddingResult,
  AIMessage,
  AIModelConfig,
  AIPromptBuildInput,
  AIRole,
  AITool,
  AIToolCall,
  AIToolFunction,
  AIUsage,
} from './types'
