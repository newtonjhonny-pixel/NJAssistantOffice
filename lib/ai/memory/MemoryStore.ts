// ─── Camada de Memória · Persistência no Banco ───────────────────────────────
// Lê e escreve no modelo EspecialistaMemory (já existente no schema).
// Nenhuma migração necessária.

import { prisma } from '@/lib/prisma'
import type {
  MemoryEntry,
  MemoryEntryType,
  MemoryHorizon,
  PersistedMemoryEntry,
  SaveMemoryOptions,
  ShortTermEntry,
} from './MemoryTypes'

// ─── Leitura ──────────────────────────────────────────────────────────────────

export async function readMediumTermMemory(
  specialist: string,
  conversationId: string,
  limit = 25,
  minRelevance = 0.3,
): Promise<MemoryEntry[]> {
  const rows = await prisma.especialistaMemory.findMany({
    where: {
      specialist,
      conversationId,
      relevance: { gte: minRelevance },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ relevance: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  })

  return rows.map(rowToEntry('medium'))
}

export async function readLongTermMemory(
  specialist: string,
  limit = 10,
  minRelevance = 0.5,
): Promise<MemoryEntry[]> {
  const rows = await prisma.especialistaMemory.findMany({
    where: {
      specialist,
      conversationId: null,
      relevance: { gte: minRelevance },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ relevance: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  })

  return rows.map(rowToEntry('long'))
}

export async function readShortTermHistory(
  conversationId: string,
  limit = 20,
): Promise<ShortTermEntry[]> {
  const rows = await prisma.especialistaMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { role: true, content: true, specialist: true, createdAt: true },
  })

  return rows.reverse().map(r => ({
    role:       r.role as 'user' | 'assistant',
    content:    r.content,
    specialist: r.specialist,
    createdAt:  r.createdAt,
  }))
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

export async function saveMemoryEntries(
  specialist: string,
  conversationId: string | null,
  entries: Array<Omit<MemoryEntry, 'horizon' | 'expiresAt'>>,
  options: SaveMemoryOptions = {},
): Promise<void> {
  const { overwrite = true, ttlDays } = options
  const expiresAt = ttlDays ? new Date(Date.now() + ttlDays * 86_400_000) : null

  for (const entry of entries) {
    if (overwrite) {
      const existing = await prisma.especialistaMemory.findFirst({
        where: { specialist, conversationId: conversationId ?? null, key: entry.key },
      })

      if (existing) {
        await prisma.especialistaMemory.update({
          where: { id: existing.id },
          data: {
            value:     entry.value,
            relevance: entry.relevance,
            ...(expiresAt ? { expiresAt } : {}),
          },
        })
        continue
      }
    }

    await prisma.especialistaMemory.create({
      data: {
        specialist,
        conversationId: conversationId ?? null,
        type:      entry.type,
        key:       entry.key,
        value:     entry.value,
        relevance: entry.relevance,
        ...(expiresAt ? { expiresAt } : {}),
      },
    })
  }
}

export async function promotToLongTerm(
  specialist: string,
  conversationId: string,
  minRelevance = 0.8,
): Promise<number> {
  const entries = await prisma.especialistaMemory.findMany({
    where: { specialist, conversationId, relevance: { gte: minRelevance } },
  })

  let promoted = 0
  for (const e of entries) {
    const existsGlobal = await prisma.especialistaMemory.findFirst({
      where: { specialist, conversationId: null, key: e.key },
    })
    if (!existsGlobal) {
      await prisma.especialistaMemory.create({
        data: {
          specialist,
          conversationId: null,
          type:      e.type,
          key:       e.key,
          value:     e.value,
          relevance: Math.min(1.0, e.relevance * 0.9), // leve decaimento
        },
      })
      promoted++
    }
  }
  return promoted
}

// ─── Remoção / Limpeza ────────────────────────────────────────────────────────

export async function deleteConversationMemory(
  specialist: string,
  conversationId: string,
): Promise<number> {
  const result = await prisma.especialistaMemory.deleteMany({
    where: { specialist, conversationId },
  })
  return result.count
}

export async function deleteExpiredMemory(specialist?: string): Promise<number> {
  const result = await prisma.especialistaMemory.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      ...(specialist ? { specialist } : {}),
    },
  })
  return result.count
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function memoryStats(specialist: string): Promise<{
  medium: number
  long: number
  total: number
  byType: Record<string, number>
}> {
  const [medium, long, byType] = await Promise.all([
    prisma.especialistaMemory.count({ where: { specialist, NOT: { conversationId: null } } }),
    prisma.especialistaMemory.count({ where: { specialist, conversationId: null } }),
    prisma.especialistaMemory.groupBy({
      by: ['type'],
      where: { specialist },
      _count: { _all: true },
    }),
  ])

  return {
    medium,
    long,
    total: medium + long,
    byType: Object.fromEntries(byType.map(r => [r.type, r._count._all])),
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function rowToEntry(horizon: MemoryHorizon) {
  return (row: {
    key: string; value: string; type: string; relevance: number; expiresAt: Date | null
  }): MemoryEntry => ({
    key:       row.key,
    value:     row.value,
    type:      row.type as MemoryEntryType,
    relevance: row.relevance,
    horizon,
    expiresAt: row.expiresAt ?? undefined,
  })
}
