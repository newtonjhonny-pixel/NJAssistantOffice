"use client"

import { useEffect, useState } from "react"
import {
  CheckSquare, Plus, X, Save, Trash2, Edit2,
  CheckCircle2, Clock, AlertTriangle, MinusCircle, Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Obligation {
  id: string
  title: string
  legalBasis: string | null
  category: string
  responsible: string | null
  frequency: string
  dueDate: string | null
  status: string
  description: string | null
  notes: string | null
  processId: string | null
  processName: string | null
  processCode: string | null
  createdAt: string
  updatedAt: string
}

interface ProcessRecord { id: string; code: string | null; name: string }

const CATEGORIES = [
  { value: "TRABALHISTA",      label: "Trabalhista" },
  { value: "PREVIDENCIARIO",   label: "Previdenciário" },
  { value: "FISCAL",           label: "Fiscal" },
  { value: "AMBIENTAL",        label: "Ambiental" },
  { value: "SAUDE_SEGURANCA",  label: "Saúde e Segurança" },
  { value: "OUTROS",           label: "Outros" },
]

const FREQUENCIES = [
  { value: "DIARIA",      label: "Diária" },
  { value: "SEMANAL",     label: "Semanal" },
  { value: "MENSAL",      label: "Mensal" },
  { value: "TRIMESTRAL",  label: "Trimestral" },
  { value: "SEMESTRAL",   label: "Semestral" },
  { value: "ANUAL",       label: "Anual" },
  { value: "PONTUAL",     label: "Pontual" },
]

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  EM_DIA:    { label: "Em Dia",    icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  PENDENTE:  { label: "Pendente",  icon: Clock,         color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"     },
  ATRASADA:  { label: "Atrasada",  icon: AlertTriangle, color: "text-red-700",     bg: "bg-red-50 border-red-200"         },
  NAO_APLICA:{ label: "N/A",       icon: MinusCircle,   color: "text-slate-500",   bg: "bg-slate-50 border-slate-200"     },
}

const CAT_COLORS: Record<string, string> = {
  TRABALHISTA:     "bg-blue-100 text-blue-700",
  PREVIDENCIARIO:  "bg-purple-100 text-purple-700",
  FISCAL:          "bg-orange-100 text-orange-700",
  AMBIENTAL:       "bg-emerald-100 text-emerald-700",
  SAUDE_SEGURANCA: "bg-red-100 text-red-700",
  OUTROS:          "bg-slate-100 text-slate-600",
}

const EMPTY: Omit<Obligation, "id" | "createdAt" | "updatedAt" | "processName" | "processCode"> = {
  title: "", legalBasis: null, category: "TRABALHISTA", responsible: null,
  frequency: "MENSAL", dueDate: null, status: "PENDENTE",
  description: null, notes: null, processId: null,
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

// ─── Formulário ───────────────────────────────────────────────────────────────

function ObligationForm({
  initial,
  processes,
  onClose,
  onSaved,
}: {
  initial: Obligation | null
  processes: ProcessRecord[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)

  function set(k: string, v: string | null) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const url    = initial ? `/api/conformidade/${initial.id}` : "/api/conformidade"
      const method = initial ? "PUT" : "POST"
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-800">{initial ? "Editar Obrigação" : "Nova Obrigação"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Ex: CAGED mensal, eSocial S-1200, RAIS anual"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Base Legal</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.legalBasis ?? ""}
              onChange={e => set("legalBasis", e.target.value || null)}
              placeholder="Ex: CLT Art. 58, NR-1, Lei 9.717/98"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Categoria</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category}
                onChange={e => set("category", e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status}
                onChange={e => set("status", e.target.value)}
              >
                {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Periodicidade</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.frequency}
                onChange={e => set("frequency", e.target.value)}
              >
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Prazo</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dueDate ?? ""}
                onChange={e => set("dueDate", e.target.value || null)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Responsável</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.responsible ?? ""}
              onChange={e => set("responsible", e.target.value || null)}
              placeholder="Nome do responsável"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Processo Vinculado</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.processId ?? ""}
              onChange={e => set("processId", e.target.value || null)}
            >
              <option value="">Sem vínculo</option>
              {processes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} — ` : ""}{p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.description ?? ""}
              onChange={e => set("description", e.target.value || null)}
              placeholder="Detalhes sobre a obrigação, como cumprir, consequências do não cumprimento..."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Observações</label>
            <textarea
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.notes ?? ""}
              onChange={e => set("notes", e.target.value || null)}
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.title.trim()}>
            {saving ? "Salvando…" : <><Save className="w-4 h-4 mr-1" />Salvar</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab principal ────────────────────────────────────────────────────────────

export function TabConformidade() {
  const [items, setItems]       = useState<Obligation[]>([])
  const [loading, setLoading]   = useState(true)
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [editing, setEditing]   = useState<Obligation | null | "new">(null)
  const [filterStatus, setFilterStatus]   = useState("")
  const [filterCategory, setFilterCategory] = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus)   params.set("status", filterStatus)
      if (filterCategory) params.set("category", filterCategory)
      const [ob, pr] = await Promise.all([
        fetch(`/api/conformidade?${params}`).then(r => r.json()),
        fetch("/api/processes").then(r => r.json()).catch(() => []),
      ])
      setItems(Array.isArray(ob) ? ob : [])
      setProcesses(Array.isArray(pr) ? pr : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus, filterCategory])

  async function remove(id: string) {
    if (!confirm("Excluir esta obrigação?")) return
    await fetch(`/api/conformidade/${id}`, { method: "DELETE" })
    load()
  }

  const counts = Object.keys(STATUS_CONFIG).reduce<Record<string, number>>((acc, k) => {
    acc[k] = items.filter(i => i.status === k).length
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Conformidade Legal</h2>
          <p className="text-sm text-slate-500">Obrigações trabalhistas, previdenciárias, fiscais e regulatórias</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4 mr-1" /> Nova Obrigação
        </Button>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? "" : key)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all hover:shadow-sm",
                filterStatus === key ? cfg.bg + " ring-2 ring-offset-1 ring-blue-400" : "bg-white border-slate-200"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-1", cfg.color)} />
              <p className="text-xl font-bold text-slate-800">{counts[key] ?? 0}</p>
              <p className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filtros por categoria */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Filter className="w-3 h-3" /> Categoria:
        </div>
        {["", ...CATEGORIES.map(c => c.value)].map(v => (
          <button
            key={v}
            onClick={() => setFilterCategory(v)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors",
              filterCategory === v
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            )}
          >
            {v ? CATEGORIES.find(c => c.value === v)?.label : "Todas"}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckSquare className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">Nenhuma obrigação cadastrada</p>
          <p className="text-sm text-slate-400 mt-1">Registre obrigações legais, prazos e responsáveis</p>
          <Button className="mt-4" onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4 mr-1" /> Nova Obrigação
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(ob => {
            const cfg = STATUS_CONFIG[ob.status] ?? STATUS_CONFIG.PENDENTE
            const Icon = cfg.icon
            const catLabel = CATEGORIES.find(c => c.value === ob.category)?.label ?? ob.category
            const freqLabel = FREQUENCIES.find(f => f.value === ob.frequency)?.label ?? ob.frequency
            const isOverdue = ob.dueDate && ob.status !== "EM_DIA" && ob.status !== "NAO_APLICA"
              && new Date(ob.dueDate) < new Date()
            return (
              <div key={ob.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow group">
                <div className={cn("mt-0.5 p-2 rounded-lg border", cfg.bg)}>
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800 truncate">{ob.title}</p>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", CAT_COLORS[ob.category] ?? "bg-slate-100 text-slate-600")}>
                      {catLabel}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Vencida
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                    {ob.legalBasis  && <span>Base: {ob.legalBasis}</span>}
                    {ob.responsible && <span>Resp.: {ob.responsible}</span>}
                    <span>Periodicidade: {freqLabel}</span>
                    {ob.dueDate && <span>Prazo: {fmt(ob.dueDate)}</span>}
                    {ob.processName && <span>Processo: {ob.processCode ? `${ob.processCode} — ` : ""}{ob.processName}</span>}
                  </div>
                  {ob.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{ob.description}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditing(ob)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove(ob.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {editing !== null && (
        <ObligationForm
          initial={editing === "new" ? null : editing}
          processes={processes}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
