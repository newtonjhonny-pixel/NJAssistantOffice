// ─── Camada de Atualização · Orquestrador Principal ──────────────────────────
// Ponto de entrada único para disparar e agendar atualizações dos especialistas.
// Invalida o cache do KnowledgeManager após cada atualização bem-sucedida.
// Não executa chamadas HTTP externas nesta fase.

import { prisma } from '@/lib/prisma'
import { knowledgeManager } from '@/lib/ai/knowledge'
import { SPECIALISTS } from '@/lib/especialistas/config'
import {
  runIncrementalUpdate,
  runForcedUpdate,
  runBatchUpdate,
} from './UpdateRunner'
import {
  detectUpdateNeeded,
  detectStaleDocuments,
} from './UpdateDetector'
import {
  isDueForUpdate,
  getOverdueSpecialists,
  scheduleNextUpdate,
  ensureAllScheduled,
  getAllScheduleInfo,
} from './UpdateScheduler'
import {
  getUpdateLogs,
  getBaseRecord,
} from './UpdateLogger'
import type {
  UpdateResult,
  UpdateOptions,
  UpdateSnapshot,
  DetectionResult,
  ScheduleInfo,
  SchedulerOptions,
  UpdateLogEntry,
} from './UpdateTypes'

// ─── UpdateManager ───────────────────────────────────────────────────────────

class UpdateManager {
  // ─── Atualização manual de um especialista ──────────────────────────────────

  async update(specialist: string, options: UpdateOptions = {}): Promise<UpdateResult> {
    if (options.force) {
      // Forced: apaga docs e recria via seed vazio (sem dados externos nesta fase)
      return runForcedUpdate(specialist, async () => 0, options)
    }
    return runIncrementalUpdate(specialist, options)
  }

  // ─── Reindexação (alias semântico para atualização incremental) ─────────────

  async reindex(specialist: string, options: UpdateOptions = {}): Promise<UpdateResult> {
    return runIncrementalUpdate(specialist, {
      ...options,
      trigger: options.trigger ?? 'manual',
    })
  }

  // ─── Atualização de todos os especialistas pendentes ───────────────────────

  async updateOverdue(options: UpdateOptions = {}): Promise<UpdateResult[]> {
    const ids = await getOverdueSpecialists()
    if (ids.length === 0) return []
    return runBatchUpdate(ids, { ...options, trigger: 'scheduled' })
  }

  // ─── Atualização em batch de uma lista ────────────────────────────────────

  async updateBatch(specialistIds: string[], options: UpdateOptions = {}): Promise<UpdateResult[]> {
    return runBatchUpdate(specialistIds, options)
  }

  // ─── Detecção de necessidade de atualização ────────────────────────────────

  async checkIfNeedsUpdate(specialist: string, maxStaleDays?: number): Promise<DetectionResult> {
    return detectUpdateNeeded(specialist, maxStaleDays)
  }

  // ─── Documentos desatualizados (checksum drift) ────────────────────────────

  async checkStaleDocuments(specialist: string) {
    return detectStaleDocuments(specialist)
  }

  // ─── Verificar se está em prazo para atualizar ─────────────────────────────

  async isDue(specialist: string, options?: SchedulerOptions): Promise<boolean> {
    return isDueForUpdate(specialist, options)
  }

  // ─── Agendar próxima atualização ──────────────────────────────────────────

  async scheduleNext(specialist: string, options?: SchedulerOptions): Promise<Date> {
    return scheduleNextUpdate(specialist, options)
  }

  // ─── Garantir que todos os especialistas têm agendamento ──────────────────

  async ensureScheduled(options?: SchedulerOptions): Promise<number> {
    return ensureAllScheduled(options)
  }

  // ─── Agenda global ────────────────────────────────────────────────────────

  async scheduleInfo(options?: SchedulerOptions): Promise<ScheduleInfo[]> {
    return getAllScheduleInfo(options)
  }

  // ─── Logs de atualização ──────────────────────────────────────────────────

  async logs(specialist: string, limit = 10): Promise<UpdateLogEntry[]> {
    return getUpdateLogs(specialist, limit)
  }

  // ─── Estado atual da base ─────────────────────────────────────────────────

  async baseRecord(specialist: string) {
    return getBaseRecord(specialist)
  }

  // ─── Snapshot do estado de todos os especialistas ─────────────────────────

  async snapshot(): Promise<UpdateSnapshot> {
    const bases = await prisma.especialistaBase.findMany({
      select: {
        specialist: true,
        status: true,
        docCount: true,
        version: true,
        lastUpdated: true,
        nextUpdate: true,
      },
    })

    const schedule = await getAllScheduleInfo()
    const scheduleMap = Object.fromEntries(schedule.map(s => [s.specialist, s]))
    const baseMap     = Object.fromEntries(bases.map(b => [b.specialist, b]))

    const specialists = SPECIALISTS.map(sp => {
      const base  = baseMap[sp.id]
      const sched = scheduleMap[sp.id]
      return {
        id:          sp.id,
        name:        sp.name ?? sp.id,
        status:      (base?.status ?? 'DESATUALIZADO') as any,
        docCount:    base?.docCount ?? 0,
        version:     base?.version ?? null,
        lastUpdated: base?.lastUpdated ?? null,
        nextUpdate:  base?.nextUpdate ?? null,
        isOverdue:   sched?.isOverdue ?? true,
      }
    })

    return {
      specialists,
      totalDocs:      specialists.reduce((s, sp) => s + sp.docCount, 0),
      lastSnapshotAt: new Date(),
    }
  }

  // ─── Invalidação manual de cache ──────────────────────────────────────────

  clearCache(specialist?: string): void {
    knowledgeManager.clearCache(specialist)
  }

  // ─── Estatísticas do manager ──────────────────────────────────────────────

  async stats(): Promise<{
    totalSpecialists: number
    totalDocs: number
    overdueCount: number
    lastUpdated: Date | null
  }> {
    const [total, overdue, bases] = await Promise.all([
      prisma.especialistaDocument.count({ where: { isRevoked: false } }),
      getOverdueSpecialists(),
      prisma.especialistaBase.findMany({ select: { lastUpdated: true }, orderBy: { lastUpdated: 'desc' }, take: 1 }),
    ])

    return {
      totalSpecialists: SPECIALISTS.length,
      totalDocs:        total,
      overdueCount:     overdue.length,
      lastUpdated:      bases[0]?.lastUpdated ?? null,
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const updateManager = new UpdateManager()
export type { UpdateManager }
