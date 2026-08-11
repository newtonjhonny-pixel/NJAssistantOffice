/**
 * CapacityEngine — Motor Central de Mensuração de Capacidade do DP
 *
 * FONTE ÚNICA DE VERDADE para todos os cálculos de capacidade.
 * Dashboard, relatórios, IA, carteira e simulador consomem este motor.
 *
 * Fórmula central:
 *   Carga Bruta  = volume × tempo médio (minutos)
 *   Carga Humana = Carga Bruta × (% intervenção humana / 100)
 *
 * Os % de intervenção são parametrizáveis pelo administrador (InterventionConfig).
 * Nenhum percentual está hardcoded no motor — apenas os defaults.
 */

import type {
  ExecutionType,
  RequiredLevel,
  InterventionConfig,
  DpActivityInstance,
  ActivityLoad,
  ProcessLoad,
  ExecutionBreakdown,
  CompanyLoad,
  CapacitySettings,
  MemberCapacityResult,
  AutomationOpportunity,
  AutomationSimulationResult,
  DpProcessEntry,
  DpActivityEntry,
} from './types'

// ─── Defaults parametrizáveis ─────────────────────────────────────────────────

/**
 * Configuração padrão de intervenção humana por tipo de execução.
 * Estes valores são usados somente quando não há registro na tabela InterventionConfig.
 * O administrador pode alterar em: Configurações → Gestão de Equipe → Parâmetros de Capacidade.
 *
 * Interpretação: representa o esforço humano RESIDUAL necessário para execução da atividade.
 * 100% não significa que a atividade ocupa 100% da jornada —
 * significa que todo esforço necessário para aquela atividade depende de intervenção humana.
 */
export const DEFAULT_INTERVENTION_CONFIGS: Record<ExecutionType, InterventionConfig> = {
  MANUAL: {
    executionType:   'MANUAL',
    interventionPct: 100,
    label:           'Manual',
    description:     '100% intervenção humana — todo esforço depende de intervenção.',
  },
  ASSISTIDA: {
    executionType:   'ASSISTIDA',
    interventionPct: 70,
    label:           'Assistida',
    description:     '70% intervenção humana — sistema apoia, operação ainda é humana.',
  },
  AUTOMATIZADA: {
    executionType:   'AUTOMATIZADA',
    interventionPct: 30,
    label:           'Automatizada',
    description:     '30% intervenção humana — sistema executa, humano valida/monitora.',
  },
  AUTOMATICA_EXCECOES: {
    executionType:   'AUTOMATICA_EXCECOES',
    interventionPct: 10,
    label:           'Automática com exceções',
    description:     '10% intervenção humana — execução automática, apenas tratamento de exceções.',
  },
}

/**
 * Configuração padrão de capacidade.
 * "Faixas gerenciais internas para planejamento de capacidade.
 *  Não representam limites legais de jornada."
 */
export const DEFAULT_CAPACITY_SETTINGS: CapacitySettings = {
  monthlyHours:       220,
  operationalReserve: 20,   // 20% de reserva → capacidade produtiva = 176h
  bandLow:            60,   // ≤60%  → Baixa utilização
  bandAvailable:      75,   // ≤75%  → Capacidade disponível
  bandAdequate:       85,   // ≤85%  → Faixa adequada
  bandHigh:           95,   // ≤95%  → Alta utilização
  bandLimit:          100,  // ≤100% → Limite operacional
  // >100%       → Sobrecarga
  // >bandLimit*1.1 → Sobrecarga crítica
}

export const BAND_LABELS_ENGINE: Record<string, string> = {
  low:       'Baixa utilização',
  available: 'Capacidade disponível',
  adequate:  'Faixa adequada',
  high:      'Alta utilização',
  limit:     'Limite operacional',
  overload:  'Sobrecarga',
  critical:  'Sobrecarga crítica',
}

