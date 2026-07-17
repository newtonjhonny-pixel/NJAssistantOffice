import type { SpecialistDefinition, SpecialistId, SpecialistPolicy } from './types'

const DEFAULT_POLICIES: SpecialistPolicy = {
  ragEnabled: true,
  memoryEnabled: true,
  updateEnabled: true,
  toolsEnabled: false,
  attachmentsEnabled: false,
}

function specialist(
  input: Omit<SpecialistDefinition, 'policies' | 'knowledge'> & {
    policies?: Partial<SpecialistPolicy>
    sources?: string[]
  },
): SpecialistDefinition {
  return {
    ...input,
    policies: { ...DEFAULT_POLICIES, ...input.policies },
    knowledge: {
      enabled: true,
      sources: input.sources ?? [],
    },
  }
}

export const SPECIALIST_CATALOG: Record<SpecialistId, SpecialistDefinition> = {
  departamento_pessoal: specialist({
    id: 'departamento_pessoal',
    name: 'Especialista em Departamento Pessoal',
    shortName: 'Departamento Pessoal',
    description: 'Admissao, rescisao, ferias, folha, encargos e rotinas de DP.',
    area: 'Departamento Pessoal',
    basePrompt: 'Voce e um especialista senior em Departamento Pessoal, legislacao trabalhista, folha, ferias, rescisao e rotinas de DP.',
    toolIds: ['calcular_ferias', 'calcular_rescisao', 'calcular_13_salario', 'calcular_aviso_previo'],
    policies: { toolsEnabled: true },
    sources: ['CLT', 'eSocial', 'FGTS Digital', 'DCTFWeb'],
  }),
  esocial: specialist({
    id: 'esocial',
    name: 'Especialista em eSocial',
    shortName: 'eSocial',
    description: 'Eventos, leiautes, MOS, validacoes, FGTS Digital e DCTFWeb.',
    area: 'eSocial',
    basePrompt: 'Voce e um especialista senior em eSocial, MOS, eventos, leiautes, regras de validacao e obrigacoes digitais trabalhistas.',
    toolIds: [],
    sources: ['MOS eSocial', 'Portal eSocial', 'FGTS Digital'],
  }),
  legislacao_trabalhista: specialist({
    id: 'legislacao_trabalhista',
    name: 'Especialista em Legislacao Trabalhista',
    shortName: 'Legislacao Trabalhista',
    description: 'CLT, normas trabalhistas, direitos, deveres e interpretacoes legais.',
    area: 'Legislacao Trabalhista',
    basePrompt: 'Voce e um especialista senior em legislacao trabalhista brasileira, CLT, normas coletivas e obrigacoes legais.',
    toolIds: [],
    sources: ['CLT', 'Constituicao Federal', 'Normas coletivas'],
  }),
  juridico_trabalhista: specialist({
    id: 'juridico_trabalhista',
    name: 'Especialista Juridico Trabalhista',
    shortName: 'Juridico Trabalhista',
    description: 'Processos trabalhistas, jurisprudencia, riscos juridicos e estrategias.',
    area: 'Juridico Trabalhista',
    basePrompt: 'Voce e um especialista juridico trabalhista senior, com foco em jurisprudencia, processos, riscos e fundamentacao legal.',
    toolIds: [],
    sources: ['CLT', 'TST', 'TRTs', 'STF'],
  }),
  seguranca_trabalho: specialist({
    id: 'seguranca_trabalho',
    name: 'Especialista em Seguranca do Trabalho',
    shortName: 'Seguranca do Trabalho',
    description: 'NRs, PGR, riscos ocupacionais, laudos, EPI e prevencao.',
    area: 'Seguranca do Trabalho',
    basePrompt: 'Voce e um especialista senior em seguranca do trabalho, NRs, PGR, riscos ocupacionais, laudos e prevencao.',
    toolIds: [],
    sources: ['Normas Regulamentadoras', 'Fundacentro', 'MTE'],
  }),
  medicina_trabalho: specialist({
    id: 'medicina_trabalho',
    name: 'Especialista em Medicina do Trabalho',
    shortName: 'Medicina do Trabalho',
    description: 'PCMSO, ASO, afastamentos, exames ocupacionais e saude ocupacional.',
    area: 'Medicina do Trabalho',
    basePrompt: 'Voce e um especialista senior em medicina do trabalho, PCMSO, ASO, exames ocupacionais, afastamentos e saude ocupacional.',
    toolIds: [],
    sources: ['NR-7', 'CFM', 'INSS'],
  }),
  processos: specialist({
    id: 'processos',
    name: 'Especialista em Processos',
    shortName: 'Processos',
    description: 'BPM, mapeamento, melhoria continua, indicadores e padronizacao.',
    area: 'Gestao de Processos',
    basePrompt: 'Voce e um especialista senior em gestao de processos, BPM, melhoria continua, indicadores e padronizacao operacional.',
    toolIds: [],
    sources: ['BPM CBOK', 'Lean', 'ISO 9001'],
  }),
  qualidade: specialist({
    id: 'qualidade',
    name: 'Especialista em Qualidade',
    shortName: 'Qualidade',
    description: 'ISO, auditoria, nao conformidades, processos e melhoria continua.',
    area: 'Qualidade',
    basePrompt: 'Voce e um especialista senior em gestao da qualidade, normas ISO, auditorias, nao conformidades e melhoria continua.',
    toolIds: [],
    sources: ['ISO 9001', 'ISO 14001', 'ISO 45001'],
  }),
  recrutamento_selecao: specialist({
    id: 'recrutamento_selecao',
    name: 'Especialista em Recrutamento e Selecao',
    shortName: 'Recrutamento e Selecao',
    description: 'Atracao, selecao, entrevistas, competencias, onboarding e indicadores.',
    area: 'Recursos Humanos',
    basePrompt: 'Voce e um especialista senior em recrutamento e selecao, entrevistas, competencias, onboarding e indicadores de RH.',
    toolIds: [],
    sources: ['SHRM', 'ABRH', 'LGPD'],
  }),
  comportamento: specialist({
    id: 'comportamento',
    name: 'Especialista em Comportamento e Desenvolvimento',
    shortName: 'Comportamento',
    description: 'Produtividade, habitos, lideranca, PDI, desempenho e desenvolvimento humano.',
    area: 'Desenvolvimento Humano',
    basePrompt: 'Voce e um especialista senior em comportamento, produtividade, habitos, lideranca, PDI e desenvolvimento humano.',
    toolIds: [],
    sources: ['Psicologia Positiva', 'GTD', 'Deep Work', 'Atomic Habits'],
  }),
}

export const SPECIALIST_IDS = Object.keys(SPECIALIST_CATALOG) as SpecialistId[]

export const SPECIALIST_ID_ALIASES: Record<string, SpecialistId> = {
  seguranca: 'seguranca_trabalho',
  medicina: 'medicina_trabalho',
  recrutamento: 'recrutamento_selecao',
}
