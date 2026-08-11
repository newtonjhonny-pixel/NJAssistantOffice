/**
 * Tipos centrais do CapacityEngine — Mensuração de Carga Manual, Assistida e Automatizada do DP
 *
 * IMPORTANTE: Nenhum percentual arbitrário neste arquivo.
 * Todos os % são derivados de InterventionConfig (parametrizável pelo administrador).
 */

export type ExecutionType =
  | 'MANUAL'
  | 'ASSISTIDA'
  | 'AUTOMATIZADA'
  | 'AUTOMATICA_EXCECOES'

export type RequiredLevel =
  | 'ASSISTENTE'
  | 'ANALISTA'
  | 'COORDENACAO'
  | 'COMPARTILHADO'

// ─── Configuração de intervenção humana por tipo de execução ─────────────────

export interface InterventionConfig {
  executionType:   ExecutionType
  interventionPct: number   // 0–100; parametrizável pelo admin
  label:           string
  description?:    string
}

// ─── Instância de atividade DP cadastrada para um vínculo ────────────────────

export interface DpActivityInstance {
  id:             string
  linkId:         string
  processCode:    string
  catalogId?:     string | null
  activityName:   string
  executionType:  ExecutionType
  volume:         number   // quantidade de ocorrências/mês
  avgTimeMinutes: number   // tempo médio em minutos por ocorrência
  requiredLevel:  RequiredLevel
  observations?:  string | null
}

// ─── Resultado por atividade (com memória de cálculo completa) ───────────────

export interface ActivityLoad {
  activityId:       string
  activityName:     string
  processCode:      string
  executionType:    ExecutionType
  interventionPct:  number
  volume:           number
  avgTimeMinutes:   number
  /** volume × avgTimeMinutes */
  grossMinutes:     number
  /** grossMinutes × (interventionPct / 100) */
  humanMinutes:     number
  /** grossMinutes × (1 − interventionPct / 100) — §5: carga automatizada equivalente */
  automatedMinutes: number
  requiredLevel:    RequiredLevel
}

// ─── Resultado por processo ───────────────────────────────────────────────────

export interface ProcessLoad {
  processCode:      string
  processName:      string
  grossMinutes:     number
  humanMinutes:     number
  /** §5: soma das cargas automatizadas = grossMinutes − humanMinutes */
  automatedMinutes: number
  /**
   * §6: Índice de Intervenção Humana = totalHumanMinutes / totalGrossMinutes × 100
   * Ponderado por esforço — substitui o antigo "manualityIndex binário"
   */
  interventionIndex: number
  /** §7: Índice de Automação Operacional = totalAutomatedMinutes / totalGrossMinutes × 100 */
  automationIndex:   number
  activities:        ActivityLoad[]
  byExecution:       Record<string, ExecutionBreakdown>
}

export interface ExecutionBreakdown {
  grossMinutes:     number
  humanMinutes:     number
  automatedMinutes: number
  count:            number
  /** % da carga bruta total representada por este tipo */
  grossPct:         number
  /** % da carga humana total representada por este tipo */
  humanPct:         number
}

// ─── Resultado por empresa (vínculo) ─────────────────────────────────────────

export interface CompanyLoad {
  linkId:            string
  companyId:         string
  companyName:       string
  totalGrossMinutes: number
  totalHumanMinutes: number
  /** §5 */
  totalAutomatedMinutes: number
  /**
   * §6: Índice de Intervenção Humana = totalHumanMinutes / totalGrossMinutes × 100
   * ATENÇÃO: substitui o antigo "manualityIndex binário"
   * Considera TODAS as atividades ponderadas pelo esforço humano equivalente
   */
  interventionIndex: number
  /** @deprecated use interventionIndex. Mantido para retrocompatibilidade. */
  manualityIndex:    number
  /** §7: Índice de Automação Operacional = totalAutomatedMinutes / totalGrossMinutes × 100 */
  automationIndex:   number
  processes:         ProcessLoad[]
  byExecution:       Record<string, ExecutionBreakdown>
  hasActivityData:   boolean
}

// ─── Configurações de capacidade do colaborador ───────────────────────────────

export interface CapacitySettings {
  monthlyHours:       number   // jornada contratual mensal (ex: 220)
  operationalReserve: number   // % de reserva operacional (ex: 20)
  /**
   * Capacidade produtiva = monthlyHours × (1 − reserve/100)
   * "A reserva operacional é um parâmetro gerencial destinado a absorver reuniões,
   *  atendimento, contingências, treinamento, demandas não planejadas e outras
   *  atividades não mensuradas. Não representa limite legal de jornada."
   */
  // Faixas gerenciais (parâmetro organizacional — não obrigação legal)
  bandLow:       number   // ex: 60  → abaixo = Baixa utilização
  bandAvailable: number   // ex: 75  → Capacidade disponível
  bandAdequate:  number   // ex: 85  → Faixa adequada
  bandHigh:      number   // ex: 95  → Alta utilização
  bandLimit:     number   // ex: 100 → Limite operacional
  // acima de bandLimit      → Sobrecarga
  // acima de bandLimit+10%  → Sobrecarga crítica
}

// ─── Resultado consolidado por colaborador ────────────────────────────────────

export interface MemberCapacityResult {
  memberId:         string
  memberName:       string
  // Capacidade — §9, §16, §17
  monthlyHours:     number
  productiveHours:  number   // monthlyHours × (1 − reserve%) — §16
  totalHumanHours:  number   // soma de todas as cargas humanas das empresas
  totalAutomatedHours: number
  availableHours:   number   // productiveHours − totalHumanHours
  utilizationPct:   number   // totalHumanHours ÷ productiveHours × 100 — §10 (só esforço humano)
  band:             string
  bandLabel:        string
  // Índices ponderados por esforço — §6 e §7
  interventionIndex: number  // = totalHumanMinutes / totalGrossMinutes × 100
  automationIndex:   number  // = totalAutomatedMinutes / totalGrossMinutes × 100
  /** @deprecated use interventionIndex. Mantido para retrocompatibilidade. */
  manualityIndex:    number
  // FTE por função — §11, §23
  ftAnalyst:        number
  ftAssistant:      number
  // Empresas
  companies:        CompanyLoad[]
  // Oportunidades de automação (atividades manuais com maior carga)
  automationOpportunities: AutomationOpportunity[]
  hasActivityData:  boolean
}

// ─── Oportunidade de automação ────────────────────────────────────────────────

export interface AutomationOpportunity {
  activityName:     string
  companyName:      string
  processCode:      string
  currentExecution: ExecutionType
  humanMinutes:     number
  humanHours:       number
}

// ─── FTE ──────────────────────────────────────────────────────────────────────

export interface FTEResult {
  level:            RequiredLevel
  requiredMinutes:  number
  ftEquivalent:     number
}

// ─── Resultado de simulação de automação ─────────────────────────────────────

export interface AutomationSimulationResult {
  currentHumanMinutes:   number
  simulatedHumanMinutes: number
  savedMinutes:          number
  savedHours:            number
  reductionPct:          number
}

// ─── Catálogo de processo DP ─────────────────────────────────────────────────

export interface DpProcessEntry {
  code:        string
  name:        string
  description?: string
  order:        number
}

// ─── Catálogo de atividade DP ────────────────────────────────────────────────

export interface DpActivityEntry {
  id?:              string
  processCode:      string
  name:             string
  description?:     string
  suggestedLevel:   RequiredLevel
  defaultExecution: ExecutionType
  defaultTimeMin:   number
  order:            number
  active?:          boolean
}
