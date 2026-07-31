"use client"

import { useEffect, useState } from "react"
import {
  BarChart2, Plus, X, Save, Trash2, Edit2, Filter,
  TrendingUp, TrendingDown, Minus, Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Indicator {
  id: string
  code: string | null
  name: string
  description: string | null
  unit: string
  frequency: string
  category: string
  processId: string | null
  responsible: string | null
  target: number | null
  minimum: number | null
  maximum: number | null
  currentValue: number | null
  status: string
  lastMeasuredAt: string | null
  trend: string | null
  notes: string | null
  processName: string | null
  processCode: string | null
  createdAt: string
  updatedAt: string
}

interface ProcessRecord { id: string; code: string | null; name: string }

const CATEGORIES = [
  { value: "QUALIDADE",    label: "Qualidade" },
  { value: "PRODUTIVIDADE",label: "Produtividade" },
  { value: "FINANCEIRO",   label: "Financeiro" },
  { value: "PESSOAS",      label: "Pessoas" },
  { value: "CLIENTE",      label: "Cliente" },
  { value: "PROCESSO",     label: "Processo" },
  { value: "OUTROS",       label: "Outros" },
]

const FREQUENCIES = [
  { value: "DIARIO",     label: "Diário" },
  { value: "SEMANAL",    label: "Semanal" },
  { value: "MENSAL",     label: "Mensal" },
  { value: "TRIMESTRAL", label: "Trimestral" },
  { value: "SEMESTRAL",  label: "Semestral" },
  { value: "ANUAL",      label: "Anual" },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  VERDE:     { label: "No Alvo",   color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  AMARELO:   { label: "Atenção",   color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"   },
  VERMELHO:  { label: "Crítico",   color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200"     },
  SEM_DADOS: { label: "Sem dados", color: "text-slate-500",   bg: "bg-slate-50",    border: "border-slate-200"   },
}

const CAT_COLORS: Record<string, string> = {
  QUALIDADE:     "bg-blue-100 text-blue-700",
  PRODUTIVIDADE: "bg-purple-100 text-purple-700",
  FINANCEIRO:    "bg-emerald-100 text-emerald-700",
  PESSOAS:       "bg-orange-100 text-orange-700",
  CLIENTE:       "bg-pink-100 text-pink-700",
  PROCESSO:      "bg-teal-100 text-teal-700",
  OUTROS:        "bg-slate-100 text-slate-600",
}

const EMPTY = {
  name: "", description: null, unit: "%", frequency: "MENSAL",
  category: "QUALIDADE", processId: null as string | null,
  responsible: null, target: null as number | null,
  minimum: null as number | null, maximum: null as number | null,
  currentValue: null as number | null, notes: null,
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === "SUBINDO")  return <TrendingUp  className="w-4 h-4 text-emerald-500" />
  if (trend === "CAINDO")   return <TrendingDown className="w-4 h-4 text-red-500" />
  if (trend === "ESTAVEL")  return <Minus        className="w-4 h-4 text-slate-400" />
  return null
}

// ─── Mini Gauge ───────────────────────────────────────────────────────────────

function Gauge({ value, target, min, max, unit }: {
  value: number | null; target: number | null; min: number | null; max: number | null; unit: string
}) {
  if (value === null) return <p className="text-2xl font-bold text-slate-300">—</p>
  const pct = max && max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : null
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-2xl font-bold text-slate-800">{value.toLocaleString("pt-BR")}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></p>
      {pct !== null && (
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {target !== null && (
        <p className="text-[10px] text-slate-500">Meta: {target.toLocaleString("pt-BR")} {unit}</p>
      )}
    </div>
  )
}

// ─── Modal de lançamento ──────────────────────────────────────────────────────

function MeasureModal({ indicator, onClose, onSaved }: {
  indicator: Indicator; onClose: () => void; onSaved: () => void
}) {
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")
  const [date, setDate]   = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!value) return
    setSaving(true)
    await fetch(`/api/indicadores/${indicator.id}/measure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: Number(value), notes: notes || null, measuredAt: date }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-800">Lançar Medição</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 font-medium">{indicator.name}</p>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Valor ({indicator.unit}) *</label>
            <input type="number" step="any"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={value} onChange={e => setValue(e.target.value)}
              placeholder={`Meta: ${indicator.target ?? "—"} ${indicator.unit}`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Data da Medição</label>
            <input type="date"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={date} onChange={e => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Observações</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={notes} onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !value}>
            {saving ? "Salvando…" : "Lançar"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Formulário ───────────────────────────────────────────────────────────────

function IndicatorForm({ initial, processes, onClose, onSaved }: {
  initial: Indicator | null; processes: ProcessRecord[]; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState(initial
    ? { ...initial, target: initial.target, minimum: initial.minimum, maximum: initial.maximum, currentValue: initial.currentValue }
    : EMPTY)
  const [saving, setSaving] = useState(false)

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }
  function setNum(k: string, v: string) { set(k, v === "" ? null : Number(v)) }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const url    = initial ? `/api/indicadores/${initial.id}` : "/api/indicadores"
    const method = initial ? "PUT" : "POST"
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-800">{initial ? "Editar Indicador" : "Novo Indicador"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nome *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Ex: Taxa de Conformidade Folha de Pagamento" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Unidade</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="%, R$, qtd" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Categoria</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Periodicidade</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.frequency} onChange={e => set("frequency", e.target.value)}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Meta ({form.unit})</label>
              <input type="number" step="any" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.target ?? ""} onChange={e => setNum("target", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Mínimo aceitável</label>
              <input type="number" step="any" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.minimum ?? ""} onChange={e => setNum("minimum", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Máximo esperado</label>
              <input type="number" step="any" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.maximum ?? ""} onChange={e => setNum("maximum", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Responsável</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.responsible ?? ""} onChange={e => set("responsible", e.target.value || null)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Processo Vinculado</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.processId ?? ""} onChange={e => set("processId", e.target.value || null)}>
                <option value="">Sem vínculo</option>
                {processes.map(p => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ""}{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.description ?? ""} onChange={e => set("description", e.target.value || null)}
              placeholder="Como este indicador é calculado?" />
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name.trim()}>
            {saving ? "Salvando…" : <><Save className="w-4 h-4 mr-1" />Salvar</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab principal ────────────────────────────────────────────────────────────

export function TabIndicadores() {
  const [items, setItems]       = useState<Indicator[]>([])
  const [loading, setLoading]   = useState(true)
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [editing, setEditing]   = useState<Indicator | null | "new">(null)
  const [measuring, setMeasuring] = useState<Indicator | null>(null)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterCat, setFilterCat]       = useState("")

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set("status", filterStatus)
    if (filterCat)    params.set("category", filterCat)
    const [ind, pr] = await Promise.all([
      fetch(`/api/indicadores?${params}`).then(r => r.json()),
      fetch("/api/processes").then(r => r.json()).catch(() => []),
    ])
    setItems(Array.isArray(ind) ? ind : [])
    setProcesses(Array.isArray(pr) ? pr : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus, filterCat])

  async function remove(id: string) {
    if (!confirm("Excluir este indicador?")) return
    await fetch(`/api/indicadores/${id}`, { method: "DELETE" })
    load()
  }

  const counts = Object.keys(STATUS_CONFIG).reduce<Record<string, number>>((acc, k) => {
    acc[k] = items.filter(i => i.status === k).length
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Indicadores de Processo</h2>
          <p className="text-sm text-slate-500">KPIs e métricas de desempenho dos processos</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4 mr-1" /> Novo Indicador
        </Button>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "" : key)}
            className={cn("rounded-xl border p-4 text-left transition-all hover:shadow-sm",
              filterStatus === key ? cfg.bg + " ring-2 ring-offset-1 ring-blue-400 " + cfg.border : "bg-white border-slate-200")}>
            <Target className={cn("w-5 h-5 mb-1", cfg.color)} />
            <p className="text-xl font-bold text-slate-800">{counts[key] ?? 0}</p>
            <p className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Filtros por categoria */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-slate-500"><Filter className="w-3 h-3" /> Categoria:</div>
        {["", ...CATEGORIES.map(c => c.value)].map(v => (
          <button key={v} onClick={() => setFilterCat(v)}
            className={cn("text-xs px-3 py-1 rounded-full border transition-colors",
              filterCat === v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
            {v ? CATEGORIES.find(c => c.value === v)?.label : "Todas"}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart2 className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">Nenhum indicador cadastrado</p>
          <p className="text-sm text-slate-400 mt-1">Defina KPIs para monitorar o desempenho dos processos</p>
          <Button className="mt-4" onClick={() => setEditing("new")}><Plus className="w-4 h-4 mr-1" /> Novo Indicador</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(ind => {
            const cfg = STATUS_CONFIG[ind.status] ?? STATUS_CONFIG.SEM_DADOS
            const catLabel = CATEGORIES.find(c => c.value === ind.category)?.label ?? ind.category
            const freqLabel = FREQUENCIES.find(f => f.value === ind.frequency)?.label ?? ind.frequency
            return (
              <div key={ind.id} className={cn("bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow group", cfg.border)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {ind.code && <span className="text-[10px] font-mono text-slate-400">{ind.code}</span>}
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", CAT_COLORS[ind.category] ?? "bg-slate-100 text-slate-600")}>{catLabel}</span>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>{cfg.label}</span>
                    </div>
                    <p className="font-medium text-slate-800 text-sm leading-tight">{ind.name}</p>
                  </div>
                  <TrendIcon trend={ind.trend} />
                </div>

                <div className="mb-3">
                  <Gauge value={ind.currentValue} target={ind.target} min={ind.minimum} max={ind.maximum} unit={ind.unit} />
                </div>

                <div className="text-xs text-slate-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Freq.: {freqLabel}</span>
                    {ind.lastMeasuredAt && <span>Medido: {fmt(ind.lastMeasuredAt)}</span>}
                  </div>
                  {ind.responsible && <p>Resp.: {ind.responsible}</p>}
                  {ind.processName && <p>Processo: {ind.processCode ? `${ind.processCode} — ` : ""}{ind.processName}</p>}
                </div>

                <div className="mt-3 pt-3 border-t flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button className="flex-1 text-xs py-1.5" onClick={() => setMeasuring(ind)}>
                    <Target className="w-3 h-3 mr-1" /> Lançar
                  </Button>
                  <button onClick={() => setEditing(ind)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(ind.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing !== null && (
        <IndicatorForm initial={editing === "new" ? null : editing} processes={processes}
          onClose={() => setEditing(null)} onSaved={load} />
      )}
      {measuring !== null && (
        <MeasureModal indicator={measuring} onClose={() => setMeasuring(null)} onSaved={load} />
      )}
    </div>
  )
}
