import type { AIModelConfig } from './types'

const DEFAULT_CHAT_MODEL = 'gpt-5'
const DEFAULT_CHAT_TEMPERATURE = 0.7
const DEFAULT_CHAT_MAX_TOKENS = 1200

export const DEFAULT_CHAT_MODEL_CONFIG: AIModelConfig = {
  provider: 'openai',
  model: DEFAULT_CHAT_MODEL,
  temperature: DEFAULT_CHAT_TEMPERATURE,
  maxTokens: DEFAULT_CHAT_MAX_TOKENS,
}

export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'

const chatModuleConfig = (
  maxTokens = DEFAULT_CHAT_MAX_TOKENS,
  temperature = DEFAULT_CHAT_TEMPERATURE,
): Partial<AIModelConfig> => ({
  model: DEFAULT_CHAT_MODEL,
  temperature,
  maxTokens,
})

export const MODULE_MODEL_CONFIG: Record<string, Partial<AIModelConfig>> = {
  'central.analyze': chatModuleConfig(1500),
  'central.chat': chatModuleConfig(1200),
  'tasks.chat': chatModuleConfig(1500),
  'notes.chat': chatModuleConfig(1200),
  'conferencia.checklist-chat': chatModuleConfig(1600),
  'projects.relatorios.analyze': chatModuleConfig(1200),
  'procedures.analyze': chatModuleConfig(1200),
  'job-roles.analyze': chatModuleConfig(1200),
  'email.analyzer': chatModuleConfig(1200),
  'team.feedback': chatModuleConfig(1200),
  'team.direction': chatModuleConfig(1200),
  'team.training': chatModuleConfig(1200),
  'team.guideline': chatModuleConfig(1200),
  'agents.internal': chatModuleConfig(1200),
  'especialistas.conversation.title': chatModuleConfig(20, 0.3),
  'especialistas.memory.extract': chatModuleConfig(400, 0),
  'especialistas.memory.summarize': chatModuleConfig(150, 0),
  'especialistas.reasoning': chatModuleConfig(2000),
  'especialistas.reasoning.tools': chatModuleConfig(2000),
  'especialistas.reasoning.tools.followup': chatModuleConfig(2000, 0.2),
}

export const SPECIALIST_MODEL_CONFIG: Record<string, Partial<AIModelConfig>> = {
  departamento_pessoal: chatModuleConfig(2000),
  esocial: chatModuleConfig(2000),
  legislacao_trabalhista: chatModuleConfig(2000),
  juridico_trabalhista: chatModuleConfig(2000),
  seguranca_trabalho: chatModuleConfig(2000),
  medicina_trabalho: chatModuleConfig(2000),
  processos: chatModuleConfig(2000),
  qualidade: chatModuleConfig(2000),
  recrutamento_selecao: chatModuleConfig(2000),
  comportamento: chatModuleConfig(2000),
}

export const FUTURE_CHAT_MODEL_FALLBACK = DEFAULT_CHAT_MODEL
