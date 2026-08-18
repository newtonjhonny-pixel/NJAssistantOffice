"use client"

import { useEffect, useState } from "react"
import {
  Plus, Save, Trash2, Loader2, Pencil, X, ChevronDown, Download,
  LayoutGrid, KanbanSquare, Map, BarChart2, Network, CheckSquare, Square,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── types ──────────────────────────────────────────────────── */
type ProjectStatus   = "idea"|"analysis"|"planned"|"approved"|"in_progress"|"waiting"|"suspended"|"done"|"cancelled"
type ProjectPriority = "low"|"medium"|"high"|"strategic"
type DepType         = "depends_on"|"related"|"blocks"|"complements"
type ViewMode        = "org"|"portfolio"|"roadmap"|"kanban"|"matrix"

interface Dependency { projectId: string; type: DepType }

interface Project {
  id:          string
  name:        string
  code:        string
  category:    string
  objective:   string
  description: string
  responsible: string
  team:        string
  company:     string
  status:      ProjectStatus
  priority:    ProjectPriority
  startDate:   string  // YYYY-MM
  endDate:     string  // YYYY-MM
  progress:    number
  impact:      "low"|"medium"|"high"
  complexity:  "low"|"medium"|"high"
  benefits:    string[]
  systems:     string
  processes:   string
  dependencies:Dependency[]
  risks:       string
  asIs:        string
  toBe:        string
  notes:       string
}

interface Pillar { id: string; name: string; color: string; description: string; projectIds: string[] }

interface ProjectOrgData {
  title:    string
  subtitle: string
  pillars:  Pillar[]
  projects: Project[]
}

interface Props {
  editorRef:      React.RefObject<HTMLDivElement>
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
}

/* ── constants ──────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9)

const STATUS_CFG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  idea:        { label: "Ideia",        color: "#64748b", bg: "#f1f5f9" },
  analysis:    { label: "Em análise",   color: "#8b5cf6", bg: "#f5f3ff" },
  planned:     { label: "Planejado",    color: "#3b82f6", bg: "#eff6ff" },
  approved:    { label: "Aprovado",     color: "#06b6d4", bg: "#ecfeff" },
  in_progress: { label: "Em andamento", color: "#f59e0b", bg: "#fffbeb" },
  waiting:     { label: "Aguardando",   color: "#f97316", bg: "#fff7ed" },
  suspended:   { label: "Suspenso",     color: "#ef4444", bg: "#fef2f2" },
  done:        { label: "Concluído",    color: "#10b981", bg: "#ecfdf5" },
  cancelled:   { label: "Cancelado",    color: "#6b7280", bg: "#f9fafb" },
}

const PRIORITY_CFG: Record<ProjectPriority, { label: string; color: string }> = {
  low:       { label: "Baixa",      color: "#64748b" },
  medium:    { label: "Média",      color: "#3b82f6" },
  high:      { label: "Alta",       color: "#f59e0b" },
  strategic: { label: "Estratégica",color: "#8b5cf6" },
}

const IMPACT_CFG = { low: "Baixo", medium: "Médio", high: "Alto" }
const COMPLEX_CFG = { low: "Baixa", medium: "Média", high: "Alta" }

const PILLAR_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#f97316"]

const BENEFIT_OPTIONS = [
  "Redução de trabalho manual","Redução de custo","Redução de risco",
  "Compliance","Produtividade","Qualidade","Experiência do colaborador",
  "Automação","Integração","Gestão",
]

const DEP_TYPE_CFG: Record<DepType, string> = {
  depends_on:  "Depende de",
  related:     "Relacionado",
  blocks:      "Bloqueia",
  complements: "Complementa",
}

function defaultData(): ProjectOrgData {
  return {
    title: "Portfólio de Projetos",
    subtitle: "Transformação Digital",
    pillars: [
      { id: uid(), name: "Automação",   color: PILLAR_COLORS[0], description: "", projectIds: [] },
      { id: uid(), name: "Processos",   color: PILLAR_COLORS[1], description: "", projectIds: [] },
      { id: uid(), name: "Gestão",      color: PILLAR_COLORS[2], description: "", projectIds: [] },
      { id: uid(), name: "Experiência", color: PILLAR_COLORS[3], description: "", projectIds: [] },
    ],
    projects: [],
  }
}

function parse(raw: string | null): ProjectOrgData {
  if (!raw) return defaultData()
  try {
    const d = JSON.parse(raw)
    if (d.projects && Array.isArray(d.projects)) return d
    return defaultData()
  } catch { return defaultData() }
}

function emptyProject(): Project {
  const now = new Date()
  const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,"0")
  return {
    id: uid(), name: "", code: "", category: "", objective: "", description: "",
    responsible: "", team: "", company: "", status: "planned", priority: "medium",
    startDate: `${y}-${m}`, endDate: `${y}-12`,
    progress: 0, impact: "medium", complexity: "medium",
    benefits: [], systems: "", processes: "", dependencies: [],
    risks: "", asIs: "", toBe: "", notes: "",
  }
}

/* ── project form modal ─────────────────────────────────────── */
function ProjectModal({ project, pillars, onSave, onClose }: {
  project: Project; pillars: Pillar[]; onSave: (p: Project) => void; onClose: () => void
}) {
  const [p, setP] = useState<Project>(project)
  function upd(patch: Partial<Project>) { setP(prev => ({ ...prev, ...patch })) }

  const tabs = ["geral","cronograma","impacto","as_is","dependencias"] as const
  const [tab, setTab] = useState<typeof tabs[number]>("geral")

  const TAB_LABELS = { geral:"Geral", cronograma:"Datas", impacto:"Impacto", as_is:"AS-IS/TO-BE", dependencias:"Dependências" }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">{p.name || "Novo Projeto"}</h2>
            <p className="text-xs text-slate-400">{p.code || "Sem código"}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {/* tabs */}
        <div className="flex gap-0 border-b border-slate-100 px-5 pt-1">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-3 py-2 text-xs font-medium border-b-2 transition-all",
                tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {tab === "geral" && <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Nome *</label>
                <input value={p.name} onChange={e => upd({name: e.target.value})}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Código</label>
                <input value={p.code} onChange={e => upd({code: e.target.value})} placeholder="PROJ-01"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Status</label>
                <select value={p.status} onChange={e => upd({status: e.target.value as ProjectStatus})}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
                  {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Prioridade</label>
                <select value={p.priority} onChange={e => upd({priority: e.target.value as ProjectPriority})}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
                  {Object.entries(PRIORITY_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Responsável</label>
                <input value={p.responsible} onChange={e => upd({responsible: e.target.value})}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Categoria</label>
                <input value={p.category} onChange={e => upd({category: e.target.value})} placeholder="Automação, Integração..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Objetivo</label>
              <textarea value={p.objective} onChange={e => upd({objective: e.target.value})} rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Sistemas envolvidos</label>
              <input value={p.systems} onChange={e => upd({systems: e.target.value})} placeholder="Metadados, Secullum, eSocial..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Processos relacionados</label>
              <input value={p.processes} onChange={e => upd({processes: e.target.value})} placeholder="Folha, Admissão, Benefícios..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Pilar</label>
              <div className="flex gap-1.5 flex-wrap">
                {pillars.map(pi => (
                  <button key={pi.id} onClick={() => {
                    // toggle: mark by category name matching pilar
                    upd({ category: p.category === pi.name ? "" : pi.name })
                  }}
                    className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                      p.category === pi.name ? "text-white border-transparent" : "bg-white border-slate-200 text-slate-600")}
                    style={p.category === pi.name ? { background: pi.color, borderColor: pi.color } : {}}>
                    {pi.name}
                  </button>
                ))}
              </div>
            </div>
          </>}

          {tab === "cronograma" && <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Início (AAAA-MM)</label>
                <input value={p.startDate} onChange={e => upd({startDate: e.target.value})} placeholder="2026-07"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Fim (AAAA-MM)</label>
                <input value={p.endDate} onChange={e => upd({endDate: e.target.value})} placeholder="2026-12"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Progresso (%)</label>
                <input type="number" min={0} max={100} value={p.progress} onChange={e => upd({progress: Number(e.target.value)})}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Riscos</label>
              <textarea value={p.risks} onChange={e => upd({risks: e.target.value})} rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Observações</label>
              <textarea value={p.notes} onChange={e => upd({notes: e.target.value})} rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none" />
            </div>
          </>}

          {tab === "impacto" && <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Impacto</label>
                <select value={p.impact} onChange={e => upd({impact: e.target.value as any})}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
                  <option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Complexidade</label>
                <select value={p.complexity} onChange={e => upd({complexity: e.target.value as any})}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400">
                  <option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">Benefícios</label>
              <div className="flex flex-wrap gap-1.5">
                {BENEFIT_OPTIONS.map(b => (
                  <button key={b}
                    onClick={() => upd({ benefits: p.benefits.includes(b) ? p.benefits.filter(x=>x!==b) : [...p.benefits, b] })}
                    className={cn("px-2.5 py-1 rounded-lg text-xs border transition-all",
                      p.benefits.includes(b) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300")}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </>}

          {tab === "as_is" && <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">🔴 Como é hoje (AS-IS)</label>
                <textarea value={p.asIs} onChange={e => upd({asIs: e.target.value})} rows={8} placeholder="Descreva o processo atual..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">🟢 Como será (TO-BE)</label>
                <textarea value={p.toBe} onChange={e => upd({toBe: e.target.value})} rows={8} placeholder="Descreva o processo futuro..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
          </>}

          {tab === "dependencias" && <>
            <div className="space-y-2">
              {p.dependencies.map((dep, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={dep.type} onChange={e => { const d=[...p.dependencies]; d[i]={...dep,type:e.target.value as DepType}; upd({dependencies:d}) }}
                    className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400">
                    {Object.entries(DEP_TYPE_CFG).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input value={dep.projectId} onChange={e => { const d=[...p.dependencies]; d[i]={...dep,projectId:e.target.value}; upd({dependencies:d}) }}
                    placeholder="ID ou nome do projeto"
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400" />
                  <button onClick={() => upd({ dependencies: p.dependencies.filter((_,j)=>j!==i) })} className="p-1 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button onClick={() => upd({ dependencies: [...p.dependencies, { projectId:"", type:"depends_on" }] })}
                className="flex items-center gap-1 text-xs text-blue-600"><Plus className="w-3 h-3" /> Adicionar dependência</button>
            </div>
          </>}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={() => { if (p.name.trim()) onSave(p) }}
            className="flex-1 bg-blue-600 rounded-lg py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={!p.name.trim()}>Salvar Projeto</button>
        </div>
      </div>
    </div>
  )
}

/* ── project card (mini) ────────────────────────────────────── */
function ProjectCard({ project, onEdit, onDelete, compact = false }: {
  project: Project; onEdit: () => void; onDelete: () => void; compact?: boolean
}) {
  const st = STATUS_CFG[project.status]
  const pr = PRIORITY_CFG[project.priority]

  if (compact) {
    return (
      <div className="group rounded-lg border border-slate-200 bg-white p-2.5 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
        onClick={onEdit}>
        <div className="flex items-start justify-between gap-1">
          <span className="text-xs font-semibold text-slate-700 leading-tight">{project.name}</span>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600 shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
          {project.progress > 0 && (
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${project.progress}%` }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {project.code && <p className="text-[10px] text-slate-400 font-mono mb-0.5">{project.code}</p>}
          <h3 className="text-sm font-bold text-slate-800 leading-tight">{project.name}</h3>
          {project.objective && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{project.objective}</p>}
        </div>
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit}   className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50  text-red-500" ><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: pr.color, background: pr.color + "18" }}>{pr.label}</span>
        {project.impact !== "low" && <span className="text-xs text-slate-500">Impacto: {IMPACT_CFG[project.impact]}</span>}
      </div>

      {project.responsible && (
        <p className="text-xs text-slate-500 mt-2">👤 {project.responsible}</p>
      )}

      {(project.startDate || project.endDate) && (
        <p className="text-xs text-slate-400 mt-1">📅 {project.startDate} → {project.endDate}</p>
      )}

      {project.progress > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Progresso</span><span>{project.progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
      )}

      {project.benefits.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.benefits.slice(0,3).map(b => (
            <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{b}</span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── org view ───────────────────────────────────────────────── */
function OrgView({ data }: { data: ProjectOrgData }) {
  const unpillared = data.projects.filter(p => !data.pillars.some(pi => pi.name === p.category))

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="text-center py-4">
        <h2 className="text-xl font-bold text-slate-800">{data.title}</h2>
        {data.subtitle && <p className="text-sm text-slate-500 mt-1">{data.subtitle}</p>}
      </div>

      {/* Pillars */}
      <div className={cn("grid gap-4", `grid-cols-${Math.min(data.pillars.length, 4)}`)}>
        {data.pillars.map(pi => {
          const piProjects = data.projects.filter(p => p.category === pi.name)
          return (
            <div key={pi.id} className="rounded-xl border-2 overflow-hidden" style={{ borderColor: pi.color + "40" }}>
              <div className="px-3 py-2 text-center text-sm font-bold text-white" style={{ background: pi.color }}>
                {pi.name}
              </div>
              <div className="p-2 space-y-1.5 min-h-16 bg-white">
                {piProjects.length === 0
                  ? <p className="text-xs text-slate-300 text-center py-2">Sem projetos</p>
                  : piProjects.map(p => {
                    const st = STATUS_CFG[p.status]
                    return (
                      <div key={p.id} className="rounded-lg border p-2 text-xs" style={{ borderColor: pi.color + "30", background: pi.color + "08" }}>
                        <p className="font-semibold text-slate-700 leading-tight">{p.name}</p>
                        <span className="mt-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          )
        })}
      </div>

      {/* Unpillared */}
      {unpillared.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Sem pilar</p>
          <div className="grid grid-cols-3 gap-2">
            {unpillared.map(p => {
              const st = STATUS_CFG[p.status]
              return (
                <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                  <p className="font-semibold text-slate-700 leading-tight">{p.name}</p>
                  <span className="mt-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── kanban view ────────────────────────────────────────────── */
function KanbanView({ data }: { data: ProjectOrgData }) {
  const cols: ProjectStatus[] = ["planned","in_progress","waiting","done"]
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {cols.map(col => {
        const cfg = STATUS_CFG[col]
        const projects = data.projects.filter(p => p.status === col)
        return (
          <div key={col} className="w-64 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
              <span className="text-xs font-semibold text-slate-700">{cfg.label}</span>
              <span className="text-xs text-slate-400 ml-auto">{projects.length}</span>
            </div>
            <div className="space-y-2">
              {projects.length === 0
                ? <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-xs text-slate-300">Vazio</div>
                : projects.map(p => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    {p.code && <p className="text-[10px] text-slate-400 font-mono">{p.code}</p>}
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{p.name}</p>
                    {p.responsible && <p className="text-xs text-slate-500 mt-1">👤 {p.responsible}</p>}
                    {p.progress > 0 && (
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── roadmap view ───────────────────────────────────────────── */
function RoadmapView({ data }: { data: ProjectOrgData }) {
  const projects = data.projects.filter(p => p.startDate)
  if (projects.length === 0) return <p className="text-sm text-slate-400 text-center py-8">Nenhum projeto com datas definidas.</p>

  // Group by year-quarter
  const groups: Record<string, Project[]> = {}
  projects.forEach(p => {
    const [y, m] = (p.startDate || "2026-01").split("-").map(Number)
    const q = Math.ceil(m / 3)
    const key = `${y} Q${q}`
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })

  return (
    <div className="space-y-4">
      {Object.entries(groups).sort().map(([period, ps]) => (
        <div key={period}>
          <div className="flex items-center gap-3 mb-2">
            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{period}</div>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-2 ml-4">
            {ps.map(p => {
              const st = STATUS_CFG[p.status]
              const pi = PRIORITY_CFG[p.priority]
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: st.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.startDate} → {p.endDate}</p>
                    {p.responsible && <p className="text-xs text-slate-400">👤 {p.responsible}</p>}
                    <div className="flex gap-1 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: pi.color, background: pi.color + "18" }}>{pi.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── matrix view (impact × complexity) ─────────────────────── */
function MatrixView({ data }: { data: ProjectOrgData }) {
  const QUADRANTS = [
    { x: "low",  y: "high", label: "Quick Wins",             color: "#10b981", bg: "#ecfdf5", desc: "Alto impacto / Baixo esforço" },
    { x: "high", y: "high", label: "Projetos Estratégicos",  color: "#8b5cf6", bg: "#f5f3ff", desc: "Alto impacto / Alto esforço" },
    { x: "low",  y: "low",  label: "Melhorias",              color: "#64748b", bg: "#f8fafc", desc: "Baixo impacto / Baixo esforço" },
    { x: "high", y: "low",  label: "Reavaliar",              color: "#ef4444", bg: "#fef2f2", desc: "Baixo impacto / Alto esforço" },
  ]

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        {QUADRANTS.map(q => {
          const ps = data.projects.filter(p => p.complexity === q.x && p.impact === q.y)
          return (
            <div key={q.label} className="rounded-xl border-2 p-3" style={{ borderColor: q.color + "40", background: q.bg }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold" style={{ color: q.color }}>{q.label}</h4>
                <span className="text-xs text-slate-500 font-medium">{ps.length} projetos</span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{q.desc}</p>
              <div className="space-y-1.5">
                {ps.length === 0
                  ? <p className="text-xs text-slate-300 text-center py-2">—</p>
                  : ps.map(p => {
                    const st = STATUS_CFG[p.status]
                    return (
                      <div key={p.id} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5">
                        <p className="text-xs font-semibold text-slate-700">{p.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-400 px-1">
        <span>← Baixo esforço · Alta complexidade →</span>
        <span>↑ Alto impacto ↓ Baixo impacto</span>
      </div>
    </div>
  )
}

/* ── dashboard strip ────────────────────────────────────────── */
function DashboardStrip({ projects }: { projects: Project[] }) {
  const total    = projects.length
  const planned  = projects.filter(p => ["planned","approved","idea","analysis"].includes(p.status)).length
  const inProg   = projects.filter(p => p.status === "in_progress").length
  const done     = projects.filter(p => p.status === "done").length
  const highPri  = projects.filter(p => ["high","strategic"].includes(p.priority)).length

  const kpis = [
    { label: "Total",         value: total,   color: "#3b82f6" },
    { label: "Planejados",    value: planned,  color: "#64748b" },
    { label: "Em andamento",  value: inProg,   color: "#f59e0b" },
    { label: "Concluídos",    value: done,     color: "#10b981" },
    { label: "Alta prioridade",value: highPri, color: "#8b5cf6" },
  ]

  return (
    <div className="grid grid-cols-5 gap-2">
      {kpis.map(k => (
        <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
          <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
        </div>
      ))}
    </div>
  )
}

/* ── import from projects API ───────────────────────────────── */
function ImportModal({ onImport, onClose }: { onImport: (projects: Project[]) => void; onClose: () => void }) {
  const [list,     setList]     = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(d => { setList(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function toggle(id: string) { setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]) }

  function doImport() {
    const selected_items = list.filter(p => selected.includes(p.id))
    const mapped: Project[] = selected_items.map(p => ({
      id:          p.id,
      name:        p.name || p.title || "",
      code:        p.code || "",
      category:    p.area || p.category || "",
      objective:   p.objective || p.description || "",
      description: p.description || "",
      responsible: p.responsible || p.owner || "",
      team:        p.team || "",
      company:     p.company || "",
      status:      mapStatus(p.status),
      priority:    mapPriority(p.priority),
      startDate:   p.startDate ? p.startDate.slice(0,7) : "",
      endDate:     p.dueDate  ? p.dueDate.slice(0,7) : "",
      progress:    p.progress || 0,
      impact:      "medium",
      complexity:  "medium",
      benefits:    [],
      systems:     p.systems || "",
      processes:   p.processes || "",
      dependencies:[],
      risks:       p.risks || "",
      asIs:        "",
      toBe:        "",
      notes:       p.notes || "",
    }))
    onImport(mapped)
  }

  function mapStatus(s?: string): ProjectStatus {
    const map: Record<string,ProjectStatus> = {
      "EM_ANDAMENTO":"in_progress","CONCLUIDO":"done","CANCELADO":"cancelled","PLANEJADO":"planned","AGUARDANDO":"waiting","SUSPENSO":"suspended"
    }
    return map[s ?? ""] ?? "planned"
  }
  function mapPriority(s?: string): ProjectPriority {
    const map: Record<string,ProjectPriority> = { "ALTA":"high","BAIXA":"low","MEDIA":"medium","ESTRATEGICA":"strategic" }
    return map[s ?? ""] ?? "medium"
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Importar Projetos</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum projeto encontrado no módulo Projetos.</p>
          ) : (
            <div className="space-y-1">
              {list.map(p => (
                <button key={p.id} onClick={() => toggle(p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left">
                  {selected.includes(p.id)
                    ? <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                    : <Square      className="w-4 h-4 text-slate-300 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.name || p.title}</p>
                    {p.status && <p className="text-xs text-slate-400">{p.status}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={() => { doImport(); onClose() }} disabled={selected.length === 0}
            className="flex-1 bg-blue-600 rounded-lg py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            Importar ({selected.length})
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── main editor ────────────────────────────────────────────── */
export function ProjectOrgEditor({ editorRef, initialContent, onSave }: Props) {
  const [data,        setData]        = useState<ProjectOrgData>(() => parse(initialContent))
  const [saving,      setSaving]      = useState(false)
  const [dirty,       setDirty]       = useState(false)
  const [view,        setView]        = useState<ViewMode>("portfolio")
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [showImport,  setShowImport]  = useState(false)
  const [editPillars, setEditPillars] = useState(false)

  function mut(fn: (d: ProjectOrgData) => ProjectOrgData) { setData(fn); setDirty(true) }

  function addProject() {
    setEditProject(emptyProject())
  }

  function saveProject(p: Project) {
    mut(d => ({
      ...d,
      projects: d.projects.find(x => x.id === p.id)
        ? d.projects.map(x => x.id === p.id ? p : x)
        : [...d.projects, p]
    }))
    setEditProject(null)
  }

  function deleteProject(id: string) {
    if (!confirm("Remover projeto?")) return
    mut(d => ({ ...d, projects: d.projects.filter(p => p.id !== id) }))
  }

  function importProjects(ps: Project[]) {
    mut(d => {
      const existing = new Set(d.projects.map(p => p.id))
      const news = ps.filter(p => !existing.has(p.id))
      return { ...d, projects: [...d.projects, ...news] }
    })
  }

  async function save() { setSaving(true); await onSave(JSON.stringify(data)); setDirty(false); setSaving(false) }

  const VIEW_TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    { id: "portfolio", label: "Portfólio",  icon: LayoutGrid },
    { id: "org",       label: "Organograma",icon: Network },
    { id: "roadmap",   label: "Roadmap",    icon: Map },
    { id: "kanban",    label: "Kanban",     icon: KanbanSquare },
    { id: "matrix",    label: "Matriz",     icon: BarChart2 },
  ]

  return (
    <div ref={editorRef} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 flex-wrap">
        <Network className="w-4 h-4 text-violet-600" />
        <div className="flex flex-col">
          <input value={data.title} onChange={e => mut(d => ({...d, title: e.target.value}))}
            className="text-sm font-bold bg-transparent focus:outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-500 px-1 w-48" />
          <input value={data.subtitle} onChange={e => mut(d => ({...d, subtitle: e.target.value}))}
            placeholder="Subtítulo..." className="text-xs text-slate-500 bg-transparent focus:outline-none px-1 w-48" />
        </div>

        {/* View tabs */}
        <div className="flex gap-1 ml-2">
          {VIEW_TABS.map(v => {
            const Icon = v.icon
            return (
              <button key={v.id} onClick={() => setView(v.id)}
                className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  view === v.id ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                )}>
                <Icon className="w-3.5 h-3.5" />{v.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        <button onClick={() => setEditPillars(v => !v)}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium",
            editPillars ? "bg-violet-100 border-violet-300 text-violet-700" : "bg-white border-slate-200 text-slate-600 hover:border-violet-300")}>
          Pilares
        </button>
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-violet-300">
          Importar
        </button>
        <button onClick={addProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700">
          <Plus className="w-3.5 h-3.5" /> Projeto
        </button>
        <button onClick={save} disabled={saving||!dirty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {dirty ? "Salvar*" : "Salvo"}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Dashboard strip */}
        <DashboardStrip projects={data.projects} />

        {/* Pillars editor */}
        {editPillars && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Pilares</h3>
              <button onClick={() => mut(d => ({ ...d, pillars: [...d.pillars, { id: uid(), name: "Novo Pilar", color: PILLAR_COLORS[d.pillars.length % PILLAR_COLORS.length], description: "", projectIds: [] }] }))}
                className="flex items-center gap-1 text-xs text-violet-700 hover:text-violet-900">
                <Plus className="w-3 h-3" /> Adicionar pilar
              </button>
            </div>
            {data.pillars.map(pi => (
              <div key={pi.id} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ background: pi.color }} />
                <input value={pi.name} onChange={e => mut(d => ({ ...d, pillars: d.pillars.map(x => x.id === pi.id ? {...x, name: e.target.value} : x) }))}
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400" />
                <div className="flex gap-1">
                  {PILLAR_COLORS.map(c => (
                    <button key={c} onClick={() => mut(d => ({ ...d, pillars: d.pillars.map(x => x.id === pi.id ? {...x, color: c} : x) }))}
                      className={cn("w-4 h-4 rounded-full border-2 hover:scale-110", pi.color===c?"border-slate-700":"border-transparent")}
                      style={{ background: c }} />
                  ))}
                </div>
                <button onClick={() => mut(d => ({ ...d, pillars: d.pillars.filter(x => x.id !== pi.id) }))}
                  className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Main view */}
        {data.projects.length === 0 && view === "portfolio" ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-12 gap-3">
            <Network className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-500">Nenhum projeto ainda</p>
            <div className="flex gap-2">
              <button onClick={addProject} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium">+ Criar projeto</button>
              <button onClick={() => setShowImport(true)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">Importar</button>
            </div>
          </div>
        ) : view === "portfolio" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.projects.map(p => (
              <ProjectCard key={p.id} project={p} onEdit={() => setEditProject(p)} onDelete={() => deleteProject(p.id)} />
            ))}
          </div>
        ) : view === "org" ? (
          <OrgView data={data} />
        ) : view === "roadmap" ? (
          <RoadmapView data={data} />
        ) : view === "kanban" ? (
          <KanbanView data={data} />
        ) : view === "matrix" ? (
          <MatrixView data={data} />
        ) : null}
      </div>

      {/* Modals */}
      {editProject && (
        <ProjectModal
          project={editProject}
          pillars={data.pillars}
          onSave={saveProject}
          onClose={() => setEditProject(null)}
        />
      )}
      {showImport && (
        <ImportModal onImport={importProjects} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
