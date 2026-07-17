// ─── Camada de Atualização · Detector de Mudanças ────────────────────────────
// Detecta se a base de um especialista precisa ser atualizada via:
//   • Hash SHA-256 do conteúdo dos documentos
//   • Data da última atualização vs. limiar de staleness
//   • Fontes marcadas como não verificadas (lastHash = null)

import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { DetectionResult, ScheduleInfo } from './UpdateTypes'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_STALE_DAYS    = 7    // considerar desatualizado após N dias
const DEFAULT_OVERDUE_HOURS = 2    // nextUpdate com atraso de N horas = overdue

// ─── Hash de conteúdo ────────────────────────────────────────────────────────

export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

export function hashObject(obj: unknown): string {
  return hashContent(JSON.stringify(obj))
}

// ─── Verifica se doc precisa re-indexar (checksum diferente) ─────────────────

export async function detectStaleDocuments(specialist: string): Promise<{
  stale: number
  total: number
  ratio: number
}> {
  const docs = await prisma.especialistaDocument.findMany({
    where: { specialist, isRevoked: false },
    select: { id: true, content: true, checksum: true },
  })

  let stale = 0
  for (const doc of docs) {
    if (!doc.content) continue
    const currentHash = hashContent(doc.content)
    if (!doc.checksum || doc.checksum !== currentHash) stale++
  }

  return {
    stale,
    total: docs.length,
    ratio: docs.length > 0 ? stale / docs.length : 0,
  }
}

// ─── Atualiza checksum de todos os docs sem hash ──────────────────────────────

export async function backfillChecksums(specialist: string): Promise<number> {
  const docs = await prisma.especialistaDocument.findMany({
    where: { specialist, checksum: null, NOT: { content: null } },
    select: { id: true, content: true },
  })

  let updated = 0
  for (const doc of docs) {
    if (!doc.content) continue
    await prisma.especialistaDocument.update({
      where: { id: doc.id },
      data:  { checksum: hashContent(doc.content) },
    })
    updated++
  }

  return updated
}

// ─── Verifica staleness por data ──────────────────────────────────────────────

export function isStalByDate(lastUpdated: Date | null, maxStaleDays = DEFAULT_STALE_DAYS): boolean {
  if (!lastUpdated) return true
  const diffMs   = Date.now() - lastUpdated.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays >= maxStaleDays
}

export function staleDaysSince(lastUpdated: Date | null): number | null {
  if (!lastUpdated) return null
  return Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Verifica fontes com hash diferente ───────────────────────────────────────

export async function detectChangedSources(specialist: string): Promise<{
  changed: string[]
  newSources: string[]
}> {
  const sources = await prisma.especialistaSource.findMany({
    where: { specialist, active: true },
    select: { label: true, lastHash: true, lastFetched: true },
  })

  const changed: string[]    = []
  const newSources: string[] = []

  for (const src of sources) {
    if (!src.lastHash || !src.lastFetched) {
      newSources.push(src.label)
    }
    // Hash real seria comparado aqui quando houver fetch real de URLs
    // Nesta fase, fontes sem lastHash são marcadas como "novas"
  }

  return { changed, newSources }
}

// ─── Decisão de atualização ───────────────────────────────────────────────────

export async function detectUpdateNeeded(
  specialist: string,
  maxStaleDays = DEFAULT_STALE_DAYS,
): Promise<DetectionResult> {
  const base = await prisma.especialistaBase.findUnique({
    where: { specialist },
    select: { lastUpdated: true, status: true, docCount: true },
  })

  const [{ changed, newSources }] = await Promise.all([
    detectChangedSources(specialist),
  ])

  const lastUpdated = base?.lastUpdated ?? null
  const staleDays   = staleDaysSince(lastUpdated)
  const isStale     = isStalByDate(lastUpdated, maxStaleDays)
  const noBase      = !base || base.docCount === 0

  const needsUpdate = noBase || isStale || changed.length > 0 || newSources.length > 0

  let reason = 'Base em dia'
  if (noBase)              reason = 'Base vazia ou não inicializada'
  else if (isStale)        reason = `Base desatualizada há ${staleDays} dia(s)`
  else if (changed.length) reason = `${changed.length} fonte(s) com conteúdo alterado`
  else if (newSources.length) reason = `${newSources.length} fonte(s) nova(s) não verificada(s)`

  return {
    specialist,
    needsUpdate,
    reason,
    staleDays,
    changedSources: changed,
    newSources,
    checkedAt: new Date(),
  }
}

// ─── Informações de agendamento ───────────────────────────────────────────────

export async function getScheduleInfo(specialist: string): Promise<ScheduleInfo> {
  const base = await prisma.especialistaBase.findUnique({
    where: { specialist },
    select: { nextUpdate: true, lastUpdated: true },
  })

  const nextUpdate  = base?.nextUpdate  ?? null
  const lastUpdated = base?.lastUpdated ?? null
  const staleDays   = staleDaysSince(lastUpdated)
  const isOverdue   = nextUpdate
    ? Date.now() > nextUpdate.getTime() + DEFAULT_OVERDUE_HOURS * 3_600_000
    : true

  return {
    specialist,
    nextUpdate,
    lastUpdated,
    isOverdue,
    staleDays,
    autoScheduleEnabled: true,
  }
}

// ─── Próxima data de atualização agendada ────────────────────────────────────

export function nextScheduledAt(hour = 3): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  return d
}

// ─── Versão no formato YYYY.MM.DD.HHmm ───────────────────────────────────────

export function makeUpdateVersion(): string {
  const d   = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}`
}
