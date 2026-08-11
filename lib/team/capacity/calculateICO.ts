/**
 * calculateICO.ts — ÚNICA fonte de verdade para o Índice de Carga Operacional
 *
 * Fórmula:
 *   cargaBase = 5
 *               + (empregadosAtivos × 0,10)
 *               + (admissões × 1,50)
 *               + (rescisões × 2,00)
 *               + (férias × 1,00)
 *               + (afastados × 0,50)
 *               + (sindicatos/CCTs × 2,00)
 *               + (estabelecimentos × 1,50)
 *
 *   scoreEmpresa = cargaBase × fatorPapel × fatorComplexidade × fatorAutomação
 *
 *   ICO colaborador = Σ scoreEmpresa de todas as empresas
 *   capacidadeUtilizada (%) = ICO   (ref padrão = 100 pts = 100%)
 *
 * NUNCA alterar esta lógica sem atualizar também os testes em __tests__/calculateICO.test.ts
 */

// ─── Coeficientes fixos ───────────────────────────────────────────────────────

const COEF_BASE            = 5.00
const COEF_EMPREGADO       = 0.10
const COEF_ADMISSAO        = 1.50
const COEF_RESCISAO        = 2.00
const COEF_FERIAS          = 1.00
const COEF_AFASTADO        = 0.50
const COEF_SINDICATO       = 2.00
const COEF_ESTABELECIMENTO = 1.50

// ─── Fatores multiplicadores ──────────────────────────────────────────────────

export const FATOR_PAPEL: Record<string, number> = {
  RESPONSAVEL:    1.00,
  CORRESPONSAVEL: 0.70,
  APOIO:          0.45,
  CONFERENCIA:    0.25,
}

export const FATOR_COMPLEXIDADE: Record<string, number> = {
  BAIXA:     0.85,
  MEDIA:     1.00,
  ALTA:      1.20,
  CRITICA:   1.40,
  MUITO_ALTA: 1.40,
}

export const FATOR_AUTOMACAO: Record<string, number> = {
  ALTA:   0.80,
  MEDIA:  1.00,
  BAIXA:  1.20,
  MANUAL: 1.35,
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export const BAND_LABELS: Record<string, string> = {
  green:    'Capacidade disponível',
  blue:     'Capacidade adequada',
  yellow:   'Atenção',
  orange:   'Sobrecarga',
  critical: 'Sobrecarga Crítica',
}

const PAPEL_LABELS: Record<string, string> = {
  RESPONSAVEL:    'Responsável Principal',
  CORRESPONSAVEL: 'Corresponsável',
  APOIO:          'Apoio',
  CONFERENCIA:    'Conferência/Supervisão',
}

const COMPLEXIDADE_LABELS: Record<string, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta',
  CRITICA: 'Crítica', MUITO_ALTA: 'Muito Alta',
}

const AUTOMACAO_LABELS: Record<string, string> = {
  ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa', MANUAL: 'Manual',
}

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface LinkInput {
  headcountActive?:    number | null | bigint
  headcountApprentice?: number | null | bigint
  headcountIntern?:    number | null | bigint
  headcountOnLeave?:   number | null | bigint
  avgAdmissions?:      number | null | bigint
  avgTerminations?:    number | null | bigint
  avgVacations?:       number | null | bigint
  unions?:             number | null | bigint
  establishments?:     number | null | bigint
  memberRole?:         string | null
  complexity?:         string | null
  automationLevel?:    string | null
}

export interface ComponenteCalculo {
  label:       string
  valor:       number
  coeficiente: number
  subtotal:    number
}

export interface MemoriaCalculo {
  componentes:       ComponenteCalculo[]
  cargaBase:         number
  fatorPapel:        number
  fatorComplexidade: number
  fatorAutomacao:    number
  papelLabel:        string
  complexidadeLabel: string
  automacaoLabel:    string
  scoreEmpresa:      number
}

export interface CompanyICOResult {
  score:             number
  cargaBase:         number
  fatorPapel:        number
  fatorComplexidade: number
  fatorAutomacao:    number
  memoria:           MemoriaCalculo
}

export interface BandConfig {
  bandGreen:  number
  bandBlue:   number
  bandYellow: number
  bandOrange: number
}

// ─── Função principal: calcCompanyICO ─────────────────────────────────────────

