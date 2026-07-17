import type { AIAskInput, AIModelConfig } from './types'
import {
  DEFAULT_CHAT_MODEL_CONFIG,
  DEFAULT_EMBEDDING_MODEL,
  MODULE_MODEL_CONFIG,
  SPECIALIST_MODEL_CONFIG,
} from './modelConfig'

export class ModelManager {
  getDefaultConfig(): AIModelConfig {
    return { ...DEFAULT_CHAT_MODEL_CONFIG }
  }

  getDefaultEmbeddingModel(): string {
    return DEFAULT_EMBEDDING_MODEL
  }

  resolveEmbeddingModel(model?: string): string {
    return model ?? DEFAULT_EMBEDDING_MODEL
  }

  resolve(input: AIAskInput): AIModelConfig {
    const moduleConfig = MODULE_MODEL_CONFIG[input.module] ?? {}
    const specialistConfig = input.specialist ? SPECIALIST_MODEL_CONFIG[input.specialist] ?? {} : {}

    return {
      ...DEFAULT_CHAT_MODEL_CONFIG,
      ...specialistConfig,
      ...moduleConfig,
      model: input.model ?? moduleConfig.model ?? specialistConfig.model ?? DEFAULT_CHAT_MODEL_CONFIG.model,
      temperature: input.temperature ?? moduleConfig.temperature ?? specialistConfig.temperature ?? DEFAULT_CHAT_MODEL_CONFIG.temperature,
      maxTokens: input.maxTokens ?? moduleConfig.maxTokens ?? specialistConfig.maxTokens ?? DEFAULT_CHAT_MODEL_CONFIG.maxTokens,
    }
  }
}

export const modelManager = new ModelManager()
