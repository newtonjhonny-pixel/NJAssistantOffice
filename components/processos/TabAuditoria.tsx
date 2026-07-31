"use client"

import { useEffect, useState } from "react"
import {
  ShieldCheck, Plus, X, Save, Trash2, Edit2, Filter,
  CheckCircle2, Clock, AlertTriangle, XCircle, FileSearch,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Audit {
  id: string
  code: string | null
  title: string
  type: string
  scope: string | null
  processId: string | null
  auditor: string | null
  auditee: string | null
  plannedDate: string | null
  executedDate: string | null
  status: string
  result: string | null
  findings: string | null
  nonConformities: string | null
  opportunities: string | null
  actionPlan: string | null
  nextAudit: string | null
  notes: string | null
  processName: string | null
  processCode: string | null
  createdAt: string
  updatedAt: string
}

interface ProcessRecord { id: string; code: string | null; name: string }

const AUDIT_TYPES = [
  { value: "INTERNA",    label: "Interna" },
  { value: "EXTERNA",    label: "Externa" },
  { value: "SEGUNDA_PARTE", label: "Segunda Parte" },
  { value: "CERTIFICACAO", label: "Certificação" },
]

const RESULTS = [
  { value: "CONFORME",         label: "Conforme" },
  { value: "CONFORME_RESSALVAS", label: "Conforme c/ Ressalvas" },
  { value: "NAO_CONFORME",     label: "Não Conforme" },
  { value: "CANCELADA",        label: "Cancelada" },
]

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  PLANEJADA:    { label: "Planejada",   icon: Clock,         color: "text-blue-700",    bg: "bg-blue-50 border-blue-200"    },
  EM_EXECUCAO:  { label: "Em Execução", icon: FileSearch,    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"  },
  CONCLUIDA:    { label: "Concluída",   icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  ATRASADA:     { label: "Atrasada",    icon: AlertTriangle, color: "text-red-700",     bg: "bg-red-50 border-red-200"      },
  CANCELADA:    { label: "Cancelada",   icon: XCircle,       color: "text-slate-500",   bg: "bg-slate-50 border-slate-200"  },
}

const RESULT_COLORS: Record<string, string> = {
  CONFORME:            "bg-emerald-100 text-emerald-700",
  CONFORME_RESSALVAS:  "bg-amber-100 text-amber-700",
  NAO_CONFORME:        "bg-red-100 text-red-700",
  CANCELADA:           "bg-slate-100 text-slate-600",
}

const EMPTY = {
  title: "", type: "INTERNA", scope: null as string | null,
  processId: null as string | null, auditor: null, auditee: null,
  plannedDate: null, executedDate: null, status: "PLANEJADA",
  result: null, findings: null, nonConformities: null,
  opportunities: null, actionPlan: null, nextAudit: null, notes: null,
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

// ─── Formulário ───────────────────────────────────────────────────────────────

function AuditForm({ initial, processes, onClose, onSaved }: {
  initial: Audit | null; processes: ProcessRecord[]; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const url    = initial ? `/api/auditoria/${initial.id}` : "/api/auditoria"
    const method = initial ? "PUT" : "POST"
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSaving(false)
    onSaved()
    onClose()
  }

  const showResult = form.status === "CONCLUIDA" || form.status === "CANCELADA"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-800">{initial ? "Editar Auditoria" : "Nova Auditoria"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="Ex: Auditoria Interna — Folha de Pagamento Q2/2026" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.type} onChange={e => set("type", e.target.value)}>
                {AUDIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status} onChange={e => set("status", e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            {showResult && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Resultado</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.result ?? ""} onChange={e => set("result", e.target.value || null)}>
                  <option value="">—</option>
                  {RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Auditor</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.auditor ?? ""} onChange={e => set("auditor", e.target.value || null)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Auditado</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.auditee ?? ""} onChange={e => set("auditee", e.target.value || null)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data Planejada</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.plannedDate ?? ""} onChange={e => set("plannedDate", e.target.value || null)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data Executada</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.executedDate ?? ""} onChange={e => set("executedDate", e.target.value || null)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Escopo</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.scope ?? ""} onChange={e => set("scope", e.target.value || null)}
              placeholder="Quais processos, áreas ou sistemas serão auditados" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Processo Vinculado</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.processId ?? ""} onChange={e => set("processId", e.target.value || null)}>
              <option value="">Sem vínculo</option>
              {processes.map(p => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ""}{p.name}</option>)}
            </select>
          </div>

          {showResult && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Constatações</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.findings ?? ""} onChange={e => set("findings", e.target.value || null)}
                  placeholder="Resumo das constatações da auditoria" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Não Conformidades</label>
                  <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={form.nonConformities ?? ""} onChange={e => set("nonConformities", e.target.value || null)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Oportunidades de Melhoria</label>
                  <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={form.opportunities ?? ""} onChange={e => set("opportunities", e.target.value || null)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Plano de Ação</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.actionPlan ?? ""} onChange={e => set("actionPlan", e.target.value || null)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Próxima Auditoria</label>
                <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.nextAudit ?? ""} onChange={e => set("nextAudit", e.target.value || null)} />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Observações</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.notes ?? ""} onChange={e => set("notes", e.target.value || null)} />
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

export function TabAuditoria() {
  const [items, setItems]       = useState<Audit[]>([])
  const [loading, setLoading]   = useState(true)
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [editing, setEditing]   = useState<Audit | null | "new">(null)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterType, setFilterType]     = useState("")

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set("status", filterStatus)
    if (filterType)   params.set("type", filterType)
    const [aud, pr] = await Promise.all([
      fetch(`/api/auditoria?${params}`).then(r => r.json()),
      fetch("/api/processes").then(r => r.json()).catch(() => []),
    ])
    setItems(Array.isArray(aud) ? aud : [])
    setProcesses(Array.isArray(pr) ? pr : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus, filterType])

  async function remove(id: string) {
    if (!confirm("Excluir esta auditoria?")) return
    await fetch(`/api/auditoria/${id}`, { method: "DELETE" })
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
          <h2 className="text-lg font-semibold text-slate-800">Auditoria Interna</h2>
          <p className="text-sm text-slate-500">Planejamento e registro de auditorias de processo</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4 mr-1" /> Nova Auditoria
        </Button>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <button key={key}
              onClick={() => setFilterStatus(filterStatus === key ? "" : key)}
              className={cn("rounded-xl border p-3 text-left transition-all hover:shadow-sm",
                filterStatus === key ? cfg.bg + " ring-2 ring-offset-1 ring-blue-400" : "bg-white border-slate-200")}>
              <Icon className={cn("w-4 h-4 mb-1", cfg.color)} />
              <p className="text-xl font-bold text-slate-800">{counts[key] ?? 0}</p>
              <p className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filtros por tipo */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-slate-500"><Filter className="w-3 h-3" /> Tipo:</div>
        {["", ...AUDIT_TYPES.map(t => t.value)].map(v => (
          <button key={v} onClick={() => setFilterType(v)}
            className={cn("text-xs px-3 py-1 rounded-full border transition-colors",
              filterType === v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
            {v ? AUDIT_TYPES.find(t => t.value === v)?.label : "Todos"}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">Nenhuma auditoria registrada</p>
          <p className="text-sm text-slate-400 mt-1">Planeje e registre auditorias dos processos</p>
          <Button className="mt-4" onClick={() => setEditing("new")}><Plus className="w-4 h-4 mr-1" /> Nova Auditoria</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(a => {
            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.PLANEJADA
            const Icon = cfg.icon
            const typeLabel = AUDIT_TYPES.find(t => t.value === a.type)?.label ?? a.type
            const resultCfg = a.result ? { label: RESULTS.find(r => r.value === a.result)?.label ?? a.result, color: RESULT_COLORS[a.result] ?? "bg-slate-100 text-slate-600" } : null
            const isOverdue = a.plannedDate && a.status === "PLANEJADA" && new Date(a.plannedDate) < new Date()
            return (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow group">
                <div className={cn("mt-0.5 p-2 rounded-lg border", cfg.bg)}>
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.code && <span className="text-[10px] font-mono text-slate-400">{a.code}</span>}
                    <p className="font-medium text-slate-800 truncate">{a.title}</p>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{typeLabel}</span>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>{cfg.label}</span>
                    {resultCfg && <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", resultCfg.color)}>{resultCfg.label}</span>}
                    {isOverdue && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Atrasada</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                    {a.auditor && <span>Auditor: {a.auditor}</span>}
                    {a.auditee && <span>Auditado: {a.auditee}</span>}
                    {a.plannedDate && <span>Planejada: {fmt(a.plannedDate)}</span>}
                    {a.executedDate && <span>Executada: {fmt(a.executedDate)}</span>}
                    {a.processName && <span>Processo: {a.processCode ? `${a.processCode} — ` : ""}{a.processName}</span>}
                    {a.nextAudit && <span>Próxima: {fmt(a.nextAudit)}</span>}
                  </div>
                  {a.scope && <p className="text-xs text-slate-500 mt-1 line-clamp-1">Escopo: {a.scope}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setEditing(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(a.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing !== null && (
        <AuditForm initial={editing === "new" ? null : editing} processes={processes}
          onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  )
}