/**
 * Calcula o score ICO de UMA empresa para UM colaborador.
 * Campos ausentes/nulos valem 0. Fatores ausentes valem 1.00 (neutro).
 */
export function calcCompanyICO(link: LinkInput): CompanyICOResult {
  // Converter tudo para Number (SQLite retorna BigInt em $queryRawUnsafe)
  const hcAtivo    = Number(link.headcountActive    ?? 0)
  const hcAfastado = Number(link.headcountOnLeave   ?? 0)
  const admissoes  = Number(link.avgAdmissions      ?? 0)
  const rescisoes  = Number(link.avgTerminations    ?? 0)
  const ferias     = Number(link.avgVacations       ?? 0)
  const sindicatos = Number(link.unions             ?? 0)
  const estab      = Number(link.establishments     ?? 0)

  // Componentes aditivos
  const cFixa  = COEF_BASE
  const cEmp   = hcAtivo    * COEF_EMPREGADO
  const cAdm   = admissoes  * COEF_ADMISSAO
  const cResc  = rescisoes  * COEF_RESCISAO
  const cFer   = ferias     * COEF_FERIAS
  const cAfas  = hcAfastado * COEF_AFASTADO
  const cSind  = sindicatos * COEF_SINDICATO
  const cEstab = estab      * COEF_ESTABELECIMENTO

  const cargaBase = cFixa + cEmp + cAdm + cResc + cFer + cAfas + cSind + cEstab

  // Fatores multiplicadores (default = 1.00 se campo vazio/nulo)
  const fatorPapel        = FATOR_PAPEL[link.memberRole      ?? ''] ?? 1.00
  const fatorComplexidade = FATOR_COMPLEXIDADE[link.complexity ?? ''] ?? 1.00
  const fatorAutomacao    = FATOR_AUTOMACAO[link.automationLevel ?? ''] ?? 1.00

  const score = cargaBase * fatorPapel * fatorComplexidade * fatorAutomacao

  const componentes: ComponenteCalculo[] = [
    { label: 'Carga fixa',        valor: 1,         coeficiente: COEF_BASE,            subtotal: cFixa  },
    { label: 'Empregados ativos', valor: hcAtivo,   coeficiente: COEF_EMPREGADO,       subtotal: cEmp   },
    { label: 'Admissões/mês',     valor: admissoes, coeficiente: COEF_ADMISSAO,        subtotal: cAdm   },
    { label: 'Rescisões/mês',     valor: rescisoes, coeficiente: COEF_RESCISAO,        subtotal: cResc  },
    { label: 'Férias/mês',        valor: ferias,    coeficiente: COEF_FERIAS,          subtotal: cFer   },
    { label: 'Afastamentos',      valor: hcAfastado,coeficiente: COEF_AFASTADO,        subtotal: cAfas  },
    { label: 'Sindicatos/CCTs',   valor: sindicatos,coeficiente: COEF_SINDICATO,       subtotal: cSind  },
    { label: 'Estabelecimentos',  valor: estab,     coeficiente: COEF_ESTABELECIMENTO, subtotal: cEstab },
  ]

  return {
    score,
    cargaBase,
    fatorPapel,
    fatorComplexidade,
    fatorAutomacao,
    memoria: {
      componentes,
      cargaBase,
      fatorPapel,
      fatorComplexidade,
      fatorAutomacao,
      papelLabel:        PAPEL_LABELS[link.memberRole      ?? ''] ?? 'Não informado',
      complexidadeLabel: COMPLEXIDADE_LABELS[link.complexity ?? ''] ?? 'Média',
      automacaoLabel:    AUTOMACAO_LABELS[link.automationLevel ?? ''] ?? 'Média',
      scoreEmpresa:      score,
    },
  }
}

// ─── calcBand ─────────────────────────────────────────────────────────────────

export function calcBand(pct: number, cfg: BandConfig): string {
  if (pct <= cfg.bandGreen)  return 'green'
  if (pct <= cfg.bandBlue)   return 'blue'
  if (pct <= cfg.bandYellow) return 'yellow'
  if (pct <= cfg.bandOrange) return 'orange'
  return 'critical'
}

// ─── DEFAULT_BAND_CONFIG ─────────────────────────────────────────────────────

export const DEFAULT_BAND_CONFIG: BandConfig = {
  bandGreen: 70, bandBlue: 85, bandYellow: 100, bandOrange: 120,
}
