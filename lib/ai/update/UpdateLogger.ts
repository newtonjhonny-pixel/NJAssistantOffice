// ─── Camada de Atualização · Logger ──────────────────────────────────────────
// Persiste logs de atualização e mantém EspecialistaBase sincronizado.
// Usa os modelos EspecialistaUpdateLog e EspecialistaBase já existentes.

import { prisma } from '@/lib/prisma'
import { nextScheduledAt } from './UpdateDetector'
import type { UpdateResult, UpdateBaseStatus, UpdateLogEntry } from './UpdateTypes'

// ─── Persiste log de uma atualização ─────────────────────────────────────────

export async function logUpdate(result: UpdateResult): Promise<string> {
  const log = await prisma.especialistaUpdateLog.create({
    data: {
      specialist:  result.specialist,
      version:     result.version,
      newDocs:     result.newDocs,
      updatedDocs: result.updatedDocs,
      removedDocs: result.removedDocs,
      duration:    result.duration,
      triggeredBy: result.trigger,
      status:      result.status,
    },
  })
  return log.id
}

// ─── Atualiza EspecialistaBase após uma atualização ───────────────────────────

export async function syncBaseRecord(
  specialist: string,
  result: UpdateResult,
  docCount: number,
  docsByCategory: Record<string, number>,
  sources: string[],
): Promise<void> {
  const status: UpdateBaseStatus = result.status === 'failed' ? 'ERRO' : 'ATUALIZADO'

  await prisma.especialistaBase.upsert({
    where:  { specialist },
    update: {
      status,
      lastUpdated:    result.checkedAt,
      lastChecked:    result.checkedAt,
      version:        result.version,
      docCount,
      docsByCategory: JSON.stringify(docsByCategory),
      nextUpdate:     nextScheduledAt(),
      sources:        sources.join('\n'),
    },
    create: {
      specialist,
      status,
      lastUpdated:    result.checkedAt,
      lastChecked:    result.checkedAt,
      version:        result.version,
      docCount,
      docsByCategory: JSON.stringify(docsByCategory),
      nextUpdate:     nextScheduledAt(),
      sources:        sources.join('\n'),
      initialLoadDone: true,
    },
  })
}

// ─── Marca base como "em progresso" ──────────────────────────────────────────

export async function markBaseUpdating(specialist: string): Promise<void> {
  await prisma.especialistaBase.upsert({
    where:  { specialist },
    update: { status: 'ATUALIZANDO', lastChecked: new Date() },
    create: {
      specialist,
      status:      'ATUALIZANDO',
      lastChecked: new Date(),
      docCount:    0,
      nextUpdate:  nextScheduledAt(),
    },
  })
}

// ─── Marca base como erro ─────────────────────────────────────────────────────

export async function markBaseError(specialist: string, error: string): Promise<void> {
  await prisma.especialistaBase.upsert({
    where:  { specialist },
    update: { status: 'ERRO', lastChecked: new Date() },
    create: {
      specialist,
      status:      'ERRO',
      lastChecked: new Date(),
      docCount:    0,
      nextUpdate:  nextScheduledAt(),
    },
  })

  // Log de erro
  await prisma.especialistaUpdateLog.create({
    data: {
      specialist,
      version:     'error',
      triggeredBy: 'auto',
      status:      'failed',
      duration:    0,
      newDocs:     0,
      updatedDocs: 0,
      removedDocs: 0,
    },
  }).catch(() => {})

  void error // referência para evitar unused-var
}

// ─── Lê logs de um especialista ──────────────────────────────────────────────

export async function getUpdateLogs(
  specialist: string,
  limit = 10,
): Promise<UpdateLogEntry[]> {
  const rows = await prisma.especialistaUpdateLog.findMany({
    where:   { specialist },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })

  return rows.map(r => ({
    id:          r.id,
    specialist:  r.specialist,
    version:     r.version,
    newDocs:     r.newDocs,
    updatedDocs: r.updatedDocs,
    removedDocs: r.removedDocs,
    duration:    r.duration,
    triggeredBy: r.triggeredBy,
    status:      r.status,
    createdAt:   r.createdAt,
  }))
}

// ─── Lê estado atual da base ──────────────────────────────────────────────────

export async function getBaseRecord(specialist: string) {
  return prisma.especialistaBase.findUnique({ where: { specialist } })
}

// ─── Contagem de docs por categoria ──────────────────────────────────────────

export async function countByCategory(specialist: string): Promise<Record<string, number>> {
  const rows = await prisma.especialistaDocument.groupBy({
    by:    ['category'],
    where: { specialist, isRevoked: false },
    _count: { _all: true },
  })
  return Object.fromEntries(rows.map(r => [r.category, r._count._all]))
}

// ─── Contagem total de docs ───────────────────────────────────────────────────

export async function countDocs(specialist: string): Promise<number> {
  return prisma.especialistaDocument.count({ where: { specialist, isRevoked: false } })
}
