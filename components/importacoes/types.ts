// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type ModuleId =
  | 'PONTO_DIARIO' | 'COLABORADORES' | 'FERIAS'
  | 'BANCO_HORAS'  | 'TREINAMENTOS'  | 'OPERACIONAL' | 'EMPRESAS'

export type SessionStatus =
  | 'PENDENTE' | 'ANALISANDO' | 'AGUARDANDO_REVISAO'
  | 'IMPORTANDO' | 'CONCLUIDO' | 'CANCELADO' | 'ERRO'

export type RecordStatus =
  | 'VALIDO' | 'INVALIDO' | 'CONFLITO' | 'IMPORTADO' | 'IGNORADO' | 'REVERTIDO'

export interface FieldMapping {
  source: string
  system: string | null
  confidence: number   // 0–1
  notes: string
}

export interface ImportSession {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  fileHash: string
  filePath: string
  module: ModuleId
  sourceProfileId?: string | null
  profileName?: string | null
  status: SessionStatus
  totalRows: number
  validRows: number
  errorRows: number
  conflictRows: number
  importedRows: number
  aiConfidence?: number | null
  mappingJson?: string | null
  rawHeaders?: string | null
  sampleJson?: string | null
  aiAnalysisJson?: string | null
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

export interface ImportRecord {
  id: string
  sessionId: string
  rowIndex: number
  status: RecordStatus
  memberId?: string | null
  companyId?: string | null
  sourceValuesJson: string
  mappedValuesJson: string
  importedEntityId?: string | null
  importedEntity?: string | null
  errorMessage?: string | null
  conflictType?: string | null
  conflictDetail?: string | null
  resolution?: string | null
  resolvedAt?: string | null
  createdAt: string
}

export interface ImportConflict {
  id: string
  sessionId: string
  recordId: string
  conflictType: string
  description?: string | null
  existingValue?: string | null
  incomingValue?: string | null
  resolution?: string | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  createdAt: string
  // joined from ImportRecord
  sourceValuesJson?: string
  mappedValuesJson?: string
  rowIndex?: number
}

export interface ImportSourceProfile {
  id: string
  name: string
  module: ModuleId
  fileType: string
  mappingJson: string
  sampleHeadersJson: string
  confidence: number
  usageCount: number
  lastUsedAt?: string | null
  active: number
  createdAt: string
  updatedAt: string
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

export const MODULE_LABELS: Record<ModuleId, string> = {
  PONTO_DIARIO:  'Ponto Diário',
  COLABORADORES: 'Colaboradores',
  FERIAS:        'Férias',
  BANCO_HORAS:   'Banco de Horas',
  TREINAMENTOS:  'Treinamentos',
  OPERACIONAL:   'Dados Operacionais',
  EMPRESAS:      'Empresas',
}

export const STATUS_LABELS: Record<SessionStatus, string> = {
  PENDENTE:          'Aguardando análise',
  ANALISANDO:        'Analisando...',
  AGUARDANDO_REVISAO:'Aguardando revisão',
  IMPORTANDO:        'Importando...',
  CONCLUIDO:         'Concluído',
  CANCELADO:         'Cancelado',
  ERRO:              'Erro',
}

export const STATUS_COLORS: Record<SessionStatus, string> = {
  PENDENTE:          'bg-slate-100 text-slate-700',
  ANALISANDO:        'bg-blue-100 text-blue-700',
  AGUARDANDO_REVISAO:'bg-amber-100 text-amber-700',
  IMPORTANDO:        'bg-indigo-100 text-indigo-700',
  CONCLUIDO:         'bg-green-100 text-green-700',
  CANCELADO:         'bg-slate-100 text-slate-500',
  ERRO:              'bg-red-100 text-red-700',
}

export const RECORD_STATUS_COLORS: Record<RecordStatus, string> = {
  VALIDO:    'bg-green-100 text-green-700',
  INVALIDO:  'bg-red-100 text-red-700',
  CONFLITO:  'bg-amber-100 text-amber-700',
  IMPORTADO: 'bg-green-100 text-green-700',
  IGNORADO:  'bg-slate-100 text-slate-500',
  REVERTIDO: 'bg-slate-100 text-slate-500',
}

export const CONFIDENCE_COLOR = (c: number) =>
  c >= 0.85 ? 'text-green-600' : c >= 0.6 ? 'text-amber-600' : 'text-red-600'

export const CONFIDENCE_LABEL = (c: number) =>
  c >= 0.85 ? 'Alta' : c >= 0.6 ? 'Média' : 'Baixa'

export function fmtFileSize(bytes: number): string {
  if (bytes < 1024)      return `${bytes} B`
  if (bytes < 1048576)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
