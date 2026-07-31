"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Users2, Plus, ArrowLeft, Save, Trash2, Edit2, ChevronRight,
  Loader2, AlertTriangle, Download, GripVertical, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import jsPDF from "jspdf"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RaciActivity { id: string; name: string; description: string; order: number }
interface RaciRole     { id: string; name: string; title: string;       order: number }
type     RaciType      = "R" | "A" | "C" | "I"
type     Entries       = Record<string, RaciType | "">

interface RaciMatrix {
  id:          string
  processId:   string | null
  name:        string
  description: string | null
  activities:  string   // JSON
  roles:       string   // JSON
  entries:     string   // JSON
  notes:       string | null
  createdAt:   string
  updatedAt:   string
}

interface ParsedMatrix extends Omit<RaciMatrix, "activities" | "roles" | "entries"> {
  activities: RaciActivity[]
  roles:      RaciRole[]
  entries:    Entries
}

interface ProcessRecord { id: string; code: string | null; name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RACI_COLORS: Record<RaciType, string> = {
  R: "bg-blue-600 text-white",
  A: "bg-red-500  text-white",
  C: "bg-amber-400 text-white",
  I: "bg-emerald-500 text-white",
}
const RACI_CYCLE: (RaciType | "")[] = ["R", "A", "C", "I", ""]
const RACI_LABELS: Record<RaciType, string> = {
  R: "Responsável",
  A: "Aprovador",
  C: "Consultado",
  I: "Informado",
}

function newId() { return Math.random().toString(36).slice(2, 10) }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function parse(m: RaciMatrix): ParsedMatrix {
  return {
    ...m,
    activities: JSON.parse(m.activities || "[]"),
    roles:      JSON.parse(m.roles      || "[]"),
    entries:    JSON.parse(m.entries    || "{}"),
  }
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function exportPDF(matrix: ParsedMatrix) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Header
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, W, 18, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(`Matriz RACI — ${matrix.name}`, 10, 12)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, W - 10, 12, { align: "right" })

  const { activities, roles, entries } = matrix
  if (!activities.length || !roles.length) {
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(11)
    doc.text("Matriz sem atividades ou papéis definidos.", 10, 40)
    doc.save(`RACI-${matrix.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`)
    return
  }

  const colW = Math.min(35, (W - 70) / roles.length)
  const rowH = 10
  const startY = 25
  const actColW = W - 10 - roles.length * colW - 5

  // Header row
  doc.setFillColor(241, 245, 249)
  doc.rect(10, startY, actColW, rowH, "F")
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text("Atividade", 12, startY + 6.5)

  roles.forEach((r, ci) => {
    const x = 10 + actColW + ci * colW
    doc.setFillColor(241, 245, 249)
    doc.rect(x, startY, colW, rowH, "F")
    doc.setDrawColor(226, 232, 240)
    doc.rect(x, startY, colW, rowH, "S")
    doc.setTextColor(71, 85, 105)
    doc.text(r.name.substring(0, 14), x + colW / 2, startY + 6.5, { align: "center" })
    if (r.title) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6)
      doc.text(r.title.substring(0, 16), x + colW / 2, startY + 9.5, { align: "center" })
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
    }
  })

  // Data rows
  activities.forEach((act, ri) => {
    const y = startY + (ri + 1) * rowH
    if (y > H - 15) return
    const bg = ri % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
    doc.setFillColor(bg[0], bg[1], bg[2])
    doc.rect(10, y, actColW, rowH, "F")
    doc.setDrawColor(226, 232, 240)
    doc.rect(10, y, actColW, rowH, "S")
    doc.setTextColor(30, 41, 59)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(act.name.substring(0, 38), 12, y + 6.5)

    roles.forEach((r, ci) => {
      const x = 10 + actColW + ci * colW
      const val = entries[`${act.id}|${r.id}`] as RaciType | ""
      doc.setFillColor(bg[0], bg[1], bg[2])
      doc.rect(x, y, colW, rowH, "F")
      doc.setDrawColor(226, 232, 240)
      doc.rect(x, y, colW, rowH, "S")
      if (val) {
        const clr: Record<string, [number, number, number]> = {
          R: [37, 99, 235], A: [239, 68, 68], C: [245, 158, 11], I: [16, 185, 129],
        }
        const c = clr[val] ?? [100, 100, 100]
        doc.setFillColor(c[0], c[1], c[2])
        doc.roundedRect(x + colW / 2 - 4, y + 1.5, 8, 7, 1.5, 1.5, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.text(val, x + colW / 2, y + 6.5, { align: "center" })
      }
    })
  })

  // Legend
  const ly = H - 12
  doc.setFontSize(7)
  const legend: [RaciType, string, [number,number,number]][] = [
    ["R", "Responsável — executa",          [37, 99, 235]],
    ["A", "Aprovador — autoriza/responde",  [239, 68, 68]],
    ["C", "Consultado — contribui",         [245, 158, 11]],
    ["I", "Informado — recebe resultado",   [16, 185, 129]],
  ]
  legend.forEach(([type, desc, c], i) => {
    const lx = 10 + i * 70
    doc.setFillColor(c[0], c[1], c[2])
    doc.roundedRect(lx, ly - 4, 6, 5, 1, 1, "F")
    doc.setTextColor(71, 85, 105)
    doc.setFont("helvetica", "normal")
    doc.text(`${type} = ${desc}`, lx + 8, ly)
  })

  doc.save(`RACI-${matrix.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`)
}

