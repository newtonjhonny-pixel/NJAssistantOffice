// ─── Camada de Atualização · Runner ──────────────────────────────────────────
// Executa a atualização da base de um especialista de forma segura.
// Nesta fase: atualiza checksums, identifica docs revogados, incrementa versão.
// Não faz chamadas HTTP externas (estrutura preparada para fase seguinte).

import { prisma } from '@/lib/prisma'
import { knowledgeManager } from '@/lib/ai/knowledge'
import {
  hashContent,
  backfillChecksums,
  makeUpdateVersion,
} from './UpdateDetector'
import {
  markBaseUpdating,
  markBaseError,
  logUpdate,
  syncBaseRecord,
  countByCategory,
  countDocs,
} from './UpdateLogger'
import { SPECIALISTS } from '@/lib/especialistas/config'
import type { UpdateResult, UpdateOptions } from './UpdateTypes'

// ─── Constante: especialistas que exigem carga inicial antes de incrementar ───

const REQUIRES_INITIAL_LOAD = new Set(['esocial'])

// ─── Verifica e atualiza checksums dos documentos existentes ─────────────────

async function refreshChecksums(specialist: string): Promise<{
  updated: number
  unchanged: number
}> {
  const docs = await prisma.especialistaDocument.findMany({
    where: { specialist, isRevoked: false, NOT: { content: null } },
    select: { id: true, content: true, checksum: true },
  })

  let updated   = 0
  let unchanged = 0

  for (const doc of docs) {
    if (!doc.content) continue
    const newHash = hashContent(doc.content)
    if (doc.checksum !== newHash) {
      await prisma.especialistaDocument.update({
        where: { id: doc.id },
        data:  { checksum: newHash },
      })
      updated++
    } else {
      unchanged++
    }
  }

  return { updated, unchanged }
}

// ─── Revoga documentos marcados como obsoletos ────────────────────────────────
// Documentos com isRevoked=true já existem no schema — este runner os detecta
// pelo padrão de conteúdo e os revoga (ex: versão superada pelo campo version).

async function revokeOutdatedVersions(specialist: string): Promise<number> {
  // Agrupa docs por título; mantém o de maior version, revoga os outros
  const docs = await prisma.especialistaDocument.findMany({
    where:   { specialist, isRevoked: false },
    select:  { id: true, title: true, version: true },
    orderBy: { version: 'desc' },
  })

  const byTitle = new Map<string, typeof docs>()
  for (const doc of docs) {
    const key = doc.title.trim().toLowerCase()
    if (!byTitle.has(key)) byTitle.set(key, [])
    byTitle.get(key)!.push(doc)
  }

  let revoked = 0
  const revokePromises: Promise<void>[] = []

  byTitle.forEach(group => {
    if (group.length <= 1) return
    const toRevoke = group.slice(1)
    for (const doc of toRevoke) {
      revokePromises.push(
        prisma.especialistaDocument.update({
          where: { id: doc.id },
          data:  { isRevoked: true },
        }).then(() => { revoked++ })
      )
    }
  })

  await Promise.all(revokePromises)
  return revoked
}

// ─── Atualização incremental (padrão) ────────────────────────────────────────

