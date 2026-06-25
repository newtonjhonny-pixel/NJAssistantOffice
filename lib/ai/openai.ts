import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callOpenAI(
  messages: ChatMessage[],
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const client = getOpenAIClient()

  if (!client) {
    throw new Error('AI_NOT_CONFIGURED')
  }

  const response = await client.chat.completions.create({
    model: options?.model ?? 'gpt-4o-mini',
    messages,
    max_tokens: options?.maxTokens ?? 1200,
    temperature: options?.temperature ?? 0.7,
  })

  return response.choices[0]?.message?.content ?? ''
}
