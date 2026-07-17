// ─── Camada de Atualização · Tipos e Interfaces ───────────────────────────────

// ─── Status da base do especialista ──────────────────────────────────────────

export type UpdateBaseStatus =
  | 'ATUALIZADO'         // Docs em dia
  | 'DESATUALIZADO'      // Precisa atualizar
  | 'ATUALIZANDO'        // Em progresso
  | 'CARGA_PENDENTE'     // Carga inicial ainda não feita
  | 'CARGA_EM_ANDAMENTO' // Carga inicial em progresso
  | 'ERRO'               // Última atualização falhou

// ─── Gatilho da atualização ───────────────────────────────────────────────────

export type UpdateTrigger =
  | 'manual'     // Disparado manualmente pelo usuário
  | 'auto'       // Disparado por pergunta do usuário que exige base atualizada
  | 'scheduled'  // Disparado pelo agendador automático
  | 'initial'    // Carga histórica inicial (ex: eSocial)
  | 'forced'     // Reconstrução forçada (apaga e recria tudo)

// ─── Resultado de uma atualização ────────────────────────────────────────────

export interface UpdateResult {
  specialist: string
  trigger: UpdateTrigger
  version: string
  newDocs: number
  updatedDocs: number
  removedDocs: number
  duration: number         // ms
  status: 'completed' | 'completed_with_errors' | 'failed' | 'skipped' | 'no_changes'
  error?: string
  cacheInvalidated: boolean
  checkedAt: Date
}

// ─── Status de uma fonte monitorada ──────────────────────────────────────────

export type SourceStatus =
  | 'ok'           // Fonte verificada, sem mudanças
  | 'changed'      // Conteúdo mudou (hash diferente)
  | 'new'          // Fonte nova, ainda não verificada
  | 'error'        // Falha ao verificar
  | 'unavailable'  // Fonte inacessível (offline, bloqueada)

// ─── Fonte monitorada ─────────────────────────────────────────────────────────

export interface MonitoredSource {
  id: string
  specialist: string
  label: string
  url: string
  description: string | null
  lastFetched: Date | null
  lastHash: string | null
  active: boolean
  status?: SourceStatus
  createdAt: Date
  updatedAt: Date
}

// ─── Resultado de detecção de mudanças ───────────────────────────────────────

export interface DetectionResult {
  specialist: string
  needsUpdate: boolean
  reason: string
  staleDays: number | null     // null se nunca atualizado
  changedSources: string[]     // labels das fontes com hash diferente
  newSources: string[]         // fontes nunca verificadas
  checkedAt: Date
}

// ─── Informações de agendamento ───────────────────────────────────────────────

export interface ScheduleInfo {
  specialist: string
  nextUpdate: Date | null
  lastUpdated: Date | null
  isOverdue: boolean           // nextUpdate já passou
  staleDays: number | null     // dias desde última atualização
  autoScheduleEnabled: boolean
}

// ─── Entrada de log de atualização ───────────────────────────────────────────

export interface UpdateLogEntry {
  id: string
  specialist: string
  version: string
  newDocs: number
  updatedDocs: number
  removedDocs: number
  duration: number
  triggeredBy: string
  status: string
  createdAt: Date
}

// ─── Opções de atualização ────────────────────────────────────────────────────

export interface UpdateOptions {
  trigger?: UpdateTrigger
  force?: boolean              // apaga docs existentes e recria
  skipIfRecent?: boolean       // pula se atualizado há menos de N horas
  skipIfRecentHours?: number   // padrão: 1 hora
  invalidateCache?: boolean    // padrão: true
  dryRun?: boolean             // simula sem gravar no banco
}

// ─── Opções do agendador ──────────────────────────────────────────────────────

export interface SchedulerOptions {
  intervalHours?: number       // padrão: 24h
  updateHour?: number          // hora do dia para agendar (padrão: 3h)
  maxStaleDays?: number        // forçar atualização após N dias sem atualizar
}

// ─── Snapshot do estado de todos os especialistas ────────────────────────────

export interface UpdateSnapshot {
  specialists: Array<{
    id: string
    name: string
    status: UpdateBaseStatus
    docCount: number
    version: string | null
    lastUpdated: Date | null
    nextUpdate: Date | null
    isOverdue: boolean
  }>
  totalDocs: number
  lastSnapshotAt: Date
}
