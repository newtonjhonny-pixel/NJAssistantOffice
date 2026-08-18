"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Calendar, Plus, Trash2, Edit2, Loader2, X, Save, AlertCircle,
  CheckCircle2, ChevronLeft, ChevronRight, Search, Sparkles,
  MapPin, Building2, RefreshCw, Clock, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface CalendarEntry {
  id: string
  date: string        // YYYY-MM-DD
  year: number
  description: string
  type: string
  uf: string | null
  municipio: string | null
  ibgeCode: string | null
  companyId: string | null
  unitId: string | null
  isWorked: boolean
  observations: string | null
  origin: string | null   // OFICIAL | MANUAL | EMPRESA | IMPORTADO | AJUSTE
  active: boolean
}

interface Locality {
  uf: string
  city: string | null
  ibgeCode: string | null
  companyCount: number
}

interface GerarPreview {
  year: number
  localities: Locality[]
  companiesPending: number
  pendingCompanies: Array<{ id: string; code: string | null; name: string }>
}

interface GerarResult {
  year: number
  localitiesCount: number
  companiesPending: number
  entriesCreated: number
  entriesUpdated: number
  entriesSkipped: number
  totalProcessed: number
}

const TYPE_LABELS: Record<string, string> = {
  FERIADO_NACIONAL:   'Feriado Nacional',
  FERIADO_ESTADUAL:   'Feriado Estadual',
  FERIADO_MUNICIPAL:  'Feriado Municipal',
  FERIADO_EMPRESA:    'Feriado Empresa',
  FACULTATIVO:        'Ponto Facultativo',
  SEM_EXPEDIENTE:     'Sem Expediente',
  ESPECIAL:           'Dia Especial',
}

const TYPE_COLORS: Record<string, string> = {
  FERIADO_NACIONAL:   'bg-red-100 text-red-700 border-red-200',
  FERIADO_ESTADUAL:   'bg-orange-100 text-orange-700 border-orange-200',
  FERIADO_MUNICIPAL:  'bg-amber-100 text-amber-700 border-amber-200',
  FERIADO_EMPRESA:    'bg-purple-100 text-purple-700 border-purple-200',
  FACULTATIVO:        'bg-blue-100 text-blue-700 border-blue-200',
  SEM_EXPEDIENTE:     'bg-slate-100 text-slate-600 border-slate-300',
  ESPECIAL:           'bg-green-100 text-green-700 border-green-200',
}

const ORIGIN_LABELS: Record<string, string> = {
  OFICIAL:   'Oficial',
  MANUAL:    'Manual',
  EMPRESA:   'Empresa',
  IMPORTADO: 'Importado',
  AJUSTE:    'Ajuste',
}

