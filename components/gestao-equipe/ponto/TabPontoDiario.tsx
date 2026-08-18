"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Calendar, Clock, ChevronLeft, ChevronRight, Settings,
  RefreshCw, Lock, Unlock, AlertCircle, CheckCircle2,
  Edit2, Loader2, Plus, X, Save, ChevronDown, ChevronUp,
  Info, FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DailyRecord, MonthlyCompetence, TimesheetSummary, Schedule,
  DAY_NAMES, CLASSIFICATION_LABELS, STATUS_LABELS, DAY_TYPE_LABELS,
  min2hhmm, formatDate, currentCompetence, competenceLabel,
  prevCompetence, nextCompetence,
} from "./types"

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function classColor(cls: string): string {
  switch (cls) {
    case 'BANCO':        return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'HORA_EXTRA':   return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'ABONADO':      return 'bg-green-100 text-green-700 border-green-200'
    case 'DESCONTO':     return 'bg-red-100 text-red-700 border-red-200'
    case 'COMPENSACAO':  return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'SEM_EFEITO':   return 'bg-slate-100 text-slate-500 border-slate-200'
    case 'PENDENTE':     return 'bg-amber-100 text-amber-700 border-amber-200'
    default:             return 'bg-slate-100 text-slate-500 border-slate-200'
  }
}

function statusColor(st: string): string {
  switch (st) {
    case 'PREENCHIDO':  return 'bg-green-100 text-green-700 border-green-200'
    case 'CONFERIDO':   return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'DIVERGENCIA': return 'bg-red-100 text-red-700 border-red-200'
    case 'JUSTIFICADO': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'FECHADO':     return 'bg-slate-200 text-slate-600 border-slate-300'
    case 'PENDENTE':    return 'bg-amber-100 text-amber-700 border-amber-200'
    default:            return 'bg-slate-100 text-slate-400 border-slate-200' // NAO_PREENCHIDO
  }
}

function dayTypeBg(dayType: string, status: string): string {
  if (dayType === 'FERIADO' || dayType === 'FOLGA') return 'bg-slate-50 dark:bg-slate-800/30'
  if (dayType === 'DOMINGO') return 'bg-slate-50 dark:bg-slate-800/30'
  if (dayType === 'SABADO') return 'bg-blue-50/40 dark:bg-blue-900/10'
  if (status === 'DIVERGENCIA') return 'bg-red-50 dark:bg-red-900/10'
  return ''
}

function balanceColor(bal: number): string {
  if (bal > 0) return 'text-green-600'
  if (bal < 0) return 'text-red-600'
  return 'text-slate-500'
}

// ─── BADGE DE CLASSIFICAÇÃO ───────────────────────────────────────────────────

function ClassBadge({ cls }: { cls: string }) {
  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium', classColor(cls))}>
      {CLASSIFICATION_LABELS[cls] ?? cls}
    </span>
  )
}

function StatusBadge({ st }: { st: string }) {
  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded border', statusColor(st))}>
      {STATUS_LABELS[st] ?? st}
    </span>
  )
}

// ─── RESUMO DO MÊS ───────────────────────────────────────────────────────────

function MonthSummaryBar({ summary }: { summary: TimesheetSummary }) {
  if (!summary) return null
  const items = [
    { label: 'Previsto',    val: summary.plannedHHMM,     color: 'text-slate-600' },
    { label: 'Trabalhado',  val: summary.workedHHMM,      color: 'text-emerald-600' },
    { label: 'Saldo',       val: summary.balanceHHMM,     color: summary.balanceMinutes >= 0 ? 'text-emerald-600' : 'text-red-600' },
    { label: 'Banco +',     val: summary.bankCreditHHMM,  color: 'text-blue-600' },
    { label: 'Banco −',     val: summary.bankDebitHHMM,   color: 'text-red-600' },
    { label: 'H. Extra 100%', val: summary.overtimeHHMM,  color: 'text-purple-600' },
    { label: 'Pendentes',   val: String(summary.pendingCount), color: summary.pendingCount > 0 ? 'text-amber-600' : 'text-slate-500' },
  ]
  return (
    <div className="flex flex-wrap gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 text-sm">
      {items.map(it => (
        <div key={it.label} className="flex flex-col items-center min-w-[60px]">
          <span className="text-xs text-slate-500 dark:text-slate-400">{it.label}</span>
          <span className={cn('font-mono font-semibold', it.color)}>{it.val}</span>
        </div>
      ))}
    </div>
  )
}

