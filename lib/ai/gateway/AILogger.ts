import type { AIUsage } from './types'

export type AICallType = 'chat' | 'embedding' | 'tools'

export interface AILogEvent {
  module: string
  specialist?: string
  provider: string
  model: string
  type: AICallType
  latencyMs: number
  success: boolean
  error?: string
  usage?: AIUsage
  timestamp: string
}

export interface AILogger {
  log(event: AILogEvent): void
}

function summarizeError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 200)
  return String(error).slice(0, 200)
}

export class ConsoleAILogger implements AILogger {
  log(event: AILogEvent): void {
    const line = {
      scope: 'ai-gateway',
      ...event,
    }

    if (event.success) {
      console.info('[ai-gateway]', line)
    } else {
      console.warn('[ai-gateway]', line)
    }
  }
}

export function buildAIErrorSummary(error: unknown): string {
  return summarizeError(error)
}

export const aiLogger = new ConsoleAILogger()
