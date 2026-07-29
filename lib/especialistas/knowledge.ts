// ─── Camada 2 · Busca de Conhecimento (Híbrida: Semântica + TF-IDF) ───────────
// Prioriza busca semântica quando há embeddings; cai para TF-IDF como fallback.

import { prisma } from "@/lib/prisma"
import { semanticSearch, type SemanticResult } from "./embeddings"

// ─── Padrões proibidos (respostas de "limitação de modelo") ───────────────────

// Padrões de limitação de modelo — removidos frase a frase, não matam a resposta inteira
const FORBIDDEN_PATTERNS = [
  /minha data de corte[^.!?]*/i,
  /não tenho acesso à internet[^.!?]*/i,
  /como (uma )?ia (language model|llm)[^.!?]*/i,
  /como (um )?modelo de linguagem[^.!?]*/i,
  /meu conhecimento (foi |é )?(treinado|limitado|restrito)[^.!?]*/i,
  /até a data do meu treinamento[^.!?]*/i,
  /não posso navegar na internet[^.!?]*/i,
  /não tenho capacidade de acessar[^.!?]*/i,
  /meus dados de treinamento[^.!?]*/i,
  /enquanto (ia|modelo de linguagem|assistente de ia)[^.!?]*/i,
  /as informações disponíveis para mim[^.!?]*/i,
  /meu conhecimento não vai além[^.!?]*/i,
]

// Usado apenas como bridge quando o conteúdo da IA vem vazio por erro técnico
export const NOT_FOUND_MESSAGE =
  "Não localizei um documento específico na base para citar, mas posso explicar o tema " +
  "com base no conhecimento técnico consolidado."

// Sanitiza resposta: remove frases com padrões proibidos, não mata a resposta inteira
export function sanitizeResponse(text: string | null | undefined): string | null {
  if (!text || text.trim().length < 10) return null

  let cleaned = text
  for (const pattern of FORBIDDEN_PATTERNS) {
    cleaned = cleaned.replace(pattern, "")
  }
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim()

  // Se sobrou conteúdo útil (> 40 chars), retorna o texto limpo
  return cleaned.length > 40 ? cleaned : null
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DocResult {
  id?: string
  specialist: string
  title: string
  category: string
  content: string
  source: string | null
  version: string | null
  tags: string | null
  score?: number
  searchMode?: "semantic" | "tfidf" | "recent"
}

// ─── Busca principal (semântica → TF-IDF → recentes) ─────────────────────────

export async function searchDocuments(
  specialist: string,
  query: string,
  limit = 5,
): Promise<DocResult[]> {

  // ── Tentativa 1: busca semântica ────────────────────────────────────────────
  try {
    const semanticDocs = await semanticSearch(specialist, query, limit, 0.20)
    if (semanticDocs.length > 0) {
      return semanticDocs.map(d => ({
        ...d,
        content: d.content ?? "",
        source: d.source ?? null,
        version: d.version ?? null,
        tags: d.tags ?? null,
        searchMode: "semantic" as const,
      }))
    }
  } catch {
    // Fallback silencioso para TF-IDF
  }

  // ── Tentativa 2: TF-IDF ─────────────────────────────────────────────────────
  const docs = await prisma.especialistaDocument.findMany({
    where: { specialist, isRevoked: false },
    select: { id: true, specialist: true, title: true, category: true, content: true, source: true, version: true, tags: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })

  if (!docs.length) return []

  const keywords = extractKeywords(query)

  if (keywords.length === 0) {
    return docs.slice(0, limit).map(d => ({
      ...d,
      content: d.content ?? "",
      source: d.source ?? null,
      version: d.version ?? null,
      tags: d.tags ?? null,
      searchMode: "recent" as const,
    }))
  }

  const scored = docs
    .map(d => ({
      ...d,
      content: d.content ?? "",
      source: d.source ?? null,
      version: d.version ?? null,
      tags: d.tags ?? null,
      score: scoreDocument(d, keywords),
      searchMode: "tfidf" as const,
    }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.length > 0
    ? scored
    : docs.slice(0, limit).map(d => ({
        ...d,
        content: d.content ?? "",
        source: d.source ?? null,
        version: d.version ?? null,
        tags: d.tags ?? null,
        searchMode: "recent" as const,
      }))
}

// ─── TF-IDF helpers ───────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "o", "as", "os", "e", "de", "do", "da", "dos", "das", "em", "no", "na",
  "nos", "nas", "por", "para", "com", "um", "uma", "uns", "umas", "que", "se",
  "ao", "aos", "ou", "mas", "como", "ser", "ter", "está", "são",
  "foi", "tem", "pode", "deve", "quando", "qual", "quais", "este", "essa",
  "isso", "sobre", "mais", "neste", "nessa", "aquele", "muito", "cada",
])

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function extractKeywords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

function scoreDocument(
  doc: { title: string; tags: string | null; content: string | null },
  keywords: string[],
): number {
  const titleNorm   = normalize(doc.title)
  const tagsNorm    = normalize(doc.tags ?? "")
  const contentNorm = normalize(doc.content ?? "")

  return keywords.reduce((score, kw) => {
    if (titleNorm.includes(kw))   score += 4
    if (tagsNorm.includes(kw))    score += 3
    if (contentNorm.includes(kw)) score += 1
    return score
  }, 0)
}

// ─── Construção do bloco de contexto ─────────────────────────────────────────

export function buildContext(docs: DocResult[]): string {
  if (!docs.length) return ""

  const blocks = docs.map((d, i) => {
    const header = `[${i + 1}] ${d.title}${d.version ? ` (v${d.version})` : ""}${d.source ? ` — Fonte: ${d.source}` : ""}`
    const modeTag = d.searchMode === "semantic"
      ? ` [semântica: ${((d.score ?? 0) * 100).toFixed(0)}%]`
      : ""
    const body = (d.content ?? "").slice(0, 1800)
    return `${header}${modeTag}\n${body}`
  })

  return `=== BASE DE CONHECIMENTO DO ESPECIALISTA ===\n\n${blocks.join("\n\n---\n\n")}\n\n=== FIM DA BASE ===`
}