// ─── Legenda ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-3">
      {(Object.entries(RACI_LABELS) as [RaciType, string][]).map(([type, label]) => (
        <div key={type} className="flex items-center gap-1.5">
          <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold", RACI_COLORS[type])}>{type}</span>
          <span className="text-xs text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Painel de Resumo ─────────────────────────────────────────────────────────

function SummaryPanel({ matrix }: { matrix: ParsedMatrix }) {
  const { activities, roles, entries } = matrix
  if (!activities.length || !roles.length) return null

  const byRole = roles.map(r => {
    const counts = { R: 0, A: 0, C: 0, I: 0 }
    activities.forEach(a => {
      const v = entries[`${a.id}|${r.id}`] as RaciType | ""
      if (v) counts[v]++
    })
    return { role: r, counts }
  })

  const byActivity = activities.map(a => {
    const responsible = roles.filter(r => entries[`${a.id}|${r.id}`] === "R").map(r => r.name)
    const approver    = roles.filter(r => entries[`${a.id}|${r.id}`] === "A").map(r => r.name)
    return { activity: a, responsible, approver }
  })

  const warnings = byActivity.filter(a => a.responsible.length === 0 || a.approver.length === 0)

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> {warnings.length} atividade{warnings.length !== 1 ? "s" : ""} com lacunas
          </p>
          <ul className="space-y-1">
            {warnings.map(w => (
              <li key={w.activity.id} className="text-xs text-amber-700">
                <strong>{w.activity.name}</strong>
                {w.responsible.length === 0 && " — sem Responsável (R)"}
                {w.approver.length === 0    && " — sem Aprovador (A)"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Por Papel</p>
          <div className="space-y-2">
            {byRole.map(({ role, counts }) => (
              <div key={role.id} className="flex items-center gap-2">
                <div className="w-28 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{role.name}</p>
                  {role.title && <p className="text-[10px] text-slate-400 truncate">{role.title}</p>}
                </div>
                <div className="flex gap-1 ml-auto">
                  {(["R","A","C","I"] as RaciType[]).map(t => (
                    <span key={t} className={cn("w-6 h-5 rounded text-[10px] font-bold flex items-center justify-center", counts[t] > 0 ? RACI_COLORS[t] : "bg-slate-100 text-slate-300")}>
                      {counts[t] > 0 ? counts[t] : "·"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Por Atividade — Responsável (R)</p>
          <div className="space-y-1.5">
            {byActivity.map(({ activity, responsible }) => (
              <div key={activity.id} className="flex items-start gap-2">
                <p className="text-xs text-slate-600 flex-1 min-w-0 truncate">{activity.name}</p>
                <p className="text-xs text-blue-600 font-medium shrink-0">
                  {responsible.length > 0 ? responsible.join(", ") : <span className="text-slate-300">—</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Editor da Matriz ─────────────────────────────────────────────────────────

function MatrixEditor({
  initial, processes, onSaved, onCancel,
}: {
  initial?: ParsedMatrix
  processes: ProcessRecord[]
  onSaved: () => void
  onCancel: () => void
}) {
  const [name,        setName]        = useState(initial?.name        ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [processId,   setProcessId]   = useState(initial?.processId   ?? "")
  const [notes,       setNotes]       = useState(initial?.notes       ?? "")
  const [activities,  setActivities]  = useState<RaciActivity[]>(initial?.activities ?? [])
  const [roles,       setRoles]       = useState<RaciRole[]>(initial?.roles ?? [])
  const [entries,     setEntries]     = useState<Entries>(initial?.entries ?? {})
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState("")
  const [activeView,  setActiveView]  = useState<"matrix" | "summary">("matrix")

  // Activity helpers
  function addActivity() {
    const id = newId()
    setActivities(prev => [...prev, { id, name: "", description: "", order: prev.length }])
  }
  function updateActivity(id: string, field: keyof RaciActivity, value: string) {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }
  function removeActivity(id: string) {
    setActivities(prev => prev.filter(a => a.id !== id))
    setEntries(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => { if (k.startsWith(id + "|")) delete next[k] })
      return next
    })
  }

  // Role helpers
  function addRole() {
    const id = newId()
    setRoles(prev => [...prev, { id, name: "", title: "", order: prev.length }])
  }
  function updateRole(id: string, field: keyof RaciRole, value: string) {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }
  function removeRole(id: string) {
    setRoles(prev => prev.filter(r => r.id !== id))
    setEntries(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => { if (k.endsWith("|" + id)) delete next[k] })
      return next
    })
  }

  // Entry click — cycle through R → A → C → I → ""
  function cycleEntry(actId: string, roleId: string) {
    const key = `${actId}|${roleId}`
    const cur = entries[key] ?? ""
    const idx = RACI_CYCLE.indexOf(cur as RaciType | "")
    const nxt = RACI_CYCLE[(idx + 1) % RACI_CYCLE.length]
    setEntries(prev => ({ ...prev, [key]: nxt }))
  }

  async function save() {
    if (!name.trim()) { setError("Nome é obrigatório"); return }
    setSaving(true); setError("")
    try {
      const url    = initial ? `/api/raci/${initial.id}` : "/api/raci"
      const method = initial ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, processId: processId || null, notes, activities, roles, entries }),
      })
      if (!res.ok) throw new Error(await res.text())
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar")
    } finally { setSaving(false) }
  }

  const matrixForPDF: ParsedMatrix = {
    ...(initial ?? { id: "", createdAt: "", updatedAt: "", processId: null, description: null, notes: null }),
    name, description: description || null, processId: processId || null, notes: notes || null,
    activities, roles, entries,
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onCancel} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="text-lg font-bold text-slate-800">{initial ? "Editar Matriz RACI" : "Nova Matriz RACI"}</h2>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPDF(matrixForPDF)} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button onClick={save} disabled={saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Info geral */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Nome da Matriz *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: RACI — Folha de Pagamento"
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Processo Vinculado</label>
          <select value={processId} onChange={e => setProcessId(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
            <option value="">— Sem vínculo —</option>
            {processes.map(p => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ""}{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Descrição</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional..."
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
      </div>

      {/* Tabs matrix / summary */}
      <div className="flex border-b border-slate-200 gap-1">
        {(["matrix","summary"] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeView === v ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}>
            {v === "matrix" ? "Editor da Matriz" : "Resumo e Diagnóstico"}
          </button>
        ))}
      </div>

      {activeView === "summary" && <SummaryPanel matrix={matrixForPDF} />}

      {activeView === "matrix" && (
        <div className="space-y-4">
          {/* Legenda */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Legend />
            <p className="text-xs text-slate-400">Clique em uma célula para ciclar: R → A → C → I → vazio</p>
          </div>

          {/* Configuração em 2 colunas: atividades + papéis */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Atividades */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Atividades / Etapas</p>
                <button onClick={addActivity} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Nenhuma atividade. Clique em "Adicionar".</p>
              ) : (
                <div className="space-y-2">
                  {activities.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-2 group">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}.</span>
                      <input
                        value={a.name}
                        onChange={e => updateActivity(a.id, "name", e.target.value)}
                        placeholder="Nome da atividade..."
                        className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                      <button onClick={() => removeActivity(a.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Papéis */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Papéis / Pessoas</p>
                <button onClick={addRole} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              {roles.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Nenhum papel. Clique em "Adicionar".</p>
              ) : (
                <div className="space-y-2">
                  {roles.map(r => (
                    <div key={r.id} className="flex items-center gap-2 group">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <input
                        value={r.name}
                        onChange={e => updateRole(r.id, "name", e.target.value)}
                        placeholder="Nome / papel..."
                        className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                      <input
                        value={r.title}
                        onChange={e => updateRole(r.id, "title", e.target.value)}
                        placeholder="Cargo (opcional)"
                        className="w-32 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                      <button onClick={() => removeRole(r.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Matriz principal */}
          {activities.length > 0 && roles.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="bg-slate-50 text-left px-4 py-3 text-xs font-semibold text-slate-600 border-b border-r border-slate-200 w-64 min-w-[200px]">
                        Atividade
                      </th>
                      {roles.map(r => (
                        <th key={r.id} className="bg-slate-50 px-2 py-3 text-center border-b border-r border-slate-200 min-w-[80px]">
                          <p className="text-xs font-semibold text-slate-700">{r.name || "—"}</p>
                          {r.title && <p className="text-[10px] text-slate-400 font-normal">{r.title}</p>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a, ri) => (
                      <tr key={a.id} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="px-4 py-3 text-sm text-slate-700 border-r border-b border-slate-200 font-medium">
                          <span className="text-xs text-slate-400 mr-2">{ri + 1}.</span>
                          {a.name || <span className="text-slate-300 italic">sem nome</span>}
                        </td>
                        {roles.map(r => {
                          const key = `${a.id}|${r.id}`
                          const val = entries[key] as RaciType | "" | undefined
                          return (
                            <td key={r.id} className="border-r border-b border-slate-200 text-center p-2">
                              <button
                                onClick={() => cycleEntry(a.id, r.id)}
                                className={cn(
                                  "w-9 h-9 rounded-lg text-sm font-bold transition-all hover:scale-110 active:scale-95",
                                  val ? RACI_COLORS[val as RaciType] : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                                )}
                                title={val ? RACI_LABELS[val as RaciType] : "Clique para atribuir"}
                              >
                                {val || "·"}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activities.length === 0 || roles.length === 0) && (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <Users2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium text-slate-500">Adicione atividades e papéis para montar a matriz</p>
              <p className="text-sm mt-1">Use os painéis acima para definir as linhas e colunas da RACI.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TabRaci() {
  const [matrices,  setMatrices]  = useState<RaciMatrix[]>([])
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [selected,  setSelected]  = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mats, procs] = await Promise.all([
        fetch("/api/raci").then(r => r.json()),
        fetch("/api/processes").then(r => r.json()),
      ])
      setMatrices(Array.isArray(mats)  ? mats  : [])
      setProcesses(Array.isArray(procs) ? procs : [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteMatrix(id: string) {
    if (!confirm("Excluir esta matriz RACI?")) return
    setDeleting(id)
    await fetch(`/api/raci/${id}`, { method: "DELETE" })
    setDeleting(null)
    load()
  }

  const selectedMatrix = selected ? matrices.find(m => m.id === selected) : null

  if (creating || selectedMatrix) {
    const parsed = selectedMatrix ? parse(selectedMatrix) : undefined
    return (
      <MatrixEditor
        initial={parsed}
        processes={processes}
        onSaved={() => { setCreating(false); setSelected(null); load() }}
        onCancel={() => { setCreating(false); setSelected(null) }}
      />
    )
  }

  // Agrupar por processo
  const processMap = Object.fromEntries(processes.map(p => [p.id, p]))
  const grouped: Record<string, RaciMatrix[]> = {}
  const standalone: RaciMatrix[] = []
  for (const m of matrices) {
    if (m.processId && processMap[m.processId]) {
      ;(grouped[m.processId] ??= []).push(m)
    } else {
      standalone.push(m)
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Matrizes RACI</p>
          <p className="text-xs text-slate-400 mt-0.5">Defina responsabilidades para cada processo e atividade</p>
        </div>
        <Button onClick={() => setCreating(true)} size="sm" className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nova Matriz
        </Button>
      </div>

      {/* Legenda compacta */}
      <Legend />

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse" />)}</div>
      ) : matrices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          <Users2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium text-slate-600">Nenhuma matriz RACI criada</p>
          <p className="text-sm mt-1">Clique em "Nova Matriz" para começar.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Agrupadas por processo */}
          {Object.entries(grouped).map(([pid, mats]) => (
            <div key={pid}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {processMap[pid]?.code ? `${processMap[pid].code} — ` : ""}{processMap[pid]?.name}
              </p>
              <MatrixList mats={mats} onSelect={setSelected} onDelete={deleteMatrix} deleting={deleting} processes={processMap} />
            </div>
          ))}

          {/* Standalone */}
          {standalone.length > 0 && (
            <div>
              {Object.keys(grouped).length > 0 && (
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sem processo vinculado</p>
              )}
              <MatrixList mats={standalone} onSelect={setSelected} onDelete={deleteMatrix} deleting={deleting} processes={processMap} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MatrixList ───────────────────────────────────────────────────────────────

function MatrixList({
  mats, onSelect, onDelete, deleting, processes,
}: {
  mats: RaciMatrix[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  deleting: string | null
  processes: Record<string, ProcessRecord>
}) {
  return (
    <div className="space-y-2">
      {mats.map(m => {
        const acts  = JSON.parse(m.activities || "[]") as RaciActivity[]
        const roles = JSON.parse(m.roles      || "[]") as RaciRole[]
        const proc  = m.processId ? processes[m.processId] : null
        return (
          <div key={m.id}
            className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-3 hover:shadow-md hover:border-slate-300 transition-all group">
            <button className="flex items-center gap-3 flex-1 text-left min-w-0" onClick={() => onSelect(m.id)}>
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Users2 className="w-4 h-4 text-violet-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{m.name}</p>
                  {proc && (
                    <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5 font-medium shrink-0">
                      {proc.code ? `${proc.code} — ` : ""}{proc.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {acts.length} atividade{acts.length !== 1 ? "s" : ""} · {roles.length} papel{roles.length !== 1 ? "is" : ""} · Atualizado {formatDate(m.updatedAt)}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onSelect(m.id)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(m.id)} disabled={deleting === m.id} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors disabled:opacity-50">
                {deleting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