// ─── FORMULÁRIO DE DIA (PAINEL LATERAL) ──────────────────────────────────────

interface DayFormProps {
  record: DailyRecord
  isClosed: boolean
  onSave: (data: Partial<DailyRecord>) => Promise<void>
  onReset: () => Promise<void>
  onClose: () => void
}

const CLASSIFICATIONS = ['BANCO', 'HORA_EXTRA', 'ABONADO', 'DESCONTO', 'COMPENSACAO', 'SEM_EFEITO', 'PENDENTE']
const JUSTIFICATIONS = [
  { value: 'BANCO_HORAS',       label: 'Banco de Horas' },
  { value: 'ATESTADO',          label: 'Atestado Médico' },
  { value: 'FALTA_JUSTIFICADA', label: 'Falta Justificada' },
  { value: 'LICENCA',           label: 'Licença' },
  { value: 'FERIAS',            label: 'Férias' },
  { value: 'FOLGA_COMP',        label: 'Folga Compensatória' },
  { value: 'TREINAMENTO',       label: 'Treinamento' },
  { value: 'VIAGEM',            label: 'Viagem a Serviço' },
  { value: 'OUTRO',             label: 'Outro' },
]

// Renderiza os 4 pares de batidas; no primeiro slot vazio exibe badge de justificativa
function BatidasSlots({ slots, justification, isClosed, onChange }: {
  slots: { en: string; ex: string; enk: string; exk: string }[]
  justification: string
  isClosed: boolean
  onChange: (k: string, v: string) => void
}) {
  const justLabel = justification
    ? JUSTIFICATIONS.find(j => j.value === justification)?.label
    : null
  // Índice do primeiro slot completamente vazio
  let firstEmptyIdx = -1
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i].en && !slots[i].ex) { firstEmptyIdx = i; break }
  }
  return (
    <>
      {slots.map((s, i) => {
        const showBadge = !!justLabel && i === firstEmptyIdx && !s.en && !s.ex
        return (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
            {showBadge ? (
              <span className="flex-1 text-center text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded px-2 py-1">
                {justLabel}
              </span>
            ) : (
              <>
                <input
                  type="time" disabled={isClosed} value={s.en}
                  onChange={e => onChange(s.enk, e.target.value)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                />
                <span className="text-slate-400">—</span>
                <input
                  type="time" disabled={isClosed} value={s.ex}
                  onChange={e => onChange(s.exk, e.target.value)}
                  className="flex-1 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                />
              </>
            )}
          </div>
        )
      })}
    </>
  )
}

