"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Plus, Save, Trash2, Pencil, X, ChevronDown, ChevronUp, Loader2,
  Play, Pause, Flag, CheckCircle2, Circle, Clock, AlertTriangle,
  XCircle, Ban, Sparkles, Eye, EyeOff, ArrowRight, GripVertical,
  ChevronLeft, ChevronRight, Filter, BarChart2, Users, Calendar,
  FileDown, Table, Presentation, Maximize2, Minimize2, ScanSearch,
  FileSpreadsheet,
} from "lucide-react"
import {
  exportProjectMapPdf,
  exportProjectMapPptx,
  exportProjectMapExcel,
  generatePreviewDataUrl,
} from "./projectMapExport"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type StepStatus  = "not_started"|"planned"|"in_progress"|"waiting"|"blocked"|"done"|"cancelled"
type NodeType    = "start"|"middle"|"milestone"|"end"
type ProjStatus  = "idea"|"planned"|"in_progress"|"waiting"|"done"|"cancelled"|"late"
type Priority    = "low"|"medium"|"high"|"critical"
type ViewMode    = "detailed"|"executive"

interface MapStep {
  id:             string
  number:         number
  title:          string
  description:    string
  responsible:    string
  startDate:      string
  endDate:        string
  endDateActual:  string
  status:         StepStatus
  progress:       number
  notes:          string
  deliverable:    string
  dependsOn:      string | null   // step id
  system:         string
  nodeType:       NodeType
}

interface CrossDep {
  fromProjectId: string
  toProjectId:   string
  label:         string
}

interface MapProject {
  id:          string
  code:        string
  name:        string
  objective:   string
  description: string
  responsible: string
  team:        string
  status:      ProjStatus
  priority:    Priority
  startDate:   string
  endDate:     string
  progress:    number
  progressManual: boolean
  category:    string
  systems:     string
  processes:   string
  color:       string
  steps:       MapStep[]
}

interface ProjectMapData {
  title:            string
  subtitle:         string
  projects:         MapProject[]
  view:             ViewMode
  showDependencies: boolean
  crossDeps:        CrossDep[]
}

interface Props {
  editorRef:      React.RefObject<HTMLDivElement>
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_STATUS_CFG: Record<StepStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  not_started: { label: "Não iniciada", color: "text-slate-500", bg: "bg-slate-50",   border: "border-slate-200", icon: Circle },
  planned:     { label: "Planejada",    color: "text-blue-600",  bg: "bg-blue-50",    border: "border-blue-200",  icon: Clock },
  in_progress: { label: "Em andamento", color: "text-amber-600", bg: "bg-amber-50",   border: "border-amber-300", icon: Play },
  waiting:     { label: "Aguardando",   color: "text-purple-600",bg: "bg-purple-50",  border: "border-purple-200",icon: Pause },
  blocked:     { label: "Bloqueada",    color: "text-red-600",   bg: "bg-red-50",     border: "border-red-300",   icon: AlertTriangle },
  done:        { label: "Concluída",    color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-300",icon: CheckCircle2 },
  cancelled:   { label: "Cancelada",   color: "text-slate-400", bg: "bg-slate-100",  border: "border-slate-200", icon: XCircle },
}

const PROJ_STATUS_CFG: Record<ProjStatus, { label: string; color: string; dot: string }> = {
  idea:        { label: "Ideia",        color: "text-slate-500", dot: "bg-slate-400" },
  planned:     { label: "Planejado",    color: "text-blue-600",  dot: "bg-blue-500"  },
  in_progress: { label: "Em andamento", color: "text-amber-600", dot: "bg-amber-500" },
  waiting:     { label: "Aguardando",   color: "text-purple-600",dot: "bg-purple-500"},
  done:        { label: "Concluído",    color: "text-emerald-600",dot: "bg-emerald-500"},
  cancelled:   { label: "Cancelado",   color: "text-slate-400", dot: "bg-slate-400" },
  late:        { label: "Atrasado",     color: "text-red-600",   dot: "bg-red-500"   },
}

const PRIORITY_CFG: Record<Priority, { label: string; color: string }> = {
  low:      { label: "Baixa",    color: "text-slate-500" },
  medium:   { label: "Média",    color: "text-blue-600"  },
  high:     { label: "Alta",     color: "text-amber-600" },
  critical: { label: "Crítica",  color: "text-red-600"   },
}

const PROJECT_COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444",
  "#06b6d4","#ec4899","#84cc16","#f97316","#6366f1",
]

function uid() { return Math.random().toString(36).slice(2, 10) }

function makeStep(n: number, overrides?: Partial<MapStep>): MapStep {
  return {
    id: uid(), number: n, title: `Etapa ${n}`,
    description: "", responsible: "", startDate: "", endDate: "",
    endDateActual: "", status: n === 1 ? "in_progress" : "not_started",
    progress: 0, notes: "", deliverable: "", dependsOn: null,
    system: "", nodeType: n === 1 ? "start" : "middle",
    ...overrides,
  }
}

function makeProject(idx: number): MapProject {
  return {
    id: uid(), code: `P${String(idx).padStart(2,"0")}`, name: `Projeto ${idx}`,
    objective: "", description: "", responsible: "", team: "",
    status: "planned", priority: "medium",
    startDate: "", endDate: "", progress: 0, progressManual: false,
    category: "", systems: "", processes: "",
    color: PROJECT_COLORS[(idx - 1) % PROJECT_COLORS.length],
    steps: [makeStep(1, { nodeType: "start" }), makeStep(2), makeStep(3, { nodeType: "end" })],
  }
}

function calcProgress(p: MapProject): number {
  if (p.progressManual) return p.progress
  if (!p.steps.length) return 0
  const done = p.steps.filter(s => s.status === "done").length
  return Math.round((done / p.steps.length) * 100)
}

// ── Demo data (Section 17) ─────────────────────────────────────────────────────

