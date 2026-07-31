"use client"

import { useEffect, useState } from "react"
import {
  FileText, Plus, X, Save, Trash2, Edit2, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, XCircle, Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Evidence {
  id: string
  title: string
  type: string
  description: string | null
  processId: string | null
  documentId: string | null
  responsible: string | null
  evidenceDate: string | null
  status: string
  expiresAt: string | null
  notes: string | null
  processName: string | null
  processCode: string | null
  createdAt: string
  updatedAt: string
}

interface ProcessRecord { id: string; code: string | null; name: string }

const EVIDENCE_TYPES = [
  { value: "DOCUMENTO",    label: "Documento" },
  { value: "FOTO",         label: "Foto" },
  { value: "RELATORIO",    label: "Relatório" },
  { value: "EMAIL",        label: "E-mail" },
  { value: "ATA",          label: "Ata de Reunião" },
  { value: "REGISTRO",     label: "Registro" },
  { value: "CERTIFICADO",  label: "Certificado" },
  { value: "OUTROS",       label: "Outros" },
]

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  VALIDA:    { label: "Válida",    icon: CheckCircle2,   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  PENDENTE:  { label: "Pendente",  icon: Clock,          color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"     },
  EXPIRADA:  { label: "Expirada",  icon: AlertTriangle,  color: "text-red-700",     bg: "bg-red-50 border-red-200"         },
  REJEITADA: { label: "Rejeitada", icon: XCircle,        color: "text-slate-600",   bg: "bg-slate-50 border-slate-200"     },
}

const EMPTY: Omit<Evidence, "id" | "createdAt" | "updatedAt" | "processName" | "processCode"> = {
  title: "", type: "DOCUMENTO", description: null, processId: null,
  documentId: null, responsible: null, evidenceDate: null,
  status: "PENDENTE", expiresAt: null, notes: null,
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

// ─── Formulário ───────────────────────────────────────────────────────────────

function EvidenceForm({
  initial,
  processes,
  onClose,
  onSaved,
}: {
  initial: Evidence | null
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
      const url    = initial ? `/api/evidencias/${initial.id}` : "/api/evidencias"
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
          <h2 className="font-semibold text-slate-800">{initial ? "Editar Evidência" : "Nova Evidência"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Ex: Relatório de treinamento NR-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.type}
                onChange={e => set("type", e.target.value)}
              >
                {EVIDENCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data da Evidência</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.evidenceDate ?? ""}
                onChange={e => set("evidenceDate", e.target.value || null)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Validade</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.expiresAt ?? ""}
                onChange={e => set("expiresAt", e.target.value || null)}
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
              placeholder="Descreva o que esta evidência comprova..."
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

export function TabEvidencias() {
  const [items, setItems]       = useState<Evidence[]>([])
  const [loading, setLoading]   = useState(true)
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [editing, setEditing]   = useState<Evidence | null | "new">(null)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterType, setFilterType]     = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set("status", filterStatus)
      if (filterType)   params.set("type", filterType)
      const [ev, pr] = await Promise.all([
        fetch(`/api/evidencias?${params}`).then(r => r.json()),
        fetch("/api/processes").then(r => r.json()).catch(() => []),
      ])
      setItems(Array.isArray(ev) ? ev : [])
      setProcesses(Array.isArray(pr) ? pr : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus, filterType])

  async function remove(id: string) {
    if (!confirm("Excluir esta evidência?")) return
    await fetch(`/api/evidencias/${id}`, { method: "DELETE" })
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
          <h2 className="text-lg font-semibold text-slate-800">Central de Evidências</h2>
          <p className="text-sm text-slate-500">Registros que comprovam conformidade e execução de processos</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4 mr-1" /> Nova Evidência
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

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Filter className="w-3 h-3" /> Tipo:
        </div>
        {["", ...EVIDENCE_TYPES.map(t => t.value)].map(v => (
          <button
            key={v}
            onClick={() => setFilterType(v)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors",
              filterType === v
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            )}
          >
            {v ? EVIDENCE_TYPES.find(t => t.value === v)?.label : "Todos"}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">Nenhuma evidência cadastrada</p>
          <p className="text-sm text-slate-400 mt-1">Registre documentos, fotos e relatórios que comprovam conformidade</p>
          <Button className="mt-4" onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4 mr-1" /> Nova Evidência
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(ev => {
            const cfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.PENDENTE
            const Icon = cfg.icon
            const typeLabel = EVIDENCE_TYPES.find(t => t.value === ev.type)?.label ?? ev.type
            return (
              <div key={ev.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow group">
                <div className={cn("mt-0.5 p-2 rounded-lg border", cfg.bg)}>
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800 truncate">{ev.title}</p>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{typeLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                    {ev.processName && <span>Processo: {ev.processCode ? `${ev.processCode} — ` : ""}{ev.processName}</span>}
                    {ev.responsible && <span>Resp.: {ev.responsible}</span>}
                    {ev.evidenceDate && <span>Data: {fmt(ev.evidenceDate)}</span>}
                    {ev.expiresAt && <span>Validade: {fmt(ev.expiresAt)}</span>}
                  </div>
                  {ev.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{ev.description}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditing(ev)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove(ev.id)}
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
        <EvidenceForm
          initial={editing === "new" ? null : editing}
          processes={processes}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
