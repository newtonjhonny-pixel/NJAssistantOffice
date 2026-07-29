// Intelligent Knowledge Engine — detecção de perguntas que exigem base atualizada

export const AUTO_UPDATE_TRIGGERS = [
  // Temporalidade
  "atualiz", "mudou", "mudanc", "novo", "nova", "novos", "novas",
  "ultimo", "ultima", "ultimos", "ultimas", "recente", "hoje",
  "ontem", "semana", "este mes", "este ano", "2026", "2027",
  // Instrumentos normativos
  "nota tecnica", "mos", "layout", "leiaute", "portaria", "resolucao",
  "instrucao normativa", "circular", "despacho", "edital",
  // Jurisprudência
  "jurisprudencia", "acordao", "sumula", "decisao", "precedente",
  "stf", "stj", "tst", "trt",
  // Normas de Segurança
  "nr-", "norma regulamentadora", "nova nr",
  // Sistemas e Plataformas
  "esocial", "fgts digital", "receita federal", "gov.br",
  "caged", "sefip", "gfip", "dctfweb",
  // Versioning
  "manual", "versao", "vigente", "vigencia", "revogad",
  // Ação recente
  "publicou", "publicad", "saiu", "lancou", "lancad",
  "alterou", "alteracao", "modificou", "modificacao",
  "entrou em vigor", "passou a valer",
]

export function needsUpdate(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[çÇ]/g, "c")
  return AUTO_UPDATE_TRIGGERS.some(kw => normalized.includes(kw))
}

// ─── Conceptual question detection ───────────────────────────────────────────
// Perguntas conceituais devem ser respondidas com conhecimento especializado,
// não bloqueadas por ausência de documentos específicos na base.

const CONCEPTUAL_INDICATORS = [
  "o que e ", "o que sao ", "para que serve", "como funciona", "me explica",
  "me fala sobre", "quais sao os", "quais eventos", "explique", "defina",
  "conceito de", "diferenca entre", "o que voce conhece", "voce conhece",
  "qual a diferenca", "como e o", "o que voce sabe", "pode me explicar",
  "me diga sobre", "pode explicar", "fale sobre", "fale um pouco",
  "me conte sobre", "o que voce pode", "quais grupos", "como funciona",
  "quais sao", "quem pode", "quando devo", "quando preciso",
  "qual o prazo", "quais os prazos", "qual evento", "quais eventos",
  "o que e s-", "o que significa s-", "como enviar", "como funciona o",
  "qual a obrigacao", "quais obrigacoes", "preciso enviar", "sou obrigado",
  "qual a diferenca entre", "me explique", "como se faz", "como fazer",
  "quais as etapas", "como implementar", "qual o objetivo",
]

export function isConceptualQuestion(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[çÇ]/g, "c")
    .trim()
  return CONCEPTUAL_INDICATORS.some(kw => normalized.includes(kw))
}

// ─── Classificação de intenção em 7 modos ────────────────────────────────────
// Determina como o especialista deve responder independentemente da base.

export type IntentMode =
  | "CONCEITUAL"     // "O que é X?", "Como funciona Y?"
  | "TECNICO"        // "Qual a regra para...?" — conhecimento aplicado
  | "ATUALIZACAO"    // "O que mudou?", "atualização de hoje"
  | "ANALISE"        // "Analise este caso / situação"
  | "PROCEDIMENTO"   // "Como fazer uma admissão?" — passo a passo
  | "CALCULO"        // "Calcule férias de R$ 3.000,00"
  | "CONVERSACIONAL" // "Não entendi", "explique melhor", "continue"

const INTENT_ATUALIZACAO = [
  "atualiz", "mudou", "mudanc", "novidade", "nova norma",
  "ultima", "mais recente", "hoje", "ontem", "esta semana",
  "este mes", "este ano", "versao vigente", "nota tecnica nova",
  "publicou", "publicad", "saiu", "lancou", "alterou",
  "alteracao", "modificou", "entrou em vigor", "passou a valer",
]

const INTENT_CALCULO = [
  "calcul", "calcule", "quanto fica", "quanto seria", "qual o valor",
  "qual seria", "r$", "salario de", "remuneracao de", "quanto recebe",
  "quanto paga", "calculo de", "resultado do calculo",
]

const INTENT_PROCEDIMENTO = [
  "como devo", "como fazer", "quais os passos", "quais as etapas",
  "passo a passo", "procedimento", "como proceder", "o que devo",
  "o que preciso fazer", "como realizar", "como efetuar",
  "como executar", "como implementar", "como montar", "como elaborar",
  "como criar", "como registrar", "como enviar", "como transmitir",
]

const INTENT_ANALISE = [
  "analise", "analisa", "verifique", "confira", "avalie", "avalia",
  "revise", "revisa", "esse caso", "nesta situacao", "nesse cenario",
  "minha situacao", "meu caso", "esta correto", "esta certo",
  "esta errado", "o que voce acha",
]

const INTENT_CONVERSACIONAL = [
  "nao entendi", "nao entendo", "explique melhor", "explica melhor",
  "pode repetir", "nao ficou claro", "nao compreendi",
  "isso nao se aplica", "nao se aplica ao meu caso",
  "e no caso de", "e se tiver", "e no caso", "continue",
  "pode continuar", "faca um exemplo", "da um exemplo",
  "com salario de", "com remuneracao de",
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[çÇ]/g, "c")
    .trim()
}

export function classifyIntent(text: string): IntentMode {
  const norm = normalize(text)

  // Conversacional — frases de continuidade/esclarecimento
  if (INTENT_CONVERSACIONAL.some(kw => norm.includes(kw))) return "CONVERSACIONAL"
  // Atualização — sempre antes das demais (keyword overlap intencional)
  if (INTENT_ATUALIZACAO.some(kw => norm.includes(kw))) return "ATUALIZACAO"
  // Cálculo — pede processamento numérico
  if (INTENT_CALCULO.some(kw => norm.includes(kw))) return "CALCULO"
  // Análise — pede avaliação de um caso concreto
  if (INTENT_ANALISE.some(kw => norm.includes(kw))) return "ANALISE"
  // Procedimento — pede orientação de como fazer
  if (INTENT_PROCEDIMENTO.some(kw => norm.includes(kw))) return "PROCEDIMENTO"
  // Conceitual — pergunta explicativa/definitória
  if (isConceptualQuestion(text)) return "CONCEITUAL"
  // Default: técnico
  return "TECNICO"
}

// ─── No-update fallback (used when update query finds nothing) ─────────────────

export const SPECIALIST_UPDATE_FALLBACK =
  "Consultei a Base de Conhecimento e não localizei uma atualização oficial específica sobre esse ponto. " +
  "Posso explicar o funcionamento geral do tema com base no meu conhecimento técnico especializado e indicar quais documentos oficiais devem ser consultados para a versão mais recente."

// Gera versão no formato YYYY.MM.DD
export function makeVersion(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}.${m}.${day}`
}

// Calcula próximo 03:00
export function nextScheduledUpdate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(3, 0, 0, 0)
  return d
}