function makeDemoData(): ProjectMapData {
  return {
    title: "Transformação Digital do DP",
    subtitle: "Portfólio de projetos estratégicos",
    view: "detailed",
    showDependencies: false,
    crossDeps: [],
    projects: [
      {
        id: "p01", code: "P01", name: "Integração do Ponto",
        objective: "Integrar o sistema de controle de ponto Secullum com o Metadados.",
        description: "Projeto de integração entre sistemas para automatizar a apuração de frequência.",
        responsible: "Gerente DP", team: "DP + TI", status: "in_progress", priority: "high",
        startDate: "2026-03", endDate: "2026-09", progress: 45, progressManual: false,
        category: "Integração", systems: "Secullum, Metadados", processes: "Apuração de Ponto",
        color: "#3b82f6",
        steps: [
          { id: uid(), number:1, title:"Diagnóstico",       description:"Mapear como as informações do ponto são processadas atualmente.", responsible:"Analista DP", startDate:"2026-03-01", endDate:"2026-03-31", endDateActual:"2026-03-28", status:"done",        progress:100, notes:"", deliverable:"Relatório de diagnóstico", dependsOn:null, system:"Secullum", nodeType:"start" },
          { id: uid(), number:2, title:"Mapeamento",        description:"Identificar os layouts e eventos a integrar.", responsible:"Analista DP", startDate:"2026-04-01", endDate:"2026-04-30", endDateActual:"2026-04-30", status:"done",        progress:100, notes:"", deliverable:"Documento de layout", dependsOn:null, system:"Metadados", nodeType:"middle" },
          { id: uid(), number:3, title:"Def. do Layout",    description:"Definir eventos, layout e regras de integração.", responsible:"DP + TI",    startDate:"2026-05-01", endDate:"2026-05-31", endDateActual:"2026-05-20", status:"done",        progress:100, notes:"", deliverable:"Especificação técnica", dependsOn:null, system:"Metadados", nodeType:"middle" },
          { id: uid(), number:4, title:"Desenvolvimento",   description:"Desenvolver a integração conforme especificação.", responsible:"TI",         startDate:"2026-06-01", endDate:"2026-07-31", endDateActual:"",           status:"in_progress", progress: 60, notes:"", deliverable:"API integrada", dependsOn:null, system:"Metadados", nodeType:"middle" },
          { id: uid(), number:5, title:"Homologação",       description:"Testar e validar a integração em ambiente controlado.", responsible:"DP + TI", startDate:"2026-08-01", endDate:"2026-08-31", endDateActual:"",          status:"not_started", progress:  0, notes:"", deliverable:"Relatório de testes", dependsOn:null, system:"Ambos", nodeType:"middle" },
          { id: uid(), number:6, title:"Go-live",           description:"Colocar a integração em produção.", responsible:"TI",                         startDate:"2026-09-01", endDate:"2026-09-30", endDateActual:"",           status:"not_started", progress:  0, notes:"", deliverable:"Integração em produção", dependsOn:null, system:"Ambos", nodeType:"end" },
        ],
      },
      {
        id: "p02", code: "P02", name: "Integração de Benefícios",
        objective: "Automatizar o processamento de benefícios via integração de sistemas.",
        description: "Padronização e integração dos dados de benefícios com operadoras.",
        responsible: "Coordenador DP", team: "DP + TI + Financeiro", status: "planned", priority: "medium",
        startDate: "2026-06", endDate: "2026-11", progress: 0, progressManual: false,
        category: "Integração", systems: "Metadados, Sistemas de benefícios", processes: "Gestão de Benefícios",
        color: "#8b5cf6",
        steps: [
          { id: uid(), number:1, title:"Levantamento",  description:"Mapear benefícios ativos e seus layouts.", responsible:"Analista DP", startDate:"2026-06-01", endDate:"2026-06-30", endDateActual:"", status:"planned",     progress:  0, notes:"", deliverable:"Inventário de benefícios", dependsOn:null, system:"Metadados", nodeType:"start" },
          { id: uid(), number:2, title:"Padronização",  description:"Padronizar os formatos de dados.", responsible:"Analista DP",          startDate:"2026-07-01", endDate:"2026-07-31", endDateActual:"", status:"not_started", progress:  0, notes:"", deliverable:"Mapeamento de dados", dependsOn:null, system:"Metadados", nodeType:"middle" },
          { id: uid(), number:3, title:"Integração",    description:"Implementar as integrações.", responsible:"TI",                        startDate:"2026-08-01", endDate:"2026-09-30", endDateActual:"", status:"not_started", progress:  0, notes:"", deliverable:"APIs integradas", dependsOn:null, system:"Operadoras", nodeType:"middle" },
          { id: uid(), number:4, title:"Testes",        description:"Validar os dados integrados.", responsible:"DP + TI",                  startDate:"2026-10-01", endDate:"2026-10-31", endDateActual:"", status:"not_started", progress:  0, notes:"", deliverable:"Relatório de testes", dependsOn:null, system:"Ambos", nodeType:"middle" },
          { id: uid(), number:5, title:"Implantação",   description:"Colocar em produção.", responsible:"TI",                              startDate:"2026-11-01", endDate:"2026-11-30", endDateActual:"", status:"not_started", progress:  0, notes:"", deliverable:"Sistema em produção", dependsOn:null, system:"Todos", nodeType:"end" },
        ],
      },
      {
        id: "p03", code: "P03", name: "Admissão Digital",
        objective: "Digitalizar e automatizar o processo de admissão de novos colaboradores.",
        description: "Portal digital de admissão integrado ao eSocial e Metadados.",
        responsible: "Gerente DP", team: "DP + TI + RH", status: "in_progress", priority: "critical",
        startDate: "2026-02", endDate: "2026-12", progress: 0, progressManual: false,
        category: "Digitalização", systems: "Metadados, eSocial, Portal", processes: "Admissão",
        color: "#10b981",
        steps: [
          { id: uid(), number:1, title:"Mapear AS-IS",       description:"Mapear o processo atual de admissão.", responsible:"Analista DP", startDate:"2026-02-01", endDate:"2026-02-28", endDateActual:"2026-02-28", status:"done",        progress:100, notes:"", deliverable:"Mapa do processo atual", dependsOn:null, system:"Manual", nodeType:"start" },
          { id: uid(), number:2, title:"Definir TO-BE",      description:"Desenhar o processo futuro digital.", responsible:"DP + TI",    startDate:"2026-03-01", endDate:"2026-03-31", endDateActual:"2026-03-31", status:"done",        progress:100, notes:"", deliverable:"Mapa do processo futuro", dependsOn:null, system:"Portal", nodeType:"middle" },
          { id: uid(), number:3, title:"Portal Candidato",   description:"Desenvolver o portal de admissão.", responsible:"TI",          startDate:"2026-04-01", endDate:"2026-06-30", endDateActual:"",           status:"in_progress", progress: 70, notes:"", deliverable:"Portal funcionando", dependsOn:null, system:"Portal", nodeType:"middle" },
          { id: uid(), number:4, title:"Valid. Documental",  description:"Implementar validação de documentos.", responsible:"TI + DP",  startDate:"2026-07-01", endDate:"2026-07-31", endDateActual:"",           status:"not_started", progress:  0, notes:"", deliverable:"Motor de validação", dependsOn:null, system:"Portal", nodeType:"middle" },
          { id: uid(), number:5, title:"Integração Metad.",  description:"Integrar portal com Metadados.", responsible:"TI",             startDate:"2026-08-01", endDate:"2026-08-31", endDateActual:"",           status:"not_started", progress:  0, notes:"", deliverable:"Integração completa", dependsOn:null, system:"Metadados", nodeType:"middle" },
          { id: uid(), number:6, title:"Integração eSocial", description:"Integrar eventos de admissão ao eSocial.", responsible:"TI",  startDate:"2026-09-01", endDate:"2026-09-30", endDateActual:"",           status:"not_started", progress:  0, notes:"", deliverable:"eSocial integrado", dependsOn:null, system:"eSocial", nodeType:"middle" },
          { id: uid(), number:7, title:"Piloto",             description:"Rodar piloto com um grupo de admissões.", responsible:"DP",   startDate:"2026-10-01", endDate:"2026-10-31", endDateActual:"",           status:"not_started", progress:  0, notes:"", deliverable:"Relatório de piloto", dependsOn:null, system:"Todos", nodeType:"milestone" },
          { id: uid(), number:8, title:"Go-live",            description:"Colocar em produção para toda a empresa.", responsible:"TI",  startDate:"2026-11-01", endDate:"2026-12-31", endDateActual:"",           status:"not_started", progress:  0, notes:"", deliverable:"Processo digital ativo", dependsOn:null, system:"Todos", nodeType:"end" },
        ],
      },
      {
        id: "p04", code: "P04", name: "Automação da Folha",
        objective: "Reduzir o processamento manual da folha de pagamento.",
        description: "Classificação e automação de variáveis e atividades da folha.",
        responsible: "Coordenador DP", team: "DP + TI", status: "idea", priority: "high",
        startDate: "2026-09", endDate: "2027-03", progress: 0, progressManual: false,
        category: "Automação", systems: "Metadados", processes: "Processamento da Folha",
        color: "#f59e0b",
        steps: [
          { id: uid(), number:1, title:"Levantamento",          description:"Mapear todas as atividades manuais da folha.", responsible:"Analista DP", startDate:"2026-09-01", endDate:"2026-09-30", endDateActual:"", status:"not_started", progress:0, notes:"", deliverable:"Inventário de atividades", dependsOn:null, system:"Manual", nodeType:"start" },
          { id: uid(), number:2, title:"Classificação",         description:"Classificar atividades em manual/assistida/automática.", responsible:"DP + TI", startDate:"2026-10-01", endDate:"2026-10-31", endDateActual:"", status:"not_started", progress:0, notes:"", deliverable:"Matriz de classificação", dependsOn:null, system:"Metadados", nodeType:"middle" },
          { id: uid(), number:3, title:"Integração Variáveis",  description:"Integrar variáveis de forma automática.", responsible:"TI",            startDate:"2026-11-01", endDate:"2026-12-31", endDateActual:"", status:"not_started", progress:0, notes:"", deliverable:"Integrações ativas", dependsOn:null, system:"Metadados", nodeType:"middle" },
          { id: uid(), number:4, title:"Automação",             description:"Automatizar o cálculo das variáveis.", responsible:"TI",               startDate:"2027-01-01", endDate:"2027-01-31", endDateActual:"", status:"not_started", progress:0, notes:"", deliverable:"Módulo de automação", dependsOn:null, system:"Metadados", nodeType:"middle" },
          { id: uid(), number:5, title:"Conferência",           description:"Implementar conferência por exceção.", responsible:"DP",                startDate:"2027-02-01", endDate:"2027-02-28", endDateActual:"", status:"not_started", progress:0, notes:"", deliverable:"Dashboard de exceções", dependsOn:null, system:"Metadados", nodeType:"middle" },
          { id: uid(), number:6, title:"Implantação",           description:"Colocar em produção.", responsible:"TI",                               startDate:"2027-03-01", endDate:"2027-03-31", endDateActual:"", status:"not_started", progress:0, notes:"", deliverable:"Folha automatizada", dependsOn:null, system:"Metadados", nodeType:"end" },
        ],
      },
    ],
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepCard({
  step, projectColor, view, isFirst, isLast,
  onClick, onDelete, onDuplicate, onMoveLeft, onMoveRight, onInsertAfter,
}: {
  step: MapStep; projectColor: string; view: ViewMode
  isFirst: boolean; isLast: boolean
  onClick: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onInsertAfter: () => void
}) {
  const [menu, setMenu] = useState(false)
  const cfg = STEP_STATUS_CFG[step.status]
  const Icon = cfg.icon
  const isStart     = step.nodeType === "start"
  const isEnd       = step.nodeType === "end"
  const isMilestone = step.nodeType === "milestone"

  return (
    <div className="flex items-center gap-0 shrink-0">
      {/* Card */}
      <div className="relative group">
        <button
          onClick={onClick}
          className={cn(
            "relative w-36 rounded-xl border-2 p-2.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5",
            cfg.bg, cfg.border,
            isMilestone && "rounded-full w-auto px-3",
          )}
        >
          {/* Node type badge */}
          {isStart && (
            <span className="absolute -top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: projectColor }}>INÍCIO</span>
          )}
          {isEnd && (
            <span className="absolute -top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: projectColor }}>FIM</span>
          )}
          {isMilestone && (
            <span className="absolute -top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">MARCO</span>
          )}

          {/* Status icon + title */}
          <div className="flex items-start gap-1.5 mt-0.5">
            <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", cfg.color)} />
            <span className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">{step.title}</span>
          </div>

          {view === "detailed" && (
            <>
              {step.responsible && (
                <p className="mt-1 text-[10px] text-slate-500 truncate">{step.responsible}</p>
              )}
              {step.progress > 0 && (
                <div className="mt-1.5">
                  <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${step.progress}%`, backgroundColor: projectColor }} />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">{step.progress}%</p>
                </div>
              )}
              {step.endDate && (
                <p className="text-[9px] text-slate-400 mt-0.5">{step.endDate}</p>
              )}
            </>
          )}
        </button>

        {/* Context menu */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={e => { e.stopPropagation(); setMenu(m => !m) }}
            className="w-5 h-5 rounded bg-white shadow border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          {menu && (
            <div className="absolute right-0 top-6 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-36 z-20 text-xs">
              {!isFirst && <button onClick={() => { onMoveLeft(); setMenu(false) }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><ChevronLeft className="w-3 h-3" /> Mover esquerda</button>}
              {!isLast  && <button onClick={() => { onMoveRight(); setMenu(false) }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Mover direita</button>}
              <button onClick={() => { onInsertAfter(); setMenu(false) }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><Plus className="w-3 h-3" /> Inserir após</button>
              <button onClick={() => { onDuplicate(); setMenu(false) }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"><GripVertical className="w-3 h-3" /> Duplicar</button>
              <div className="border-t border-slate-100 my-1" />
              <button onClick={() => { onDelete(); setMenu(false) }} className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 className="w-3 h-3" /> Excluir</button>
            </div>
          )}
        </div>
      </div>

      {/* Connector arrow (not after last) */}
      {!isLast && (
        <div className="flex items-center shrink-0 px-1">
          <div className="h-0.5 w-6" style={{ backgroundColor: projectColor + "60" }} />
          <ArrowRight className="w-3.5 h-3.5" style={{ color: projectColor }} />
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project, onClick,
}: { project: MapProject; onClick: () => void }) {
  const pct  = calcProgress(project)
  const cfg  = PROJ_STATUS_CFG[project.status]
  return (
    <button
      onClick={onClick}
      className="shrink-0 w-44 rounded-xl border-2 border-l-4 bg-white p-3 text-left hover:shadow-md transition-all hover:-translate-y-0.5"
      style={{ borderColor: project.color + "40", borderLeftColor: project.color }}
    >
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{project.code}</div>
      <div className="text-sm font-semibold text-slate-800 leading-tight mt-0.5 line-clamp-2">{project.name}</div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
        <span className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</span>
      </div>
      {project.responsible && (
        <div className="text-[10px] text-slate-500 mt-1 truncate">{project.responsible}</div>
      )}
      <div className="mt-2">
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: project.color }} />
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">{pct}%</div>
      </div>
    </button>
  )
}

// ── Step Edit Panel ────────────────────────────────────────────────────────────

function StepPanel({ step, projectName, onUpdate, onClose }: {
  step: MapStep; projectName: string
  onUpdate: (s: MapStep) => void
  onClose: () => void
}) {
  const [s, setS] = useState<MapStep>(step)
  function field<K extends keyof MapStep>(k: K, v: MapStep[K]) { setS(cur => { const n = {...cur, [k]: v}; onUpdate(n); return n }) }

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-xl z-30 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Etapa {s.number} · {projectName}</p>
          <h3 className="text-sm font-bold text-slate-800 leading-tight">{s.title || "Sem título"}</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
          <input value={s.title} onChange={e => field("title", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo do nó</label>
          <select value={s.nodeType} onChange={e => field("nodeType", e.target.value as NodeType)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400">
            <option value="start">Início</option>
            <option value="middle">Desenvolvimento</option>
            <option value="milestone">Marco</option>
            <option value="end">Conclusão</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select value={s.status} onChange={e => field("status", e.target.value as StepStatus)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400">
            {Object.entries(STEP_STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
          <textarea value={s.description} onChange={e => field("description", e.target.value)}
            rows={3} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
          <input value={s.responsible} onChange={e => field("responsible", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Início</label>
            <input type="date" value={s.startDate} onChange={e => field("startDate", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Prazo</label>
            <input type="date" value={s.endDate} onChange={e => field("endDate", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Conclusão realizada</label>
          <input type="date" value={s.endDateActual} onChange={e => field("endDateActual", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Percentual ({s.progress}%)</label>
          <input type="range" min={0} max={100} value={s.progress} onChange={e => field("progress", Number(e.target.value))}
            className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Entregável</label>
          <input value={s.deliverable} onChange={e => field("deliverable", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Sistema relacionado</label>
          <input value={s.system} onChange={e => field("system", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
          <textarea value={s.notes} onChange={e => field("notes", e.target.value)}
            rows={2} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
        </div>
      </div>
    </div>
  )
}

// ── Project Edit Modal ─────────────────────────────────────────────────────────

function ProjectModal({ project, onUpdate, onClose, onDelete }: {
  project: MapProject
  onUpdate: (p: MapProject) => void
  onClose: () => void
  onDelete: () => void
}) {
  const [p, setP] = useState<MapProject>(project)
  function field<K extends keyof MapProject>(k: K, v: MapProject[K]) {
    setP(cur => { const n = {...cur, [k]: v}; onUpdate(n); return n })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-4 h-8 rounded-full" style={{ backgroundColor: p.color }} />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{p.code}</p>
              <h3 className="text-base font-bold text-slate-800">{p.name || "Projeto sem nome"}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (confirm("Excluir projeto?")) { onDelete(); onClose() } }}
              className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Código</label>
              <input value={p.code} onChange={e => field("code", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
              <input value={p.name} onChange={e => field("name", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Objetivo</label>
            <textarea value={p.objective} onChange={e => field("objective", e.target.value)}
              rows={2} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={p.status} onChange={e => field("status", e.target.value as ProjStatus)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                {Object.entries(PROJ_STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
              <select value={p.priority} onChange={e => field("priority", e.target.value as Priority)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
              <input value={p.responsible} onChange={e => field("responsible", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Equipe</label>
              <input value={p.team} onChange={e => field("team", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Início previsto</label>
              <input value={p.startDate} onChange={e => field("startDate", e.target.value)} placeholder="AAAA-MM"
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fim previsto</label>
              <input value={p.endDate} onChange={e => field("endDate", e.target.value)} placeholder="AAAA-MM"
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
            <input value={p.category} onChange={e => field("category", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sistemas envolvidos</label>
            <input value={p.systems} onChange={e => field("systems", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Processos impactados</label>
            <input value={p.processes} onChange={e => field("processes", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cor do projeto</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => field("color", c)}
                  className={cn("w-6 h-6 rounded-full border-2 transition-transform hover:scale-110", p.color === c ? "border-slate-700 scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" checked={p.progressManual} onChange={e => field("progressManual", e.target.checked)}
                className="rounded" />
              Percentual manual
            </label>
            {p.progressManual && (
              <div className="mt-1.5">
                <input type="range" min={0} max={100} value={p.progress}
                  onChange={e => field("progress", Number(e.target.value))} className="w-full" />
                <p className="text-xs text-slate-500">{p.progress}%</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AI Modal ─────────────────────────────────────────────────────────────────

function AiModal({ mode, onApply, onClose }: {
  mode: "single" | "portfolio"
  onApply: (projects: MapProject[]) => void
  onClose: () => void
}) {
  const [prompt, setPrompt]   = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  async function generate() {
    if (!prompt.trim() || loading) return
    setLoading(true); setError("")
    try {
      const systemPrompt = mode === "single"
        ? `Você é um especialista em gestão de projetos. O usuário descreverá um projeto. Gere um projeto no formato JSON com os campos: name, code, objective, description, responsible, team, status (use: planned/in_progress/done), priority (low/medium/high/critical), startDate (YYYY-MM), endDate (YYYY-MM), category, systems, processes, steps (array com: title, description, responsible, status, deliverable, system, nodeType onde primeiro=start, intermediários=middle, último=end, marcos=milestone). Retorne APENAS o JSON do projeto, sem markdown.`
        : `Você é um especialista em gestão de projetos. O usuário descreverá vários projetos. Gere um array JSON de projetos, cada um com os campos: name, code, objective, description, responsible, team, status, priority, startDate, endDate, category, systems, processes, steps (array com title, description, responsible, status, deliverable, system, nodeType onde primeiro=start, intermediários=middle, último=end). Retorne APENAS o JSON array, sem markdown.`

      const res = await fetch("/api/apresentacoes/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${systemPrompt}\n\nSolicitação do usuário: ${prompt}`, type: "project-map" }),
      })
      if (!res.ok) throw new Error("Erro na API de IA")
      const data = await res.json()
      const raw  = (data.content as string).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      const parsed = JSON.parse(raw)
      const arr: object[] = Array.isArray(parsed) ? parsed : [parsed]

      const projects: MapProject[] = arr.map((obj: any, i) => ({
        id: uid(), code: obj.code || `P${String(i+1).padStart(2,"0")}`,
        name: obj.name || "Projeto sem nome",
        objective: obj.objective || "", description: obj.description || "",
        responsible: obj.responsible || "", team: obj.team || "",
        status: obj.status || "planned", priority: obj.priority || "medium",
        startDate: obj.startDate || "", endDate: obj.endDate || "",
        progress: 0, progressManual: false,
        category: obj.category || "", systems: obj.systems || "", processes: obj.processes || "",
        color: PROJECT_COLORS[i % PROJECT_COLORS.length],
        steps: (obj.steps || []).map((s: any, j: number) => ({
          id: uid(), number: j + 1,
          title: s.title || `Etapa ${j+1}`,
          description: s.description || "",
          responsible: s.responsible || "",
          startDate: s.startDate || "", endDate: s.endDate || "", endDateActual: "",
          status: s.status || (j === 0 ? "planned" : "not_started"),
          progress: s.progress || 0, notes: "", deliverable: s.deliverable || "",
          dependsOn: null, system: s.system || "",
          nodeType: s.nodeType || (j === 0 ? "start" : j === (obj.steps.length - 1) ? "end" : "middle"),
        })),
      }))
      onApply(projects)
    } catch (e: any) {
      setError(e.message || "Erro ao gerar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {mode === "single" ? "Criar projeto com IA" : "Gerar portfólio com IA"}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === "single" ? "Descreva o projeto e a IA sugere as etapas" : "Descreva vários projetos de uma vez"}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={mode === "single"
            ? "Ex: Crie o projeto de integração do controle de ponto entre Secullum e Metadados..."
            : "Ex: Quero criar os projetos de integração de ponto, benefícios, admissão digital e automação da folha..."}
          rows={5}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 resize-none"
        />
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={generate} disabled={loading || !prompt.trim()}
            className="flex-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar</>}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-3 text-center">A IA apenas preenche o editor — você revisa antes de salvar.</p>
      </div>
    </div>
  )
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export function ProjectMapEditor({ editorRef, initialContent, onSave }: Props) {
  const [data,         setData]         = useState<ProjectMapData>(() => {
    if (!initialContent) return makeDemoData()
    try { return JSON.parse(initialContent) } catch { return makeDemoData() }
  })
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [selectedStep, setSelectedStep] = useState<{ projId: string; stepId: string } | null>(null)
  const [selectedProj, setSelectedProj] = useState<string | null>(null)
  const [presentMode,  setPresentMode]  = useState(false)
  const [fitScreen,    setFitScreen]    = useState(true)
  const [aiMode,       setAiMode]       = useState<"single"|"portfolio"|null>(null)
  const [filterStatus, setFilterStatus] = useState<ProjStatus | "all">("all")
  const [editTitle,    setEditTitle]    = useState(false)
  const [exportingFmt, setExportingFmt] = useState<"pdf"|"pptx"|"xlsx"|null>(null)
  const [showPreview,  setShowPreview]  = useState(false)
  const [previewUrl,   setPreviewUrl]   = useState<string|null>(null)
  const presentContentRef = useRef<HTMLDivElement>(null)
  const presentContainerRef = useRef<HTMLDivElement>(null)

  // Computed KPIs
  const projects   = data.projects
  const total      = projects.length
  const inProgress = projects.filter(p => p.status === "in_progress").length
  const planned    = projects.filter(p => p.status === "planned").length
  const done       = projects.filter(p => p.status === "done").length
  const late       = projects.filter(p => p.status === "late").length
  const avgPct     = total ? Math.round(projects.reduce((a, p) => a + calcProgress(p), 0) / total) : 0

  const visible = filterStatus === "all" ? projects : projects.filter(p => p.status === filterStatus)

  function updateData(fn: (d: ProjectMapData) => ProjectMapData) {
    setData(fn)
    setSaved(false)
  }

  // ── Exportação ──────────────────────────────────────────────────────────────

  const exportFilename = data.title.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "mapa-projetos"

  async function doExport(fmt: "pdf"|"pptx"|"xlsx") {
    setExportingFmt(fmt)
    try {
      if (fmt === "pdf")  await exportProjectMapPdf(data, exportFilename)
      if (fmt === "pptx") await exportProjectMapPptx(data, exportFilename)
      if (fmt === "xlsx") await exportProjectMapExcel(data, exportFilename)
    } catch (e: any) {
      alert("Erro ao exportar: " + (e.message ?? e))
    } finally {
      setExportingFmt(null)
    }
  }

  function openPreview() {
    const url = generatePreviewDataUrl(data)
    setPreviewUrl(url)
    setShowPreview(true)
  }

  async function save() {
    setSaving(true)
    try {
      await onSave(JSON.stringify(data))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function addProject() {
    updateData(d => ({ ...d, projects: [...d.projects, makeProject(d.projects.length + 1)] }))
  }

  function updateProject(updated: MapProject) {
    updateData(d => ({ ...d, projects: d.projects.map(p => p.id === updated.id ? updated : p) }))
  }

  function deleteProject(id: string) {
    updateData(d => ({ ...d, projects: d.projects.filter(p => p.id !== id) }))
    if (selectedProj === id) setSelectedProj(null)
  }

  function addStep(projId: string, afterIndex?: number) {
    updateData(d => ({
      ...d,
      projects: d.projects.map(p => {
        if (p.id !== projId) return p
        const steps = [...p.steps]
        const n     = steps.length + 1
        const newS  = makeStep(n, { nodeType: "middle" })
        if (afterIndex !== undefined) steps.splice(afterIndex + 1, 0, newS)
        else steps.push(newS)
        // Renumber & auto nodeType
        const numbered = steps.map((s, i) => ({
          ...s, number: i + 1,
          nodeType: i === 0 ? "start" : i === steps.length - 1 ? "end" : s.nodeType === "start" || s.nodeType === "end" ? "middle" : s.nodeType,
        } as MapStep))
        return { ...p, steps: numbered }
      }),
    }))
  }

  function deleteStep(projId: string, stepId: string) {
    if (selectedStep?.stepId === stepId) setSelectedStep(null)
    updateData(d => ({
      ...d,
      projects: d.projects.map(p => {
        if (p.id !== projId) return p
        const steps = p.steps.filter(s => s.id !== stepId)
        const renumbered = steps.map((s, i) => ({
          ...s, number: i + 1,
          nodeType: i === 0 ? "start" : i === steps.length - 1 ? "end" : s.nodeType === "start" || s.nodeType === "end" ? "middle" : s.nodeType,
        } as MapStep))
        return { ...p, steps: renumbered }
      }),
    }))
  }

  function moveStep(projId: string, stepId: string, dir: -1 | 1) {
    updateData(d => ({
      ...d,
      projects: d.projects.map(p => {
        if (p.id !== projId) return p
        const steps = [...p.steps]
        const idx   = steps.findIndex(s => s.id === stepId)
        const to    = idx + dir
        if (to < 0 || to >= steps.length) return p
        ;[steps[idx], steps[to]] = [steps[to], steps[idx]]
        const renumbered = steps.map((s, i) => ({
          ...s, number: i + 1,
          nodeType: i === 0 ? "start" : i === steps.length - 1 ? "end" : s.nodeType === "start" || s.nodeType === "end" ? "middle" : s.nodeType,
        } as MapStep))
        return { ...p, steps: renumbered }
      }),
    }))
  }

  function duplicateStep(projId: string, stepId: string) {
    updateData(d => ({
      ...d,
      projects: d.projects.map(p => {
        if (p.id !== projId) return p
        const idx  = p.steps.findIndex(s => s.id === stepId)
        const copy = { ...p.steps[idx], id: uid(), number: idx + 2, nodeType: "middle" as NodeType }
        const steps = [...p.steps.slice(0, idx + 1), copy, ...p.steps.slice(idx + 1)]
        const renumbered = steps.map((s, i) => ({
          ...s, number: i + 1,
          nodeType: i === 0 ? "start" : i === steps.length - 1 ? "end" : s.nodeType === "start" || s.nodeType === "end" ? "middle" : s.nodeType,
        } as MapStep))
        return { ...p, steps: renumbered }
      }),
    }))
  }

  function updateStep(projId: string, updated: MapStep) {
    updateData(d => ({
      ...d,
      projects: d.projects.map(p => {
        if (p.id !== projId) return p
        return { ...p, steps: p.steps.map(s => s.id === updated.id ? updated : s) }
      }),
    }))
  }

  const selectedStepObj = selectedStep
    ? data.projects.find(p => p.id === selectedStep.projId)?.steps.find(s => s.id === selectedStep.stepId)
    : null
  const selectedStepProj = selectedStep
    ? data.projects.find(p => p.id === selectedStep.projId)
    : null
  const selectedProjObj = selectedProj ? data.projects.find(p => p.id === selectedProj) : null

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Cálculo de escala para "Ajustar à tela" no modo apresentação ────────────
  const maxStepsCount  = Math.max(...data.projects.map(p => p.steps.length), 1)
  const NATURAL_ROW_H  = 108   // px por projeto (incluindo gap)
  const NATURAL_STEP_W = 152   // w-36 = 144 + conectores
  const NATURAL_PROJ_W = 200   // card do projeto
  const NATURAL_CONTENT_W = NATURAL_PROJ_W + maxStepsCount * NATURAL_STEP_W + 48
  const NATURAL_CONTENT_H = data.projects.length * NATURAL_ROW_H + 120  // +header

  if (presentMode) {
    // Escala "ajustar à tela": calcula após o container renderizar
    // Usamos valores de layout fixos para o cálculo sem depender do DOM
    const availW = typeof window !== "undefined" ? window.innerWidth  - 48 : 1200
    const availH = typeof window !== "undefined" ? window.innerHeight - 90 : 700
    const scaleW = availW / NATURAL_CONTENT_W
    const scaleH = availH / NATURAL_CONTENT_H
    const fitScale = Math.min(scaleW, scaleH, 1)

    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Presentation toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex-wrap">
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">{data.title}</h1>
            {data.subtitle && <p className="text-[11px] text-slate-500">{data.subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Ajustar à tela */}
            <button
              onClick={() => setFitScreen(f => !f)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                fitScreen
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
            >
              {fitScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {fitScreen ? "100%" : "Ajustar à tela"}
            </button>

            {/* Exportar PDF */}
            <button
              onClick={() => doExport("pdf")}
              disabled={exportingFmt === "pdf"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
            >
              {exportingFmt === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              PDF
            </button>

            {/* Exportar PPTX */}
            <button
              onClick={() => doExport("pptx")}
              disabled={exportingFmt === "pptx"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-blue-600 text-xs font-medium hover:bg-blue-50 disabled:opacity-60 transition-colors"
            >
              {exportingFmt === "pptx" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
              PowerPoint
            </button>

            <button onClick={() => setPresentMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition-colors">
              <X className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={presentContainerRef}
          className="flex-1 overflow-auto p-6 bg-slate-100 flex items-start justify-center"
        >
          <div
            ref={presentContentRef}
            style={fitScreen ? {
              transform: `scale(${fitScale})`,
              transformOrigin: "top center",
              width: NATURAL_CONTENT_W,
              marginBottom: NATURAL_CONTENT_H * fitScale - NATURAL_CONTENT_H,
            } : {}}
          >
            {/* Card de apresentação */}
            <div className="bg-white rounded-2xl shadow-xl" style={{ width: fitScreen ? NATURAL_CONTENT_W : undefined }}>
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-2xl font-bold text-slate-800 mb-0.5">{data.title}</h2>
                {data.subtitle && <p className="text-slate-500 text-sm">{data.subtitle}</p>}
              </div>
              <div className="p-6 space-y-3">
                {visible.map(proj => {
                  const pct  = calcProgress(proj)
                  const scfg = PROJ_STATUS_CFG[proj.status]
                  return (
                    <div key={proj.id} className="flex items-center gap-3">
                      {/* Mini project card */}
                      <div className="shrink-0 w-44 rounded-xl border-l-4 bg-slate-50 p-3"
                        style={{ borderLeftColor: proj.color }}>
                        <p className="text-[10px] font-bold text-slate-400">{proj.code}</p>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{proj.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", scfg.dot)} />
                          <span className={cn("text-[10px]", scfg.color)}>{scfg.label} · {pct}%</span>
                        </div>
                        <div className="mt-1.5">
                          <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: proj.color }} />
                          </div>
                        </div>
                      </div>
                      {/* Steps — sem overflow quando fitScreen */}
                      <div className={cn("flex items-center gap-0 pb-1", fitScreen ? "" : "overflow-x-auto flex-1")}>
                        {proj.steps.map((step, i) => {
                          const sc  = STEP_STATUS_CFG[step.status]
                          const SI  = sc.icon
                          const isL = i === proj.steps.length - 1
                          return (
                            <div key={step.id} className="flex items-center shrink-0">
                              <div className={cn("rounded-lg border px-2.5 py-1.5 relative", sc.bg, sc.border)}>
                                {(step.nodeType === "start" || step.nodeType === "end" || step.nodeType === "milestone") && (
                                  <span
                                    className="absolute -top-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                    style={{ backgroundColor: step.nodeType === "milestone" ? "#f59e0b" : proj.color }}
                                  >
                                    {step.nodeType === "start" ? "INÍCIO" : step.nodeType === "end" ? "FIM" : "MARCO"}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 mt-0.5">
                                  <SI className={cn("w-3 h-3 shrink-0", sc.color)} />
                                  <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">{step.title}</span>
                                </div>
                                {data.view === "detailed" && step.responsible && (
                                  <p className="text-[9px] text-slate-500 mt-0.5">{step.responsible}</p>
                                )}
                              </div>
                              {!isL && (
                                <div className="flex items-center shrink-0 px-1">
                                  <div className="h-px w-4" style={{ backgroundColor: proj.color + "80" }} />
                                  <ArrowRight className="w-3 h-3" style={{ color: proj.color }} />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={addProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Projeto
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <button onClick={() => setAiMode("single")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition-colors">
          <Sparkles className="w-4 h-4" /> Criar com IA
        </button>
        <button onClick={() => setAiMode("portfolio")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition-colors">
          <Sparkles className="w-4 h-4" /> Portfólio com IA
        </button>
        <div className="h-5 w-px bg-slate-200" />
        {/* View toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
          <button onClick={() => updateData(d => ({ ...d, view: "detailed" }))}
            className={cn("px-3 py-1.5 font-medium transition-colors", data.view === "detailed" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
            Detalhada
          </button>
          <button onClick={() => updateData(d => ({ ...d, view: "executive" }))}
            className={cn("px-3 py-1.5 font-medium transition-colors", data.view === "executive" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
            Executiva
          </button>
        </div>
        {/* Filter */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-blue-400 bg-white">
          <option value="all">Todos os projetos</option>
          {Object.entries(PROJ_STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Prévia de exportação */}
          <button onClick={openPreview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
            title="Pré-visualizar exportação">
            <ScanSearch className="w-4 h-4" /> Prévia
          </button>

          {/* PDF */}
          <button
            onClick={() => doExport("pdf")}
            disabled={exportingFmt === "pdf"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-60 transition-colors"
            title="Exportar PDF — A3 Paisagem"
          >
            {exportingFmt === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            PDF
          </button>

          {/* PowerPoint */}
          <button
            onClick={() => doExport("pptx")}
            disabled={exportingFmt === "pptx"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 disabled:opacity-60 transition-colors"
            title="Exportar PowerPoint — 1 slide 16:9"
          >
            {exportingFmt === "pptx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
            PowerPoint
          </button>

          {/* Excel */}
          <button
            onClick={() => doExport("xlsx")}
            disabled={exportingFmt === "xlsx"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-60 transition-colors"
            title="Exportar Excel — 3 abas de dados"
          >
            {exportingFmt === "xlsx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Excel
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <button onClick={() => setPresentMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
            <Eye className="w-4 h-4" /> Apresentar
          </button>
          <button onClick={save} disabled={saving}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              saved ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
            )}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando…" : saved ? "Salvo" : "Salvar"}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Total",       value: total,      color: "text-slate-700" },
          { label: "Em andamento",value: inProgress, color: "text-amber-600" },
          { label: "Planejados",  value: planned,    color: "text-blue-600"  },
          { label: "Concluídos",  value: done,       color: "text-emerald-600" },
          { label: "Atrasados",   value: late,       color: "text-red-600"   },
          { label: "Avanço geral",value: `${avgPct}%`, color: "text-violet-600" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={cn("text-xl font-bold", kpi.color)}>{kpi.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {editTitle ? (
          <div className="space-y-2">
            <input value={data.title} onChange={e => updateData(d => ({ ...d, title: e.target.value }))}
              placeholder="Título da apresentação"
              className="w-full text-lg font-bold text-slate-800 border-b border-blue-400 bg-transparent focus:outline-none" />
            <input value={data.subtitle} onChange={e => updateData(d => ({ ...d, subtitle: e.target.value }))}
              placeholder="Subtítulo / descrição (opcional)"
              className="w-full text-sm text-slate-500 border-b border-slate-200 bg-transparent focus:outline-none" />
            <button onClick={() => setEditTitle(false)} className="text-xs text-blue-600 hover:underline">OK</button>
          </div>
        ) : (
          <div className="flex items-start gap-2 group cursor-pointer" onClick={() => setEditTitle(true)}>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">{data.title}</h2>
              {data.subtitle && <p className="text-sm text-slate-500 mt-0.5">{data.subtitle}</p>}
            </div>
            <Pencil className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
          </div>
        )}
      </div>

      {/* Swimlanes */}
      <div ref={editorRef} className="space-y-2">
        {visible.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Nenhum projeto ainda</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "+ Projeto" para começar</p>
          </div>
        )}
        {visible.map(proj => (
          <div key={proj.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Row */}
            <div className="flex items-start gap-0 min-h-[100px]">
              {/* Project card — fixed left */}
              <div className="shrink-0 p-3 border-r border-slate-100">
                <ProjectCard project={proj} onClick={() => setSelectedProj(proj.id)} />
              </div>
              {/* Steps — scrollable */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex items-center gap-0 p-4 min-h-[100px]">
                  {proj.steps.map((step, i) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      projectColor={proj.color}
                      view={data.view}
                      isFirst={i === 0}
                      isLast={i === proj.steps.length - 1}
                      onClick={() => setSelectedStep({ projId: proj.id, stepId: step.id })}
                      onDelete={() => deleteStep(proj.id, step.id)}
                      onDuplicate={() => duplicateStep(proj.id, step.id)}
                      onMoveLeft={() => moveStep(proj.id, step.id, -1)}
                      onMoveRight={() => moveStep(proj.id, step.id, 1)}
                      onInsertAfter={() => addStep(proj.id, i)}
                    />
                  ))}
                  {/* Add step button */}
                  <button onClick={() => addStep(proj.id)}
                    className="shrink-0 ml-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors text-xs">
                    <Plus className="w-3.5 h-3.5" /> Etapa
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Step panel */}
      {selectedStep && selectedStepObj && selectedStepProj && (
        <StepPanel
          step={selectedStepObj}
          projectName={selectedStepProj.name}
          onUpdate={updated => updateStep(selectedStep.projId, updated)}
          onClose={() => setSelectedStep(null)}
        />
      )}

      {/* Project modal */}
      {selectedProj && selectedProjObj && (
        <ProjectModal
          project={selectedProjObj}
          onUpdate={updateProject}
          onClose={() => setSelectedProj(null)}
          onDelete={() => deleteProject(selectedProj)}
        />
      )}

      {/* AI modal */}
      {aiMode && (
        <AiModal
          mode={aiMode}
          onApply={projects => {
            updateData(d => ({ ...d, projects: [...d.projects, ...projects] }))
            setAiMode(null)
          }}
          onClose={() => setAiMode(null)}
        />
      )}

      {/* Modal de pré-visualização de exportação */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[95vh] w-full max-w-5xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">Pré-visualização da exportação</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifique se todos os projetos e etapas estão visíveis antes de exportar.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowPreview(false); doExport("pdf") }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" /> Baixar PDF
                </button>
                <button
                  onClick={() => { setShowPreview(false); doExport("pptx") }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  <Presentation className="w-3.5 h-3.5" /> Baixar PPTX
                </button>
                <button
                  onClick={() => { setShowPreview(false); doExport("xlsx") }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Baixar Excel
                </button>
                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-700 ml-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Prévia do mapa de projetos"
                className="rounded-xl shadow-lg mx-auto"
                style={{ maxWidth: "100%", border: "1px solid #e2e8f0" }}
              />
            </div>
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <p className="text-[11px] text-slate-500 text-center">
                A prévia usa formato A4 · PDF e PowerPoint usarão A3 paisagem e 16:9 respectivamente, com escala automática para conteúdo completo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
