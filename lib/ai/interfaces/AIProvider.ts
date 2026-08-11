import type {
  AIAskResult,
  AIEmbeddingInput,
  AIEmbeddingResult,
  AIMessage,
  AIModelConfig,
  AITool,
  AIUsage,
} from '@/lib/ai/gateway'

export interface AIProviderRequest {
  messages: AIMessage[]
  modelConfig: AIModelConfig
  tools?: AITool[]
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
  responseFormat?: { type: 'json_object' } | { type: 'json_schema'; json_schema: Record<string, unknown> }
}

export interface AIProviderResponse {
  content: string
  model: string
  provider: string
  usage?: AIUsage
  toolCalls?: AIAskResult['toolCalls']
  finishReason?: string
}

export interface AIProvider {
  readonly name: string
  isConfigured(): boolean
  complete(request: AIProviderRequest): Promise<AIProviderResponse>
  embed?(input: AIEmbeddingInput): Promise<AIEmbeddingResult>
}

export function buildNotConfiguredResult(model: string, provider: string): AIAskResult {
  return {
    content: '',
    model,
    provider,
    aiPowered: false,
  }
}

export function buildNotConfiguredEmbeddingResult(model: string, provider: string): AIEmbeddingResult {
  return {
    embeddings: [],
    model,
    provider,
    aiPowered: false,
  }
}