export const BAND_COLORS_ENGINE: Record<string, { text: string; bg: string; border: string; bar: string }> = {
  low:       { text: 'text-slate-600',  bg: 'bg-slate-50',   border: 'border-slate-200',  bar: 'bg-slate-400'  },
  available: { text: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  bar: 'bg-green-500'  },
  adequate:  { text: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   bar: 'bg-blue-500'   },
  high:      { text: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200',  bar: 'bg-amber-400'  },
  limit:     { text: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', bar: 'bg-orange-500' },
  overload:  { text: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',    bar: 'bg-red-500'    },
  critical:  { text: 'text-red-800',    bg: 'bg-red-100',    border: 'border-red-300',    bar: 'bg-red-700'    },
}

export const EXECUTION_LABELS: Record<string, string> = {
  MANUAL:               'Manual',
  ASSISTIDA:            'Assistida',
  AUTOMATIZADA:         'Automatizada',
  AUTOMATICA_EXCECOES:  'Automática com exceções',
}

export const EXECUTION_COLORS: Record<string, string> = {
  MANUAL:               'bg-red-100 text-red-700',
  ASSISTIDA:            'bg-amber-100 text-amber-700',
  AUTOMATIZADA:         'bg-blue-100 text-blue-700',
  AUTOMATICA_EXCECOES:  'bg-green-100 text-green-700',
}

export const LEVEL_LABELS: Record<string, string> = {
  ASSISTENTE:    'Assistente',
  ANALISTA:      'Analista',
  COORDENACAO:   'Coordenação',
  COMPARTILHADO: 'Compartilhado',
}

// ─── Catálogo de Processos DP ─────────────────────────────────────────────────

export const DP_PROCESS_CATALOG: DpProcessEntry[] = [
  { code: 'ADMISSAO',          name: 'Admissão',                     order: 1  },
  { code: 'FOLHA',             name: 'Folha de Pagamento',            order: 2  },
  { code: 'PONTO',             name: 'Ponto',                         order: 3  },
  { code: 'FERIAS',            name: 'Férias',                        order: 4  },
  { code: 'RESCISAO',          name: 'Rescisão',                      order: 5  },
  { code: 'BENEFICIOS',        name: 'Benefícios',                    order: 6  },
  { code: 'AFASTAMENTOS',      name: 'Afastamentos',                  order: 7  },
  { code: 'ESOCIAL',           name: 'eSocial',                       order: 8  },
  { code: 'FGTS_DIGITAL',      name: 'FGTS Digital',                  order: 9  },
  { code: 'DCTFWEB',           name: 'DCTFWeb',                       order: 10 },
  { code: 'CONSIGNADO',        name: 'Consignado',                    order: 11 },
  { code: 'OBRIGACOES_ACESS',  name: 'Obrigações Acessórias',         order: 12 },
  { code: 'ATENDIMENTO',       name: 'Atendimento ao Colaborador',    order: 13 },
  { code: 'ARQUIVAMENTO',      name: 'Arquivamento/Documentação',     order: 14 },
  { code: 'OUTROS',            name: 'Outros',                        order: 15 },
]

export const DP_PROCESS_MAP: Record<string, string> = Object.fromEntries(
  DP_PROCESS_CATALOG.map(p => [p.code, p.name])
)

// ─── Catálogo de Atividades DP ────────────────────────────────────────────────

export const DP_ACTIVITY_CATALOG: DpActivityEntry[] = [
  // ── ADMISSÃO ──────────────────────────────────────────────────────────────
  { processCode: 'ADMISSAO', name: 'Receber documentação',       suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 10,  order: 1  },
  { processCode: 'ADMISSAO', name: 'Conferir documentação',      suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 15,  order: 2  },
  { processCode: 'ADMISSAO', name: 'Cobrar documentos pendentes',suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 5,   order: 3  },
  { processCode: 'ADMISSAO', name: 'Cadastrar empregado',        suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 15,  order: 4  },
  { processCode: 'ADMISSAO', name: 'Cadastrar dependentes',      suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 5,   order: 5  },
  { processCode: 'ADMISSAO', name: 'Cadastrar benefícios',       suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 5,   order: 6  },
  { processCode: 'ADMISSAO', name: 'Cadastrar banco',            suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 3,   order: 7  },
  { processCode: 'ADMISSAO', name: 'Cadastrar salário/horário',  suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 5,   order: 8  },
  { processCode: 'ADMISSAO', name: 'Enviar eSocial admissão',    suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATICA_EXCECOES', defaultTimeMin: 5,   order: 9  },
  { processCode: 'ADMISSAO', name: 'Gerar contrato',             suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATIZADA',        defaultTimeMin: 5,   order: 10 },
  { processCode: 'ADMISSAO', name: 'Coletar assinatura',         suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',           defaultTimeMin: 5,   order: 11 },
  { processCode: 'ADMISSAO', name: 'Arquivar documentos',        suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',           defaultTimeMin: 5,   order: 12 },
  // ── FOLHA ─────────────────────────────────────────────────────────────────
  { processCode: 'FOLHA', name: 'Importar ponto',              suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',    defaultTimeMin: 15,  order: 1  },
  { processCode: 'FOLHA', name: 'Conferir ponto',              suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',       defaultTimeMin: 60,  order: 2  },
  { processCode: 'FOLHA', name: 'Lançar horas extras',         suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 2,   order: 3  },
  { processCode: 'FOLHA', name: 'Lançar faltas',               suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 2,   order: 4  },
  { processCode: 'FOLHA', name: 'Lançar atrasos',              suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 1,   order: 5  },
  { processCode: 'FOLHA', name: 'Tratar banco de horas',       suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 3,   order: 6  },
  { processCode: 'FOLHA', name: 'Lançar comissões',            suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 2,   order: 7  },
  { processCode: 'FOLHA', name: 'Lançar premiações',           suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 2,   order: 8  },
  { processCode: 'FOLHA', name: 'Lançar adicionais',           suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 2,   order: 9  },
  { processCode: 'FOLHA', name: 'Lançar descontos',            suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 2,   order: 10 },
  { processCode: 'FOLHA', name: 'Importar benefícios',         suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',    defaultTimeMin: 15,  order: 11 },
  { processCode: 'FOLHA', name: 'Importar consignados',        suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',    defaultTimeMin: 10,  order: 12 },
  { processCode: 'FOLHA', name: 'Processar folha',             suggestedLevel: 'ANALISTA',   defaultExecution: 'AUTOMATIZADA', defaultTimeMin: 20,  order: 13 },
  { processCode: 'FOLHA', name: 'Conferir folha',              suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',       defaultTimeMin: 60,  order: 14 },
  { processCode: 'FOLHA', name: 'Corrigir inconsistências',    suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',       defaultTimeMin: 30,  order: 15 },
  { processCode: 'FOLHA', name: 'Gerar eSocial folha',         suggestedLevel: 'ANALISTA',   defaultExecution: 'AUTOMATIZADA', defaultTimeMin: 10,  order: 16 },
  { processCode: 'FOLHA', name: 'Conferir eSocial',            suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',       defaultTimeMin: 20,  order: 17 },
  { processCode: 'FOLHA', name: 'Fechar folha',                suggestedLevel: 'ANALISTA',   defaultExecution: 'ASSISTIDA',    defaultTimeMin: 15,  order: 18 },
  { processCode: 'FOLHA', name: 'Conferir encargos',           suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',       defaultTimeMin: 30,  order: 19 },
  { processCode: 'FOLHA', name: 'Gerar relatórios',            suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATIZADA', defaultTimeMin: 10,  order: 20 },
  // ── RESCISÃO ──────────────────────────────────────────────────────────────
  { processCode: 'RESCISAO', name: 'Receber solicitação',      suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 5,   order: 1  },
  { processCode: 'RESCISAO', name: 'Conferir aviso prévio',    suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 15,  order: 2  },
  { processCode: 'RESCISAO', name: 'Calcular rescisão',        suggestedLevel: 'ANALISTA',   defaultExecution: 'ASSISTIDA',           defaultTimeMin: 30,  order: 3  },
  { processCode: 'RESCISAO', name: 'Conferir médias',          suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 20,  order: 4  },
  { processCode: 'RESCISAO', name: 'Conferir consignado',      suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 10,  order: 5  },
  { processCode: 'RESCISAO', name: 'Conferir descontos',       suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 10,  order: 6  },
  { processCode: 'RESCISAO', name: 'Gerar documentos',         suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATIZADA',        defaultTimeMin: 10,  order: 7  },
  { processCode: 'RESCISAO', name: 'Enviar eSocial rescisão',  suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATICA_EXCECOES', defaultTimeMin: 5,   order: 8  },
  { processCode: 'RESCISAO', name: 'Gerar FGTS',               suggestedLevel: 'ANALISTA',   defaultExecution: 'ASSISTIDA',           defaultTimeMin: 10,  order: 9  },
  { processCode: 'RESCISAO', name: 'Conferência final',        suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 20,  order: 10 },
  { processCode: 'RESCISAO', name: 'Enviar para pagamento',    suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',           defaultTimeMin: 5,   order: 11 },
  { processCode: 'RESCISAO', name: 'Arquivar documentos',      suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',           defaultTimeMin: 5,   order: 12 },
  // ── FÉRIAS ────────────────────────────────────────────────────────────────
  { processCode: 'FERIAS', name: 'Verificar vencimentos',      suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATIZADA',        defaultTimeMin: 5,   order: 1  },
  { processCode: 'FERIAS', name: 'Comunicar ao colaborador',   suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 5,   order: 2  },
  { processCode: 'FERIAS', name: 'Calcular férias',            suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATIZADA',        defaultTimeMin: 10,  order: 3  },
  { processCode: 'FERIAS', name: 'Gerar aviso de férias',      suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATIZADA',        defaultTimeMin: 5,   order: 4  },
  { processCode: 'FERIAS', name: 'Gerar recibo de férias',     suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATIZADA',        defaultTimeMin: 5,   order: 5  },
  { processCode: 'FERIAS', name: 'Enviar eSocial férias',      suggestedLevel: 'ASSISTENTE', defaultExecution: 'AUTOMATICA_EXCECOES', defaultTimeMin: 5,   order: 6  },
  { processCode: 'FERIAS', name: 'Arquivar documentos',        suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',           defaultTimeMin: 3,   order: 7  },
  // ── PONTO ─────────────────────────────────────────────────────────────────
  { processCode: 'PONTO', name: 'Coletar registros de ponto',  suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',    defaultTimeMin: 15,  order: 1  },
  { processCode: 'PONTO', name: 'Tratar ausências',            suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 2,   order: 2  },
  { processCode: 'PONTO', name: 'Validar banco de horas',      suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',       defaultTimeMin: 30,  order: 3  },
  { processCode: 'PONTO', name: 'Fechar folha de ponto',       suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',       defaultTimeMin: 20,  order: 4  },
  // ── BENEFÍCIOS ────────────────────────────────────────────────────────────
  { processCode: 'BENEFICIOS', name: 'Cadastrar benefícios',      suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',       defaultTimeMin: 5,   order: 1  },
  { processCode: 'BENEFICIOS', name: 'Importar movimentações',    suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',    defaultTimeMin: 15,  order: 2  },
  { processCode: 'BENEFICIOS', name: 'Conferir fatura',           suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',       defaultTimeMin: 20,  order: 3  },
  { processCode: 'BENEFICIOS', name: 'Tratar divergências',       suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',       defaultTimeMin: 15,  order: 4  },
  // ── AFASTAMENTOS ──────────────────────────────────────────────────────────
  { processCode: 'AFASTAMENTOS', name: 'Receber atestado',        suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 5,   order: 1  },
  { processCode: 'AFASTAMENTOS', name: 'Lançar afastamento',      suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 10,  order: 2  },
  { processCode: 'AFASTAMENTOS', name: 'Enviar CAT/eSocial',      suggestedLevel: 'ANALISTA',   defaultExecution: 'AUTOMATICA_EXCECOES', defaultTimeMin: 15,  order: 3  },
  { processCode: 'AFASTAMENTOS', name: 'Acompanhar INSS',         suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 10,  order: 4  },
  // ── ESOCIAL ───────────────────────────────────────────────────────────────
  { processCode: 'ESOCIAL', name: 'Monitorar pendências',         suggestedLevel: 'ANALISTA',   defaultExecution: 'ASSISTIDA',           defaultTimeMin: 15,  order: 1  },
  { processCode: 'ESOCIAL', name: 'Tratar erros/rejeições',       suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 20,  order: 2  },
  { processCode: 'ESOCIAL', name: 'Enviar eventos periódicos',    suggestedLevel: 'ANALISTA',   defaultExecution: 'AUTOMATIZADA',        defaultTimeMin: 10,  order: 3  },
  // ── FGTS DIGITAL ──────────────────────────────────────────────────────────
  { processCode: 'FGTS_DIGITAL', name: 'Gerar guia FGTS Digital', suggestedLevel: 'ANALISTA',   defaultExecution: 'AUTOMATIZADA',        defaultTimeMin: 15,  order: 1  },
  { processCode: 'FGTS_DIGITAL', name: 'Conferir FGTS Digital',   suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 20,  order: 2  },
  { processCode: 'FGTS_DIGITAL', name: 'Tratar erros FGTS',       suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 15,  order: 3  },
  // ── DCTFWEB ───────────────────────────────────────────────────────────────
  { processCode: 'DCTFWEB', name: 'Apurar DCTFWeb',               suggestedLevel: 'ANALISTA',   defaultExecution: 'ASSISTIDA',           defaultTimeMin: 30,  order: 1  },
  { processCode: 'DCTFWEB', name: 'Conferir DCTFWeb',             suggestedLevel: 'ANALISTA',   defaultExecution: 'MANUAL',              defaultTimeMin: 20,  order: 2  },
  { processCode: 'DCTFWEB', name: 'Transmitir DCTFWeb',           suggestedLevel: 'ANALISTA',   defaultExecution: 'AUTOMATIZADA',        defaultTimeMin: 10,  order: 3  },
  // ── ATENDIMENTO ───────────────────────────────────────────────────────────
  { processCode: 'ATENDIMENTO', name: 'Responder dúvidas internas',suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',              defaultTimeMin: 10,  order: 1  },
  { processCode: 'ATENDIMENTO', name: 'Emitir certidões/docs',     suggestedLevel: 'ASSISTENTE', defaultExecution: 'ASSISTIDA',           defaultTimeMin: 5,   order: 2  },
  { processCode: 'ATENDIMENTO', name: 'Atendimento ao colaborador', suggestedLevel: 'ASSISTENTE', defaultExecution: 'MANUAL',             defaultTimeMin: 15,  order: 3  },
]

// ─── Funções do Motor ─────────────────────────────────────────────────────────

/**
 * Calcula a carga de uma atividade individual.
 *
 * Memória de cálculo (§3–§5):
 *   Carga Bruta       = volume × avgTimeMinutes
 *   Carga Humana      = Carga Bruta × (interventionPct / 100)
 *   Carga Automatizada = Carga Bruta × (1 − interventionPct / 100)
 *
 * Invariante: humanMinutes + automatedMinutes = grossMinutes
 */
export function calculateActivityLoad(
  activity: DpActivityInstance,
  interventionPct: number
): ActivityLoad {
  const grossMinutes     = (activity.volume ?? 0) * (activity.avgTimeMinutes ?? 0)
  const humanMinutes     = grossMinutes * (interventionPct / 100)
  const automatedMinutes = grossMinutes - humanMinutes   // §5: carga automatizada equivalente
  return {
    activityId:       activity.id,
    activityName:     activity.activityName,
    processCode:      activity.processCode,
    executionType:    activity.executionType,
    interventionPct,
    volume:           activity.volume ?? 0,
    avgTimeMinutes:   activity.avgTimeMinutes ?? 0,
    grossMinutes:     Math.round(grossMinutes     * 100) / 100,
    humanMinutes:     Math.round(humanMinutes     * 100) / 100,
    automatedMinutes: Math.round(automatedMinutes * 100) / 100,
    requiredLevel:    activity.requiredLevel,
  }
}

/**
 * Agrega as cargas de todas as atividades de um processo.
 *
 * §6: interventionIndex = totalHumanMinutes / totalGrossMinutes × 100
 * §7: automationIndex   = totalAutomatedMinutes / totalGrossMinutes × 100
 * Invariante: interventionIndex + automationIndex = 100 (salvo arredondamento)
 */
export function calculateProcessLoad(
  processCode: string,
  processName: string,
  activities: DpActivityInstance[],
  interventionMap: Record<string, number>   // executionType → %
): ProcessLoad {
  const activityLoads = activities.map(a =>
    calculateActivityLoad(a, interventionMap[a.executionType] ?? 100)
  )

  const byExecution: Record<string, ExecutionBreakdown> = {}
  let totalGross     = 0
  let totalHuman     = 0
  let totalAutomated = 0

  for (const al of activityLoads) {
    totalGross     += al.grossMinutes
    totalHuman     += al.humanMinutes
    totalAutomated += al.automatedMinutes
    if (!byExecution[al.executionType]) {
      byExecution[al.executionType] = { grossMinutes: 0, humanMinutes: 0, automatedMinutes: 0, count: 0, grossPct: 0, humanPct: 0 }
    }
    byExecution[al.executionType].grossMinutes     += al.grossMinutes
    byExecution[al.executionType].humanMinutes     += al.humanMinutes
    byExecution[al.executionType].automatedMinutes += al.automatedMinutes
    byExecution[al.executionType].count++
  }

  // Round and compute percentages (§8: composição operacional por tipo)
  for (const k of Object.keys(byExecution)) {
    const b = byExecution[k]
    b.grossMinutes     = Math.round(b.grossMinutes     * 100) / 100
    b.humanMinutes     = Math.round(b.humanMinutes     * 100) / 100
    b.automatedMinutes = Math.round(b.automatedMinutes * 100) / 100
    b.grossPct = totalGross > 0 ? Math.round((b.grossMinutes / totalGross) * 10000) / 100 : 0
    b.humanPct = totalHuman > 0 ? Math.round((b.humanMinutes / totalHuman) * 10000) / 100 : 0
  }

  // §6: interventionIndex — ponderado pelo esforço, não pela contagem de atividades
  const interventionIndex = totalGross > 0
    ? Math.round((totalHuman / totalGross) * 10000) / 100
    : 0
  // §7: automationIndex — derivado da carga automatizada real
  const automationIndex = totalGross > 0
    ? Math.round((totalAutomated / totalGross) * 10000) / 100
    : 0

  return {
    processCode,
    processName,
    grossMinutes:      Math.round(totalGross     * 100) / 100,
    humanMinutes:      Math.round(totalHuman     * 100) / 100,
    automatedMinutes:  Math.round(totalAutomated * 100) / 100,
    interventionIndex,
    automationIndex,
    activities:        activityLoads,
    byExecution,
  }
}

/**
 * Agrega as cargas de todos os processos de uma empresa (vínculo).
 *
 * §6: interventionIndex = totalHumanMinutes / totalGrossMinutes × 100
 * §7: automationIndex   = totalAutomatedMinutes / totalGrossMinutes × 100
 * Invariante: interventionIndex + automationIndex = 100 (salvo arredondamento visual)
 *
 * NOTA: o antigo "manualityIndex binário" (manual/totalHumano) foi substituído.
 * O campo manualityIndex é mantido como alias de interventionIndex para retrocompatibilidade.
 */
export function calculateCompanyLoad(
  link: { id: string; companyId: string; companyName: string },
  activities: DpActivityInstance[],
  interventionMap: Record<string, number>,
  processCatalog: Record<string, string> = DP_PROCESS_MAP
): CompanyLoad {
  // Group by processCode
  const byProcess: Record<string, DpActivityInstance[]> = {}
  for (const a of activities) {
    if (!byProcess[a.processCode]) byProcess[a.processCode] = []
    byProcess[a.processCode].push(a)
  }

  const processes: ProcessLoad[] = []
  const byExecution: Record<string, ExecutionBreakdown> = {}
  let totalGross     = 0
  let totalHuman     = 0
  let totalAutomated = 0

  for (const [code, acts] of Object.entries(byProcess)) {
    const pLoad = calculateProcessLoad(
      code,
      processCatalog[code] ?? code,
      acts,
      interventionMap
    )
    processes.push(pLoad)
    totalGross     += pLoad.grossMinutes
    totalHuman     += pLoad.humanMinutes
    totalAutomated += pLoad.automatedMinutes
    for (const [et, ev] of Object.entries(pLoad.byExecution)) {
      if (!byExecution[et]) byExecution[et] = { grossMinutes: 0, humanMinutes: 0, automatedMinutes: 0, count: 0, grossPct: 0, humanPct: 0 }
      byExecution[et].grossMinutes     += ev.grossMinutes
      byExecution[et].humanMinutes     += ev.humanMinutes
      byExecution[et].automatedMinutes += ev.automatedMinutes
      byExecution[et].count            += ev.count
    }
  }

  // Round e percentuais finais (§8: composição operacional)
  for (const k of Object.keys(byExecution)) {
    const b = byExecution[k]
    b.grossMinutes     = Math.round(b.grossMinutes     * 100) / 100
    b.humanMinutes     = Math.round(b.humanMinutes     * 100) / 100
    b.automatedMinutes = Math.round(b.automatedMinutes * 100) / 100
    b.grossPct = totalGross > 0 ? Math.round((b.grossMinutes / totalGross) * 10000) / 100 : 0
    b.humanPct = totalHuman > 0 ? Math.round((b.humanMinutes / totalHuman) * 10000) / 100 : 0
  }

  // §6: Índice de Intervenção Humana — ponderado pelo esforço equivalente (NÃO binário)
  const interventionIndex = totalGross > 0
    ? Math.round((totalHuman / totalGross) * 10000) / 100
    : 0
  // §7: Índice de Automação Operacional — derivado da carga automatizada real
  const automationIndex = totalGross > 0
    ? Math.round((totalAutomated / totalGross) * 10000) / 100
    : 0

  return {
    linkId:                  link.id,
    companyId:               link.companyId,
    companyName:             link.companyName,
    totalGrossMinutes:       Math.round(totalGross     * 100) / 100,
    totalHumanMinutes:       Math.round(totalHuman     * 100) / 100,
    totalAutomatedMinutes:   Math.round(totalAutomated * 100) / 100,
    interventionIndex,
    manualityIndex:          interventionIndex,  // alias retrocompatível
    automationIndex,
    processes: processes.sort((a, b) => b.humanMinutes - a.humanMinutes),
    byExecution,
    hasActivityData:         activities.length > 0,
  }
}

/**
 * Calcula a capacidade completa de um colaborador.
 *
 * §10: Utilização = Carga Humana Total ÷ Capacidade Produtiva × 100
 *      IMPORTANTE: somente esforço humano consome capacidade do colaborador.
 *      Tempo automatizado NÃO consome capacidade humana.
 *
 * §16: Capacidade Produtiva = Jornada × (1 − Reserva Operacional%)
 *      "A reserva operacional absorve reuniões, atendimento, contingências,
 *       treinamento e demandas não planejadas. Não representa limite legal de jornada."
 */
export function calculateMemberCapacity(
  member: { id: string; name: string },
  companyLoads: CompanyLoad[],
  settings: CapacitySettings
): MemberCapacityResult {
  const productiveHours    = settings.monthlyHours * (1 - settings.operationalReserve / 100)
  const productiveMinutes  = productiveHours * 60
  const totalHumanMinutes  = companyLoads.reduce((s, c) => s + c.totalHumanMinutes, 0)
  const totalAutomatedMinutes = companyLoads.reduce((s, c) => s + c.totalAutomatedMinutes, 0)
  const totalGrossMinutes  = totalHumanMinutes + totalAutomatedMinutes
  const totalHumanHours    = totalHumanMinutes / 60
  const totalAutomatedHours = totalAutomatedMinutes / 60
  const availableHours     = productiveHours - totalHumanHours

  // §10: utilização considera APENAS esforço humano
  const utilizationPct = productiveHours > 0
    ? Math.round((totalHumanHours / productiveHours) * 10000) / 100
    : 0

  const band = calcBandEngine(utilizationPct, settings)

  // §6: Índice de Intervenção Humana — ponderado pelo esforço equivalente (NÃO binário)
  const interventionIndex = totalGrossMinutes > 0
    ? Math.round((totalHumanMinutes / totalGrossMinutes) * 10000) / 100
    : 0
  // §7: Índice de Automação Operacional
  const automationIndex = totalGrossMinutes > 0
    ? Math.round((totalAutomatedMinutes / totalGrossMinutes) * 10000) / 100
    : 0

  // §11: FTE por nível de função — usa esforço humano necessário
  let analystMinutes   = 0
  let assistantMinutes = 0
  for (const c of companyLoads) {
    for (const p of c.processes) {
      for (const a of p.activities) {
        if (a.requiredLevel === 'ANALISTA' || a.requiredLevel === 'COORDENACAO') {
          analystMinutes += a.humanMinutes
        } else {
          assistantMinutes += a.humanMinutes
        }
      }
    }
  }
  const ftAnalyst   = productiveMinutes > 0
    ? Math.round((analystMinutes   / productiveMinutes) * 1000) / 1000
    : 0
  const ftAssistant = productiveMinutes > 0
    ? Math.round((assistantMinutes / productiveMinutes) * 1000) / 1000
    : 0

  // Top oportunidades de automação (atividades manuais, maior carga humana) — §25
  const opportunities: AutomationOpportunity[] = []
  for (const c of companyLoads) {
    for (const p of c.processes) {
      for (const a of p.activities) {
        if (a.executionType === 'MANUAL' && a.humanMinutes > 0) {
          opportunities.push({
            activityName:     a.activityName,
            companyName:      c.companyName,
            processCode:      a.processCode,
            currentExecution: a.executionType,
            humanMinutes:     a.humanMinutes,
            humanHours:       Math.round((a.humanMinutes / 60) * 100) / 100,
          })
        }
      }
    }
  }
  opportunities.sort((a, b) => b.humanMinutes - a.humanMinutes)

  return {
    memberId:             member.id,
    memberName:           member.name,
    monthlyHours:         settings.monthlyHours,
    productiveHours:      Math.round(productiveHours      * 100) / 100,
    totalHumanHours:      Math.round(totalHumanHours      * 100) / 100,
    totalAutomatedHours:  Math.round(totalAutomatedHours  * 100) / 100,
    availableHours:       Math.round(availableHours        * 100) / 100,
    utilizationPct,
    band,
    bandLabel:            BAND_LABELS_ENGINE[band] ?? band,
    interventionIndex,
    automationIndex,
    manualityIndex:       interventionIndex,  // alias retrocompatível
    ftAnalyst,
    ftAssistant,
    companies:            companyLoads,
    automationOpportunities: opportunities.slice(0, 10),
    hasActivityData:      companyLoads.some(c => c.hasActivityData),
  }
}

/**
 * Calcula a faixa de capacidade.
 * "Faixas gerenciais internas — não representam limites legais de jornada."
 */
export function calcBandEngine(pct: number, settings: CapacitySettings): string {
  if (pct <= settings.bandLow)            return 'low'
  if (pct <= settings.bandAvailable)      return 'available'
  if (pct <= settings.bandAdequate)       return 'adequate'
  if (pct <= settings.bandHigh)           return 'high'
  if (pct <= settings.bandLimit)          return 'limit'
  if (pct <= settings.bandLimit * 1.10)   return 'overload'
  return 'critical'
}

/**
 * Simula o impacto de automatizar uma atividade.
 *
 * Exemplo:
 *   Atual:  MANUAL (100% → 200 min humanos)
 *   Simul:  AUTOMATIZADA (30% → 60 min humanos)
 *   Ganho:  140 min / 2h20
 */
export function simulateAutomation(
  activity: DpActivityInstance,
  newExecutionType: ExecutionType,
  interventionMap: Record<string, number>
): AutomationSimulationResult {
  const currentPct   = interventionMap[activity.executionType] ?? 100
  const newPct       = interventionMap[newExecutionType] ?? 100
  const gross        = (activity.volume ?? 0) * (activity.avgTimeMinutes ?? 0)
  const currentHuman = gross * (currentPct / 100)
  const newHuman     = gross * (newPct     / 100)
  const saved        = currentHuman - newHuman
  const reductionPct = currentHuman > 0
    ? Math.round((saved / currentHuman) * 10000) / 100
    : 0
  return {
    currentHumanMinutes:   Math.round(currentHuman * 100) / 100,
    simulatedHumanMinutes: Math.round(newHuman      * 100) / 100,
    savedMinutes:          Math.round(saved          * 100) / 100,
    savedHours:            Math.round((saved / 60)   * 100) / 100,
    reductionPct,
  }
}

// ─── Utilitários de formatação ────────────────────────────────────────────────

/**
 * Converte minutos (decimal) em string legível com segundos quando houver fração.
 *
 * Exemplos (spec §1):
 *   200    minutos → "3h20m"
 *   16.35  minutos → "0h16m21s"
 *   0      minutos → "0h00m"
 *
 * Invariante: a fração de minuto é convertida em segundos inteiros (arredondados).
 */
export function minutesToHHMM(minutes: number): string {
  const sign      = minutes < 0 ? '-' : ''
  const abs       = Math.abs(minutes)
  const totalSec  = Math.round(abs * 60)   // converte para segundos inteiros
  const h         = Math.floor(totalSec / 3600)
  const m         = Math.floor((totalSec % 3600) / 60)
  const s         = totalSec % 60
  const hStr      = String(h).padStart(2, '0')
  const mStr      = String(m).padStart(2, '0')
  if (s === 0) {
    return `${sign}${h}h${mStr}m`
  }
  return `${sign}${h}h${mStr}m${String(s).padStart(2, '0')}s`
}

/**
 * Converte SEGUNDOS em string legível.
 *
 * Exemplos (spec §1):
 *   981  segundos → "0h16m21s"
 *   3600 segundos → "1h00m"
 *   60   segundos → "0h01m"
 */
export function secondsToHHMMSS(seconds: number): string {
  const sign  = seconds < 0 ? '-' : ''
  const abs   = Math.round(Math.abs(seconds))
  const h     = Math.floor(abs / 3600)
  const m     = Math.floor((abs % 3600) / 60)
  const s     = abs % 60
  const mStr  = String(m).padStart(2, '0')
  if (s === 0) {
    return `${sign}${h}h${mStr}m`
  }
  return `${sign}${h}h${mStr}m${String(s).padStart(2, '0')}s`
}

/** Reconstrói interventionMap a partir de lista ou usa defaults */
export function buildInterventionMap(
  configs: { executionType: string; interventionPct: number }[]
): Record<string, number> {
  if (!configs || configs.length === 0) {
    return Object.fromEntries(
      Object.entries(DEFAULT_INTERVENTION_CONFIGS).map(([k, v]) => [k, v.interventionPct])
    )
  }
  const map: Record<string, number> = Object.fromEntries(
    Object.entries(DEFAULT_INTERVENTION_CONFIGS).map(([k, v]) => [k, v.interventionPct])
  )
  for (const c of configs) {
    map[c.executionType] = c.interventionPct
  }
  return map
}
