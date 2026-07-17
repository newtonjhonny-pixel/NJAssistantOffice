import type { AIMessage, AIPromptBuildInput } from './types'

const BASE_SYSTEM_PROMPT = `Voce e o nucleo central de inteligencia artificial do NJ Assistant Office.
Responda em portugues brasileiro, com linguagem profissional, clara e objetiva.
Use apenas o contexto recebido quando o modulo exigir precisao operacional.
Nao exponha credenciais, variaveis de ambiente ou detalhes internos de infraestrutura.`

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

export class PromptManager {
  buildMessages(input: AIPromptBuildInput): AIMessage[] {
    const systemPrompt = this.buildSystemPrompt(input)
    const contextPrompt = this.buildContextPrompt(input)

    return [
      { role: 'system', content: systemPrompt },
      ...this.normalizeHistory(input.history),
      ...(contextPrompt ? [{ role: 'user' as const, content: contextPrompt }] : []),
      { role: 'user', content: input.message },
    ]
  }

  private buildSystemPrompt(input: AIPromptBuildInput): string {
    const parts = [
      input.systemPrompt ?? BASE_SYSTEM_PROMPT,
      `Modulo: ${input.module}`,
      input.specialist ? `Especialista: ${input.specialist}` : null,
      input.modulePrompt ? `Prompt do modulo:\n${input.modulePrompt}` : null,
      `Modelo selecionado: ${input.modelConfig.model}`,
    ].filter(Boolean)

    return parts.join('\n\n')
  }

  private buildContextPrompt(input: AIPromptBuildInput): string {
    const parts = [
      input.context?.summary ? `Resumo do contexto:\n${input.context.summary}` : null,
      input.context?.data ? `Dados do contexto:\n${stringifyValue(input.context.data)}` : null,
      input.context?.documents?.length ? `Documentos do contexto:\n${input.context.documents.join('\n\n---\n\n')}` : null,
      input.attachments?.length ? `Anexos informados:\n${input.attachments.map(a => this.formatAttachment(a)).join('\n\n')}` : null,
    ].filter(Boolean)

    return parts.length ? `Contexto enviado pelo modulo:\n\n${parts.join('\n\n')}` : ''
  }

  private normalizeHistory(history?: AIMessage[]): AIMessage[] {
    return history?.filter(message => message.role !== 'system') ?? []
  }

  private formatAttachment(attachment: NonNullable<AIPromptBuildInput['attachments']>[number]): string {
    return [
      attachment.fileName ? `Arquivo: ${attachment.fileName}` : null,
      attachment.mimeType ? `Tipo: ${attachment.mimeType}` : null,
      attachment.text ? `Conteudo:\n${attachment.text}` : null,
      attachment.url ? `URL: ${attachment.url}` : null,
    ].filter(Boolean).join('\n')
  }
}

export const promptManager = new PromptManager()
