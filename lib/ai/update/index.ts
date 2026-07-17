// ─── Camada de Atualização · Exports ─────────────────────────────────────────

export { updateManager }             from './UpdateManager'
export type { UpdateManager }        from './UpdateManager'

export {
  runIncrementalUpdate,
  runForcedUpdate,
  runBatchUpdate,
}                                    from './UpdateRunner'

export {
  hashContent,
  hashObject,
  detectStaleDocuments,
  backfillChecksums,
  isStalByDate,
  staleDaysSince,
  detectChangedSources,
  detectUpdateNeeded,
  getScheduleInfo,
  nextScheduledAt,
  makeUpdateVersion,
}                                    from './UpdateDetector'

export {
  logUpdate,
  syncBaseRecord,
  markBaseUpdating,
  markBaseError,
  getUpdateLogs,
  getBaseRecord,
  countByCategory,
  countDocs,
}                                    from './UpdateLogger'

export {
  isDueForUpdate,
  getOverdueSpecialists,
  scheduleNextUpdate,
  ensureAllScheduled,
  getAllScheduleInfo,
  isWithinUpdateWindow,
  formatScheduleSummary,
}                                    from './UpdateScheduler'

export type {
  UpdateBaseStatus,
  UpdateTrigger,
  UpdateResult,
  SourceStatus,
  MonitoredSource,
  DetectionResult,
  ScheduleInfo,
  UpdateLogEntry,
  UpdateOptions,
  SchedulerOptions,
  UpdateSnapshot,
}                                    from './UpdateTypes'
