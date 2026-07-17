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
