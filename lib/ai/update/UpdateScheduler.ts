// ─── Camada de Atualização · Agendador ───────────────────────────────────────
// Gerencia o calendário de atualizações automáticas por especialista.
// Não usa node-cron nesta fase — apenas calcula datas e verifica se é hora.
// A execução real é acionada pelo UpdateManager quando invocado.

import { prisma } from '@/lib/prisma'
import { nextScheduledAt, staleDaysSince } from './UpdateDetector'
import { SPECIALISTS } from '@/lib/especialistas/config'
import type { ScheduleInfo, SchedulerOptions } from './UpdateTypes'

// ─── Padrões ─────────────────────────────────────────────────────────────────

const DEFAULT_UPDATE_HOUR  = 3      // 03:00 da manhã
const DEFAULT_MAX_STALE    = 7      // dias antes de forçar atualização
const DEFAULT_INTERVAL_H   = 24     // horas entre verificações agendadas

// ─── Verifica se um especialista deve ser atualizado agora ────────────────────

export async function isDueForUpdate(
  specialist: string,
  options: SchedulerOptions = {},
): Promise<boolean> {
  const maxStaleDays = options.maxStaleDays ?? DEFAULT_MAX_STALE

  const base = await prisma.especialistaBase.findUnique({
    where: { specialist },
    select: { nextUpdate: true, lastUpdated: true, status: true },
  })

  // Nunca atualizado
  if (!base || !base.lastUpdated) return true

  // Passado o nextUpdate agendado
  if (base.nextUpdate && Date.now() >= base.nextUpdate.getTime()) return true

  // Excedeu o limiar de staleness
  const days = staleDaysSince(base.lastUpdated)
  if (days !== null && days >= maxStaleDays) return true

  return false
}

// ─── Lista todos os especialistas com atualização pendente ───────────────────

export async function getOverdueSpecialists(
  options: SchedulerOptions = {},
): Promise<string[]> {
  const results = await Promise.allSettled(
    SPECIALISTS.map(async s => {
      const due = await isDueForUpdate(s.id, options)
      return due ? s.id : null
    })
  )

  return results
    .flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : [])
}

// ─── Agenda próxima atualização para um especialista ─────────────────────────

export async function scheduleNextUpdate(
  specialist: string,
  options: SchedulerOptions = {},
): Promise<Date> {
  const hour      = options.updateHour ?? DEFAULT_UPDATE_HOUR
  const nextDate  = nextScheduledAt(hour)

  await prisma.especialistaBase.upsert({
    where:  { specialist },
    update: { nextUpdate: nextDate },
    create: {
      specialist,
      status:      'DESATUALIZADO',
      lastChecked: new Date(),
      docCount:    0,
      nextUpdate:  nextDate,
    },
  })

  return nextDate
}

// ─── Agenda todos os especialistas sem próximo agendamento ───────────────────

export async function ensureAllScheduled(
  options: SchedulerOptions = {},
): Promise<number> {
  let scheduled = 0

  for (const sp of SPECIALISTS) {
    const base = await prisma.especialistaBase.findUnique({
      where: { specialist: sp.id },
      select: { nextUpdate: true },
    })

    if (!base?.nextUpdate) {
      await scheduleNextUpdate(sp.id, options)
      scheduled++
    }
  }

  return scheduled
}

// ─── Informações de agendamento de todos os especialistas ────────────────────

export async function getAllScheduleInfo(
  options: SchedulerOptions = {},
): Promise<ScheduleInfo[]> {
  const bases = await prisma.especialistaBase.findMany({
    select: { specialist: true, nextUpdate: true, lastUpdated: true },
  })

  const baseMap = Object.fromEntries(bases.map(b => [b.specialist, b]))

  return SPECIALISTS.map(sp => {
    const base       = baseMap[sp.id]
    const nextUpdate  = base?.nextUpdate  ?? null
    const lastUpdated = base?.lastUpdated ?? null
    const staleDays   = staleDaysSince(lastUpdated)

    const overdueHours = options.maxStaleDays ? options.maxStaleDays * 24 : DEFAULT_INTERVAL_H
    const isOverdue    = nextUpdate
      ? Date.now() > nextUpdate.getTime() + overdueHours * 3_600_000
      : true

    return {
      specialist:          sp.id,
      nextUpdate,
      lastUpdated,
      isOverdue,
      staleDays,
      autoScheduleEnabled: true,
    }
  })
}

// ─── Verifica se a hora atual é dentro da janela de atualização ───────────────

export function isWithinUpdateWindow(
  targetHour = DEFAULT_UPDATE_HOUR,
  windowMinutes = 30,
): boolean {
  const now         = new Date()
  const currentMins = now.getHours() * 60 + now.getMinutes()
  const targetMins  = targetHour * 60
  return Math.abs(currentMins - targetMins) <= windowMinutes
}

// ─── Resumo do agendamento ────────────────────────────────────────────────────

export function formatScheduleSummary(info: ScheduleInfo[]): string {
  const overdue  = info.filter(i => i.isOverdue)
  const upcoming = info.filter(i => !i.isOverdue && i.nextUpdate)
  const lines    = [
    `Total: ${info.length} especialistas`,
    `Com atualização pendente: ${overdue.length}`,
    `Com agendamento futuro: ${upcoming.length}`,
  ]
  return lines.join('\n')
}
