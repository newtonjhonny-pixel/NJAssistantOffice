// ─── Camada 2 · Motor de Embeddings Semânticos ────────────────────────────────
// Usa o modelo padrão de embeddings do AI Gateway, armazenado como JSON string no SQLite.
// Busca semântica via cosine similarity computada em JavaScript.

import { prisma } from "@/lib/prisma"
import { aiService } from "@/lib/ai/gateway"

// ─── Geração de embedding ─────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 8000)
  const response = await aiService.embed({
    module: "especialistas.embeddings",
    input: cleaned,
  })
  const embedding = response.embeddings[0]
  if (!embedding) throw new Error("AI_EMBEDDING_NOT_AVAILABLE")
  return embedding
}

export function serializeEmbedding(vec: number[]): string {
  return JSON.stringify(vec)
}

export function deserializeEmbedding(raw: string): number[] {
  return JSON.parse(raw) as number[]
}

// ─── Similaridade coseno ──────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// ─── Busca semântica ──────────────────────────────────────────────────────────

export interface SemanticResult {
  id: string
  specialist: string
  title: string
  category: string
  content: string
  source: string | null
  version: string | null
  tags: string | null
  score: number
}

export async function semanticSearch(
  specialist: string,
  query: string,
  limit = 5,
  threshold = 0.25,
): Promise<SemanticResult[]> {
  // Gera embedding da query
  let queryVec: number[]
  try {
    queryVec = await generateEmbedding(query)
  } catch {
    return []
  }

  // Busca todos os docs do especialista que têm embedding
  const docs = await prisma.especialistaDocument.findMany({
    where: { specialist, isRevoked: false, embedding: { not: null } },
    select: { id: true, specialist: true, title: true, category: true, content: true, source: true, version: true, tags: true, embedding: true },
  })

  if (!docs.length) return []

  // Calcula similaridade
  const scored = docs
    .map(doc => {
      const vec = deserializeEmbedding(doc.embedding!)
      const score = cosineSimilarity(queryVec, vec)
      return {
        id: doc.id,
        specialist: doc.specialist,
        title: doc.title,
        category: doc.category,
        content: doc.content ?? "",
        source: doc.source,
        version: doc.version,
        tags: doc.tags,
        score,
      }
    })
    .filter(d => d.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored
}

// ─── Indexar documento (gera e persiste embedding) ────────────────────────────

export async function indexDocument(docId: string): Promise<void> {
  const doc = await prisma.especialistaDocument.findUnique({ where: { id: docId } })
  if (!doc) return

  const text = [doc.title, doc.tags ?? "", doc.content ?? ""].join("\n")
  try {
    const vec = await generateEmbedding(text)
    await prisma.especialistaDocument.update({
      where: { id: docId },
      data: { embedding: serializeEmbedding(vec) },
    })
  } catch (err) {
    console.error(`[embeddings] Falha ao indexar doc ${docId}:`, err)
  }
}

// ─── Re-indexar todos os docs de um especialista ─────────────────────────────
// Chama em batch, aguarda 200ms entre requests para respeitar rate limit.

export async function reindexSpecialist(
  specialist: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ indexed: number; errors: number }> {
  const docs = await prisma.especialistaDocument.findMany({
    where: { specialist, isRevoked: false },
    select: { id: true, title: true, tags: true, content: true },
  })

  let indexed = 0
  let errors  = 0

  for (const doc of docs) {
    const text = [doc.title, doc.tags ?? "", doc.content ?? ""].join("\n")
    try {
      const vec = await generateEmbedding(text)
      await prisma.especialistaDocument.update({
        where: { id: doc.id },
        data: { embedding: serializeEmbedding(vec) },
      })
      indexed++
    } catch {
      errors++
    }
    onProgress?.(indexed + errors, docs.length)
    await new Promise(r => setTimeout(r, 200))
  }

  return { indexed, errors }
}
