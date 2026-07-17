import type { AIModelConfig } from '@/lib/ai/gateway'

export type SpecialistId =
  | 'departamento_pessoal'
  | 'esocial'
  | 'legislacao_trabalhista'
  | 'juridico_trabalhista'
  | 'seguranca_trabalho'
  | 'medicina_trabalho'
  | 'processos'
  | 'qualidade'
  | 'recrutamento_selecao'
  | 'comportamento'

export type LegacySpecialistId = 'seguranca' | 'medicina' | 'recrutamento'

export type SpecialistLookupId = SpecialistId | LegacySpecialistId

export interface SpecialistPolicy {
  ragEnabled: boolean
  memoryEnabled: boolean
  updateEnabled: boolean
  toolsEnabled: boolean
  attachmentsEnabled: boolean
}

export interface SpecialistKnowledgeConfig {
  enabled: boolean
  sources: string[]
}

export interface SpecialistDefinition {
  id: SpecialistId
  name: string
  shortName: string
  description: string
  area: string
  basePrompt: string
  policies: SpecialistPolicy
  knowledge: SpecialistKnowledgeConfig
  toolIds: string[]
  model?: Partial<AIModelConfig>
}
