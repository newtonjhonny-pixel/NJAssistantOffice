// ─── Camada de Conhecimento · Motor de Indexação e Busca ─────────────────────
// Implementa busca semântica (cosine similarity) e TF-IDF (keyword).
// Modo híbrido: semântica primeiro; TF-IDF como fallback se não houver embeddings.

import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai/gateway'
import type { KnowledgeDoc, KnowledgeSearchResult, SearchMode } from './KnowledgeTypes'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_SEMANTIC_THRESHOLD = 0.20
const DEFAULT_LIMIT = 5
const MAX_CONTENT_CHARS = 8000  // limite para geração de embedding
const SNIPPET_LENGTH = 300      // tamanho do snippet retornado

// ─── Utilidades ───────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

function extractSnippet(content: string, query: string): string {
  const lower   = content.toLowerCase()
  const words   = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  let bestIndex = 0
  let bestScore = 0
  for (const word of words) {
    const idx = lower.indexOf(word)
    if (idx !== -1) {
      const score = words.filter(w => lower.slice(Math.max(0, idx - 50), idx + 200).includes(w)).length
      if (score > bestScore) { bestScore = score; bestIndex = idx }
    }
  }
  const start = Math.max(0, bestIndex - 50)
  const raw   = content.slice(start, start + SNIPPET_LENGTH)
  return (start > 0 ? '…' : '') + raw + (start + SNIPPET_LENGTH < content.length ? '…' : '')
}

