"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Workflow, Plus, ArrowLeft, Save, Trash2, Edit2, Search,
  ChevronRight, Building2, User, Clock, RefreshCw, AlertTriangle,
  CheckCircle2, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ProcessRecord {
  id: string
  code: string | null
  name: string
  description: string | null
  objective: string | null
  owner: string | null
  department: string | null
  category: string | null
  status: string
  sla: string | null
  frequency: string | null
  inputs: string | null
  outputs: string | null
  tools: string | null
  risks: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

type FormState = Omit<ProcessRecord, "id" | "createdAt" | "updatedAt">

const EMPTY_FORM: FormState = {
  code: "", name: "", description: "", objective: "",
  owner: "", department: "", category: "", status: "ATIVO",
  sla: "", frequency: "", inputs: "", outputs: "",
  tools: "", risks: "", notes: "",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  OPERACIONAL: "Operacional", GESTAO: "Gestão", APOIO: "Apoio", ESTRATEGICO: "Estratégico",
}
const CATEGORY_COLORS: Record<string, string> = {
  OPERACIONAL: "bg-blue-100 text-blue-700 border-blue-200",
  GESTAO:      "bg-violet-100 text-violet-700 border-violet-200",
  APOIO:       "bg-amber-100 text-amber-700 border-amber-200",
  ESTRATEGICO: "bg-emerald-100 text-emerald-700 border-emerald-200",
}
const STATUS_COLORS: Record<string, string> = {
  ATIVO:      "bg-emerald-100 text-emerald-700",
  EM_REVISAO: "bg-amber-100 text-amber-700",
  INATIVO:    "bg-slate-100 text-slate-500",
}
const STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo", EM_REVISAO: "Em Revisão", INATIVO: "Inativo",
}
const FREQUENCY_LABELS: Record<string, string> = {
  DIARIO: "Diário", SEMANAL: "Semanal", MENSAL: "Mensal", SOB_DEMANDA: "Sob Demanda",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function ProcessForm({
  initial, onSaved, onCancel,
}: {
  initial?: ProcessRecord
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { code: initial.code ?? "", name: initial.name, description: initial.description ?? "",
          objective: initial.objective ?? "", owner: initial.owner ?? "", department: initial.department ?? "",
          category: initial.category ?? "", status: initial.status, sla: initial.sla ?? "",
          frequency: initial.frequency ?? "", inputs: initial.inputs ?? "", outputs: initial.outputs ?? "",
          tools: initial.tools ?? "", risks: initial.risks ?? "", notes: initial.notes ?? "" }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Nome é obrigatório"); return }
    setSaving(true); setError("")
    try {
      const url    = initial ? `/api/processes/${initial.id}` : "/api/processes"
      const method = initial ? "PUT" : "POST"
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error(await res.text())
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally { setSaving(false) }
  }

  const field = (label: string, key: keyof FormState, opts?: { textarea?: boolean; placeholder?: string }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      {opts?.textarea ? (
        <textarea
          value={form[key] as string} onChange={set(key)} rows={3}
          placeholder={opts.placeholder}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
        />
      ) : (
        <input
          type="text" value={form[key] as string} onChange={set(key)}
          placeholder={opts?.placeholder}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      )}
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="text-lg font-bold text-slate-800">
          {initial ? "Editar Processo" : "Novo Processo"}
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Identificação</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {field("Código", "code", { placeholder: "ex: PROC-001" })}
          <div className="sm:col-span-2">{field("Nome do Processo *", "name", { placeholder: "ex: Processamento de Folha de Pagamento" })}</div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Categoria</label>
            <select value={form.category ?? ''} onChange={set("category")}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
              <option value="">Selecionar...</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select value={form.status} onChange={set("status")}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Frequência</label>
            <select value={form.frequency ?? ''} onChange={set("frequency")}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
              <option value="">Selecionar...</option>
              {Object.entries(FREQUENCY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("Dono do Processo", "owner", { placeholder: "ex: Coordenador de DP" })}
          {field("Departamento", "department", { placeholder: "ex: Departamento Pessoal" })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</p>
        {field("Objetivo", "objective", { textarea: true, placeholder: "Para que serve este processo?" })}
        {field("Descrição Geral", "description", { textarea: true, placeholder: "Visão geral do processo..." })}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("Entradas (Inputs)", "inputs", { textarea: true, placeholder: "O que alimenta este processo?" })}
          {field("Saídas (Outputs)", "outputs", { textarea: true, placeholder: "O que este processo entrega?" })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operação</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("SLA / Tempo de Ciclo", "sla", { placeholder: "ex: 3 dias úteis" })}
          {field("Sistemas e Ferramentas", "tools", { placeholder: "ex: eSocial, Domínio, Excel" })}
        </div>
        {field("Riscos", "risks", { textarea: true, placeholder: "Principais riscos deste processo..." })}
        {field("Observações", "notes", { textarea: true })}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar Processo"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TabCadastroProcessos() {
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState<string | null>(null)
  const [creating,  setCreating]  = useState(false)
  const [search,    setSearch]    = useState("")
  const [filterCat, setFilterCat] = useState("")
  const [deleting,  setDeleting]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search)    params.set("search", search)
      if (filterCat) params.set("category", filterCat)
      const res = await fetch(`/api/processes?${params}`)
      setProcesses(await res.json())
    } finally { setLoading(false) }
  }, [search, filterCat])

  useEffect(() => { load() }, [load])

  async function deleteProcess(id: string) {
    if (!confirm("Excluir este processo?")) return
    setDeleting(id)
    await fetch(`/api/processes/${id}`, { method: "DELETE" })
    setDeleting(null)
    load()
  }

  const selectedProcess = processes.find(p => p.id === selected)

  if (creating || selectedProcess) {
    return (
      <ProcessForm
        initial={selectedProcess}
        onSaved={() => { setCreating(false); setSelected(null); load() }}
        onCancel={() => { setCreating(false); setSelected(null) }}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Buscar processo..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Button onClick={() => setCreating(true)} size="sm" className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo Processo
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : processes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Workflow className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search || filterCat ? "Nenhum processo encontrado" : "Nenhum processo cadastrado"}</p>
          <p className="text-sm mt-1">Clique em "Novo Processo" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {processes.map(p => (
            <div key={p.id}
              className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-start justify-between gap-3 hover:shadow-md hover:border-slate-300 transition-all group">
              <button className="flex items-start gap-3 flex-1 text-left min-w-0" onClick={() => setSelected(p.id)}>
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Workflow className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.code && <span className="text-xs font-mono text-slate-400">{p.code}</span>}
                    <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{p.name}</p>
                    {p.category && (
                      <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium shrink-0", CATEGORY_COLORS[p.category] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                    )}
                    <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium shrink-0", STATUS_COLORS[p.status] ?? "bg-slate-100 text-slate-500")}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    {p.department && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{p.department}</span>}
                    {p.owner      && <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.owner}</span>}
                    {p.frequency  && <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />{FREQUENCY_LABELS[p.frequency] ?? p.frequency}</span>}
                    {p.sla        && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.sla}</span>}
                    <span>• Atualizado {formatDate(p.updatedAt)}</span>
                  </div>
                  {p.description && <p className="text-xs text-slate-400 mt-1 truncate">{p.description}</p>}
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setSelected(p.id)} title="Editar"
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteProcess(p.id)} disabled={deleting === p.id} title="Excluir"
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors disabled:opacity-50">
                  {deleting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && processes.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{processes.filter(p => p.status === "ATIVO").length} ativos</span>
          <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-amber-500" />{processes.filter(p => p.status === "EM_REVISAO").length} em revisão</span>
          <span>{processes.length} total</span>
        </div>
      )}
    </div>
  )
}
