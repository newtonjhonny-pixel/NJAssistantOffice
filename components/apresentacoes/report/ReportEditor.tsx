"use client"

import { useState } from "react"
import { Plus, Save, Trash2, Loader2, MoveUp, MoveDown, FileText, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/* ── types ──────────────────────────────────────────────────── */
type SectionType = "summary" | "kpi-row" | "table" | "text" | "list" | "timeline" | "next-steps"

interface KpiItem     { label: string; value: string; unit: string; trend: string }
interface TableRow    { cells: string[] }
interface StepItem    { text: string; done: boolean }

interface Section {
  id:       string
  type:     SectionType
  title:    string
  content?: string
  kpis?:    KpiItem[]
  headers?: string[]
  rows?:    TableRow[]
  items?:   string[]
  steps?:   StepItem[]
}

interface ReportData {
  title:    string
  subtitle: string
  author:   string
  date:     string
  theme:    string
  sections: Section[]
}

interface Props {
  editorRef:      React.RefObject<HTMLDivElement>
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
}

/* ── helpers ────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9)

function defaultData(): ReportData {
  const today = new Date().toISOString().slice(0,10)
  return {
    title: "Relatório Visual", subtitle: "Transformação Digital", author: "", date: today, theme: "blue",
    sections: [
      { id: uid(), type: "summary", title: "Resumo Executivo",
        content: "Descreva aqui o objetivo e contexto geral do relatório." },
      { id: uid(), type: "kpi-row", title: "Indicadores",
        kpis: [
          { label: "Total de Projetos", value: "10", unit: "", trend: "" },
          { label: "Em andamento",      value: "4",  unit: "", trend: "" },
          { label: "Concluídos",        value: "2",  unit: "", trend: "↑" },
        ]},
      { id: uid(), type: "text", title: "Contexto",
        content: "Adicione aqui o contexto e situação atual." },
      { id: uid(), type: "next-steps", title: "Próximos Passos",
        steps: [
          { text: "Mapear processos prioritários", done: true },
          { text: "Definir fornecedores", done: false },
          { text: "Iniciar projeto piloto", done: false },
        ]},
    ],
  }
}

function parse(raw: string | null): ReportData {
  if (!raw) return defaultData()
  try {
    const d = JSON.parse(raw)
    if (d.sections && Array.isArray(d.sections)) return d
    return defaultData()
  } catch { return defaultData() }
}

/* ── section editor ─────────────────────────────────────────── */
function SectionEditor({ section, onChange, onDelete, onMoveUp, onMoveDown }: {
  section: Section; onChange: (s: Section) => void; onDelete: () => void
  onMoveUp: () => void; onMoveDown: () => void
}) {
  const [open, setOpen] = useState(true)
  function upd(patch: Partial<Section>) { onChange({ ...section, ...patch }) }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-100 cursor-pointer"
        onClick={() => setOpen(o => !o)}>
        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", !open && "-rotate-90")} />
        <input value={section.title} onChange={e => { e.stopPropagation(); upd({ title: e.target.value }) }}
          onClick={e => e.stopPropagation()}
          className="flex-1 text-sm font-semibold text-slate-700 bg-transparent focus:outline-none" />
        <span className="text-xs text-slate-400">{section.type}</span>
        <button onClick={e => { e.stopPropagation(); onMoveUp() }}   className="p-1 rounded hover:bg-slate-200 text-slate-400"><MoveUp   className="w-3 h-3" /></button>
        <button onClick={e => { e.stopPropagation(); onMoveDown() }} className="p-1 rounded hover:bg-slate-200 text-slate-400"><MoveDown className="w-3 h-3" /></button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}   className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2    className="w-3 h-3" /></button>
      </div>

      {open && (
        <div className="p-3 space-y-2">
          {(section.type === "summary" || section.type === "text") && (
            <textarea value={section.content ?? ""} onChange={e => upd({ content: e.target.value })}
              rows={4} className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 resize-none" />
          )}

          {section.type === "kpi-row" && (
            <div className="space-y-2">
              {(section.kpis ?? []).map((kpi, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={kpi.label} onChange={e => { const kpis=[...(section.kpis??[])]; kpis[i]={...kpi,label:e.target.value}; upd({kpis}) }}
                    placeholder="Rótulo" className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                  <input value={kpi.value} onChange={e => { const kpis=[...(section.kpis??[])]; kpis[i]={...kpi,value:e.target.value}; upd({kpis}) }}
                    placeholder="Valor" className="w-20 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                  <input value={kpi.trend} onChange={e => { const kpis=[...(section.kpis??[])]; kpis[i]={...kpi,trend:e.target.value}; upd({kpis}) }}
                    placeholder="↑↓" className="w-12 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                  <button onClick={() => { const kpis=(section.kpis??[]).filter((_,j)=>j!==i); upd({kpis}) }}
                    className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => upd({ kpis: [...(section.kpis??[]), { label:"Indicador", value:"0", unit:"", trend:"" }] })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Plus className="w-3 h-3" /> Adicionar KPI
              </button>
            </div>
          )}

          {section.type === "list" && (
            <div className="space-y-1">
              {(section.items ?? []).map((item, i) => (
                <div key={i} className="flex gap-1">
                  <input value={item} onChange={e => { const items=[...(section.items??[])]; items[i]=e.target.value; upd({items}) }}
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                  <button onClick={() => { const items=(section.items??[]).filter((_,j)=>j!==i); upd({items}) }}
                    className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => upd({ items: [...(section.items??[]), ""] })}
                className="flex items-center gap-1 text-xs text-blue-600"><Plus className="w-3 h-3" /> Adicionar</button>
            </div>
          )}

          {section.type === "table" && (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Colunas (separadas por vírgula)</label>
                <input value={(section.headers??[]).join(",")} onChange={e => upd({ headers: e.target.value.split(",").map(s=>s.trim()) })}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
              </div>
              {(section.rows??[]).map((row, ri) => (
                <div key={ri} className="flex gap-1">
                  {(section.headers??["Col1"]).map((_, ci) => (
                    <input key={ci} value={row.cells[ci]??""} onChange={e => {
                      const rows=[...(section.rows??[])]; const cells=[...rows[ri].cells]; cells[ci]=e.target.value; rows[ri]={cells}; upd({rows})
                    }} className="flex-1 text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400" />
                  ))}
                  <button onClick={() => { const rows=(section.rows??[]).filter((_,j)=>j!==ri); upd({rows}) }}
                    className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => upd({ rows: [...(section.rows??[]), { cells: (section.headers??["Col1"]).map(()=>"") }] })}
                className="flex items-center gap-1 text-xs text-blue-600"><Plus className="w-3 h-3" /> Adicionar linha</button>
            </div>
          )}

          {section.type === "next-steps" && (
            <div className="space-y-1">
              {(section.steps??[]).map((step, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="checkbox" checked={step.done} onChange={e => { const steps=[...(section.steps??[])]; steps[i]={...step,done:e.target.checked}; upd({steps}) }} className="rounded" />
                  <input value={step.text} onChange={e => { const steps=[...(section.steps??[])]; steps[i]={...step,text:e.target.value}; upd({steps}) }}
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                  <button onClick={() => { const steps=(section.steps??[]).filter((_,j)=>j!==i); upd({steps}) }}
                    className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => upd({ steps: [...(section.steps??[]), { text:"", done:false }] })}
                className="flex items-center gap-1 text-xs text-blue-600"><Plus className="w-3 h-3" /> Adicionar passo</button>
            </div>
          )}

          {section.type === "timeline" && (
            <div className="space-y-1">
              {(section.items??[]).map((item, i) => (
                <div key={i} className="flex gap-1">
                  <input value={item} onChange={e => { const items=[...(section.items??[])]; items[i]=e.target.value; upd({items}) }}
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
                  <button onClick={() => { const items=(section.items??[]).filter((_,j)=>j!==i); upd({items}) }}
                    className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => upd({ items: [...(section.items??[]), ""] })}
                className="flex items-center gap-1 text-xs text-blue-600"><Plus className="w-3 h-3" /> Adicionar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── preview ────────────────────────────────────────────────── */
function ReportPreview({ data }: { data: ReportData }) {
  const themeColors: Record<string, string> = { blue: "#1e3a5f", emerald: "#065f46", violet: "#4c1d95", slate: "#1e293b" }
  const tc = themeColors[data.theme] ?? themeColors.blue

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {/* Cover */}
      <div className="px-8 py-10 text-white" style={{ background: tc }}>
        <p className="text-xs opacity-60 mb-2 uppercase tracking-widest">Relatório Visual</p>
        <h1 className="text-3xl font-bold leading-tight">{data.title}</h1>
        {data.subtitle && <p className="text-lg opacity-80 mt-2">{data.subtitle}</p>}
        <div className="flex items-center gap-4 mt-4 text-xs opacity-60">
          {data.author && <span>Por {data.author}</span>}
          {data.date && <span>{data.date}</span>}
        </div>
      </div>

      {/* Sections */}
      <div className="p-6 space-y-8">
        {data.sections.map(sec => (
          <div key={sec.id}>
            <h2 className="text-base font-bold text-slate-800 mb-3 pb-1 border-b border-slate-100">{sec.title}</h2>
            {(sec.type === "summary" || sec.type === "text") && (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{sec.content}</p>
            )}
            {sec.type === "kpi-row" && (
              <div className={cn("grid gap-4", `grid-cols-${Math.min(sec.kpis?.length??1, 4)}`)}>
                {(sec.kpis??[]).map((kpi, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4 text-center">
                    <div className="text-2xl font-bold text-slate-800">{kpi.value}{kpi.unit} {kpi.trend && <span className={cn("text-base", kpi.trend.startsWith("↑") ? "text-green-600" : "text-red-500")}>{kpi.trend}</span>}</div>
                    <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
                  </div>
                ))}
              </div>
            )}
            {sec.type === "list" && (
              <ul className="space-y-1">
                {(sec.items??[]).map((it, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="text-slate-400 mt-0.5">•</span>{it}</li>)}
              </ul>
            )}
            {sec.type === "table" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {(sec.headers??[]).map((h, i) => <th key={i} className="text-left px-3 py-2 text-xs font-semibold text-slate-600">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(sec.rows??[]).map((row, ri) => (
                      <tr key={ri} className="border-b border-slate-100 hover:bg-slate-50">
                        {row.cells.map((cell, ci) => <td key={ci} className="px-3 py-2 text-slate-700">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {sec.type === "next-steps" && (
              <div className="space-y-2">
                {(sec.steps??[]).map((step, i) => (
                  <div key={i} className={cn("flex items-start gap-3 p-3 rounded-lg border", step.done ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200")}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                      step.done ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600")}>{step.done ? "✓" : i+1}</div>
                    <p className={cn("text-sm", step.done ? "text-green-800 line-through" : "text-slate-700")}>{step.text}</p>
                  </div>
                ))}
              </div>
            )}
            {sec.type === "timeline" && (
              <div className="space-y-2">
                {(sec.items??[]).map((it, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-600 mt-0.5" />
                      {i < (sec.items??[]).length - 1 && <div className="w-0.5 flex-1 bg-blue-200 mt-1" style={{minHeight:20}} />}
                    </div>
                    <p className="text-sm text-slate-700">{it}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── main ───────────────────────────────────────────────────── */
export function ReportEditor({ editorRef, initialContent, onSave }: Props) {
  const [data,   setData]   = useState<ReportData>(() => parse(initialContent))
  const [saving, setSaving] = useState(false)
  const [dirty,  setDirty]  = useState(false)
  const [tab,    setTab]    = useState<"edit"|"preview">("edit")

  function mut(fn: (d: ReportData) => ReportData) { setData(fn); setDirty(true) }

  const ADD_TYPES: { type: SectionType; label: string }[] = [
    { type: "summary",    label: "Resumo" },
    { type: "kpi-row",    label: "KPIs" },
    { type: "text",       label: "Texto" },
    { type: "list",       label: "Lista" },
    { type: "table",      label: "Tabela" },
    { type: "timeline",   label: "Timeline" },
    { type: "next-steps", label: "Próx. Passos" },
  ]

  function addSection(type: SectionType) {
    const base = { id: uid(), type, title: type === "summary" ? "Resumo" : type === "kpi-row" ? "Indicadores" : type === "text" ? "Seção" : type === "list" ? "Lista" : type === "table" ? "Tabela" : type === "timeline" ? "Timeline" : "Próximos Passos" }
    let section: Section
    switch (type) {
      case "summary":    section = { ...base, content: "" }; break
      case "text":       section = { ...base, content: "" }; break
      case "kpi-row":    section = { ...base, kpis: [] }; break
      case "list":       section = { ...base, items: [] }; break
      case "table":      section = { ...base, headers: ["Coluna 1","Coluna 2"], rows: [] }; break
      case "timeline":   section = { ...base, items: [] }; break
      case "next-steps": section = { ...base, steps: [] }; break
    }
    mut(d => ({ ...d, sections: [...d.sections, section] }))
  }

  function updateSection(id: string, s: Section) { mut(d => ({ ...d, sections: d.sections.map(x => x.id === id ? s : x) })) }
  function deleteSection(id: string) { mut(d => ({ ...d, sections: d.sections.filter(x => x.id !== id) })) }
  function moveUp(i: number) { if (i === 0) return; mut(d => { const ss=[...d.sections]; [ss[i-1],ss[i]]=[ss[i],ss[i-1]]; return {...d,sections:ss} }) }
  function moveDown(i: number) { mut(d => { const ss=[...d.sections]; if(i>=ss.length-1) return d; [ss[i],ss[i+1]]=[ss[i+1],ss[i]]; return {...d,sections:ss} }) }

  async function save() { setSaving(true); await onSave(JSON.stringify(data)); setDirty(false); setSaving(false) }

  return (
    <div ref={editorRef} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 flex-wrap">
        <FileText className="w-4 h-4 text-slate-600" />
        <input value={data.title} onChange={e => mut(d => ({...d, title: e.target.value}))}
          className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 min-w-0" />
        <div className="flex gap-1 ml-2">
          {(["edit","preview"] as const).map(v => (
            <button key={v} onClick={() => setTab(v)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border",
                tab === v ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
              {v === "edit" ? "Editor" : "Prévia"}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <select value={data.theme} onChange={e => mut(d => ({...d, theme: e.target.value}))}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="blue">Azul</option><option value="emerald">Verde</option>
          <option value="violet">Roxo</option><option value="slate">Cinza</option>
        </select>
        <button onClick={save} disabled={saving||!dirty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {dirty ? "Salvar*" : "Salvo"}
        </button>
      </div>

      {tab === "edit" ? (
        <div className="p-4 space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Subtítulo</label>
              <input value={data.subtitle} onChange={e => mut(d => ({...d, subtitle: e.target.value}))}
                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Autor</label>
              <input value={data.author} onChange={e => mut(d => ({...d, author: e.target.value}))}
                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Data</label>
              <input type="date" value={data.date} onChange={e => mut(d => ({...d, date: e.target.value}))}
                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
            </div>
          </div>

          {/* Add section */}
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 self-center mr-1">+ Seção:</span>
            {ADD_TYPES.map(({ type, label }) => (
              <button key={type} onClick={() => addSection(type)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all">
                {label}
              </button>
            ))}
          </div>

          {/* Sections */}
          <div className="space-y-2">
            {data.sections.length === 0
              ? <p className="text-sm text-slate-400 text-center py-8">Nenhuma seção. Adicione acima.</p>
              : data.sections.map((sec, i) => (
                <SectionEditor key={sec.id} section={sec}
                  onChange={s => updateSection(sec.id, s)}
                  onDelete={() => deleteSection(sec.id)}
                  onMoveUp={() => moveUp(i)}
                  onMoveDown={() => moveDown(i)} />
              ))
            }
          </div>
        </div>
      ) : (
        <div className="p-4">
          <ReportPreview data={data} />
        </div>
      )}
    </div>
  )
}
