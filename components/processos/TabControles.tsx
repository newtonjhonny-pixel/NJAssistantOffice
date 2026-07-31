"use client"

import { useEffect, useState } from "react"
import {
  ShieldCheck, Plus, X, Save, Trash2, Edit2, Filter,
  CheckCircle2, Clock, AlertTriangle, MinusCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Control {
  id: string
  code: string | null
  title: string
  description: string | null
  type: string
  category: string
  processId: string | null
  riskId: string | null
  responsible: string | null
  frequency: string
  status: string
  lastExecution: string | null
  nextExecution: string | null
  evidence: string | null
  effectiveness: string
  notes: string | null
  processName: string | null
  processCode: string | null
  riskTitle: string | null
  riskCode: string | null
  createdAt: string
  updatedAt: string
}

interface ProcessRecord { id: string; code: string | null; name: string }
interface RiskRecord { id: string; code: string | null; title: string }

const CONTROL_TYPES = [
  { value: "PREVENTIVO",  label: "Preventivo" },
  { value: "DETECTIVO",   label: "Detectivo" },
  { value: "CORRETIVO",   label: "Corretivo" },
  { value: "DIRETIVO",    label: "Diretivo" },
]

const CATEGORIES = [
  { value: "PROCESSO",    label: "Processo" },
  { value: "TECNOLOGIA",  label: "Tecnologia" },
  { value: "PESSOAS",     label: "Pessoas" },
  { value: "FISICO",      label: "Físico" },
  { value: "OUTROS",      label: "Outros" },
]

const FREQUENCIES = [
  { value: "DIARIO",     label: "Diário" },
  { value: "SEMANAL",    label: "Semanal" },
  { value: "MENSAL",     label: "Mensal" },
  { value: "TRIMESTRAL", label: "Trimestral" },
  { value: "SEMESTRAL",  label: "Semestral" },
  { value: "ANUAL",      label: "Anual" },
  { value: "CONTINUO",   label: "Contínuo" },
]

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  ATIVO:      { label: "Ativo",      icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  PENDENTE:   { label: "Pendente",   icon: Clock,         color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"     },
  ATRASADO:   { label: "Atrasado",   icon: AlertTriangle, color: "text-red-700",     bg: "bg-red-50 border-red-200"         },
  INATIVO:    { label: "Inativo",    icon: MinusCircle,   color: "text-slate-500",   bg: "bg-slate-50 border-slate-200"     },
}

const EFFECTIVENESS_CONFIG: Record<string, { label: string; color: string }> = {
  NAO_AVALIADO: { label: "Não Avaliado", color: "text-slate-500" },
  EFICAZ:       { label: "Eficaz",       color: "text-emerald-600" },
  PARCIAL:      { label: "Parcial",      color: "text-amber-600" },
  INEFICAZ:     { label: "Ineficaz",     color: "text-red-600" },
}

const TYPE_COLORS: Record<string, string> = {
  PREVENTIVO: "bg-blue-100 text-blue-700",
  DETECTIVO:  "bg-purple-100 text-purple-700",
  CORRETIVO:  "bg-orange-100 text-orange-700",
  DIRETIVO:   "bg-teal-100 text-teal-700",
}

const EMPTY = {
  title: "", description: null, type: "PREVENTIVO", category: "PROCESSO",
  processId: null as string | null, riskId: null as string | null,
  responsible: null, frequency: "MENSAL", status: "ATIVO",
  lastExecution: null, nextExecution: null, evidence: null,
  effectiveness: "NAO_AVALIADO", notes: null,
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

// ─── Formulário ───────────────────────────────────────────────────────────────

function ControlForm({
  initial, processes, risks, onClose, onSaved,
}: {
  initial: Control | null
  processes: ProcessRecord[]
  risks: RiskRecord[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const url    = initial ? `/api/controles/${initial.id}` : "/api/controles"
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
          <h2 className="font-semibold text-slate-800">{initial ? "Editar Controle" : "Novo Controle"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="Ex: Revisão dupla de cálculo de horas extras" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.type} onChange={e => set("type", e.target.value)}>
                {CONTROL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Categoria</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status} onChange={e => set("status", e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Efetividade</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.effectiveness} onChange={e => set("effectiveness", e.target.value)}>
                {Object.entries(EFFECTIVENESS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Periodicidade</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.frequency} onChange={e => set("frequency", e.target.value)}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Responsável</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.responsible ?? ""} onChange={e => set("responsible", e.target.value || null)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Última Execução</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.lastExecution ?? ""} onChange={e => set("lastExecution", e.target.value || null)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Próxima Execução</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.nextExecution ?? ""} onChange={e => set("nextExecution", e.target.value || null)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Processo Vinculado</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.processId ?? ""} onChange={e => set("processId", e.target.value || null)}>
              <option value="">Sem vínculo</option>
              {processes.map(p => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ""}{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Risco Controlado</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.riskId ?? ""} onChange={e => set("riskId", e.target.value || null)}>
              <option value="">Sem vínculo</option>
              {risks.map(r => <option key={r.id} value={r.id}>{r.code ? `${r.code} — ` : ""}{r.title}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.description ?? ""} onChange={e => set("description", e.target.value || null)}
              placeholder="Como este controle funciona?" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Evidência Esperada</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.evidence ?? ""} onChange={e => set("evidence", e.target.value || null)}
              placeholder="Ex: Relatório assinado, print de sistema, ata" />
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

export function TabControles() {
  const [items, setItems]       = useState<Control[]>([])
  const [loading, setLoading]   = useState(true)
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [risks, setRisks]       = useState<RiskRecord[]>([])
  const [editing, setEditing]   = useState<Control | null | "new">(null)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterType, setFilterType]     = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set("status", filterStatus)
      if (filterType)   params.set("type", filterType)
      const [ct, pr, rs] = await Promise.all([
        fetch(`/api/controles?${params}`).then(r => r.json()),
        fetch("/api/processes").then(r => r.json()).catch(() => []),
        fetch("/api/riscos").then(r => r.json()).catch(() => []),
      ])
      setItems(Array.isArray(ct) ? ct : [])
      setProcesses(Array.isArray(pr) ? pr : [])
      setRisks(Array.isArray(rs) ? rs : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus, filterType])

  async function remove(id: string) {
    if (!confirm("Excluir este controle?")) return
    await fetch(`/api/controles/${id}`, { method: "DELETE" })
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
          <h2 className="text-lg font-semibold text-slate-800">Plano de Controle</h2>
          <p className="text-sm text-slate-500">Controles preventivos, detectivos e corretivos dos processos</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4 mr-1" /> Novo Controle
        </Button>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <button key={key}
              onClick={() => setFilterStatus(filterStatus === key ? "" : key)}
              className={cn("rounded-xl border p-4 text-left transition-all hover:shadow-sm",
                filterStatus === key ? cfg.bg + " ring-2 ring-offset-1 ring-blue-400" : "bg-white border-slate-200")}>
              <Icon className={cn("w-5 h-5 mb-1", cfg.color)} />
              <p className="text-xl font-bold text-slate-800">{counts[key] ?? 0}</p>
              <p className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filtros por tipo */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-slate-500"><Filter className="w-3 h-3" /> Tipo:</div>
        {["", ...CONTROL_TYPES.map(t => t.value)].map(v => (
          <button key={v} onClick={() => setFilterType(v)}
            className={cn("text-xs px-3 py-1 rounded-full border transition-colors",
              filterType === v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
            {v ? CONTROL_TYPES.find(t => t.value === v)?.label : "Todos"}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">Nenhum controle cadastrado</p>
          <p className="text-sm text-slate-400 mt-1">Registre controles para mitigar os riscos identificados</p>
          <Button className="mt-4" onClick={() => setEditing("new")}><Plus className="w-4 h-4 mr-1" /> Novo Controle</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(c => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.ATIVO
            const Icon = cfg.icon
            const freqLabel = FREQUENCIES.find(f => f.value === c.frequency)?.label ?? c.frequency
            const effCfg = EFFECTIVENESS_CONFIG[c.effectiveness] ?? EFFECTIVENESS_CONFIG.NAO_AVALIADO
            const isOverdue = c.nextExecution && c.status !== "INATIVO"
              && new Date(c.nextExecution) < new Date()
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow group">
                <div className={cn("mt-0.5 p-2 rounded-lg border", cfg.bg)}>
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.code && <span className="text-[10px] font-mono text-slate-400">{c.code}</span>}
                    <p className="font-medium text-slate-800 truncate">{c.title}</p>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", TYPE_COLORS[c.type] ?? "bg-slate-100 text-slate-600")}>
                      {CONTROL_TYPES.find(t => t.value === c.type)?.label ?? c.type}
                    </span>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    {isOverdue && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Vencido</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                    <span>Freq.: {freqLabel}</span>
                    {c.responsible  && <span>Resp.: {c.responsible}</span>}
                    {c.nextExecution && <span>Próxima: {fmt(c.nextExecution)}</span>}
                    {c.processName   && <span>Processo: {c.processCode ? `${c.processCode} — ` : ""}{c.processName}</span>}
                    {c.riskTitle     && <span>Risco: {c.riskCode ? `${c.riskCode} — ` : ""}{c.riskTitle}</span>}
                    <span className={effCfg.color}>Efetividade: {effCfg.label}</span>
                  </div>
                  {c.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{c.description}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing !== null && (
        <ControlForm
          initial={editing === "new" ? null : editing}
          processes={processes}
          risks={risks}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
