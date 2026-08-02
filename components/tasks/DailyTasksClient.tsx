"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2,
  CheckCircle2, Circle, Clock, AlertTriangle, MoreVertical,
  Trash2, Edit2, FileDown, Printer, RefreshCw, X, Save,
  ClipboardList, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyTask {
  id: string
  date: string
  responsible: string | null
  title: string | null
  objective: string | null
  status: string
  initialNotes: string | null
  finalNotes: string | null
  summary: string | null
  completionPct: number
  createdAt: string
  updatedAt: string
  items: DailyTaskItem[]
  _stats?: TaskStats
}

interface DailyTaskItem {
  id: string
  dailyTaskId: string
  order: number
  title: string
  description: string | null
  category: string | null
  priority: string
  status: string
  plannedTime: string | null
  responsible: string | null
  notes: string | null
  required: boolean
  origin: string | null
}

interface TaskStats {
  total: number
  done: number
  cancelled: number
  pending: number
  inProgress: number
  postponed: number
  notDone: number
  completionPct: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  PENDENTE:      { label: 'Pendente',       color: 'text-slate-400',  icon: Circle        },
  EM_ANDAMENTO:  { label: 'Em andamento',   color: 'text-blue-500',   icon: Clock         },
  CONCLUIDO:     { label: 'Concluído',      color: 'text-green-500',  icon: CheckCircle2  },
  NAO_REALIZADO: { label: 'Não realizado',  color: 'text-red-500',    icon: AlertTriangle },
  ADIADO:        { label: 'Adiado',         color: 'text-amber-500',  icon: AlertTriangle },
  CANCELADO:     { label: 'Cancelado',      color: 'text-slate-300',  icon: X             },
}

const ITEM_STATUS_CYCLE: Record<string, string> = {
  PENDENTE:      'EM_ANDAMENTO',
  EM_ANDAMENTO:  'CONCLUIDO',
  CONCLUIDO:     'PENDENTE',
  NAO_REALIZADO: 'PENDENTE',
  ADIADO:        'PENDENTE',
  CANCELADO:     'PENDENTE',
}

const PRIORITY_CFG: Record<string, { label: string; cls: string }> = {
  BAIXA:   { label: 'Baixa',   cls: 'bg-slate-100 text-slate-500' },
  MEDIA:   { label: 'Média',   cls: 'bg-blue-100 text-blue-600'   },
  ALTA:    { label: 'Alta',    cls: 'bg-amber-100 text-amber-700' },
  URGENTE: { label: 'Urgente', cls: 'bg-red-100 text-red-600'     },
}

const TASK_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ABERTO:       { label: 'Aberto',       cls: 'bg-slate-100 text-slate-600'  },
  EM_ANDAMENTO: { label: 'Em andamento', cls: 'bg-blue-100 text-blue-700'    },
  CONCLUIDO:    { label: 'Concluído',    cls: 'bg-green-100 text-green-700'  },
  ENCERRADO:    { label: 'Encerrado',    cls: 'bg-purple-100 text-purple-700'},
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const labelCls = "block text-xs font-medium text-slate-500 mb-1"

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDateBR(s: string): string {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function addDays(s: string, n: number): string {
  const d = parseDateLocal(s)
  d.setDate(d.getDate() + n)
  return dateStr(d)
}

// ─── Modal overlay ────────────────────────────────────────────────────────────

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}

