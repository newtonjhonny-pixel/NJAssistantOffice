"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus, Loader2, ChevronDown, ChevronRight, Lock, Unlock,
  AlertTriangle, CheckCircle, Clock, RefreshCw, TrendingUp, TrendingDown, Minus,
  Save, ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface OperationalSnapshot {
  id: string; companyId: string; competence: string
  status: 'INICIAL' | 'PRE_CALCULADA' | 'EM_PREENCHIMENTO' | 'FECHADA'
  isInitialCompetence: boolean; closedAt: string | null
  // Quadro inicial
  headcountInitialActive: number | null
  headcountInitialApprentice: number | null
  headcountInitialIntern: number | null
  headcountInitialOnLeave: number | null
  // Movimentações
  admissionsClt: number; admissionsApprentice: number; admissionsIntern: number
  entriesClt: number; entriesApprentice: number; entriesIntern: number
  terminationsClt: number; terminationsApprentice: number; terminationsIntern: number
  exitsClt: number; exitsApprentice: number; exitsIntern: number
  newLeaves: number; returnFromLeave: number
  // Quadro final
  headcountFinalActive: number | null
  headcountFinalApprentice: number | null
  headcountFinalIntern: number | null
  headcountFinalOnLeave: number | null
  observations: string | null
  createdAt: string; updatedAt: string
}

interface FormState {
  // Inicial
  initActive: string; initApprentice: string; initIntern: string; initOnLeave: string
  // Admissões
  admClt: string; admAppr: string; admIntern: string
  // Entradas
  entClt: string; entAppr: string; entIntern: string
  // Rescisões
  termClt: string; termAppr: string; termIntern: string
  // Saídas
  exitClt: string; exitAppr: string; exitIntern: string
  // Afastamentos
  newLeaves: string; returnLeave: string
  observations: string
}

interface ConflictInfo {
  nextCompetence: string
  currentInitial: number | null
  expectedInitial: number
  hasMovements: boolean
  nextStatus: string
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function n(s: string): number { return s === '' ? 0 : (parseInt(s, 10) || 0) }
function ni(s: string): number | null { return s === '' ? null : (parseInt(s, 10) ?? null) }

function computeLive(f: FormState) {
  const ia  = n(f.initActive), iap = n(f.initApprentice)
  const ii  = n(f.initIntern), io  = n(f.initOnLeave)

  return {
    active:     Math.max(0, ia  + n(f.admClt)   + n(f.entClt)   - n(f.termClt)  - n(f.exitClt)  - n(f.newLeaves) + n(f.returnLeave)),
    apprentice: Math.max(0, iap + n(f.admAppr)  + n(f.entAppr)  - n(f.termAppr) - n(f.exitAppr)),
    intern:     Math.max(0, ii  + n(f.admIntern) + n(f.entIntern) - n(f.termIntern) - n(f.exitIntern)),
    onLeave:    Math.max(0, io  + n(f.newLeaves) - n(f.returnLeave)),
  }
}

function totalHeadcount(a: number | null, ap: number | null, i: number | null) {
  return (a ?? 0) + (ap ?? 0) + (i ?? 0)
}

function snapshotToForm(s: OperationalSnapshot): FormState {
  return {
    initActive:     s.headcountInitialActive?.toString()     ?? '',
    initApprentice: s.headcountInitialApprentice?.toString() ?? '',
    initIntern:     s.headcountInitialIntern?.toString()     ?? '',
    initOnLeave:    s.headcountInitialOnLeave?.toString()    ?? '',
    admClt:    s.admissionsClt.toString(),    admAppr:  s.admissionsApprentice.toString(), admIntern: s.admissionsIntern.toString(),
    entClt:    s.entriesClt.toString(),       entAppr:  s.entriesApprentice.toString(),    entIntern: s.entriesIntern.toString(),
    termClt:   s.terminationsClt.toString(),  termAppr: s.terminationsApprentice.toString(), termIntern: s.terminationsIntern.toString(),
    exitClt:   s.exitsClt.toString(),         exitAppr: s.exitsApprentice.toString(),      exitIntern: s.exitsIntern.toString(),
    newLeaves:   s.newLeaves.toString(),
    returnLeave: s.returnFromLeave.toString(),
    observations: s.observations ?? '',
  }
}

function emptyForm(initActive = '', initApprentice = '', initIntern = '', initOnLeave = ''): FormState {
  return {
    initActive, initApprentice, initIntern, initOnLeave,
    admClt: '0', admAppr: '0', admIntern: '0',
    entClt: '0', entAppr: '0', entIntern: '0',
    termClt: '0', termAppr: '0', termIntern: '0',
    exitClt: '0', exitAppr: '0', exitIntern: '0',
    newLeaves: '0', returnLeave: '0',
    observations: '',
  }
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  INICIAL:          { label: 'Inicial',          color: 'bg-slate-100 text-slate-600 border-slate-200',   icon: Clock },
  PRE_CALCULADA:    { label: 'Pré-calculada',    color: 'bg-blue-50 text-blue-600 border-blue-200',      icon: RefreshCw },
  EM_PREENCHIMENTO: { label: 'Em preenchimento', color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Unlock },
  FECHADA:          { label: 'Fechada',          color: 'bg-green-50 text-green-700 border-green-200',   icon: Lock },
}

// ─── BADGE DE STATUS ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_INFO[status] ?? { label: status, color: 'bg-slate-100 text-slate-500 border-slate-200', icon: Clock }
  const Icon = info.icon
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium", info.color)}>
      <Icon className="w-2.5 h-2.5" /> {info.label}
    </span>
  )
}

