import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat'
import type { AIProvider, AIProviderRequest, AIProviderResponse } from '@/lib/ai/interfaces/AIProvider'
import type { AIEmbeddingInput, AIEmbeddingResult } from '@/lib/ai/gateway'

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  private client: OpenAI | null = null

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY)
  }

  async complete(request: AIProviderRequest): Promise<AIProviderResponse> {
    const client = this.getClient()
    const messages = request.messages.map(message => {
      if (message.role === 'assistant' && message.toolCalls) {
        const { toolCalls, ...rest } = message
        return { ...rest, tool_calls: toolCalls }
      }
      return message
    })

    const model = request.modelConfig.model
    // gpt-5 e modelos de raciocínio (o1, o3) usam max_completion_tokens em vez de max_tokens
    const usesCompletionTokens = /^gpt-5|^o1|^o3/.test(model)
    // gpt-5 e modelos de raciocínio (o1, o3) só aceitam temperature=1 (padrão); não enviar
    const supportsTemperature = !/^gpt-5|^o1|^o3/.test(model)

    const response = await client.chat.completions.create({
      model,
      messages: messages as ChatCompletionMessageParam[],
      tools: request.tools,
      tool_choice: request.toolChoice,
      ...(usesCompletionTokens
        ? { max_completion_tokens: request.modelConfig.maxTokens }
        : { max_tokens: request.modelConfig.maxTokens }),
      ...(supportsTemperature ? { temperature: request.modelConfig.temperature } : {}),
    })

    const choice = response.choices[0]

    const toolCalls = choice?.message?.tool_calls
      ?.filter(toolCall => toolCall.type === 'function')
      .map(toolCall => ({
        id: toolCall.id,
        type: 'function' as const,
        function: toolCall.function,
      }))

    return {
      content: choice?.message?.content ?? '',
      model: response.model,
      provider: this.name,
      toolCalls,
      finishReason: choice?.finish_reason ?? undefined,
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
    }
  }

  async embed(input: AIEmbeddingInput): Promise<AIEmbeddingResult> {
    const client = this.getClient()
    const model = input.model

    if (!model) {
      throw new Error('AI_EMBEDDING_MODEL_NOT_RESOLVED')
    }

    const response = await client.embeddings.create({
      model,
      input: input.input,
    })

    return {
      embeddings: response.data.map(item => item.embedding),
      model: response.model,
      provider: this.name,
      aiPowered: true,
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        totalTokens: response.usage?.total_tokens,
      },
    }
  }

  private getClient(): OpenAI {
    if (!this.isConfigured()) {
      throw new Error('AI_PROVIDER_NOT_CONFIGURED')
    }

    if (!this.client) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }

    return this.client
  }
}

export const openAIProvider = new OpenAIProvider()
