"use client"

import { useState } from "react"
import { Plus, Save, Trash2, Loader2, ChevronDown, GripVertical, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

/* ── types ──────────────────────────────────────────────────── */
type Granularity = "month" | "quarter" | "year"
type ItemStatus  = "planned" | "in_progress" | "done" | "waiting" | "cancelled"

interface Milestone { id: string; name: string; date: string }
interface TimelineItem {
  id:          string
  name:        string
  start:       string   // YYYY-MM
  end:         string   // YYYY-MM
  status:      ItemStatus
  responsible: string
  color:       string
  progress:    number
  milestones:  Milestone[]
  dependsOn:   string[]
  note:        string
}

interface TimelineData {
  title:       string
  granularity: Granularity
  items:       TimelineItem[]
}

interface Props {
  editorRef:      React.RefObject<HTMLDivElement>
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
}

/* ── helpers ────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9)

const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#f97316"]

const STATUS_CFG: Record<ItemStatus, { label: string; color: string }> = {
  planned:     { label: "Planejado",   color: "#64748b" },
  in_progress: { label: "Em andamento",color: "#3b82f6" },
  done:        { label: "Concluído",   color: "#10b981" },
  waiting:     { label: "Aguardando",  color: "#f59e0b" },
  cancelled:   { label: "Cancelado",   color: "#ef4444" },
}

function defaultData(): TimelineData {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  return {
    title: "Roadmap",
    granularity: "quarter",
    items: [
      { id: uid(), name: "Projeto 1", start: `${y}-${m}`, end: `${y}-${String(now.getMonth() + 3).padStart(2, "0")}`,
        status: "planned", responsible: "", color: COLORS[0], progress: 0, milestones: [], dependsOn: [], note: "" },
    ],
  }
}

function parse(raw: string | null): TimelineData {
  if (!raw) return defaultData()
  try {
    const d = JSON.parse(raw)
    if (d.items && Array.isArray(d.items)) return d
    return defaultData()
  } catch { return defaultData() }
}

function monthsBetween(start: string, end: string): number {
  const [sy, sm] = start.split("-").map(Number)
  const [ey, em] = end.split("-").map(Number)
  return Math.max(0, (ey - sy) * 12 + (em - sm) + 1)
}

function allMonths(items: TimelineItem[]): string[] {
  if (items.length === 0) {
    const now = new Date()
    const months: string[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    }
    return months
  }
  const all = items.flatMap(it => [it.start, it.end])
  all.sort()
  const [minY, minM] = all[0].split("-").map(Number)
  const [maxY, maxM] = all[all.length - 1].split("-").map(Number)
  const result: string[] = []
  let y = minY, m = minM
  while (y < maxY || (y === maxY && m <= maxM)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`)
    m++; if (m > 12) { m = 1; y++ }
  }
  return result
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-")
  const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
  return `${names[Number(m) - 1]}/${y.slice(2)}`
}

function monthIndex(months: string[], ym: string): number {
  return months.indexOf(ym)
}

/* ── item form ──────────────────────────────────────────────── */
function ItemForm({
  item, onChange, onDelete, allItems,
}: {
  item: TimelineItem
  onChange: (patch: Partial<TimelineItem>) => void
  onDelete: () => void
  allItems: TimelineItem[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
        <span className="flex-1 text-sm font-medium text-slate-700">{item.name || "Sem nome"}</span>
        <span className="text-xs text-slate-400">{item.start} → {item.end}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: STATUS_CFG[item.status].color + "22", color: STATUS_CFG[item.status].color }}>
          {STATUS_CFG[item.status].label}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </div>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">Nome</label>
            <input value={item.name} onChange={e => onChange({ name: e.target.value })}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Início (AAAA-MM)</label>
            <input value={item.start} onChange={e => onChange({ start: e.target.value })}
              placeholder="2026-07"
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Fim (AAAA-MM)</label>
            <input value={item.end} onChange={e => onChange({ end: e.target.value })}
              placeholder="2026-09"
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Status</label>
            <select value={item.status} onChange={e => onChange({ status: e.target.value as ItemStatus })}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-400">
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Responsável</label>
            <input value={item.responsible} onChange={e => onChange({ responsible: e.target.value })}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Progresso (%)</label>
            <input type="number" min={0} max={100} value={item.progress} onChange={e => onChange({ progress: Number(e.target.value) })}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Cor</label>
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => onChange({ color: c })}
                  className={cn("w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                    item.color === c ? "border-slate-700" : "border-transparent")}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">Observação</label>
            <textarea value={item.note} onChange={e => onChange({ note: e.target.value })} rows={2} resize-none
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <div className="col-span-2 flex justify-end">
            <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 border border-red-200">
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── gantt chart ────────────────────────────────────────────── */
function GanttChart({ data }: { data: TimelineData }) {
  const months = allMonths(data.items)
  const COL_W = 60
  const ROW_H = 44
  const LABEL_W = 180

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div style={{ minWidth: LABEL_W + months.length * COL_W }}>
        {/* Header */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div style={{ width: LABEL_W }} className="shrink-0 px-3 py-2 text-xs font-semibold text-slate-500 border-r border-slate-200">
            Projeto / Etapa
          </div>
          <div className="flex">
            {months.map(m => (
              <div key={m} style={{ width: COL_W }}
                className="text-center text-xs text-slate-500 py-2 border-r border-slate-100 shrink-0 font-medium">
                {formatMonth(m)}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {data.items.map((item, rowIdx) => {
          const startIdx = monthIndex(months, item.start)
          const span     = monthsBetween(item.start, item.end)
          const validStart = startIdx >= 0
          const cfg = STATUS_CFG[item.status]

          return (
            <div key={item.id} className={cn("flex items-center border-b border-slate-100", rowIdx % 2 === 1 && "bg-slate-50/50")}>
              <div style={{ height: ROW_H, width: LABEL_W, display: "flex", alignItems: "center" }} className="shrink-0 px-3 border-r border-slate-200">
                <div>
                  <div className="text-xs font-medium text-slate-700 leading-tight truncate max-w-[164px]">{item.name}</div>
                  {item.responsible && <div className="text-[10px] text-slate-400 truncate max-w-[164px]">{item.responsible}</div>}
                </div>
              </div>
              <div className="flex relative" style={{ height: ROW_H }}>
                {months.map((m, mi) => (
                  <div key={m} style={{ width: COL_W }}
                    className="border-r border-slate-100 shrink-0 h-full" />
                ))}
                {validStart && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rounded-full flex items-center px-2"
                    style={{
                      left:    startIdx * COL_W + 4,
                      width:   Math.max(span * COL_W - 8, 20),
                      height:  24,
                      background: item.color,
                      opacity: item.status === "cancelled" ? 0.4 : 1,
                    }}
                  >
                    {/* progress fill */}
                    {item.progress > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 rounded-full"
                        style={{ width: `${item.progress}%`, background: "rgba(255,255,255,0.35)" }}
                      />
                    )}
                    <span className="text-[10px] text-white font-medium truncate relative z-10">
                      {item.name}
                    </span>
                    {item.progress > 0 && (
                      <span className="ml-auto text-[9px] text-white/80 relative z-10 shrink-0 ml-1">{item.progress}%</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── main ───────────────────────────────────────────────────── */
export function TimelineEditor({ editorRef, initialContent, onSave }: Props) {
  const [data,   setData]   = useState<TimelineData>(() => parse(initialContent))
  const [saving, setSaving] = useState(false)
  const [dirty,  setDirty]  = useState(false)
  const [view,   setView]   = useState<"gantt" | "list">("gantt")

  function mut(fn: (d: TimelineData) => TimelineData) {
    setData(fn); setDirty(true)
  }

  function addItem() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const m3 = String(now.getMonth() + 3).padStart(2, "0")
    const color = COLORS[data.items.length % COLORS.length]
    mut(d => ({
      ...d,
      items: [...d.items, {
        id: uid(), name: `Projeto ${d.items.length + 1}`,
        start: `${y}-${m}`, end: `${y}-${m3}`,
        status: "planned", responsible: "", color, progress: 0, milestones: [], dependsOn: [], note: "",
      }]
    }))
  }

  function updateItem(id: string, patch: Partial<TimelineItem>) {
    mut(d => ({ ...d, items: d.items.map(it => it.id === id ? { ...it, ...patch } : it) }))
  }

  function deleteItem(id: string) {
    mut(d => ({ ...d, items: d.items.filter(it => it.id !== id) }))
  }

  async function save() {
    setSaving(true)
    await onSave(JSON.stringify(data))
    setDirty(false)
    setSaving(false)
  }

  return (
    <div ref={editorRef} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 flex-wrap">
        <Calendar className="w-4 h-4 text-cyan-600" />
        <input
          value={data.title}
          onChange={e => mut(d => ({ ...d, title: e.target.value }))}
          className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 min-w-0"
        />
        <div className="flex gap-1 ml-2">
          {(["gantt","list"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                view === v ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-slate-600 border-slate-200 hover:border-cyan-300"
              )}>
              {v === "gantt" ? "Gantt" : "Lista"}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={addItem}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium hover:bg-cyan-700">
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
        <button onClick={save} disabled={saving || !dirty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {dirty ? "Salvar*" : "Salvo"}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {view === "gantt" ? (
          data.items.length === 0
            ? <p className="text-sm text-slate-400 text-center py-8">Nenhum item. Clique em "Adicionar" para começar.</p>
            : <GanttChart data={data} />
        ) : (
          <div className="space-y-2">
            {data.items.length === 0
              ? <p className="text-sm text-slate-400 text-center py-8">Nenhum item ainda.</p>
              : data.items.map(item => (
                <ItemForm key={item.id} item={item} onChange={p => updateItem(item.id, p)} onDelete={() => deleteItem(item.id)} allItems={data.items} />
              ))
            }
          </div>
        )}

        {/* Legend */}
        {data.items.length > 0 && view === "gantt" && (
          <div className="flex items-center gap-4 flex-wrap pt-2">
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: v.color }} />
                <span className="text-xs text-slate-500">{v.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
