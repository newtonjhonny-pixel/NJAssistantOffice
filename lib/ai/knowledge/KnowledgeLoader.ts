// ─── Camada de Conhecimento · Carregador de Documentos ───────────────────────
// Carrega documentos oficiais, documentos do usuário, memória e histórico
// a partir do banco de dados. Usa cache para evitar recargas repetidas.

import { prisma } from '@/lib/prisma'
import { knowledgeCache, CACHE_KEYS, CACHE_TTL } from './KnowledgeCache'
import type {
  KnowledgeDoc,
  KnowledgeMemoryEntry,
  KnowledgeHistoryItem,
  KnowledgeLoadOptions,
} from './KnowledgeTypes'

// ─── Conversão de registro DB → KnowledgeDoc ─────────────────────────────────

function rowToDoc(row: {
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

// ─── Documentos Oficiais ──────────────────────────────────────────────────────

export async function loadOfficialDocuments(
  specialist: string,
  options: KnowledgeLoadOptions = {},
): Promise<KnowledgeDoc[]> {
  const cacheKey = CACHE_KEYS.officialDocs(specialist)

  if (!options.forceRefresh) {
    const cached = knowledgeCache.get<KnowledgeDoc[]>(specialist, cacheKey)
    if (cached) return cached
  }

  const rows = await prisma.especialistaDocument.findMany({
    where: {
      specialist,
      isRevoked: false,
      ...(options.categories?.length ? { category: { in: options.categories } } : {}),
    },
    select: {
      id: true, specialist: true, title: true, category: true,
      content: true, source: true, version: true, tags: true,
      isRevoked: true, embedding: true, createdAt: true, updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: options.limit ?? 200,
  })

  const docs = rows.map(rowToDoc)
  knowledgeCache.set(specialist, cacheKey, docs, CACHE_TTL.officialDocs)
  return docs
}

// ─── Documentos do Usuário ────────────────────────────────────────────────────
// Por enquanto lê da mesma tabela com category = 'documento_usuario'.
// Quando houver upload de arquivos, este loader será estendido.

export async function loadUserDocuments(
  specialist: string,
  userId?: string,
  options: KnowledgeLoadOptions = {},
): Promise<KnowledgeDoc[]> {
  const cacheKey = CACHE_KEYS.userDocs(specialist, userId)

  if (!options.forceRefresh) {
    const cached = knowledgeCache.get<KnowledgeDoc[]>(specialist, cacheKey)
    if (cached) return cached
  }

  const rows = await prisma.especialistaDocument.findMany({
    where: {
      specialist,
      isRevoked: false,
      category: 'documento_usuario',
    },
    select: {
      id: true, specialist: true, title: true, category: true,
      content: true, source: true, version: true, tags: true,
      isRevoked: true, embedding: true, createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 50,
  })

  const docs = rows.map(r => ({ ...rowToDoc(r), origin: 'user' as const }))
  knowledgeCache.set(specialist, cacheKey, docs, CACHE_TTL.userDocs)
  return docs
}

// ─── Memória Contextual ───────────────────────────────────────────────────────

export async function loadMemory(
  specialist: string,
  conversationId?: string,
  options: KnowledgeLoadOptions = {},
): Promise<KnowledgeMemoryEntry[]> {
  const cacheKey = CACHE_KEYS.memory(specialist, conversationId)

  if (!options.forceRefresh) {
    const cached = knowledgeCache.get<KnowledgeMemoryEntry[]>(specialist, cacheKey)
    if (cached) return cached
  }

  const now = new Date()
  const rows = await prisma.especialistaMemory.findMany({
    where: {
      specialist,
      OR: [
        { conversationId },
        { conversationId: null },  // memória global do especialista
      ],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    orderBy: [{ relevance: 'desc' }, { updatedAt: 'desc' }],
    take: 30,
  })

  const entries: KnowledgeMemoryEntry[] = rows.map(r => ({
    key:       r.key,
    value:     r.value,
    type:      r.type as KnowledgeMemoryEntry['type'],
    relevance: r.relevance,
  }))

  knowledgeCache.set(specialist, cacheKey, entries, CACHE_TTL.memory)
  return entries
}

// ─── Histórico da Conversa ───────────────────────────────────────────────────

export async function loadHistory(
  conversationId: string,
  limit = 20,
  options: KnowledgeLoadOptions = {},
): Promise<KnowledgeHistoryItem[]> {
  const cacheKey = CACHE_KEYS.history(conversationId)

  if (!options.forceRefresh) {
    const cached = knowledgeCache.get<KnowledgeHistoryItem[]>('_global', cacheKey)
    if (cached) return cached
  }

  const rows = await prisma.especialistaMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { role: true, content: true, specialist: true, createdAt: true },
  })

  const items: KnowledgeHistoryItem[] = rows.reverse().map(r => ({
    role:       r.role as 'user' | 'assistant',
    content:    r.content,
    specialist: r.specialist,
    createdAt:  r.createdAt,
  }))

  knowledgeCache.set('_global', cacheKey, items, CACHE_TTL.history)
  return items
}

// ─── Stats da base ────────────────────────────────────────────────────────────

export async function loadBaseStats(specialist: string): Promise<{
  total: number
  withEmbedding: number
  byCategory: Record<string, number>
}> {
  const [total, withEmbedding, byCategory] = await Promise.all([
    prisma.especialistaDocument.count({ where: { specialist, isRevoked: false } }),
    prisma.especialistaDocument.count({ where: { specialist, isRevoked: false, NOT: { embedding: null } } }),
    prisma.especialistaDocument.groupBy({
      by: ['category'],
      where: { specialist, isRevoked: false },
      _count: { _all: true },
    }),
  ])

  return {
    total,
    withEmbedding,
    byCategory: Object.fromEntries(byCategory.map(r => [r.category, r._count._all])),
  }
}