// ─── CAMPO NUMÉRICO PEQUENO ───────────────────────────────────────────────────

function NumInput({
  label, value, onChange, disabled, accent,
}: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; accent?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] text-slate-400 leading-none">{label}</label>
      <input
        type="number" min="0" step="1"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full rounded border px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors",
          disabled
            ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
            : accent
              ? `bg-white border-${accent}-200 text-${accent}-700 focus:ring-${accent}-400`
              : "bg-white border-slate-200 text-slate-700"
        )}
      />
    </div>
  )
}

// ─── PAINEL DE PRÉVIA DO SALDO FINAL ─────────────────────────────────────────

function LivePreview({ form, isClosed }: { form: FormState; isClosed: boolean }) {
  const live = computeLive(form)
  const ia  = n(form.initActive), iap = n(form.initApprentice)
  const ii  = n(form.initIntern), io  = n(form.initOnLeave)

  const totalInit  = ia + iap + ii
  const totalFinal = live.active + live.apprentice + live.intern
  const delta = totalFinal - totalInit
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const deltaColor = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-slate-400'

  const row = (label: string, init: number, final: number) => {
    const d = final - init
    return (
      <div key={label} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
        <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
        <span className="text-sm font-semibold text-slate-700 w-8 text-right">{init}</span>
        <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
        <span className={cn("text-sm font-bold w-8 text-right", d < 0 ? 'text-red-600' : d > 0 ? 'text-green-600' : 'text-slate-700')}>{final}</span>
        {d !== 0 && (
          <span className={cn("text-[10px] font-medium", d > 0 ? 'text-green-600' : 'text-red-600')}>
            {d > 0 ? `+${d}` : d}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3",
      isClosed ? "bg-green-50/60 border-green-200" : "bg-blue-50/40 border-blue-200"
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {isClosed ? 'Quadro Final (fechado)' : 'Prévia do Saldo Final'}
        </p>
        <div className={cn("flex items-center gap-1 text-xs font-bold", deltaColor)}>
          <DeltaIcon className="w-3.5 h-3.5" />
          {delta > 0 ? `+${delta}` : delta === 0 ? '±0' : delta}
        </div>
      </div>

      <div className="space-y-0">
        {row('Ativos CLT',  ia,  live.active)}
        {row('Aprendizes',  iap, live.apprentice)}
        {row('Estagiários', ii,  live.intern)}
        {row('Afastados',   io,  live.onLeave)}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
        <span className="text-xs font-semibold text-slate-500">Total (excl. afastados)</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{totalInit}</span>
          <ArrowRight className="w-3 h-3 text-slate-300" />
          <span className="text-sm font-bold text-slate-800">{totalFinal}</span>
        </div>
      </div>

      {/* Totalizadores de movimentações */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-green-600 font-semibold">+{n(form.admClt) + n(form.admAppr) + n(form.admIntern) + n(form.entClt) + n(form.entAppr) + n(form.entIntern)}</span>
          <span className="text-slate-400">entradas totais</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-600 font-semibold">-{n(form.termClt) + n(form.termAppr) + n(form.termIntern) + n(form.exitClt) + n(form.exitAppr) + n(form.exitIntern)}</span>
          <span className="text-slate-400">saídas totais</span>
        </div>
      </div>
    </div>
  )
}

// ─── FORMULÁRIO DE EDIÇÃO ─────────────────────────────────────────────────────

function CompetenceForm({
  snapshot,
  onSave,
  onClose: onCloseCompetence,
  onCancel,
}: {
  snapshot: OperationalSnapshot
  onSave: (form: FormState) => Promise<void>
  onClose: () => Promise<void>
  onCancel: () => void
}) {
  const isClosed = snapshot.status === 'FECHADA'
  const isPreCalc = snapshot.status === 'PRE_CALCULADA'
  const canEditInitial = snapshot.status === 'INICIAL' || snapshot.isInitialCompetence

  const [form, setForm] = useState<FormState>(() => snapshotToForm(snapshot))
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof FormState, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try { await onSave(form) }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar.') }
    finally { setSaving(false) }
  }

  async function handleClose() {
    setClosing(true); setError(null)
    try {
      await onSave(form)        // salva movimentações antes de fechar
      await onCloseCompetence() // depois fecha e cria próxima
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao fechar.') }
    finally { setClosing(false) }
  }

  const numCell = (label: string, key: keyof FormState, accent?: string) => (
    <NumInput label={label} value={form[key] as string}
      onChange={v => set(key, v)} disabled={isClosed} accent={accent} />
  )

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Quadro inicial */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Quadro Inicial
          {!canEditInitial && <span className="ml-2 text-blue-500 normal-case font-normal">(propagado da competência anterior)</span>}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {numCell('Ativos CLT',    'initActive',     canEditInitial ? undefined : undefined)}
          {numCell('Aprendizes',    'initApprentice')}
          {numCell('Estagiários',   'initIntern')}
          {numCell('Afastados',     'initOnLeave')}
        </div>
        {!canEditInitial && !isClosed && (
          <p className="text-[10px] text-slate-400 mt-1">
            Para alterar o quadro inicial, edite e feche a competência anterior.
          </p>
        )}
      </div>

      {/* Admissões */}
      <div>
        <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wider mb-2">+ Admissões (novas contratações)</p>
        <div className="grid grid-cols-3 gap-2">
          {numCell('CLT',        'admClt',    'green')}
          {numCell('Aprendiz',   'admAppr',   'green')}
          {numCell('Estagiário', 'admIntern', 'green')}
        </div>
      </div>

      {/* Entradas / Transferências */}
      <div>
        <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-wider mb-2">+ Entradas / Transferências recebidas</p>
        <div className="grid grid-cols-3 gap-2">
          {numCell('CLT',        'entClt',    'teal')}
          {numCell('Aprendiz',   'entAppr',   'teal')}
          {numCell('Estagiário', 'entIntern', 'teal')}
        </div>
      </div>

      {/* Rescisões */}
      <div>
        <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-2">− Rescisões</p>
        <div className="grid grid-cols-3 gap-2">
          {numCell('CLT',        'termClt',    'red')}
          {numCell('Aprendiz',   'termAppr',   'red')}
          {numCell('Estagiário', 'termIntern', 'red')}
        </div>
      </div>

      {/* Saídas */}
      <div>
        <p className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider mb-2">− Saídas / Transferências cedidas</p>
        <div className="grid grid-cols-3 gap-2">
          {numCell('CLT',        'exitClt',    'orange')}
          {numCell('Aprendiz',   'exitAppr',   'orange')}
          {numCell('Estagiário', 'exitIntern', 'orange')}
        </div>
      </div>

      {/* Afastamentos */}
      <div>
        <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider mb-2">↕ Afastamentos</p>
        <div className="grid grid-cols-2 gap-2">
          {numCell('Novos afastamentos', 'newLeaves',   'purple')}
          {numCell('Retornos',           'returnLeave', 'purple')}
        </div>
      </div>

      {/* Prévia */}
      <LivePreview form={form} isClosed={isClosed} />

      {/* Observações */}
      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Observações</label>
        <textarea
          rows={2}
          value={form.observations}
          onChange={e => set('observations', e.target.value)}
          disabled={isClosed}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none disabled:bg-slate-50 disabled:text-slate-400"
          placeholder="Observações sobre esta competência..."
        />
      </div>

      {/* Botões */}
      {!isClosed && (
        <div className="flex items-center gap-2 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </button>
          <button onClick={handleClose} disabled={closing || saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
            {closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            Fechar e criar {snapshot.competence.replace(/(\d{2})\/(\d{4})/, (_, m, y) => {
              const mm = parseInt(m), yy = parseInt(y)
              const nm = mm === 12 ? 1 : mm + 1
              const ny = mm === 12 ? yy + 1 : yy
              return `${String(nm).padStart(2, '0')}/${ny}`
            })}
          </button>
          <button onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
        </div>
      )}
      {isClosed && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">Competência fechada em {snapshot.closedAt ? new Date(snapshot.closedAt).toLocaleDateString('pt-BR') : '—'}</p>
        </div>
      )}
    </div>
  )
}

// ─── CARD DE COMPETÊNCIA ──────────────────────────────────────────────────────

function CompetenceCard({
  snapshot, selected, onClick,
}: {
  snapshot: OperationalSnapshot; selected: boolean; onClick: () => void
}) {
  const totalInit  = totalHeadcount(snapshot.headcountInitialActive, snapshot.headcountInitialApprentice, snapshot.headcountInitialIntern)
  const totalFinal = snapshot.status === 'FECHADA' && snapshot.headcountFinalActive != null
    ? totalHeadcount(snapshot.headcountFinalActive, snapshot.headcountFinalApprentice, snapshot.headcountFinalIntern)
    : null
  const delta = totalFinal != null ? totalFinal - totalInit : null

  return (
    <button onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left transition-all flex items-center gap-3",
        selected
          ? "border-blue-400 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
      )}>
      {/* Competência */}
      <div className="shrink-0 text-center">
        <p className="text-base font-bold text-slate-800 font-mono leading-none">{snapshot.competence}</p>
      </div>

      {/* Status */}
      <div className="flex-1 min-w-0">
        <StatusBadge status={snapshot.status} />
        {snapshot.isInitialCompetence && (
          <span className="ml-1.5 text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded-full font-medium">
            competência inicial
          </span>
        )}
      </div>

      {/* Totais */}
      <div className="shrink-0 text-right">
        <p className="text-xs text-slate-400 leading-none">quadro</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm font-semibold text-slate-700">{totalInit}</span>
          {totalFinal != null && (
            <>
              <ArrowRight className="w-3 h-3 text-slate-300" />
              <span className={cn("text-sm font-bold", delta! > 0 ? 'text-green-600' : delta! < 0 ? 'text-red-600' : 'text-slate-700')}>
                {totalFinal}
              </span>
              {delta !== 0 && (
                <span className={cn("text-[10px] font-medium", delta! > 0 ? 'text-green-600' : 'text-red-600')}>
                  {delta! > 0 ? `+${delta}` : delta}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {selected ? <ChevronDown className="w-4 h-4 text-blue-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
    </button>
  )
}

// ─── MODAL DE NOVA COMPETÊNCIA INICIAL ───────────────────────────────────────

function NewInitialForm({
  onSubmit, onCancel, defaultCompetence,
}: {
  onSubmit: (competence: string, initActive: string, initApprentice: string, initIntern: string, initOnLeave: string) => Promise<void>
  onCancel: () => void
  defaultCompetence: string
}) {
  const [competence, setCompetence] = useState(defaultCompetence)
  const [initActive, setInitActive] = useState('')
  const [initAppr,   setInitAppr]   = useState('')
  const [initIntern, setInitIntern] = useState('')
  const [initLeave,  setInitLeave]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle() {
    if (!/^\d{2}\/\d{4}$/.test(competence.trim())) {
      setError('Formato inválido. Use MM/YYYY.'); return
    }
    setSaving(true); setError(null)
    try { await onSubmit(competence.trim(), initActive, initAppr, initIntern, initLeave) }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro.') }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-700">Nova competência — quadro inicial</p>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="text-xs font-medium text-slate-500 block mb-1">Competência (MM/AAAA) *</label>
          <input value={competence} onChange={e => setCompetence(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="08/2026" />
        </div>
        <div className="sm:col-span-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Quadro inicial (saldo de abertura)</p>
        </div>
        {[
          { label: 'Ativos CLT', val: initActive, set: setInitActive },
          { label: 'Aprendizes', val: initAppr,   set: setInitAppr },
          { label: 'Estagiários', val: initIntern, set: setInitIntern },
          { label: 'Afastados',  val: initLeave,  set: setInitLeave },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs font-medium text-slate-500 block mb-1">{f.label}</label>
            <input type="number" min="0" value={f.val}
              onChange={e => f.set(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="0" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handle} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Criar competência inicial
        </button>
        <button onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── AVISO DE CONFLITO ────────────────────────────────────────────────────────

function ConflictBanner({
  conflict, onCascade, onDismiss,
}: {
  conflict: ConflictInfo
  onCascade: () => void
  onDismiss: () => void
}) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Edição retroativa detectada</p>
          <p className="text-xs text-amber-700 mt-0.5">
            A competência <strong>{conflict.nextCompetence}</strong> tem saldo inicial{' '}
            <strong>{conflict.currentInitial ?? '—'}</strong>, mas o novo saldo final desta competência é{' '}
            <strong>{conflict.expectedInitial}</strong>.
            {conflict.hasMovements && ' Ela já possui movimentações preenchidas.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onCascade}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors">
          <RefreshCw className="w-3 h-3" /> Recalcular cadeia a partir de {conflict.nextCompetence}
        </button>
        <button onClick={onDismiss}
          className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-100 transition-colors">
          Ignorar por ora
        </button>
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function TabOperacional({ companyId }: { companyId: string }) {
  const [snapshots, setSnapshots] = useState<OperationalSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)
  const [lastSavedId, setLastSavedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/gestao-equipe/companies/${companyId}/operational`)
      if (res.ok) setSnapshots(await res.json())
    } finally { setLoading(false) }
  }, [companyId])

  useEffect(() => { load() }, [load])

  // Seleciona automaticamente o único snapshot não fechado (ou o mais recente)
  useEffect(() => {
    if (!snapshots.length || selectedId) return
    const open = snapshots.find(s => s.status !== 'FECHADA')
    setSelectedId(open?.id ?? snapshots[snapshots.length - 1]?.id ?? null)
  }, [snapshots, selectedId])

  const selected = snapshots.find(s => s.id === selectedId) ?? null

  async function createInitial(
    competence: string,
    initActive: string, initApprentice: string, initIntern: string, initOnLeave: string
  ) {
    const res = await fetch(`/api/gestao-equipe/companies/${companyId}/operational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        competence, isInitialCompetence: true,
        headcountInitialActive:     initActive     === '' ? null : parseInt(initActive, 10),
        headcountInitialApprentice: initApprentice === '' ? null : parseInt(initApprentice, 10),
        headcountInitialIntern:     initIntern     === '' ? null : parseInt(initIntern, 10),
        headcountInitialOnLeave:    initOnLeave    === '' ? null : parseInt(initOnLeave, 10),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao criar.')
    setShowNewForm(false)
    await load()
    setSelectedId(data.id)
  }

  async function saveMovements(form: FormState) {
    if (!selected) return
    const payload = {
      headcountInitialActive:     ni(form.initActive),
      headcountInitialApprentice: ni(form.initApprentice),
      headcountInitialIntern:     ni(form.initIntern),
      headcountInitialOnLeave:    ni(form.initOnLeave),
      admissionsClt: n(form.admClt), admissionsApprentice: n(form.admAppr), admissionsIntern: n(form.admIntern),
      entriesClt: n(form.entClt), entriesApprentice: n(form.entAppr), entriesIntern: n(form.entIntern),
      terminationsClt: n(form.termClt), terminationsApprentice: n(form.termAppr), terminationsIntern: n(form.termIntern),
      exitsClt: n(form.exitClt), exitsApprentice: n(form.exitAppr), exitsIntern: n(form.exitIntern),
      newLeaves: n(form.newLeaves), returnFromLeave: n(form.returnLeave),
      observations: form.observations || null,
    }
    const res = await fetch(
      `/api/gestao-equipe/companies/${companyId}/operational/${selected.id}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar.')
    if (data.conflict) setConflict(data.conflict)
    setLastSavedId(selected.id)
    await load()
  }

  async function closeCompetence() {
    if (!selected) return
    const res = await fetch(
      `/api/gestao-equipe/companies/${companyId}/operational/${selected.id}/close`,
      { method: 'POST' }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao fechar.')
    setConflict(null)
    await load()
    // Seleciona a próxima automaticamente
    if (data.next) setSelectedId(data.next.id)
  }

  async function cascadeRecalculate() {
    if (!selected) return
    const res = await fetch(
      `/api/gestao-equipe/companies/${companyId}/operational/${selected.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cascade: true }),
      }
    )
    if (!res.ok) return
    setConflict(null)
    await load()
  }

  // Data atual para sugerir competência
  const now = new Date()
  const defaultComp = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Dados Operacionais por Competência</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Saldo Inicial + Movimentações = Saldo Final
          </p>
        </div>
        {!showNewForm && (
          <button
            onClick={() => { setShowNewForm(true); setSelectedId(null) }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova competência
          </button>
        )}
      </div>

      {/* Aviso de conflito */}
      {conflict && (
        <ConflictBanner
          conflict={conflict}
          onCascade={cascadeRecalculate}
          onDismiss={() => setConflict(null)}
        />
      )}

      {/* Formulário de nova competência inicial */}
      {showNewForm && (
        <NewInitialForm
          defaultCompetence={defaultComp}
          onSubmit={createInitial}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {/* Lista + detalhe */}
      {snapshots.length === 0 && !showNewForm ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <Database className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">Nenhuma competência registrada</p>
          <p className="text-xs text-slate-400 mb-4">Crie a competência inicial com o quadro de abertura da empresa.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Criar competência inicial
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px,1fr] lg:items-start">
          {/* Lista de competências */}
          <div className="space-y-1.5">
            {snapshots.map(s => (
              <CompetenceCard
                key={s.id}
                snapshot={s}
                selected={selectedId === s.id}
                onClick={() => { setSelectedId(s.id === selectedId ? null : s.id); setShowNewForm(false) }}
              />
            ))}
          </div>

          {/* Detalhe / Formulário */}
          {selected && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <p className="text-base font-bold text-slate-800 font-mono">{selected.competence}</p>
                <StatusBadge status={selected.status} />
                {lastSavedId === selected.id && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-green-600">
                    <CheckCircle className="w-3 h-3" /> salvo
                  </span>
                )}
              </div>
              <CompetenceForm
                key={selected.id}
                snapshot={selected}
                onSave={saveMovements}
                onClose={closeCompetence}
                onCancel={() => setSelectedId(null)}
              />
            </div>
          )}

          {/* Estado vazio no painel direito */}
          {!selected && !showNewForm && snapshots.length > 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center hidden lg:flex flex-col items-center justify-center">
              <p className="text-sm text-slate-400">Selecione uma competência para ver detalhes</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Para evitar erro de import circular no ícone Database
function Database({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.657 4.029 3 9 3s9-1.343 9-3V5" />
      <path d="M3 12c0 1.657 4.029 3 9 3s9-1.343 9-3" />
    </svg>
  )
}