// ─── Normalização TF-IDF ──────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','o','as','os','e','de','do','da','dos','das','em','no','na','nos','nas',
  'por','para','com','um','uma','uns','umas','que','se','ao','aos','ou','mas',
  'como','ser','ter','esta','sao','foi','tem','pode','deve','quando','qual',
  'quais','este','essa','isso','sobre','mais','neste','nessa','aquele','muito',
  'cada','sendo','tendo','foram','sera','serao','havia','houve',
])

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractKeywords(text: string): string[] {
  return normalize(text).split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

function scoreTfidf(
  doc: { title: string; tags: string | null; content: string },
  keywords: string[],
): number {
  const titleN   = normalize(doc.title)
  const tagsN    = normalize(doc.tags ?? '')
  const contentN = normalize(doc.content)
  return keywords.reduce((s, kw) => {
    if (titleN.includes(kw))   s += 5
    if (tagsN.includes(kw))    s += 3
    if (contentN.includes(kw)) s += 1
    return s
  }, 0)
}

// ─── Conversão de registro DB → KnowledgeDoc ─────────────────────────────────

function toKnowledgeDoc(row: {
  id: string; specialist: string; title: string; category: string;
  content: string | null; source: string | null; version: string | null;
  tags: string | null; isRevoked: boolean; embedding: string | null;
  createdAt: Date; updatedAt: Date;
}): KnowledgeDoc {
  return {
    id: row.id,
    specialist: row.specialist,
    title: row.title,
    category: row.category,
    content: row.content ?? '',
    source: row.source,
    version: row.version,
    tags: row.tags,
    origin: 'official',
    isRevoked: row.isRevoked,
    hasEmbedding: !!row.embedding,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ─── Busca Semântica ──────────────────────────────────────────────────────────

async function semanticSearch(
  specialist: string,
  query: string,
  limit: number,
  threshold: number,
  categories?: string[],
): Promise<KnowledgeSearchResult[]> {
  // Gera embedding da query via AIService (gateway centralizado)
  const embResult = await aiService.embed({
    input: query.slice(0, MAX_CONTENT_CHARS),
    module: 'knowledge',
  })
  if (!embResult.aiPowered || !embResult.embeddings[0]) return []

  const queryVec = embResult.embeddings[0]

  // Busca todos os docs com embedding do especialista
  const rows = await prisma.especialistaDocument.findMany({
    where: {
      specialist,
      isRevoked: false,
      NOT: { embedding: null },
      ...(categories?.length ? { category: { in: categories } } : {}),
    },
    select: {
      id: true, specialist: true, title: true, category: true,
      content: true, source: true, version: true, tags: true,
      isRevoked: true, embedding: true, createdAt: true, updatedAt: true,
    },
  })

  if (!rows.length) return []

  const scored = rows
    .map(row => {
      const vec = JSON.parse(row.embedding!) as number[]
      const score = cosineSimilarity(queryVec, vec)
      return { row, score }
    })
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map(({ row, score }) => ({
    ...toKnowledgeDoc(row),
    score,
    searchMode: 'semantic' as SearchMode,
    snippet: extractSnippet(row.content ?? '', query),
  }))
}

// ─── Busca TF-IDF ─────────────────────────────────────────────────────────────

async function tfidfSearch(
  specialist: string,
  query: string,
  limit: number,
  categories?: string[],
): Promise<KnowledgeSearchResult[]> {
  const rows = await prisma.especialistaDocument.findMany({
    where: {
      specialist,
      isRevoked: false,
      ...(categories?.length ? { category: { in: categories } } : {}),
    },
    select: {
      id: true, specialist: true, title: true, category: true,
      content: true, source: true, version: true, tags: true,
      isRevoked: true, embedding: true, createdAt: true, updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 150,
  })

  if (!rows.length) return []

  const keywords = extractKeywords(query)
  if (!keywords.length) {
    return rows.slice(0, limit).map(row => ({
      ...toKnowledgeDoc(row),
      score: 0,
      searchMode: 'recent' as SearchMode,
      snippet: extractSnippet(row.content ?? '', query),
    }))
  }

  const maxPossible = keywords.length * 9  // title*5 + tags*3 + content*1
  return rows
    .map(row => {
      const raw   = scoreTfidf({ ...row, content: row.content ?? '' }, keywords)
      const score = Math.min(1, raw / maxPossible)
      return { row, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) => ({
      ...toKnowledgeDoc(row),
      score,
      searchMode: 'tfidf' as SearchMode,
      snippet: extractSnippet(row.content ?? '', query),
    }))
}

// ─── Busca Híbrida (pública) ─────────────────────────────────────────────────

export async function hybridSearch(
  specialist: string,
  query: string,
  options: {
    limit?: number
    threshold?: number
    categories?: string[]
    mode?: SearchMode
  } = {},
): Promise<KnowledgeSearchResult[]> {
  const limit     = options.limit     ?? DEFAULT_LIMIT
  const threshold = options.threshold ?? DEFAULT_SEMANTIC_THRESHOLD
  const mode      = options.mode      ?? 'hybrid'

  if (mode === 'tfidf') {
    return tfidfSearch(specialist, query, limit, options.categories)
  }

  if (mode === 'semantic') {
    return semanticSearch(specialist, query, limit, threshold, options.categories)
  }

  // hybrid: semântica → TF-IDF fallback
  try {
    const semantic = await semanticSearch(specialist, query, limit, threshold, options.categories)
    if (semantic.length > 0) return semantic
  } catch {
    // fallback silencioso
  }

  return tfidfSearch(specialist, query, limit, options.categories)
}

// ─── Busca por múltiplos especialistas ───────────────────────────────────────

export async function crossSpecialistSearch(
  specialists: string[],
  query: string,
  limitPerSpecialist = 2,
): Promise<KnowledgeSearchResult[]> {
  const results = await Promise.allSettled(
    specialists.map(s => hybridSearch(s, query, { limit: limitPerSpecialist }))
  )
  return results
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .sort((a, b) => b.score - a.score)
}

// ─── Geração de embedding para indexação ─────────────────────────────────────

export async function generateDocEmbedding(text: string): Promise<number[] | null> {
  try {
    const result = await aiService.embed({
      input: text.slice(0, MAX_CONTENT_CHARS),
      module: 'knowledge',
    })
    if (!result.aiPowered || !result.embeddings[0]) return null
    return result.embeddings[0]
  } catch {
    return null
  }
}
