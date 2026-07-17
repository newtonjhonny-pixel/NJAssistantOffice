export type AIRole = 'system' | 'user' | 'assistant' | 'tool'

export type AIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }

export interface AIMessage {
  role: AIRole
  content: string | AIContentPart[]
  tool_call_id?: string
  toolCalls?: AIToolCall[]
}

export interface AIToolFunction {
  name: string
  description?: string
  parameters?: Record<string, unknown>
}

export interface AITool {
  type: 'function'
  function: AIToolFunction
}

export interface AIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface AIAttachment {
  id?: string
  fileName?: string
  mimeType?: string
  text?: string
  url?: string
}

export interface AIContext {
  summary?: string
  data?: Record<string, unknown>
  documents?: string[]
}

export interface AIAskInput {
  module: string
  message: string
  messages?: AIMessage[]
  specialist?: string
  conversationId?: string
  userId?: string
  context?: AIContext
  attachments?: AIAttachment[]
  history?: AIMessage[]
  systemPrompt?: string
  modulePrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: AITool[]
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export interface AIUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export interface AIAskResult {
  content: string
  model: string
  provider: string
  aiPowered: boolean
  usage?: AIUsage
  toolCalls?: AIToolCall[]
  finishReason?: string
}

export interface AIModelConfig {
  provider: 'openai'
  model: string
  temperature: number
  maxTokens: number
}

export interface AIEmbeddingInput {
  input: string | string[]
  model?: string
  module?: string
}

export interface AIEmbeddingResult {
  embeddings: number[][]
  model: string
  provider: string
  aiPowered: boolean
  usage?: {
    promptTokens?: number
    totalTokens?: number
  }
}

export interface AIPromptBuildInput extends AIAskInput {
  modelConfig: AIModelConfig
}
