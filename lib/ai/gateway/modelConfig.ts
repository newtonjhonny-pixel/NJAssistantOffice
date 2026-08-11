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
  'central.analyze': chatModuleConfig(16000),
  'central.chat': chatModuleConfig(16000),
  'tasks.chat': chatModuleConfig(16000),
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
  'team.dimensionamento': chatModuleConfig(16000),
  'team.activities.generator': chatModuleConfig(8000, 0.4),
  'agents.internal': chatModuleConfig(1200),
  'dashboard.daily-summary': chatModuleConfig(8000),
  'especialistas.conversation.title': chatModuleConfig(20, 0.3),
  'especialistas.memory.extract': chatModuleConfig(400, 0),
  'especialistas.memory.summarize': chatModuleConfig(150, 0),
  'especialistas.reasoning': chatModuleConfig(16000),
  'especialistas.reasoning.tools': chatModuleConfig(16000),
  'especialistas.reasoning.tools.followup': chatModuleConfig(16000, 0.2),
}

export const SPECIALIST_MODEL_CONFIG: Record<string, Partial<AIModelConfig>> = {
  departamento_pessoal: chatModuleConfig(16000),
  esocial: chatModuleConfig(16000),
  legislacao_trabalhista: chatModuleConfig(16000),
  juridico_trabalhista: chatModuleConfig(16000),
  seguranca_trabalho: chatModuleConfig(16000),
  medicina_trabalho: chatModuleConfig(16000),
  processos: chatModuleConfig(16000),
  qualidade: chatModuleConfig(16000),
  recrutamento_selecao: chatModuleConfig(16000),
  comportamento: chatModuleConfig(16000),
}

export const FUTURE_CHAT_MODEL_FALLBACK = DEFAULT_CHAT_MODEL