const ORIGIN_COLORS: Record<string, string> = {
  OFICIAL:   'bg-sky-50 text-sky-700 border-sky-200',
  MANUAL:    'bg-slate-100 text-slate-500 border-slate-300',
  EMPRESA:   'bg-purple-50 text-purple-600 border-purple-200',
  IMPORTADO: 'bg-teal-50 text-teal-700 border-teal-200',
  AJUSTE:    'bg-yellow-50 text-yellow-700 border-yellow-200',
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ─── FORMULÁRIO DE ENTRADA ────────────────────────────────────────────────────

interface EntryFormProps {
  initial?: Partial<CalendarEntry>
  onSave: (data: Partial<CalendarEntry>) => Promise<void>
  onCancel: () => void
}

function EntryForm({ initial, onSave, onCancel }: EntryFormProps) {
  const [form, setForm] = useState({
    date:        initial?.date        ?? '',
    description: initial?.description ?? '',
    type:        initial?.type        ?? 'FERIADO_NACIONAL',
    uf:          initial?.uf          ?? '',
    municipio:   initial?.municipio   ?? '',
    ibgeCode:    initial?.ibgeCode    ?? '',
    origin:      initial?.origin      ?? 'MANUAL',
    isWorked:    initial?.isWorked    ?? false,
    observations: initial?.observations ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const needsUF = form.type === 'FERIADO_ESTADUAL' || form.type === 'FERIADO_MUNICIPAL'
  const needsMun = form.type === 'FERIADO_MUNICIPAL'

  async function handleSave() {
    if (!form.date || !form.description || !form.type) {
      setError('Data, descrição e tipo são obrigatórios.'); return
    }
    setSaving(true); setError(null)
    try {
      await onSave({
        date:        form.date,
        description: form.description.trim(),
        type:        form.type,
        uf:          form.uf.trim()        || undefined,
        municipio:   form.municipio.trim() || undefined,
        ibgeCode:    form.ibgeCode.trim()  || undefined,
        origin:      form.origin || 'MANUAL',
        isWorked:    form.isWorked,
        observations: form.observations.trim() || undefined,
      })
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const IC = "w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Data *</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={IC} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className={IC}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Descrição *</label>
        <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Ex: Natal, Tiradentes, Aniversário da Cidade..." className={IC} />
      </div>

      {needsUF && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">UF</label>
            <select value={form.uf} onChange={e => set('uf', e.target.value)} className={IC}>
              <option value="">Todas</option>
              {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {needsMun && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Município</label>
              <input type="text" value={form.municipio} onChange={e => set('municipio', e.target.value)}
                placeholder="São Paulo" className={IC} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Origem</label>
          <select value={form.origin} onChange={e => set('origin', e.target.value)} className={IC}>
            <option value="MANUAL">Manual</option>
            <option value="OFICIAL">Oficial</option>
            <option value="EMPRESA">Empresa</option>
            <option value="IMPORTADO">Importado</option>
            <option value="AJUSTE">Ajuste</option>
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" checked={form.isWorked} onChange={e => set('isWorked', e.target.checked)} className="rounded" />
            Feriado trabalhado
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Observações</label>
        <textarea rows={2} value={form.observations} onChange={e => set('observations', e.target.value)}
          className={cn(IC, "resize-none")} />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-60 flex items-center justify-center gap-1.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar
        </button>
      </div>
    </div>
  )
}

// ─── MODAL: GERAR CALENDÁRIO ─────────────────────────────────────────────────

function GerarCalendarioModal({
  year,
  onClose,
  onSuccess,
}: { year: number; onClose: () => void; onSuccess: (result: GerarResult) => void }) {
  const [selectedYear, setSelectedYear] = useState(year)
  const [step, setStep] = useState<'select' | 'preview' | 'generating' | 'done'>('select')
  const [preview, setPreview] = useState<GerarPreview | null>(null)
  const [result, setResult] = useState<GerarResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadPreview() {
    setError(null)
    setStep('preview')
    try {
      const r = await fetch(`/api/gestao-equipe/work-calendar/gerar?year=${selectedYear}`)
      if (!r.ok) throw new Error((await r.json()).error)
      setPreview(await r.json())
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar preview')
      setStep('select')
    }
  }

  async function gerar() {
    setStep('generating')
    setError(null)
    try {
      const r = await fetch('/api/gestao-equipe/work-calendar/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, generatedBy: 'usuario' }),
      })
      if (!r.ok) throw new Error((await r.json()).error)
      const res = await r.json()
      setResult(res)
      setStep('done')
      onSuccess(res)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao gerar calendário')
      setStep('preview')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Gerar Calendário de Feriados</h2>
            <p className="text-xs text-slate-400">Preenche automaticamente com feriados das localidades das empresas</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-700 dark:text-red-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />{error}
            </div>
          )}

          {/* Step: Seleção do ano */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Ano de referência</label>
                <div className="flex items-center gap-2">
                  {[-1, 0, 1, 2].map(offset => {
                    const y = new Date().getFullYear() + offset
                    return (
                      <button key={y} onClick={() => setSelectedYear(y)}
                        className={cn(
                          "flex-1 py-2.5 text-sm rounded-lg border font-medium transition-colors",
                          selectedYear === y
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400"
                        )}>
                        {y}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-medium text-slate-700 dark:text-slate-300">O que será gerado:</p>
                <p>✅ Feriados nacionais brasileiros (via BrasilAPI)</p>
                <p>✅ Feriados estaduais de cada UF das empresas</p>
                <p>✅ Feriados municipais das cidades das empresas</p>
                <p>🔒 Entradas manuais existentes serão preservadas</p>
                <p>♻️ Entradas oficiais existentes serão atualizadas</p>
              </div>

              <button onClick={loadPreview}
                className="w-full py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                <MapPin size={14} /> Ver localidades →
              </button>
            </div>
          )}

          {/* Step: Preview de localidades */}
          {step === 'preview' && preview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Localidades encontradas — {selectedYear}
                </p>
                <button onClick={() => setStep('select')} className="text-xs text-slate-400 hover:text-slate-600">
                  ← Voltar
                </button>
              </div>

              {preview.localities.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma empresa com endereço cadastrado.</p>
                  <p className="text-xs mt-1">Cadastre o município e UF nas empresas para gerar o calendário.</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {preview.localities.map((loc, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <span className="text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                        {loc.uf}
                      </span>
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                        {loc.city ?? '(sem cidade)'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Building2 size={10} /> {loc.companyCount} empresa{loc.companyCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {preview.companiesPending > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{preview.companiesPending} empresa(s) sem endereço completo</p>
                    <p className="text-amber-600 mt-0.5">Estas não terão feriados municipais/estaduais gerados. Cadastre a UF e Município em cada uma.</p>
                  </div>
                </div>
              )}

              {preview.localities.length > 0 && (
                <button onClick={gerar}
                  className="w-full py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                  <Sparkles size={14} /> Gerar calendário de {selectedYear}
                </button>
              )}
            </div>
          )}

          {/* Step: Gerando */}
          {step === 'generating' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Gerando feriados para {selectedYear}…</p>
              <p className="text-xs text-slate-400">Consultando BrasilAPI e dados curados…</p>
            </div>
          )}

          {/* Step: Resultado */}
          {step === 'done' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 size={20} />
                <p className="text-sm font-semibold">Calendário {result.year} gerado com sucesso!</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Localidades', value: result.localitiesCount, color: 'text-blue-700' },
                  { label: 'Criados',     value: result.entriesCreated,  color: 'text-green-700' },
                  { label: 'Atualizados', value: result.entriesUpdated,  color: 'text-amber-700' },
                  { label: 'Preservados', value: result.entriesSkipped,  color: 'text-slate-500' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                    <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {result.companiesPending > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {result.companiesPending} empresa(s) sem endereço não tiveram feriados gerados.
                </p>
              )}

              <button onClick={onClose}
                className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                Fechar e ver calendário
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── VISUALIZAÇÃO DE CALENDÁRIO POR MÊS ──────────────────────────────────────

function MonthCalendar({ year, month, entries }: {
  year: number; month: number; entries: CalendarEntry[]
}) {
  const firstDow = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()

  const dayMap = new Map<number, CalendarEntry>()
  for (const e of entries) {
    const [, m, d] = e.date.split('-').map(Number)
    if (m === month + 1) dayMap.set(d, e)
  }

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1)
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-slate-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const entry = dayMap.get(day)
          const isSun = new Date(year, month, day).getDay() === 0
          const isSat = new Date(year, month, day).getDay() === 6
          return (
            <div key={i}
              title={entry ? `${entry.description} (${TYPE_LABELS[entry.type]})` : undefined}
              className={cn(
                'flex items-center justify-center text-[11px] rounded h-7 font-medium cursor-default',
                entry
                  ? `${TYPE_COLORS[entry.type] ?? 'bg-slate-100 text-slate-600'} border`
                  : isSun || isSat ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'
              )}>
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function WorkCalendarManager() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CalendarEntry | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterUF, setFilterUF] = useState('')
  const [filterOrigin, setFilterOrigin] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showGerar, setShowGerar] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year: String(year) })
      if (filterUF)     params.set('uf', filterUF)
      if (filterOrigin) params.set('origin', filterOrigin)
      const r = await fetch(`/api/gestao-equipe/work-calendar?${params}`)
      if (r.ok) setEntries(await r.json())
    } finally { setLoading(false) }
  }, [year, filterUF, filterOrigin])

  useEffect(() => { load() }, [load])

  async function handleCreate(data: Partial<CalendarEntry>) {
    const r = await fetch('/api/gestao-equipe/work-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
    setCreating(false)
    showSuccess('Entrada criada!')
    load()
  }

  async function handleEdit(id: string, data: Partial<CalendarEntry>) {
    const r = await fetch(`/api/gestao-equipe/work-calendar/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
    setEditing(null)
    showSuccess('Entrada atualizada!')
    load()
  }

  async function handleDelete(id: string, desc: string) {
    if (!confirm(`Excluir "${desc}"?`)) return
    const r = await fetch(`/api/gestao-equipe/work-calendar/${id}`, { method: 'DELETE' })
    if (!r.ok) { setError('Erro ao excluir.'); return }
    showSuccess('Excluído!')
    load()
  }

  function showSuccess(msg: string) {
    setSuccess(msg); setTimeout(() => setSuccess(null), 4000)
  }

  // Filtragem local (além dos filtros via API)
  const filtered = entries.filter(e => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase())
      || (e.uf ?? '').toLowerCase().includes(search.toLowerCase())
      || (e.municipio ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || e.type === filterType
    return matchSearch && matchType
  })

  // Agrupamento por mês para visão lista
  const byMonth: Map<number, CalendarEntry[]> = new Map()
  for (const e of filtered) {
    const m = Number(e.date.split('-')[1])
    if (!byMonth.has(m)) byMonth.set(m, [])
    byMonth.get(m)!.push(e)
  }

  const hasActiveFilters = !!(filterUF || filterOrigin || filterType || search)

  return (
    <div className="flex flex-col gap-4">
      {/* Modal Gerar */}
      {showGerar && (
        <GerarCalendarioModal
          year={year}
          onClose={() => setShowGerar(false)}
          onSuccess={(result) => {
            showSuccess(`Calendário ${result.year} gerado: ${result.entriesCreated} criados, ${result.entriesUpdated} atualizados`)
            load()
          }}
        />
      )}

      {/* Header linha 1: ano + busca + tipo + vista */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <ChevronLeft size={16} />
          </button>
          <span className="text-lg font-bold text-slate-700 dark:text-slate-200 min-w-[52px] text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
        </div>

        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
          {(['list','calendar'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={cn('px-3 py-1.5 text-xs', viewMode === m ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}>
              {m === 'list' ? 'Lista' : 'Calendário'}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Ações */}
        <button onClick={() => setShowGerar(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium">
          <Sparkles size={14} /> Gerar Calendário
        </button>

        <button onClick={() => { setCreating(true); setEditing(null) }}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">
          <Plus size={14} /> Nova Entrada
        </button>
      </div>

      {/* Header linha 2: filtros de UF e Origem */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <MapPin size={12} /> Filtrar:
        </div>

        <select value={filterUF} onChange={e => setFilterUF(e.target.value)}
          className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <option value="">Todas as UFs</option>
          {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterOrigin} onChange={e => setFilterOrigin(e.target.value)}
          className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <option value="">Todas as origens</option>
          {Object.entries(ORIGIN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        {hasActiveFilters && (
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterUF(''); setFilterOrigin('') }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
            <X size={10} /> Limpar filtros
          </button>
        )}

        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} entrada{filtered.length !== 1 ? 's' : ''}
          {hasActiveFilters ? ' (filtrado)' : ''}
        </span>
      </div>

      {/* Notificações */}
      {success && (
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 size={14} />{success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={14} />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Formulário de criação */}
      {creating && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-blue-50/40 dark:bg-blue-900/10">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Nova Entrada de Calendário</h3>
          <EntryForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {/* Formulário de edição */}
      {editing && (
        <div className="border border-amber-200 dark:border-amber-800 rounded-xl p-4 bg-amber-50/40 dark:bg-amber-900/10">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Editar: {editing.description}</h3>
          <EntryForm initial={editing} onSave={data => handleEdit(editing.id, data)} onCancel={() => setEditing(null)} />
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Carregando...
        </div>
      ) : viewMode === 'calendar' ? (
        /* Visão calendário: grade 4×3 */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MONTHS.map((mon, mi) => (
            <div key={mi} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 text-center uppercase tracking-wide">
                {MONTHS_FULL[mi]}
              </div>
              <MonthCalendar year={year} month={mi} entries={entries} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Calendar size={36} strokeWidth={1.5} />
          <p className="text-sm">Nenhuma entrada para {year}{filterType ? ` do tipo "${TYPE_LABELS[filterType]}"` : ''}</p>
          {!hasActiveFilters && (
            <button onClick={() => setShowGerar(true)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
              <Sparkles size={14} /> Gerar calendário automático
            </button>
          )}
        </div>
      ) : (
        /* Visão lista agrupada por mês */
        <div className="space-y-6">
          {Array.from({ length: 12 }, (_, mi) => mi + 1).map(m => {
            const monthEntries = byMonth.get(m)
            if (!monthEntries?.length) return null
            return (
              <div key={m}>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span>{MONTHS_FULL[m - 1]}</span>
                  <span className="text-slate-300 dark:text-slate-600">({monthEntries.length})</span>
                </h3>
                <div className="space-y-1.5">
                  {monthEntries.map(e => (
                    <div key={e.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                      {/* Data */}
                      <div className="text-center min-w-[42px]">
                        <div className="text-xs text-slate-400">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(e.date + 'T12:00').getDay()]}</div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{e.date.split('-')[2]}</div>
                      </div>

                      {/* Tipo badge */}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0', TYPE_COLORS[e.type] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                        {TYPE_LABELS[e.type] ?? e.type}
                      </span>

                      {/* Descrição */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{e.description}</div>
                        {(e.uf || e.municipio) && (
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin size={10} />
                            {[e.municipio, e.uf].filter(Boolean).join(' – ')}
                          </div>
                        )}
                      </div>

                      {/* Origem badge */}
                      {e.origin && e.origin !== 'MANUAL' && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border shrink-0', ORIGIN_COLORS[e.origin] ?? '')}>
                          {ORIGIN_LABELS[e.origin] ?? e.origin}
                        </span>
                      )}

                      {e.isWorked && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded shrink-0">
                          Trabalhado
                        </span>
                      )}

                      {/* Ações */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditing(e); setCreating(false) }}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(e.id, e.description)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legenda */}
      {!loading && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <span key={type} className={cn('text-[10px] px-1.5 py-0.5 rounded border', TYPE_COLORS[type])}>
              {label}
            </span>
          ))}
          <span className="mx-2 text-slate-200 dark:text-slate-700">|</span>
          {Object.entries(ORIGIN_LABELS).map(([orig, label]) => (
            <span key={orig} className={cn('text-[10px] px-1.5 py-0.5 rounded border', ORIGIN_COLORS[orig] ?? '')}>
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