function Modal({ title, onClose, children, wide }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 sm:p-8"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn(
          "relative w-full rounded-2xl bg-white shadow-2xl",
          wide ? "max-w-2xl" : "max-w-lg"
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Item form (inline) ───────────────────────────────────────────────────────

interface ItemFormData {
  title: string
  description: string
  category: string
  priority: string
  plannedTime: string
  responsible: string
  notes: string
  required: boolean
}

const emptyItemForm = (): ItemFormData => ({
  title: '', description: '', category: '', priority: 'MEDIA',
  plannedTime: '', responsible: '', notes: '', required: false,
})

interface ItemFormProps {
  dailyTaskId: string
  initial?: Partial<DailyTaskItem>
  onSaved: (item: DailyTaskItem) => void
  onCancel: () => void
}

function ItemForm({ dailyTaskId, initial, onSaved, onCancel }: ItemFormProps) {
  const isEdit = Boolean(initial?.id)
  const [form, setForm] = useState<ItemFormData>({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    category:    initial?.category    ?? '',
    priority:    initial?.priority    ?? 'MEDIA',
    plannedTime: initial?.plannedTime ?? '',
    responsible: initial?.responsible ?? '',
    notes:       initial?.notes       ?? '',
    required:    initial?.required    ?? false,
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const titleRef              = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  function setField<K extends keyof ItemFormData>(k: K, v: ItemFormData[K]) {
    setForm(p => ({ ...p, [k]: v }))
    setError('')
  }

  async function submit() {
    if (!form.title.trim()) { setError('O título da atividade é obrigatório.'); return }
    setSaving(true)
    setError('')
    try {
      const url    = isEdit
        ? `/api/daily-tasks/${dailyTaskId}/items/${initial!.id}`
        : `/api/daily-tasks/${dailyTaskId}/items`
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, required: form.required }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Erro HTTP ${res.status}`)
      }
      onSaved(await res.json())
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-700">{isEdit ? 'Editar atividade' : 'Nova atividade'}</p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Atividade *</label>
          <input
            ref={titleRef}
            type="text"
            value={form.title}
            onChange={e => setField('title', e.target.value)}
            className={inputCls}
            placeholder="Descreva a atividade..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Descrição</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            className={inputCls}
            placeholder="Detalhe opcional..."
          />
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <input
            type="text"
            value={form.category}
            onChange={e => setField('category', e.target.value)}
            className={inputCls}
            placeholder="Ex: Folha, Admissão..."
          />
        </div>
        <div>
          <label className={labelCls}>Prioridade</label>
          <select value={form.priority} onChange={e => setField('priority', e.target.value)} className={inputCls}>
            {Object.entries(PRIORITY_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Horário previsto</label>
          <input
            type="time"
            value={form.plannedTime}
            onChange={e => setField('plannedTime', e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Responsável</label>
          <input
            type="text"
            value={form.responsible}
            onChange={e => setField('responsible', e.target.value)}
            className={inputCls}
            placeholder="Nome..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Observação</label>
          <textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="Opcional..."
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id={`req-${initial?.id ?? 'new'}`}
            checked={form.required}
            onChange={e => setField('required', e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor={`req-${initial?.id ?? 'new'}`} className="text-sm text-slate-600">
            Item obrigatório
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isEdit ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </div>
  )
}

// ─── Create Daily Task Modal ──────────────────────────────────────────────────

interface CreateDailyTaskModalProps {
  date: string
  onCreated: (dt: DailyTask) => void
  onClose: () => void
}

function CreateDailyTaskModal({ date, onCreated, onClose }: CreateDailyTaskModalProps) {
  const [form, setForm] = useState({
    date,
    responsible: '',
    title: '',
    objective: '',
    initialNotes: '',
  })
  const [items, setItems]       = useState<ItemFormData[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [showItemAdd, setShowItemAdd] = useState(false)
  const [editingIdx, setEditingIdx]   = useState<number | null>(null)

  function setField(k: string, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    setError('')
  }

  function addItem(item: ItemFormData) {
    setItems(p => [...p, item])
    setShowItemAdd(false)
  }

  function updateItem(idx: number, item: ItemFormData) {
    setItems(p => p.map((it, i) => i === idx ? item : it))
    setEditingIdx(null)
  }

  function removeItem(idx: number) {
    setItems(p => p.filter((_, i) => i !== idx))
  }

  async function submit() {
    if (!form.date) { setError('A data é obrigatória.'); return }
    setSaving(true)
    setError('')
    try {
      // 1. Create the DailyTask header
      const res = await fetch('/api/daily-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date:          form.date,
          responsible:   form.responsible || null,
          title:         form.title       || null,
          objective:     form.objective   || null,
          initialNotes:  form.initialNotes || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Erro HTTP ${res.status}`)
      }
      const created: DailyTask = await res.json()

      // 2. Create items sequentially
      for (const item of items) {
        const itemRes = await fetch(`/api/daily-tasks/${created.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, required: item.required }),
        })
        if (!itemRes.ok) {
          // Non-fatal — item creation failure doesn't abort the whole operation
          console.warn('[daily-task] item POST failed:', await itemRes.text())
        }
      }

      // 3. Load full detail (with items + stats)
      const detRes = await fetch(`/api/daily-tasks/${created.id}`)
      const detail: DailyTask = detRes.ok ? await detRes.json() : created

      onCreated(detail)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao criar tarefa diária.')
    } finally {
      setSaving(false)
    }
  }

  const hasUnsaved = form.title || form.responsible || form.objective || form.initialNotes || items.length > 0

  function handleClose() {
    if (hasUnsaved && !confirm('Descartar as alterações?')) return
    onClose()
  }

  return (
    <Modal title="Nova Tarefa Diária" onClose={handleClose} wide>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button type="button" onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="space-y-4">
        {/* Header fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Data *</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setField('date', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Responsável</label>
            <input
              type="text"
              value={form.responsible}
              onChange={e => setField('responsible', e.target.value)}
              className={inputCls}
              placeholder="Nome..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Título do dia</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              className={inputCls}
              placeholder="Ex: Fechamento de folha — Ago/26"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Objetivo do dia</label>
            <textarea
              value={form.objective}
              onChange={e => setField('objective', e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="O que precisa ser entregue hoje..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Observações iniciais</label>
            <textarea
              value={form.initialNotes}
              onChange={e => setField('initialNotes', e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Contexto, pendências de ontem..."
            />
          </div>
        </div>

        {/* Items / checklist */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-blue-500" />
              Atividades ({items.length})
            </p>
            {!showItemAdd && editingIdx === null && (
              <button
                type="button"
                onClick={() => setShowItemAdd(true)}
                className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                <Plus className="w-3 h-3" /> Adicionar atividade
              </button>
            )}
          </div>

          {/* Inline add form */}
          {showItemAdd && (
            <InlineItemEditor
              onSave={addItem}
              onCancel={() => setShowItemAdd(false)}
            />
          )}

          {/* Items list */}
          {items.length === 0 && !showItemAdd && (
            <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center">
              <p className="text-sm text-slate-400">Nenhuma atividade adicionada.</p>
              <button
                type="button"
                onClick={() => setShowItemAdd(true)}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                + Adicionar primeira atividade
              </button>
            </div>
          )}

          <div className="space-y-1.5 mt-1">
            {items.map((item, idx) =>
              editingIdx === idx ? (
                <InlineItemEditor
                  key={idx}
                  initial={item}
                  onSave={updated => updateItem(idx, updated)}
                  onCancel={() => setEditingIdx(null)}
                />
              ) : (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 group"
                >
                  <Circle className="w-4 h-4 mt-0.5 shrink-0 text-slate-300" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-800 font-medium">{item.title}</span>
                    {item.required && <span className="ml-1 text-red-500 text-xs">*</span>}
                    {item.description && (
                      <p className="text-xs text-slate-400 truncate">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-0.5">
                      {item.category && (
                        <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">{item.category}</span>
                      )}
                      {item.plannedTime && (
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />{item.plannedTime}
                        </span>
                      )}
                      <span className={cn("text-[10px] rounded-full px-1.5 py-0.5 font-semibold", PRIORITY_CFG[item.priority]?.cls ?? '')}>
                        {PRIORITY_CFG[item.priority]?.label ?? item.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button type="button" onClick={() => setEditingIdx(idx)} className="rounded p-1 hover:bg-slate-100 text-slate-400">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => removeItem(idx)} className="rounded p-1 hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !form.date}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Salvar</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Inline Item Editor (used inside create modal) ────────────────────────────

interface InlineItemEditorProps {
  initial?: ItemFormData
  onSave: (item: ItemFormData) => void
  onCancel: () => void
}

function InlineItemEditor({ initial, onSave, onCancel }: InlineItemEditorProps) {
  const [form, setForm] = useState<ItemFormData>(initial ?? emptyItemForm())
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  function setField<K extends keyof ItemFormData>(k: K, v: ItemFormData[K]) {
    setForm(p => ({ ...p, [k]: v }))
    setError('')
  }

  function save() {
    if (!form.title.trim()) { setError('Título obrigatório'); return }
    onSave(form)
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2 mb-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        ref={titleRef}
        type="text"
        value={form.title}
        onChange={e => setField('title', e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } if (e.key === 'Escape') onCancel() }}
        className={inputCls}
        placeholder="Título da atividade *"
      />
      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={form.category} onChange={e => setField('category', e.target.value)} className={inputCls} placeholder="Categoria" />
        <select value={form.priority} onChange={e => setField('priority', e.target.value)} className={inputCls}>
          {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input type="time" value={form.plannedTime} onChange={e => setField('plannedTime', e.target.value)} className={inputCls} />
        <input type="text" value={form.responsible} onChange={e => setField('responsible', e.target.value)} className={inputCls} placeholder="Responsável" />
      </div>
      <input type="text" value={form.description} onChange={e => setField('description', e.target.value)} className={inputCls} placeholder="Descrição (opcional)" />
      <div className="flex items-center gap-2">
        <input type="checkbox" id="req-inline" checked={form.required} onChange={e => setField('required', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
        <label htmlFor="req-inline" className="text-xs text-slate-600">Obrigatório</label>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button type="button" onClick={save} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          {initial ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
      <div className={cn("h-2 rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: DailyTaskItem
  dailyTaskId: string
  onToggle: (item: DailyTaskItem) => void
  onEdit: (item: DailyTaskItem) => void
  onDelete: (id: string) => void
}

function ItemRow({ item, dailyTaskId, onToggle, onEdit, onDelete }: ItemRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cfg      = STATUS_CFG[item.status] ?? STATUS_CFG.PENDENTE
  const Icon     = cfg.icon
  const prioCfg  = PRIORITY_CFG[item.priority] ?? PRIORITY_CFG.MEDIA

  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-all",
      item.status === 'CONCLUIDO'
        ? "border-green-100 bg-green-50/50"
        : item.status === 'CANCELADO'
        ? "border-slate-100 bg-slate-50/50 opacity-60"
        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/20"
    )}>
      <button
        type="button"
        onClick={() => onToggle(item)}
        className={cn("mt-0.5 shrink-0 transition-colors hover:scale-110", cfg.color)}
        title="Avançar status"
      >
        <Icon className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className={cn(
            "text-sm font-medium flex-1",
            item.status === 'CONCLUIDO' ? "line-through text-slate-400" : "text-slate-800"
          )}>
            {item.title}
            {item.required && <span className="ml-1 text-red-500">*</span>}
          </span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", prioCfg.cls)}>
            {prioCfg.label}
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-1">
          {item.category && (
            <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">{item.category}</span>
          )}
          {item.plannedTime && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <Clock className="w-3 h-3" />{item.plannedTime}
            </span>
          )}
          {item.responsible && (
            <span className="text-[10px] text-slate-400">{item.responsible}</span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-slate-400 mt-0.5 italic">{item.notes}</p>
        )}
      </div>

      <span className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium hidden sm:inline-block",
        cfg.color
      )}>
        {cfg.label}
      </span>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen(p => !p)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-6 z-20 w-40 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
            <button type="button" onClick={() => { onEdit(item); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
            <button type="button" onClick={() => { onDelete(item.id); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Day Detail ───────────────────────────────────────────────────────────────

interface DayDetailProps {
  dt: DailyTask
  onUpdated: (dt: DailyTask) => void
  onDeleted: () => void
}

function DayDetail({ dt, onUpdated, onDeleted }: DayDetailProps) {
  const [items, setItems]             = useState<DailyTaskItem[]>(dt.items ?? [])
  const [stats, setStats]             = useState<TaskStats | null>(dt._stats ?? null)
  const [showItemForm, setShowItemForm]   = useState(false)
  const [editingItem, setEditingItem]     = useState<DailyTaskItem | null>(null)
  const [editingDt, setEditingDt]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const [markAllLoading, setMarkAllLoading] = useState(false)
  const [showSummary, setShowSummary]     = useState(false)
  const [dtForm, setDtForm]               = useState({
    title:        dt.title        ?? '',
    objective:    dt.objective    ?? '',
    responsible:  dt.responsible  ?? '',
    status:       dt.status,
    initialNotes: dt.initialNotes ?? '',
    finalNotes:   dt.finalNotes   ?? '',
    summary:      dt.summary      ?? '',
  })

  async function reload() {
    const res = await fetch(`/api/daily-tasks/${dt.id}`)
    if (res.ok) {
      const data: DailyTask = await res.json()
      setItems(data.items ?? [])
      setStats(data._stats ?? null)
      onUpdated(data)
    }
  }

  async function toggleItem(item: DailyTaskItem) {
    const nextStatus = ITEM_STATUS_CYCLE[item.status] ?? 'PENDENTE'
    const res = await fetch(`/api/daily-tasks/${dt.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    if (res.ok) {
      const updated: DailyTaskItem = await res.json()
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      await reload()
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Excluir este item?')) return
    await fetch(`/api/daily-tasks/${dt.id}/items/${itemId}`, { method: 'DELETE' })
    await reload()
  }

  async function markAllDone() {
    if (!confirm('Marcar todos os itens pendentes como concluídos?')) return
    setMarkAllLoading(true)
    const pending = items.filter(i => ['PENDENTE', 'EM_ANDAMENTO'].includes(i.status))
    await Promise.all(
      pending.map(i =>
        fetch(`/api/daily-tasks/${dt.id}/items/${i.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CONCLUIDO' }),
        })
      )
    )
    setMarkAllLoading(false)
    await reload()
  }

  async function saveDt() {
    setSaving(true)
    const res = await fetch(`/api/daily-tasks/${dt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dtForm),
    })
    setSaving(false)
    if (res.ok) {
      setEditingDt(false)
      onUpdated({ ...dt, ...dtForm })
    }
  }

  async function handleDelete() {
    if (!confirm('Excluir esta tarefa diária e todas as atividades?')) return
    await fetch(`/api/daily-tasks/${dt.id}`, { method: 'DELETE' })
    onDeleted()
  }

  function downloadReport(format: 'pdf' | 'xlsx') {
    const a = document.createElement('a')
    a.href = `/api/daily-tasks/${dt.id}/report?format=${format}`
    a.download = `Tarefa_Diaria_${dt.date}.${format}`
    a.click()
  }

  const pct   = stats?.completionPct ?? dt.completionPct ?? 0
  const tsCfg = TASK_STATUS_CFG[dt.status] ?? TASK_STATUS_CFG.ABERTO

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tsCfg.cls)}>
                {tsCfg.label}
              </span>
              {dt.title && (
                <h2 className="text-base font-bold text-slate-800 truncate">{dt.title}</h2>
              )}
            </div>
            {dt.objective && (
              <p className="text-sm text-slate-500 mt-1">{dt.objective}</p>
            )}
            {dt.responsible && (
              <p className="text-xs text-slate-400 mt-0.5">Responsável: {dt.responsible}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={() => setEditingDt(p => !p)} title="Editar"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Edit2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => downloadReport('pdf')} title="Exportar PDF"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <FileDown className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => downloadReport('xlsx')} title="Exportar Excel"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <FileDown className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => window.print()} title="Imprimir"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Printer className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleDelete} title="Excluir"
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{stats?.done ?? 0} de {stats?.total ?? 0} concluídos</span>
            <span className="font-semibold text-slate-700">{pct}%</span>
          </div>
          <ProgressBar pct={pct} />
          {stats && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-1">
              {stats.pending    > 0 && <span className="text-slate-500">{stats.pending} pendente{stats.pending > 1 ? 's' : ''}</span>}
              {stats.inProgress > 0 && <span className="text-blue-500">{stats.inProgress} em andamento</span>}
              {stats.postponed  > 0 && <span className="text-amber-500">{stats.postponed} adiado{stats.postponed > 1 ? 's' : ''}</span>}
              {stats.notDone    > 0 && <span className="text-red-500">{stats.notDone} não realizado{stats.notDone > 1 ? 's' : ''}</span>}
              {stats.cancelled  > 0 && <span>{stats.cancelled} cancelado{stats.cancelled > 1 ? 's' : ''}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Edit header form */}
      {editingDt && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Editar tarefa diária</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Título</label>
              <input type="text" value={dtForm.title} onChange={e => setDtForm(p => ({ ...p, title: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Responsável</label>
              <input type="text" value={dtForm.responsible} onChange={e => setDtForm(p => ({ ...p, responsible: e.target.value }))} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Objetivo</label>
              <input type="text" value={dtForm.objective} onChange={e => setDtForm(p => ({ ...p, objective: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={dtForm.status} onChange={e => setDtForm(p => ({ ...p, status: e.target.value }))} className={inputCls}>
                {Object.entries(TASK_STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Observações iniciais</label>
              <textarea value={dtForm.initialNotes} onChange={e => setDtForm(p => ({ ...p, initialNotes: e.target.value }))} rows={2} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Observações finais</label>
              <textarea value={dtForm.finalNotes} onChange={e => setDtForm(p => ({ ...p, finalNotes: e.target.value }))} rows={2} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Resumo do dia</label>
              <textarea value={dtForm.summary} onChange={e => setDtForm(p => ({ ...p, summary: e.target.value }))} rows={3} className={inputCls} placeholder="Resumo das atividades do dia..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditingDt(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="button" onClick={saveDt} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Save className="w-3.5 h-3.5" /> Salvar
            </button>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-500" />
            Atividades ({items.length})
          </h3>
          <div className="flex gap-1">
            {items.some(i => ['PENDENTE', 'EM_ANDAMENTO'].includes(i.status)) && (
              <button type="button" onClick={markAllDone} disabled={markAllLoading}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                {markAllLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-green-500" />}
                Marcar todos
              </button>
            )}
            <button type="button" onClick={() => { setShowItemForm(true); setEditingItem(null) }}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
        </div>

        {showItemForm && !editingItem && (
          <ItemForm
            dailyTaskId={dt.id}
            onSaved={async () => { setShowItemForm(false); await reload() }}
            onCancel={() => setShowItemForm(false)}
          />
        )}

        {items.length === 0 && !showItemForm && (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhuma atividade registrada.</p>
            <button type="button" onClick={() => setShowItemForm(true)}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
              + Adicionar atividade
            </button>
          </div>
        )}

        <div className="space-y-1.5">
          {items.map(item =>
            editingItem?.id === item.id ? (
              <ItemForm
                key={item.id}
                dailyTaskId={dt.id}
                initial={editingItem}
                onSaved={async () => { setEditingItem(null); await reload() }}
                onCancel={() => setEditingItem(null)}
              />
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                dailyTaskId={dt.id}
                onToggle={toggleItem}
                onEdit={i => { setEditingItem(i); setShowItemForm(false) }}
                onDelete={deleteItem}
              />
            )
          )}
        </div>
      </div>

      {/* Summary */}
      {(dt.summary || dt.finalNotes || dt.initialNotes) && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <button type="button" onClick={() => setShowSummary(p => !p)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700">
            Resumo do Dia
            {showSummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSummary && (
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
              {dt.initialNotes && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">Observações iniciais</p>
                  <p className="text-sm text-slate-600">{dt.initialNotes}</p>
                </div>
              )}
              {dt.summary && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">Resumo</p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{dt.summary}</p>
                </div>
              )}
              {dt.finalNotes && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">Observações finais</p>
                  <p className="text-sm text-slate-600">{dt.finalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DailyTasksClient() {
  const [selectedDate, setSelectedDate]   = useState(todayStr)
  const [dailyTask, setDailyTask]         = useState<DailyTask | null>(null)
  const [loading, setLoading]             = useState(true)
  const [loadError, setLoadError]         = useState('')
  // Modal state is INDEPENDENT from loading/dailyTask — never reset by load()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const load = useCallback(async (date: string) => {
    setLoading(true)
    setLoadError('')
    setDailyTask(null)
    try {
      const res = await fetch(`/api/daily-tasks?date=${date}`)
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`)
      const list: DailyTask[] = await res.json()
      if (list.length > 0) {
        const det = await fetch(`/api/daily-tasks/${list[0].id}`)
        if (!det.ok) throw new Error(`Erro ao carregar detalhes`)
        setDailyTask(await det.json())
      }
    } catch (e: any) {
      setLoadError(e.message ?? 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(selectedDate) }, [selectedDate, load])

  function goDate(delta: number) {
    setSelectedDate(prev => addDays(prev, delta))
  }

  function handleCreated(dt: DailyTask) {
    setShowCreateModal(false)
    setDailyTask(dt)
  }

  const dateObj    = parseDateLocal(selectedDate)
  const weekday    = WEEKDAYS[dateObj.getDay()]
  const monthLabel = `${MONTHS[dateObj.getMonth()]} de ${dateObj.getFullYear()}`
  const isToday    = selectedDate === todayStr()

  return (
    <>
      {/* Create modal — rendered OUTSIDE the loading/content area */}
      {showCreateModal && (
        <CreateDailyTaskModal
          date={selectedDate}
          onCreated={handleCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      <div className="space-y-5">
        {/* Date navigator */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => goDate(-1)}
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
            title="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>

          <div className="flex flex-1 items-center gap-3 min-w-0">
            <input
              type="date"
              value={selectedDate}
              onChange={e => { if (e.target.value) setSelectedDate(e.target.value) }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {weekday}, {fmtDateBR(selectedDate)}
              </p>
              <p className="text-xs text-slate-400">{monthLabel}</p>
            </div>
            {isToday && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Hoje</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => goDate(1)}
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
            title="Próximo dia"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(todayStr())}
            title="Ir para hoje"
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              isToday
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => load(selectedDate)}
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <p className="text-sm text-slate-400">Carregando...</p>
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700 mb-1">Erro ao carregar</p>
            <p className="text-xs text-red-500 mb-4">{loadError}</p>
            <button
              type="button"
              onClick={() => load(selectedDate)}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : dailyTask ? (
          <DayDetail
            dt={dailyTask}
            onUpdated={updated => setDailyTask(prev => prev ? { ...prev, ...updated } : updated)}
            onDeleted={() => setDailyTask(null)}
          />
        ) : (
          /* Empty state */
          <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-500 mb-1">
              Nenhuma tarefa registrada para {fmtDateBR(selectedDate)}
            </p>
            <p className="text-sm text-slate-400 mb-6">
              Crie uma tarefa diária para organizar suas atividades
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa Diária
            </button>
          </div>
        )}
      </div>
    </>
  )
}
