import { buildNotConfiguredEmbeddingResult, buildNotConfiguredResult, type AIProvider } from '@/lib/ai/interfaces/AIProvider'
import { openAIProvider } from '@/lib/ai/providers/OpenAIProvider'
import { aiLogger, buildAIErrorSummary, type AILogger } from './AILogger'
import { modelManager, ModelManager } from './ModelManager'
import { promptManager, PromptManager } from './PromptManager'
import type { AIAskInput, AIAskResult, AIEmbeddingInput, AIEmbeddingResult } from './types'

export class AIService {
  constructor(
    private readonly provider: AIProvider = openAIProvider,
    private readonly models: ModelManager = modelManager,
    private readonly prompts: PromptManager = promptManager,
    private readonly logger: AILogger = aiLogger,
  ) {}

  isConfigured(): boolean {
    return this.provider.isConfigured()
  }

  async ask(input: AIAskInput): Promise<AIAskResult> {
    const modelConfig = this.models.resolve(input)
    const startedAt = Date.now()
    const type = input.tools?.length ? 'tools' : 'chat'

    if (!this.provider.isConfigured()) {
      const result = buildNotConfiguredResult(modelConfig.model, this.provider.name)
      this.logger.log({
        module: input.module,
        specialist: input.specialist,
        provider: result.provider,
        model: result.model,
        type,
        latencyMs: Date.now() - startedAt,
        success: false,
        error: 'AI_PROVIDER_NOT_CONFIGURED',
        timestamp: new Date().toISOString(),
      })
      return result
    }

    try {
      const messages = input.messages ?? this.prompts.buildMessages({ ...input, modelConfig })
      const response = await this.provider.complete({
        messages,
        modelConfig,
        tools: input.tools,
        toolChoice: input.toolChoice,
        responseFormat: input.responseFormat,
      })

      this.logger.log({
        module: input.module,
        specialist: input.specialist,
        provider: response.provider,
        model: response.model,
        type,
        latencyMs: Date.now() - startedAt,
        success: true,
        usage: response.usage,
        timestamp: new Date().toISOString(),
      })

      return {
        ...response,
        aiPowered: true,
      }
    } catch (error) {
      this.logger.log({
        module: input.module,
        specialist: input.specialist,
        provider: this.provider.name,
        model: modelConfig.model,
        type,
        latencyMs: Date.now() - startedAt,
        success: false,
        error: buildAIErrorSummary(error),
        timestamp: new Date().toISOString(),
      })
      throw error
    }
  }

  async embed(input: AIEmbeddingInput): Promise<AIEmbeddingResult> {
    const model = this.models.resolveEmbeddingModel(input.model)
    const startedAt = Date.now()
    const module = input.module ?? 'embeddings'

    if (!this.provider.isConfigured()) {
      const result = buildNotConfiguredEmbeddingResult(model, this.provider.name)
      this.logger.log({
        module,
        provider: result.provider,
        model: result.model,
        type: 'embedding',
        latencyMs: Date.now() - startedAt,
        success: false,
        error: 'AI_PROVIDER_NOT_CONFIGURED',
        timestamp: new Date().toISOString(),
      })
      return result
    }

    if (!this.provider.embed) {
      throw new Error('AI_PROVIDER_EMBEDDINGS_NOT_SUPPORTED')
    }

    try {
      const response = await this.provider.embed({ ...input, model })
      this.logger.log({
        module,
        provider: response.provider,
        model: response.model,
        type: 'embedding',
        latencyMs: Date.now() - startedAt,
        success: true,
        usage: response.usage,
        timestamp: new Date().toISOString(),
      })
      return response
    } catch (error) {
      this.logger.log({
        module,
        provider: this.provider.name,
        model,
        type: 'embedding',
        latencyMs: Date.now() - startedAt,
        success: false,
        error: buildAIErrorSummary(error),
        timestamp: new Date().toISOString(),
      })
      throw error
    }
  }
}

export const aiService = new AIService()