function DayForm({ record, isClosed, onSave, onReset, onClose }: DayFormProps) {
  const [form, setForm] = useState({
    entryMode: record.entryMode || 'MARCACAO',
    entry1: record.entry1 || '', exit1: record.exit1 || '',
    entry2: record.entry2 || '', exit2: record.exit2 || '',
    entry3: record.entry3 || '', exit3: record.exit3 || '',
    entry4: record.entry4 || '', exit4: record.exit4 || '',
    totalMinutes: record.totalMinutes ?? '',
    classification: record.classification || 'PENDENTE',
    justification: record.justification || '',
    justificationDesc: record.justificationDesc || '',
    observations: record.observations || '',
  })
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Cálculo live
  function liveWorked(): number {
    if (form.entryMode === 'TOTAL' || form.entryMode === 'AJUSTE') {
      const t = Number(form.totalMinutes)
      return Number.isFinite(t) ? t : 0
    }
    let total = 0
    const pairs: [string, string][] = [
      [form.entry1, form.exit1], [form.entry2, form.exit2],
      [form.entry3, form.exit3], [form.entry4, form.exit4],
    ]
    for (const [en, ex] of pairs) {
      if (en && ex) {
        const [eh, em] = en.split(':').map(Number)
        const [xh, xm] = ex.split(':').map(Number)
        const diff = (xh * 60 + xm) - (eh * 60 + em)
        if (diff > 0) total += diff
      }
    }
    return total
  }

  const worked = liveWorked()
  const balance = worked - record.plannedMinutes

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const payload: Partial<DailyRecord> = {
        entryMode: form.entryMode as any,
        classification: form.classification as any,
        justification: form.justification || undefined,
        justificationDesc: form.justificationDesc || undefined,
        observations: form.observations || undefined,
      }
      if (form.entryMode === 'MARCACAO') {
        payload.entry1 = form.entry1 || null; payload.exit1 = form.exit1 || null
        payload.entry2 = form.entry2 || null; payload.exit2 = form.exit2 || null
        payload.entry3 = form.entry3 || null; payload.exit3 = form.exit3 || null
        payload.entry4 = form.entry4 || null; payload.exit4 = form.exit4 || null
      } else {
        payload.totalMinutes = form.totalMinutes !== '' ? Number(form.totalMinutes) : null
      }
      await onSave(payload)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function handleReset() {
    setResetting(true); setError(null)
    try { await onReset() }
    catch (e: any) { setError(e.message ?? 'Erro ao limpar') }
    finally { setResetting(false) }
  }

  const dayDate = formatDate(record.date)
  const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][record.dayOfWeek]
  const isSpecialDay = record.dayType === 'FERIADO' || record.dayType === 'FOLGA' || record.dayType === 'DOMINGO'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">{dayName}, {dayDate}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500">{DAY_TYPE_LABELS[record.dayType] ?? record.dayType}</span>
            <StatusBadge st={record.status} />
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Previsto */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Previsto:</span>
          <span className="font-mono font-medium">{min2hhmm(record.plannedMinutes)}</span>
        </div>

        {/* Modo de entrada */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Modo de Lançamento</label>
          <select
            disabled={isClosed}
            value={form.entryMode}
            onChange={e => set('entryMode', e.target.value)}
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-60"
          >
            <option value="MARCACAO">Batidas (HH:MM)</option>
            <option value="TOTAL">Total de Horas (minutos)</option>
            <option value="AJUSTE">Ajuste Manual</option>
          </select>
        </div>

        {/* Batidas */}
        {(form.entryMode === 'MARCACAO') && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Batidas</label>
            <BatidasSlots
              slots={[
                { en: form.entry1, ex: form.exit1, enk: 'entry1', exk: 'exit1' },
                { en: form.entry2, ex: form.exit2, enk: 'entry2', exk: 'exit2' },
                { en: form.entry3, ex: form.exit3, enk: 'entry3', exk: 'exit3' },
                { en: form.entry4, ex: form.exit4, enk: 'entry4', exk: 'exit4' },
              ]}
              justification={form.justification}
              isClosed={isClosed}
              onChange={(k, v) => set(k, v)}
            />
          </div>
        )}

        {/* Total de minutos */}
        {(form.entryMode === 'TOTAL' || form.entryMode === 'AJUSTE') && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Minutos Trabalhados
            </label>
            <input
              type="number" min={0} max={1440} disabled={isClosed}
              value={form.totalMinutes}
              onChange={e => set('totalMinutes', e.target.value)}
              placeholder="Ex: 510 = 8h30"
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-60"
            />
          </div>
        )}

        {/* Live preview */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-sm">
          <div>
            <div className="text-xs text-slate-500">Trabalhado</div>
            <div className="font-mono font-semibold text-emerald-600">{min2hhmm(worked)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Saldo</div>
            <div className={cn('font-mono font-semibold', balanceColor(balance))}>
              {balance >= 0 ? '+' : ''}{min2hhmm(balance)}
            </div>
          </div>
        </div>

        {/* Classificação */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Classificação</label>
          <select
            disabled={isClosed}
            value={form.classification}
            onChange={e => set('classification', e.target.value)}
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-60"
          >
            {CLASSIFICATIONS.map(c => (
              <option key={c} value={c}>{CLASSIFICATION_LABELS[c]}</option>
            ))}
          </select>
        </div>

        {/* Justificativa */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Justificativa</label>
          <select
            disabled={isClosed}
            value={form.justification}
            onChange={e => set('justification', e.target.value)}
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 mb-1.5 disabled:opacity-60"
          >
            <option value="">— Sem justificativa —</option>
            {JUSTIFICATIONS.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
          </select>
          {form.justification && (
            <input
              type="text" disabled={isClosed} value={form.justificationDesc}
              onChange={e => set('justificationDesc', e.target.value)}
              placeholder="Detalhe a justificativa..."
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-60"
            />
          )}
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Observações</label>
          <textarea
            disabled={isClosed} rows={2} value={form.observations}
            onChange={e => set('observations', e.target.value)}
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 resize-none disabled:opacity-60"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            <AlertCircle size={14} />{error}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isClosed && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2 bg-white dark:bg-slate-900">
          <button
            onClick={handleReset} disabled={resetting || saving}
            className="flex-1 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-60"
          >
            {resetting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Limpar'}
          </button>
          <button
            onClick={handleSave} disabled={saving || resetting}
            className="flex-1 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      )}
      {isClosed && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Lock size={12} /> Competência fechada — leitura apenas
        </div>
      )}
    </div>
  )
}

// ─── CALENDÁRIO MENSAL ────────────────────────────────────────────────────────

interface CalendarViewProps {
  competence: string
  days: DailyRecord[]
  selected: string | null
  onSelect: (date: string) => void
}

function CalendarView({ competence, days, selected, onSelect }: CalendarViewProps) {
  const [y, m] = competence.split('-').map(Number)
  const firstDow = new Date(y, m - 1, 1).getDay()  // 0=Dom
  const totalDays = new Date(y, m, 0).getDate()

  const dayMap = new Map(days.map(d => [d.date, d]))

  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => {
      const d = i + 1
      return `${competence}-${String(d).padStart(2, '0')}`
    }),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="select-none">
      {/* Cabeçalho dos dias */}
      <div className="grid grid-cols-7 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>
      {/* Semanas */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const rec = dayMap.get(date)
          const day = Number(date.split('-')[2])
          const isSelected = selected === date
          const isSunday = new Date(y, m - 1, day).getDay() === 0
          const isSpecial = rec && (rec.dayType === 'FERIADO' || rec.dayType === 'FOLGA')
          const hasPending = rec?.status === 'NAO_PREENCHIDO' || rec?.status === 'PENDENTE'
          const hasWork = rec && rec.workedMinutes > 0

          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={cn(
                'relative flex flex-col items-center p-1 rounded text-sm transition-colors min-h-[48px]',
                isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-1'
                  : isSunday || isSpecial
                    ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-800 dark:text-slate-200'
              )}
            >
              <span className="text-xs font-medium">{day}</span>
              {rec && (
                <span className={cn(
                  'text-[9px] font-mono mt-0.5',
                  isSelected ? 'text-blue-100' : balanceColor(rec.balanceMinutes)
                )}>
                  {rec.workedMinutes > 0 || rec.balanceMinutes !== 0
                    ? min2hhmm(rec.workedMinutes)
                    : '—'
                  }
                </span>
              )}
              {/* Status dot */}
              {rec && (
                <span className={cn(
                  'absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full',
                  isSelected ? 'bg-white' :
                    rec.status === 'FECHADO'     ? 'bg-slate-400' :
                    rec.status === 'CONFERIDO'   ? 'bg-blue-500' :
                    rec.status === 'PREENCHIDO'  ? 'bg-green-500' :
                    rec.status === 'DIVERGENCIA' ? 'bg-red-500' :
                    rec.status === 'JUSTIFICADO' ? 'bg-orange-500' :
                    hasPending && !isSpecial && !isSunday ? 'bg-amber-400' : ''
                )} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── LISTA DE DIAS ────────────────────────────────────────────────────────────

function DayList({ days, selected, onSelect }: {
  days: DailyRecord[]
  selected: string | null
  onSelect: (date: string) => void
}) {
  return (
    <div className="space-y-0.5">
      {days.map(d => {
        const isSelected = selected === d.date
        const isSpecial = d.dayType === 'FERIADO' || d.dayType === 'FOLGA' || d.dayType === 'DOMINGO'
        return (
          <button
            key={d.date}
            onClick={() => onSelect(d.date)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors',
              isSelected
                ? 'bg-blue-600 text-white'
                : isSpecial
                  ? 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            <span className="w-16 text-xs font-medium shrink-0">{formatDate(d.date)}</span>
            <span className="w-5 text-xs text-slate-400 shrink-0">{['D','S','T','Q','Q','S','S'][d.dayOfWeek]}</span>
            <span className={cn('flex-1 text-xs', isSelected ? 'text-blue-200' : 'text-slate-400')}>
              {DAY_TYPE_LABELS[d.dayType]}
            </span>
            <span className={cn('font-mono text-xs', isSelected ? 'text-blue-100' : 'text-slate-500')}>
              {d.workedMinutes > 0 ? min2hhmm(d.workedMinutes) : '—'}
            </span>
            {!isSelected && d.classification && d.classification !== 'SEM_EFEITO' && (
              <ClassBadge cls={d.classification} />
            )}
            {!isSelected && (
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                d.status === 'FECHADO'     ? 'bg-slate-400' :
                d.status === 'CONFERIDO'   ? 'bg-blue-500' :
                d.status === 'PREENCHIDO'  ? 'bg-green-500' :
                d.status === 'DIVERGENCIA' ? 'bg-red-500' :
                d.status === 'JUSTIFICADO' ? 'bg-orange-500' :
                !isSpecial                  ? 'bg-amber-300' : 'bg-transparent'
              )} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── CONFIGURAÇÃO DE ESCALA ───────────────────────────────────────────────────

function ScheduleConfig({ memberId }: { memberId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '', startDate: '', endDate: '',
    days: [0,1,2,3,4,5,6].map(dow => ({
      dayOfWeek: dow,
      isWorked: dow >= 1 && dow <= 5,
      entry1: dow >= 1 && dow <= 5 ? '08:00' : '',
      exit1: dow >= 1 && dow <= 5 ? '12:00' : '',
      entry2: dow >= 1 && dow <= 5 ? '13:00' : '',
      exit2: dow >= 1 && dow <= 5 ? '17:00' : '',
      entry3: '', exit3: '',
      dailyMinutes: dow >= 1 && dow <= 5 ? 480 : 0,
    }))
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/gestao-equipe/members/${memberId}/schedule`)
      if (r.ok) setSchedules(await r.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [memberId])

  async function handleCreate() {
    setSaving(true); setError(null)
    try {
      const r = await fetch(`/api/gestao-equipe/members/${memberId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, endDate: form.endDate || undefined })
      })
      if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
      setCreating(false)
      setForm({ name: '', startDate: '', endDate: '', days: form.days })
      load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDeactivate(id: string) {
    await fetch(`/api/gestao-equipe/members/${memberId}/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false, endDate: new Date().toISOString().split('T')[0] })
    })
    load()
  }

  if (loading) return <div className="p-4 text-center text-slate-400 text-sm"><Loader2 size={16} className="animate-spin inline mr-2" />Carregando escalas...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Escalas Cadastradas</h3>
        <button
          onClick={() => setCreating(c => !c)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
        >
          <Plus size={13} /> Nova Escala
        </button>
      </div>

      {/* Formulário de nova escala */}
      {creating && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3 bg-blue-50/50 dark:bg-blue-900/10">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">Nome</label>
              <input
                type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Padrão 8h"
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">Início de Vigência</label>
              <input
                type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          {/* Dias da semana */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Dias e Horários</div>
            {form.days.map((d, idx) => (
              <div key={d.dayOfWeek} className={cn('flex items-center gap-2 text-xs', !d.isWorked && 'opacity-50')}>
                <input
                  type="checkbox" checked={d.isWorked}
                  onChange={e => {
                    const days = [...form.days]
                    days[idx] = { ...days[idx], isWorked: e.target.checked }
                    setForm(f => ({ ...f, days }))
                  }}
                  className="rounded"
                />
                <span className="w-6 font-medium">{DOW[d.dayOfWeek]}</span>
                {d.isWorked && (
                  <>
                    <input type="time" value={d.entry1} onChange={e => {
                      const days = [...form.days]; days[idx] = { ...days[idx], entry1: e.target.value }
                      setForm(f => ({ ...f, days }))
                    }} className="border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 bg-white dark:bg-slate-800 w-20" />
                    <span className="text-slate-400">—</span>
                    <input type="time" value={d.exit1} onChange={e => {
                      const days = [...form.days]; days[idx] = { ...days[idx], exit1: e.target.value }
                      setForm(f => ({ ...f, days }))
                    }} className="border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 bg-white dark:bg-slate-800 w-20" />
                    <input type="time" value={d.entry2} onChange={e => {
                      const days = [...form.days]; days[idx] = { ...days[idx], entry2: e.target.value }
                      setForm(f => ({ ...f, days }))
                    }} className="border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 bg-white dark:bg-slate-800 w-20" />
                    <span className="text-slate-400">—</span>
                    <input type="time" value={d.exit2} onChange={e => {
                      const days = [...form.days]; days[idx] = { ...days[idx], exit2: e.target.value }
                      setForm(f => ({ ...f, days }))
                    }} className="border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 bg-white dark:bg-slate-800 w-20" />
                  </>
                )}
                {!d.isWorked && <span className="text-slate-400">Folga</span>}
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 text-xs py-1.5 border border-slate-200 dark:border-slate-700 rounded text-slate-600">Cancelar</button>
            <button onClick={handleCreate} disabled={saving} className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded font-medium disabled:opacity-60 flex items-center justify-center gap-1">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
            </button>
          </div>
        </div>
      )}

      {/* Lista de escalas */}
      {schedules.length === 0 && !creating && (
        <p className="text-sm text-slate-400 text-center py-4">Nenhuma escala cadastrada.</p>
      )}
      {schedules.map(s => (
        <div key={s.id} className={cn(
          'border rounded-lg overflow-hidden',
          s.active
            ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10'
            : 'border-slate-200 dark:border-slate-700 opacity-60'
        )}>
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer"
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
              {s.active && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200">Vigente</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {formatDate(s.startDate)}{s.endDate ? ` → ${formatDate(s.endDate)}` : ' → atual'}
              </span>
              <span className="text-xs font-mono text-slate-500">{min2hhmm(s.weeklyMinutes)}/sem</span>
              {expanded === s.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </div>
          </div>
          {expanded === s.id && (
            <div className="px-3 pb-3 border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1">
              {s.days.map(d => (
                <div key={d.dayOfWeek} className={cn('flex items-center gap-2 text-xs', !d.isWorked && 'text-slate-400')}>
                  <span className="w-6 font-medium">{DOW[d.dayOfWeek]}</span>
                  {d.isWorked
                    ? <span className="font-mono">{d.entry1}–{d.exit1} {d.entry2 ? `/ ${d.entry2}–${d.exit2}` : ''} ({min2hhmm(d.dailyMinutes)})</span>
                    : <span>Folga</span>
                  }
                </div>
              ))}
              {s.active && (
                <button onClick={() => handleDeactivate(s.id)} className="mt-2 text-xs text-red-600 hover:underline">
                  Encerrar vigência
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── TAB PRINCIPAL ────────────────────────────────────────────────────────────

type ViewMode = 'calendar' | 'list' | 'schedule'

export default function TabPontoDiario({ memberId }: { memberId: string }) {
  const [comp, setComp] = useState(currentCompetence())
  const [days, setDays] = useState<DailyRecord[]>([])
  const [competence, setCompetenceData] = useState<MonthlyCompetence | null>(null)
  const [summary, setSummary] = useState<TimesheetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('calendar')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isClosed = competence?.status === 'FECHADA'

  const loadTimesheet = useCallback(async () => {
    setLoading(true); setError(null); setSelected(null)
    try {
      const r = await fetch(`/api/gestao-equipe/members/${memberId}/timesheet/${comp}`)
      if (r.ok) {
        const data = await r.json()
        setDays(data.days ?? [])
        setCompetenceData(data.competence ?? null)
        setSummary(data.summary ?? null)
      }
    } finally { setLoading(false) }
  }, [memberId, comp])

  useEffect(() => { loadTimesheet() }, [loadTimesheet])

  async function handleGenerate() {
    setGenerating(true); setError(null)
    try {
      const r = await fetch(`/api/gestao-equipe/members/${memberId}/timesheet/${comp}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      })
      if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
      const data = await r.json()
      setSuccess(`${data.created} dias gerados.`)
      setTimeout(() => setSuccess(null), 3000)
      await loadTimesheet()
    } catch (e: any) { setError(e.message) }
    finally { setGenerating(false) }
  }

  // ── Modal de fechamento ──────────────────────────────────────────────────────
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closePreview, setClosePreview] = useState<any>(null)
  const [closePreviewLoading, setClosePreviewLoading] = useState(false)

  async function openCloseModal() {
    setShowCloseModal(true)
    setClosePreview(null)
    setClosePreviewLoading(true)
    try {
      const r = await fetch(`/api/gestao-equipe/members/${memberId}/timesheet/${comp}/close`)
      setClosePreview(await r.json())
    } catch { setClosePreview({ criticalErrors: ['Erro ao carregar preview.'], warnings: [], canClose: false }) }
    finally { setClosePreviewLoading(false) }
  }

  async function handleClose(force = false) {
    setClosing(true); setError(null)
    try {
      const r = await fetch(`/api/gestao-equipe/members/${memberId}/timesheet/${comp}/close`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
      setShowCloseModal(false)
      setSuccess('Competência fechada! Banco de Horas atualizado automaticamente.')
      setTimeout(() => setSuccess(null), 4000)
      await loadTimesheet()
    } catch (e: any) { setError(e.message) }
    finally { setClosing(false) }
  }

  async function handleReopen() {
    if (!confirm('Reabrir competência? O lançamento no Banco de Horas será estornado.')) return
    setReopening(true); setError(null)
    try {
      const r = await fetch(`/api/gestao-equipe/members/${memberId}/timesheet/${comp}/reopen`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      })
      if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
      setSuccess('Competência reaberta.')
      setTimeout(() => setSuccess(null), 3000)
      await loadTimesheet()
    } catch (e: any) { setError(e.message) }
    finally { setReopening(false) }
  }

  async function handleSaveDay(data: Partial<DailyRecord>) {
    if (!selected) return
    const r = await fetch(
      `/api/gestao-equipe/members/${memberId}/timesheet/${comp}/days/${selected}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    )
    if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
    await loadTimesheet()
  }

  async function handleResetDay() {
    if (!selected) return
    const r = await fetch(
      `/api/gestao-equipe/members/${memberId}/timesheet/${comp}/days/${selected}`,
      { method: 'DELETE' }
    )
    if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
    await loadTimesheet()
  }

  const selectedRecord = selected ? days.find(d => d.date === selected) ?? null : null

  if (view === 'schedule') {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <button
            onClick={() => setView('calendar')}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
          >
            <ChevronLeft size={16} /> Ponto Diário
          </button>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Configurar Escala</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ScheduleConfig memberId={memberId} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {/* Navegação de competência */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setComp(prevCompetence(comp))}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[90px] text-center">
            {competenceLabel(comp)}
          </span>
          <button
            onClick={() => setComp(nextCompetence(comp))}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Status badge */}
        {competence && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full border font-medium',
            competence.status === 'FECHADA'  ? 'bg-slate-200 text-slate-600 border-slate-300' :
            competence.status === 'REABERTA' ? 'bg-orange-100 text-orange-700 border-orange-200' :
            'bg-green-100 text-green-700 border-green-200'
          )}>
            {competence.status === 'FECHADA' ? 'Fechada' : competence.status === 'REABERTA' ? 'Reaberta' : 'Aberta'}
          </span>
        )}

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
          <button
            onClick={() => setView('calendar')}
            className={cn('px-2.5 py-1 text-xs', view === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}
          ><Calendar size={13} /></button>
          <button
            onClick={() => setView('list')}
            className={cn('px-2.5 py-1 text-xs', view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}
          ><FileText size={13} /></button>
        </div>

        {/* Ações */}
        {!isClosed && (
          <button
            onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-60"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Gerar Dias
          </button>
        )}
        {!isClosed && days.length > 0 && (
          <button
            onClick={openCloseModal} disabled={closing}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded font-medium disabled:opacity-60"
          >
            {closing ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
            Fechar Mês
          </button>
        )}
        {isClosed && (
          <button
            onClick={handleReopen} disabled={reopening}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-orange-300 dark:border-orange-700 rounded text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-60"
          >
            {reopening ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
            Reabrir Mês
          </button>
        )}
        <button
          onClick={() => setView('schedule')}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          title="Configurar Escala"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Notificações */}
      {error && (
        <div className="flex items-center gap-2 mx-4 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={14} />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 mx-4 mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 size={14} />{success}
        </div>
      )}

      {/* Summary bar */}
      {summary && <MonthSummaryBar summary={summary} />}

      {/* ── Modal de Fechamento ─────────────────────────────────────── */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Fechamento do Ponto — {competenceLabel(comp)}
                </h2>
                {closePreview?.memberName && (
                  <p className="text-xs text-slate-500 mt-0.5">{closePreview.memberName}</p>
                )}
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {closePreviewLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                  <Loader2 size={20} className="animate-spin" /> Carregando resumo...
                </div>
              ) : closePreview && (
                <>
                  {/* Erros críticos */}
                  {closePreview.criticalErrors?.length > 0 && (
                    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                        <AlertCircle size={15} />
                        Esta competência possui {closePreview.criticalErrors.length} pendência(s) crítica(s)
                      </div>
                      <ul className="ml-5 space-y-0.5">
                        {closePreview.criticalErrors.map((e: string, i: number) => (
                          <li key={i} className="text-xs text-red-600 dark:text-red-400 list-disc">{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {closePreview.warnings?.length > 0 && (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                        <Info size={15} />
                        Alertas (não bloqueantes)
                      </div>
                      <ul className="ml-5 space-y-0.5">
                        {closePreview.warnings.map((w: string, i: number) => (
                          <li key={i} className="text-xs text-amber-600 dark:text-amber-400 list-disc">{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Resumo */}
                  {closePreview.summary && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        Resumo da Competência
                      </div>
                      {[
                        ['Horas Previstas',     closePreview.summary.plannedHHMM,    'text-slate-600'],
                        ['Horas Trabalhadas',   closePreview.summary.workedHHMM,     'text-emerald-600'],
                        ['Diferença Bruta',     closePreview.summary.balanceHHMM,    closePreview.summary.balanceMinutes >= 0 ? 'text-emerald-600' : 'text-red-600'],
                        ['Banco Positivo',      closePreview.summary.bankCreditHHMM, 'text-blue-600'],
                        ['Banco Negativo',      closePreview.summary.bankDebitHHMM,  'text-red-600'],
                        ['Saldo Líquido Banco', closePreview.summary.bankNetHHMM,    closePreview.summary.bankNetMinutes >= 0 ? 'text-blue-600' : 'text-red-600'],
                        ['Horas Extras',        closePreview.summary.overtimeHHMM,   'text-purple-600'],
                        ['Horas Abonadas',      closePreview.summary.abonoHHMM,      'text-green-600'],
                        ['Dias Pendentes',      String(closePreview.summary.pendingCount), closePreview.summary.pendingCount > 0 ? 'text-amber-600' : 'text-slate-500'],
                        ['Batidas Incompletas', String(closePreview.summary.incompletePunches), closePreview.summary.incompletePunches > 0 ? 'text-red-600' : 'text-slate-500'],
                        ['Justif. Pendentes',   String(closePreview.summary.pendingJustification), closePreview.summary.pendingJustification > 0 ? 'text-red-600' : 'text-slate-500'],
                      ].map(([label, val, color]) => (
                        <div key={label} className="flex items-center justify-between px-3 py-1.5 text-sm border-t border-slate-100 dark:border-slate-800 first:border-t-0">
                          <span className="text-slate-500 dark:text-slate-400">{label}</span>
                          <span className={cn('font-mono font-semibold', color)}>{val}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nota */}
                  {closePreview.canClose && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                      Ao confirmar, o Banco de Horas será atualizado automaticamente com o saldo classificado como BANCO.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-sm px-4 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              {closePreview?.canClose && (
                <button
                  onClick={() => handleClose(false)} disabled={closing}
                  className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded font-medium disabled:opacity-60"
                >
                  {closing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  Confirmar Fechamento
                </button>
              )}
              {!closePreview?.canClose && closePreview?.warnings?.length > 0 && closePreview?.criticalErrors?.length === 0 && (
                <button
                  onClick={() => handleClose(true)} disabled={closing}
                  className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium disabled:opacity-60"
                >
                  {closing ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                  Fechar mesmo assim
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : days.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Calendar size={36} strokeWidth={1.5} />
          <p className="text-sm">Nenhum dia gerado para {competenceLabel(comp)}</p>
          {!isClosed && (
            <button
              onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Gerar Dias
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Main content */}
          <div className={cn('flex-1 overflow-y-auto p-4', selectedRecord ? 'hidden md:block' : '')}>
            {view === 'calendar' ? (
              <CalendarView
                competence={comp}
                days={days}
                selected={selected}
                onSelect={date => setSelected(selected === date ? null : date)}
              />
            ) : (
              <DayList
                days={days}
                selected={selected}
                onSelect={date => setSelected(selected === date ? null : date)}
              />
            )}
          </div>

          {/* Painel lateral do dia selecionado */}
          {selectedRecord && (
            <div className={cn(
              'w-full md:w-80 border-l border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900',
              'md:relative absolute inset-0 z-10'
            )}>
              <DayForm
                key={`${selectedRecord.date}_${selectedRecord.updatedAt ?? selectedRecord.classification}`}
                record={selectedRecord}
                isClosed={isClosed || selectedRecord.status === 'FECHADO'}
                onSave={handleSaveDay}
                onReset={handleResetDay}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </div>
      )}

    </div>
  )
}
