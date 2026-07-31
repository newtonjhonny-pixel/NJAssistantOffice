"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle, Plus, X, Save, Trash2, Edit2, Filter,
  ChevronDown, ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Risk {
  id: string
  code: string | null
  title: string
  description: string | null
  category: string
  processId: string | null
  probability: number
  impact: number
  riskLevel: string
  cause: string | null
  effect: string | null
  currentControl: string | null
  treatmentType: string
  actionPlan: string | null
  responsible: string | null
  dueDate: string | null
  status: string
  residualProbability: number | null
  residualImpact: number | null
  residualLevel: string | null
  notes: string | null
  processName: string | null
  processCode: string | null
  createdAt: string
  updatedAt: string
}

interface ProcessRecord { id: string; code: string | null; name: string }

const CATEGORIES = [
  { value: "OPERACIONAL",  label: "Operacional" },
  { value: "FINANCEIRO",   label: "Financeiro" },
  { value: "LEGAL",        label: "Legal / Compliance" },
  { value: "ESTRATEGICO",  label: "Estratégico" },
  { value: "TECNOLOGIA",   label: "Tecnologia" },
  { value: "PESSOAS",      label: "Pessoas" },
  { value: "OUTROS",       label: "Outros" },
]

const TREATMENT_TYPES = [
  { value: "MITIGAR",    label: "Mitigar" },
  { value: "ACEITAR",    label: "Aceitar" },
  { value: "TRANSFERIR", label: "Transferir" },
  { value: "ELIMINAR",   label: "Eliminar" },
]

const STATUSES = [
  { value: "IDENTIFICADO", label: "Identificado" },
  { value: "EM_TRATAMENTO", label: "Em Tratamento" },
  { value: "MONITORANDO",   label: "Monitorando" },
  { value: "RESOLVIDO",     label: "Resolvido" },
  { value: "ACEITO",        label: "Aceito" },
]

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  CRITICO: { label: "Crítico",  color: "text-red-700",     bg: "bg-red-100",    border: "border-red-300" },
  ALTO:    { label: "Alto",     color: "text-orange-700",  bg: "bg-orange-100", border: "border-orange-300" },
  MEDIO:   { label: "Médio",    color: "text-amber-700",   bg: "bg-amber-100",  border: "border-amber-300" },
  BAIXO:   { label: "Baixo",    color: "text-emerald-700", bg: "bg-emerald-100",border: "border-emerald-300" },
}

const SCALE = [1, 2, 3, 4, 5]