export async function runIncrementalUpdate(
  specialist: string,
  options: UpdateOptions = {},
): Promise<UpdateResult> {
  const t0      = Date.now()
  const trigger = options.trigger ?? 'manual'
  const version = makeUpdateVersion()

  // Bloqueia incrementais se carga inicial não foi feita
  if (REQUIRES_INITIAL_LOAD.has(specialist)) {
    const base = await prisma.especialistaBase.findUnique({
      where: { specialist },
      select: { initialLoadDone: true },
    })
    if (!base?.initialLoadDone) {
      return {
        specialist, trigger, version,
        newDocs: 0, updatedDocs: 0, removedDocs: 0,
        duration: Date.now() - t0,
        status: 'skipped',
        error: 'INITIAL_LOAD_REQUIRED',
        cacheInvalidated: false,
        checkedAt: new Date(),
      }
    }
  }

  // Pula se atualizado recentemente (default: 1h)
  if (options.skipIfRecent) {
    const skipHours = options.skipIfRecentHours ?? 1
    const base      = await prisma.especialistaBase.findUnique({
      where: { specialist },
      select: { lastUpdated: true },
    })
    if (base?.lastUpdated) {
      const diffH = (Date.now() - base.lastUpdated.getTime()) / 3_600_000
      if (diffH < skipHours) {
        return {
          specialist, trigger, version,
          newDocs: 0, updatedDocs: 0, removedDocs: 0,
          duration: Date.now() - t0,
          status: 'skipped',
          error: `Atualizado há ${diffH.toFixed(1)}h (mínimo: ${skipHours}h)`,
          cacheInvalidated: false,
          checkedAt: new Date(),
        }
      }
    }
  }

  if (options.dryRun) {
    const { updated } = await refreshChecksums(specialist)
    return {
      specialist, trigger, version,
      newDocs: 0, updatedDocs: updated, removedDocs: 0,
      duration: Date.now() - t0,
      status: 'completed',
      cacheInvalidated: false,
      checkedAt: new Date(),
    }
  }

  try {
    await markBaseUpdating(specialist)

    // 1. Atualiza checksums
    const { updated: updatedDocs } = await refreshChecksums(specialist)

    // 2. Preenche checksums faltantes
    await backfillChecksums(specialist)

    // 3. Revoga versões antigas
    const removedDocs = await revokeOutdatedVersions(specialist)

    // 4. Coleta stats
    const docCount     = await countDocs(specialist)
    const byCategory   = await countByCategory(specialist)
    const sp           = SPECIALISTS.find(s => s.id === specialist)
    const sources      = sp?.sources ?? []

    const result: UpdateResult = {
      specialist, trigger, version,
      newDocs:    0,
      updatedDocs,
      removedDocs,
      duration:   Date.now() - t0,
      status:     'completed',
      cacheInvalidated: false,
      checkedAt:  new Date(),
    }

    // 5. Persiste log e sincroniza base
    if (!options.dryRun) {
      await Promise.all([
        logUpdate(result),
        syncBaseRecord(specialist, result, docCount, byCategory, sources),
      ])
    }

    // 6. Invalida cache do KnowledgeManager
    if (options.invalidateCache !== false) {
      knowledgeManager.clearCache(specialist)
      result.cacheInvalidated = true
    }

    return result
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown'
    await markBaseError(specialist, errMsg)

    return {
      specialist, trigger, version,
      newDocs: 0, updatedDocs: 0, removedDocs: 0,
      duration: Date.now() - t0,
      status: 'failed',
      error: errMsg,
      cacheInvalidated: false,
      checkedAt: new Date(),
    }
  }
}

// ─── Atualização forçada (apaga e recria) ────────────────────────────────────

export async function runForcedUpdate(
  specialist: string,
  seedFn: () => Promise<number>,
  options: UpdateOptions = {},
): Promise<UpdateResult> {
  const t0      = Date.now()
  const trigger = options.trigger ?? 'forced'
  const version = makeUpdateVersion()

  if (options.dryRun) {
    return {
      specialist, trigger, version,
      newDocs: 0, updatedDocs: 0, removedDocs: 0,
      duration: 0, status: 'completed',
      cacheInvalidated: false, checkedAt: new Date(),
    }
  }

  try {
    await markBaseUpdating(specialist)

    // Apaga docs existentes
    const { count: removedDocs } = await prisma.especialistaDocument.deleteMany({
      where: { specialist },
    })

    // Executa seed (função fornecida pelo chamador)
    const newDocs    = await seedFn()
    await backfillChecksums(specialist)

    const docCount   = await countDocs(specialist)
    const byCategory = await countByCategory(specialist)
    const sp         = SPECIALISTS.find(s => s.id === specialist)
    const sources    = sp?.sources ?? []

    const result: UpdateResult = {
      specialist, trigger, version,
      newDocs, updatedDocs: 0, removedDocs,
      duration: Date.now() - t0,
      status: 'completed',
      cacheInvalidated: false,
      checkedAt: new Date(),
    }

    await Promise.all([
      logUpdate(result),
      syncBaseRecord(specialist, result, docCount, byCategory, sources),
    ])

    if (options.invalidateCache !== false) {
      knowledgeManager.clearCache(specialist)
      result.cacheInvalidated = true
    }

    return result
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'unknown'
    await markBaseError(specialist, errMsg)
    return {
      specialist, trigger, version,
      newDocs: 0, updatedDocs: 0, removedDocs: 0,
      duration: Date.now() - t0,
      status: 'failed',
      error: errMsg,
      cacheInvalidated: false,
      checkedAt: new Date(),
    }
  }
}

// ─── Atualização em batch (todos ou lista) ────────────────────────────────────

export async function runBatchUpdate(
  specialistIds: string[],
  options: UpdateOptions = {},
): Promise<UpdateResult[]> {
  const results: UpdateResult[] = []

  for (const id of specialistIds) {
    const result = await runIncrementalUpdate(id, {
      ...options,
      skipIfRecent:      true,
      skipIfRecentHours: 1,
    })
    results.push(result)
  }

  return results
}
