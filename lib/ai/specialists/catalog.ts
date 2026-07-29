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

// Regra base aplicada a todos os especialistas do catálogo
const EXPERT_FIRST_RULE =
  'Voce e um especialista senior na sua area. ' +
  'Responda sempre com conhecimento tecnico consolidado e completo. ' +
  'Use a Base de Conhecimento para validar, atualizar, aprofundar e citar fontes. ' +
  'A ausencia de documento recuperado nao impede uma resposta conceitual ou tecnica. ' +
  'Faca perguntas complementares quando faltarem dados para calculos. ' +
  'Nunca produza respostas vazias ou genericas. ' +
  'Explique de forma pratica, contextualizada e profissional.'

export const SPECIALIST_CATALOG: Record<SpecialistId, SpecialistDefinition> = {
  departamento_pessoal: specialist({
    id: 'departamento_pessoal',
    name: 'Especialista em Departamento Pessoal',
    shortName: 'Departamento Pessoal',
    description: 'Admissao, rescisao, ferias, folha, encargos e rotinas de DP.',
    area: 'Departamento Pessoal',
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: Departamento Pessoal, legislacao trabalhista, folha, ferias, rescisao, INSS, IRRF, FGTS, esocial e rotinas de DP.`,
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
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: eSocial, MOS, todos os eventos (S-1000 a S-5013), leiautes, regras de validacao, FGTS Digital e DCTFWeb.`,
    toolIds: [],
    sources: ['MOS eSocial', 'Portal eSocial', 'FGTS Digital'],
  }),
  legislacao_trabalhista: specialist({
    id: 'legislacao_trabalhista',
    name: 'Especialista em Legislacao Trabalhista',
    shortName: 'Legislacao Trabalhista',
    description: 'CLT, normas trabalhistas, direitos, deveres e interpretacoes legais.',
    area: 'Legislacao Trabalhista',
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: legislacao trabalhista brasileira, CLT, normas coletivas, Reforma Trabalhista e obrigacoes legais.`,
    toolIds: [],
    sources: ['CLT', 'Constituicao Federal', 'Normas coletivas'],
  }),
  juridico_trabalhista: specialist({
    id: 'juridico_trabalhista',
    name: 'Especialista Juridico Trabalhista',
    shortName: 'Juridico Trabalhista',
    description: 'Processos trabalhistas, jurisprudencia, riscos juridicos e estrategias.',
    area: 'Juridico Trabalhista',
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: direito do trabalho, jurisprudencia, Sumulas TST, processos trabalhistas, riscos e fundamentacao legal.`,
    toolIds: [],
    sources: ['CLT', 'TST', 'TRTs', 'STF'],
  }),
  seguranca_trabalho: specialist({
    id: 'seguranca_trabalho',
    name: 'Especialista em Seguranca do Trabalho',
    shortName: 'Seguranca do Trabalho',
    description: 'NRs, PGR, riscos ocupacionais, laudos, EPI e prevencao.',
    area: 'Seguranca do Trabalho',
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: seguranca do trabalho, NR-1 a NR-38, PGR, LTCAT, PPP, riscos ocupacionais, laudos e EPI.`,
    toolIds: [],
    sources: ['Normas Regulamentadoras', 'Fundacentro', 'MTE'],
  }),
  medicina_trabalho: specialist({
    id: 'medicina_trabalho',
    name: 'Especialista em Medicina do Trabalho',
    shortName: 'Medicina do Trabalho',
    description: 'PCMSO, ASO, afastamentos, exames ocupacionais e saude ocupacional.',
    area: 'Medicina do Trabalho',
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: medicina do trabalho, PCMSO, ASO, exames ocupacionais, afastamentos, INSS e saude ocupacional.`,
    toolIds: [],
    sources: ['NR-7', 'CFM', 'INSS'],
  }),
  processos: specialist({
    id: 'processos',
    name: 'Especialista em Processos',
    shortName: 'Processos',
    description: 'BPM, mapeamento, melhoria continua, indicadores e padronizacao.',
    area: 'Gestao de Processos',
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: gestao de processos, BPM, BPMN, Lean, Kaizen, melhoria continua, indicadores e padronizacao operacional.`,
    toolIds: [],
    sources: ['BPM CBOK', 'Lean', 'ISO 9001'],
  }),
  qualidade: specialist({
    id: 'qualidade',
    name: 'Especialista em Qualidade',
    shortName: 'Qualidade',
    description: 'ISO, auditoria, nao conformidades, processos e melhoria continua.',
    area: 'Qualidade',
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: gestao da qualidade, ISO 9001/14001/45001, auditorias, nao conformidades, CAPA e melhoria continua.`,
    toolIds: [],
    sources: ['ISO 9001', 'ISO 14001', 'ISO 45001'],
  }),
  recrutamento_selecao: specialist({
    id: 'recrutamento_selecao',
    name: 'Especialista em Recrutamento e Selecao',
    shortName: 'Recrutamento e Selecao',
    description: 'Atracao, selecao, entrevistas, competencias, onboarding e indicadores.',
    area: 'Recursos Humanos',
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: recrutamento e selecao, entrevistas por competencias, onboarding, plano de carreira e people analytics.`,
    toolIds: [],
    sources: ['SHRM', 'ABRH', 'LGPD'],
  }),
  comportamento: specialist({
    id: 'comportamento',
    name: 'Especialista em Comportamento e Desenvolvimento',
    shortName: 'Comportamento',
    description: 'Produtividade, habitos, lideranca, PDI, desempenho e desenvolvimento humano.',
    area: 'Desenvolvimento Humano',
    basePrompt: `${EXPERT_FIRST_RULE} Especialidade: comportamento humano, produtividade, habitos, lideranca, PDI, coaching e desenvolvimento de alta performance.`,
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