function calcLevel(p: number, i: number) {
  const s = p * i
  if (s >= 15) return 'CRITICO'
  if (s >= 9)  return 'ALTO'
  if (s >= 4)  return 'MEDIO'
  return 'BAIXO'
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

const EMPTY = {
  title: "", description: null, category: "OPERACIONAL", processId: null,
  probability: 3, impact: 3, cause: null, effect: null,
  currentControl: null, treatmentType: "MITIGAR", actionPlan: null,
  responsible: null, dueDate: null, status: "IDENTIFICADO",
  residualProbability: null as number | null, residualImpact: null as number | null,
  notes: null,
}

// ─── Matriz de Risco ──────────────────────────────────────────────────────────

function RiskMatrix({ risks }: { risks: Risk[] }) {
  const cellRisks = (p: number, i: number) => risks.filter(r => r.probability === p && r.impact === i)
  const cellLevel = (p: number, i: number) => {
    const s = p * i
    if (s >= 15) return "bg-red-200"
    if (s >= 9)  return "bg-orange-200"
    if (s >= 4)  return "bg-amber-200"
    return "bg-emerald-200"
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-600 mb-3">Mapa de Calor de Riscos</p>
      <div className="overflow-x-auto">
        <table className="text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="w-16 text-right pr-2 text-slate-400 font-medium">Prob ↓ / Impacto →</th>
              {SCALE.map(i => <th key={i} className="w-12 text-center pb-1 text-slate-500 font-semibold">{i}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...SCALE].reverse().map(p => (
              <tr key={p}>
                <td className="text-right pr-2 text-slate-500 font-semibold py-0.5">{p}</td>
                {SCALE.map(i => {
                  const rs = cellRisks(p, i)
                  return (
                    <td key={i} className={cn("border border-white/50 rounded text-center align-middle h-10 w-12", cellLevel(p, i))}>
                      {rs.length > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/70 font-bold text-slate-700 text-[9px]">
                          {rs.length}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Formulário ───────────────────────────────────────────────────────────────

function RiskForm({
  initial, processes, onClose, onSaved,
}: {
  initial: Risk | null
  processes: ProcessRecord[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<typeof EMPTY>(
    initial
      ? { ...initial, probability: initial.probability, impact: initial.impact,
          residualProbability: initial.residualProbability, residualImpact: initial.residualImpact } as typeof EMPTY
      : EMPTY
  )
  const [saving, setSaving] = useState(false)
  const [showResidual, setShowResidual] = useState(
    !!(initial?.residualProbability && initial?.residualImpact)
  )

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  const level = calcLevel(form.probability, form.impact)
  const resLevel = (form.residualProbability && form.residualImpact)
    ? calcLevel(form.residualProbability, form.residualImpact) : null
  const lvlCfg = LEVEL_CONFIG[level]

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const url    = initial ? `/api/riscos/${initial.id}` : "/api/riscos"
      const method = initial ? "PUT" : "POST"
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-slate-800">{initial ? "Editar Risco" : "Novo Risco"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Título e categoria */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.title} onChange={e => set("title", e.target.value)}
                placeholder="Ex: Erro no cálculo de folha" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Categoria</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Probabilidade e Impacto */}
          <div className={cn("rounded-lg border p-4", lvlCfg.border, lvlCfg.bg)}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-600">Avaliação do Risco</p>
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", lvlCfg.color, "bg-white/70")}>
                {lvlCfg.label} (P{form.probability} × I{form.impact} = {form.probability * form.impact})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Probabilidade (1–5)</label>
                <div className="flex gap-1">
                  {SCALE.map(v => (
                    <button key={v} onClick={() => set("probability", v)}
                      className={cn("flex-1 py-1.5 rounded text-xs font-semibold border transition-colors",
                        form.probability === v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400")}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Impacto (1–5)</label>
                <div className="flex gap-1">
                  {SCALE.map(v => (
                    <button key={v} onClick={() => set("impact", v)}
                      className={cn("flex-1 py-1.5 rounded text-xs font-semibold border transition-colors",
                        form.impact === v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400")}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Causa e Efeito */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Causa</label>
              <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={form.cause ?? ""} onChange={e => set("cause", e.target.value || null)}
                placeholder="O que origina este risco?" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Efeito</label>
              <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={form.effect ?? ""} onChange={e => set("effect", e.target.value || null)}
                placeholder="Consequência caso ocorra" />
            </div>
          </div>

          {/* Controle atual e plano */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Controle Atual</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.currentControl ?? ""} onChange={e => set("currentControl", e.target.value || null)}
              placeholder="Controles já existentes" />
          </div>

          {/* Tratamento, status, responsável, prazo, processo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tratamento</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.treatmentType} onChange={e => set("treatmentType", e.target.value)}>
                {TREATMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Responsável</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.responsible ?? ""} onChange={e => set("responsible", e.target.value || null)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Prazo</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dueDate ?? ""} onChange={e => set("dueDate", e.target.value || null)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Processo Vinculado</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.processId ?? ""} onChange={e => set("processId", e.target.value || null)}>
              <option value="">Sem vínculo</option>
              {processes.map(p => (
                <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ""}{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Plano de Ação</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.actionPlan ?? ""} onChange={e => set("actionPlan", e.target.value || null)}
              placeholder="Ações para tratar o risco..." />
          </div>

          {/* Risco residual */}
          <button
            type="button"
            onClick={() => setShowResidual(v => !v)}
            className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
          >
            {showResidual ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Risco Residual (após tratamento)
          </button>

          {showResidual && (
            <div className={cn("rounded-lg border p-4", resLevel ? LEVEL_CONFIG[resLevel].border + " " + LEVEL_CONFIG[resLevel].bg : "border-slate-200 bg-slate-50")}>
              {resLevel && (
                <p className={cn("text-xs font-bold mb-3", LEVEL_CONFIG[resLevel].color)}>
                  Nível residual: {LEVEL_CONFIG[resLevel].label} (P{form.residualProbability} × I{form.residualImpact} = {(form.residualProbability ?? 0) * (form.residualImpact ?? 0)})
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Probabilidade Residual</label>
                  <div className="flex gap-1">
                    {SCALE.map(v => (
                      <button key={v} onClick={() => set("residualProbability", v)}
                        className={cn("flex-1 py-1.5 rounded text-xs font-semibold border transition-colors",
                          form.residualProbability === v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400")}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Impacto Residual</label>
                  <div className="flex gap-1">
                    {SCALE.map(v => (
                      <button key={v} onClick={() => set("residualImpact", v)}
                        className={cn("flex-1 py-1.5 rounded text-xs font-semibold border transition-colors",
                          form.residualImpact === v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400")}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
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

export function TabRiscos() {
  const [items, setItems]       = useState<Risk[]>([])
  const [loading, setLoading]   = useState(true)
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [editing, setEditing]   = useState<Risk | null | "new">(null)
  const [filterLevel, setFilterLevel]   = useState("")
  const [filterCat, setFilterCat]       = useState("")
  const [showMatrix, setShowMatrix]     = useState(true)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterLevel) params.set("status", filterLevel)
      if (filterCat)   params.set("category", filterCat)
      const [rs, pr] = await Promise.all([
        fetch(`/api/riscos?${params}`).then(r => r.json()),
        fetch("/api/processes").then(r => r.json()).catch(() => []),
      ])
      setItems(Array.isArray(rs) ? rs : [])
      setProcesses(Array.isArray(pr) ? pr : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterLevel, filterCat])

  async function remove(id: string) {
    if (!confirm("Excluir este risco?")) return
    await fetch(`/api/riscos/${id}`, { method: "DELETE" })
    load()
  }

  const counts = Object.keys(LEVEL_CONFIG).reduce<Record<string, number>>((acc, k) => {
    acc[k] = items.filter(i => i.riskLevel === k).length
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Riscos e FMEA</h2>
          <p className="text-sm text-slate-500">Identificação, avaliação e tratamento de riscos operacionais</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4 mr-1" /> Novo Risco
        </Button>
      </div>

      {/* Resumo por nível */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
          <button key={key}
            onClick={() => setFilterLevel(filterLevel === key ? "" : key)}
            className={cn("rounded-xl border p-4 text-left transition-all hover:shadow-sm",
              filterLevel === key ? cfg.bg + " ring-2 ring-offset-1 ring-blue-400 " + cfg.border : "bg-white border-slate-200")}>
            <AlertTriangle className={cn("w-5 h-5 mb-1", cfg.color)} />
            <p className="text-xl font-bold text-slate-800">{counts[key] ?? 0}</p>
            <p className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Mapa de calor */}
      {items.length > 0 && (
        <div>
          <button onClick={() => setShowMatrix(v => !v)}
            className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-700 mb-2">
            {showMatrix ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Mapa de Calor
          </button>
          {showMatrix && <RiskMatrix risks={items} />}
        </div>
      )}

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
          <AlertTriangle className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-medium text-slate-600">Nenhum risco cadastrado</p>
          <p className="text-sm text-slate-400 mt-1">Identifique e avalie riscos dos seus processos</p>
          <Button className="mt-4" onClick={() => setEditing("new")}><Plus className="w-4 h-4 mr-1" /> Novo Risco</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(r => {
            const lvl = LEVEL_CONFIG[r.riskLevel] ?? LEVEL_CONFIG.MEDIO
            const catLabel = CATEGORIES.find(c => c.value === r.category)?.label ?? r.category
            const trtLabel = TREATMENT_TYPES.find(t => t.value === r.treatmentType)?.label ?? r.treatmentType
            const stsLabel = STATUSES.find(s => s.value === r.status)?.label ?? r.status
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow group">
                <div className={cn("mt-0.5 px-2 py-1 rounded-lg border text-center min-w-[52px]", lvl.bg, lvl.border)}>
                  <p className={cn("text-[9px] font-bold uppercase", lvl.color)}>{lvl.label}</p>
                  <p className={cn("text-lg font-black leading-none", lvl.color)}>{r.probability * r.impact}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.code && <span className="text-[10px] font-mono text-slate-400">{r.code}</span>}
                    <p className="font-medium text-slate-800 truncate">{r.title}</p>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{catLabel}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{trtLabel}</span>
                    <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border">{stsLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                    <span>P{r.probability} × I{r.impact}</span>
                    {r.responsible && <span>Resp.: {r.responsible}</span>}
                    {r.dueDate && <span>Prazo: {fmt(r.dueDate)}</span>}
                    {r.processName && <span>Processo: {r.processCode ? `${r.processCode} — ` : ""}{r.processName}</span>}
                    {r.residualLevel && (
                      <span className={cn("font-medium", LEVEL_CONFIG[r.residualLevel]?.color)}>
                        Residual: {LEVEL_CONFIG[r.residualLevel]?.label}
                      </span>
                    )}
                  </div>
                  {r.cause && <p className="text-xs text-slate-500 mt-1 line-clamp-1">Causa: {r.cause}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing !== null && (
        <RiskForm
          initial={editing === "new" ? null : editing}
          processes={processes}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
