"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart2, Download, Bot, X, Loader2, AlertTriangle, CheckCircle2,
  Clock, Calendar, Printer, FileSpreadsheet, Info, TrendingUp,
  PauseCircle, XCircle, Flag, Layers, ListChecks, Trophy, Zap,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectData {
  id: string
  name: string
  description: string | null
  responsible: string | null
  startDate: string | null
  dueDate: string | null
  priority: string
  status: string
  progress: number
  isOverdue: boolean
  hasLateTasks: boolean
  totalStages: number
  doneStages: number
  totalTasks: number
  doneTasks: number
  createdAt: string
  milestones: { id: string; status: string }[]
}

interface IAResult { content: string; aiPowered: boolean; aiConfigured: boolean }

interface Filters {
  responsible: string
  status: string
  priority: string
  periodFrom: string
  periodTo: string
  onlyOverdue: boolean
  onlyDone: boolean
  onlyActive: boolean
}

const EMPTY_FILTERS: Filters = {
  responsible: "", status: "", priority: "",
  periodFrom: "", periodTo: "",
  onlyOverdue: false, onlyDone: false, onlyActive: false,
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEJADO: "Planejado", EM_ANDAMENTO: "Em andamento",
  PAUSADO: "Pausado",     ATRASADO: "Atrasado",
  CONCLUIDO: "Concluído", CANCELADO: "Cancelado",
}
const STATUS_COLOR: Record<string, string> = {
  PLANEJADO:    "#94a3b8",
  EM_ANDAMENTO: "#3b82f6",
  PAUSADO:      "#eab308",
  ATRASADO:     "#f97316",
  CONCLUIDO:    "#22c55e",
  CANCELADO:    "#ef4444",
}
const PRIORITY_LABEL: Record<string, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente",
}
const PRIORITY_COLOR: Record<string, string> = {
  BAIXA: "#22c55e", MEDIA: "#3b82f6", ALTA: "#f97316", URGENTE: "#ef4444",
}

// ─── SVG Pie Chart ────────────────────────────────────────────────────────────

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p className="text-xs text-slate-400 text-center py-8">Sem dados</p>

  let cumulative = 0
  const slices = data.map(d => {
    const pct   = d.value / total
    const start = cumulative
    cumulative += pct
    return { ...d, pct, start }
  })

  function arcPath(startPct: number, endPct: number, cx: number, cy: number, r: number) {
    const s = startPct * Math.PI * 2 - Math.PI / 2
    const e = endPct   * Math.PI * 2 - Math.PI / 2
    const x1 = cx + r * Math.cos(s)
    const y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e)
    const y2 = cy + r * Math.sin(e)
    const large = endPct - startPct > 0.5 ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
  }

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0">
        {slices.filter(s => s.pct > 0).map((s, i) => (
          <path
            key={i}
            d={arcPath(s.start, s.start + s.pct, 50, 50, 40)}
            fill={s.color}
            stroke="white"
            strokeWidth="1.5"
          />
        ))}
        <circle cx="50" cy="50" r="18" fill="white" />
        <text x="50" y="54" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#374151">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="flex-1">{s.label}</span>
            <span className="font-bold text-slate-800">{s.value}</span>
            <span className="text-slate-400">({Math.round(s.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SVG Horizontal Bar Chart ─────────────────────────────────────────────────

function BarChart({ data, color = "#6366f1" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  if (data.length === 0) return <p className="text-xs text-slate-400 py-4">Sem dados</p>
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <p className="text-xs text-slate-600 w-28 shrink-0 truncate" title={d.label}>{d.label || "—"}</p>
          <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${Math.max((d.value / max) * 100, 4)}%`, background: color }}
            >
              {d.value > 0 && <span className="text-[10px] text-white font-bold">{d.value}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color = "bg-indigo-500" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full", value >= 100 ? "bg-green-500" : color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}

// ─── Timeline (mini Gantt) ────────────────────────────────────────────────────

function TimelineView({ projects }: { projects: ProjectData[] }) {
  const withDates = projects.filter(p => p.startDate && p.dueDate).slice(0, 10)
  if (withDates.length === 0) return <p className="text-xs text-slate-400 py-4 text-center">Sem projetos com datas definidas</p>

  const earliest = Math.min(...withDates.map(p => new Date(p.startDate!).getTime()))
  const latest   = Math.max(...withDates.map(p => new Date(p.dueDate!).getTime()))
  const span     = latest - earliest || 1
  const todayPct = ((Date.now() - earliest) / span) * 100

  return (
    <div className="space-y-2">
      {/* Today marker label */}
      <div className="relative h-4 mb-1">
        <div
          className="absolute top-0 bottom-0 border-l-2 border-red-400 border-dashed"
          style={{ left: `${Math.min(100, Math.max(0, todayPct))}%` }}
        >
          <span className="absolute -top-1 left-1 text-[9px] text-red-500 font-semibold whitespace-nowrap">Hoje</span>
        </div>
      </div>
      {withDates.map(p => {
        const start = ((new Date(p.startDate!).getTime() - earliest) / span) * 100
        const end   = ((new Date(p.dueDate!).getTime()   - earliest) / span) * 100
        const width = Math.max(end - start, 2)
        const color = p.isOverdue ? "#f97316" : p.status === "CONCLUIDO" ? "#22c55e" : "#6366f1"
        return (
          <div key={p.id} className="flex items-center gap-2">
            <p className="text-xs text-slate-600 w-36 shrink-0 truncate" title={p.name}>{p.name}</p>
            <div className="flex-1 h-5 bg-slate-100 rounded-sm relative overflow-hidden">
              <div
                className="absolute top-0.5 bottom-0.5 rounded-sm flex items-center justify-center"
                style={{ left: `${start}%`, width: `${width}%`, background: color, opacity: 0.85 }}
              >
                {width > 10 && <span className="text-[9px] text-white font-bold truncate px-1">{p.progress}%</span>}
              </div>
              {/* Today line */}
              {todayPct >= 0 && todayPct <= 100 && (
                <div className="absolute top-0 bottom-0 border-l border-red-400 border-dashed" style={{ left: `${todayPct}%` }} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "text-slate-800", bg = "bg-white" }: {
  label: string; value: string | number; sub?: string; color?: string; bg?: string
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200 p-4", bg)}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn("text-2xl font-bold leading-none", color)}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── IA Modal ─────────────────────────────────────────────────────────────────

function IAModal({ result, onClose }: { result: IAResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Bot className="w-4 h-4 text-violet-600" />
            Análise de IA — Relatório de Projetos
            {result.aiPowered && (
              <span className="text-xs font-normal bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">✨ IA Real</span>
            )}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!result.aiConfigured && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>IA não configurada.</strong> Adicione <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code> no <code className="bg-amber-100 px-1 rounded">.env</code> para análises reais.
              </p>
            </div>
          )}
          <div
            className="text-sm text-slate-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: result.content
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\n/g, "<br/>"),
            }}
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="text-sm border border-slate-200 rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-50 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Print Area (inline-styled for reliable PDF) ──────────────────────────────

function PrintArea({ projects, kpis, emitDate }: {
  projects: ProjectData[]
  kpis: ReturnType<typeof computeKpis>
  emitDate: string
}) {
  const now = new Date()
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Arial, sans-serif", color: "#1e293b", background: "white" }}>
      {/* Cover */}
      <div style={{ textAlign: "center", padding: "40px 0 32px", borderBottom: "3px solid #6366f1", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>
          Relatório Gerencial de Projetos
        </h1>
        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 4px" }}>
          Data de emissão: {emitDate}
        </p>
      </div>

      {/* KPIs */}
      <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "12px" }}>Indicadores</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px" }}>
        <tbody>
          {[
            ["Total de Projetos",         kpis.total,         "Em andamento",           kpis.emAndamento],
            ["Concluídos",                kpis.concluidos,    "Atrasados",              kpis.atrasados],
            ["Pausados",                  kpis.pausados,      "Cancelados",             kpis.cancelados],
            ["Total de Tarefas",          kpis.totalTasks,    "Tarefas Concluídas",     kpis.doneTasks],
            ["Tarefas Pendentes",         kpis.pendingTasks,  "Entregas Concluídas",    kpis.doneEntregas],
            ["Entregas Pendentes",        kpis.pendingEntregas,"% Médio de Conclusão",  `${kpis.avgProgress}%`],
          ].map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
              {[0, 2].map(c => (
                <td key={c} style={{ padding: "6px 10px", fontSize: "11px", color: "#64748b", width: "25%" }}>{row[c]}</td>
              ))}
              {[1, 3].map(c => (
                <td key={c} style={{ padding: "6px 10px", fontSize: "14px", fontWeight: 700, color: "#1e293b", width: "25%" }}>{row[c]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Table */}
      <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "12px" }}>Tabela Gerencial</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginBottom: "28px" }}>
        <thead>
          <tr style={{ background: "#6366f1", color: "white" }}>
            {["Projeto","Responsável","Prioridade","Status","Início","Prazo","Progresso","Etapas","Tarefas"].map(h => (
              <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((p, i) => (
            <tr key={p.id} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
              <td style={{ padding: "5px 8px", fontWeight: 600, maxWidth: "120px" }}>{p.name}</td>
              <td style={{ padding: "5px 8px", color: "#475569" }}>{p.responsible ?? "—"}</td>
              <td style={{ padding: "5px 8px", color: PRIORITY_COLOR[p.priority] ?? "#64748b" }}>{PRIORITY_LABEL[p.priority]}</td>
              <td style={{ padding: "5px 8px" }}>{STATUS_LABEL[p.status] ?? p.status}</td>
              <td style={{ padding: "5px 8px", color: "#64748b" }}>{p.startDate ? p.startDate.slice(0,10).split("-").reverse().join("/") : "—"}</td>
              <td style={{ padding: "5px 8px", color: p.isOverdue ? "#ef4444" : "#64748b" }}>
                {p.dueDate ? p.dueDate.slice(0,10).split("-").reverse().join("/") : "—"}
                {p.isOverdue ? " ⚠" : ""}
              </td>
              <td style={{ padding: "5px 8px", fontWeight: 700, color: p.progress >= 100 ? "#22c55e" : "#6366f1" }}>{p.progress}%</td>
              <td style={{ padding: "5px 8px", textAlign: "center" }}>{p.doneStages}/{p.totalStages}</td>
              <td style={{ padding: "5px 8px", textAlign: "center" }}>{p.doneTasks}/{p.totalTasks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", marginTop: "24px", fontSize: "10px", color: "#94a3b8", textAlign: "center" }}>
        Relatório Gerencial de Projetos · Emitido em {emitDate} · Confidencial
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeKpis(projects: ProjectData[]) {
  const total         = projects.length
  const emAndamento   = projects.filter(p => p.status === "EM_ANDAMENTO").length
  const concluidos    = projects.filter(p => p.status === "CONCLUIDO").length
  const atrasados     = projects.filter(p => p.isOverdue || p.status === "ATRASADO").length
  const pausados      = projects.filter(p => p.status === "PAUSADO").length
  const cancelados    = projects.filter(p => p.status === "CANCELADO").length
  const totalTasks    = projects.reduce((s, p) => s + p.totalTasks, 0)
  const doneTasks     = projects.reduce((s, p) => s + p.doneTasks, 0)
  const pendingTasks  = totalTasks - doneTasks
  const doneEntregas  = projects.reduce((s, p) => s + (p.milestones?.filter(m => m.status === "CONCLUIDA").length ?? 0), 0)
  const totalEntregas = projects.reduce((s, p) => s + (p.milestones?.length ?? 0), 0)
  const pendingEntregas = totalEntregas - doneEntregas
  const avgProgress   = total > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / total) : 0

  const withDelay = projects.filter(p => p.isOverdue && p.dueDate)
  const avgDelay  = withDelay.length > 0
    ? Math.round(withDelay.reduce((s, p) => {
        const days = Math.ceil((Date.now() - new Date(p.dueDate!).getTime()) / 86400000)
        return s + Math.max(0, days)
      }, 0) / withDelay.length)
    : 0

  const withDuration = projects.filter(p => p.startDate && p.dueDate)
  const avgDuration  = withDuration.length > 0
    ? Math.round(withDuration.reduce((s, p) => {
        const days = Math.ceil((new Date(p.dueDate!).getTime() - new Date(p.startDate!).getTime()) / 86400000)
        return s + days
      }, 0) / withDuration.length)
    : 0

  return {
    total, emAndamento, concluidos, atrasados, pausados, cancelados,
    totalTasks, doneTasks, pendingTasks, doneEntregas, pendingEntregas,
    avgProgress, avgDelay, avgDuration,
  }
}

function generateSummaryText(projects: ProjectData[], kpis: ReturnType<typeof computeKpis>): string {
  const atrasados   = projects.filter(p => p.isOverdue || p.status === "ATRASADO")
  const criticos    = projects.filter(p => p.priority === "URGENTE" && p.status !== "CONCLUIDO" && p.status !== "CANCELADO")
  const proximosFim = projects
    .filter(p => p.dueDate && p.status !== "CONCLUIDO" && p.status !== "CANCELADO")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3)

  return `
DADOS CONSOLIDADOS — ${new Date().toLocaleDateString("pt-BR")}

VISÃO GERAL:
- Total de projetos: ${kpis.total}
- Em andamento: ${kpis.emAndamento}
- Concluídos: ${kpis.concluidos}
- Atrasados: ${kpis.atrasados}
- Pausados: ${kpis.pausados}
- Cancelados: ${kpis.cancelados}
- Progresso médio: ${kpis.avgProgress}%
- Média de atraso (dias): ${kpis.avgDelay}
- Duração média dos projetos (dias): ${kpis.avgDuration}

TAREFAS E ENTREGAS:
- Total de tarefas: ${kpis.totalTasks} | Concluídas: ${kpis.doneTasks} | Pendentes: ${kpis.pendingTasks}
- Total de entregas: ${kpis.doneEntregas + kpis.pendingEntregas} | Concluídas: ${kpis.doneEntregas} | Pendentes: ${kpis.pendingEntregas}

PROJETOS ATRASADOS (${atrasados.length}):
${atrasados.map(p => `- ${p.name} | Resp: ${p.responsible ?? "—"} | Prazo: ${p.dueDate ? p.dueDate.slice(0,10) : "—"} | Progresso: ${p.progress}%`).join("\n") || "Nenhum"}

PROJETOS CRÍTICOS/URGENTES (${criticos.length}):
${criticos.map(p => `- ${p.name} | Status: ${STATUS_LABEL[p.status]} | Progresso: ${p.progress}%`).join("\n") || "Nenhum"}

PROJETOS COM PRAZO MAIS PRÓXIMO:
${proximosFim.map(p => `- ${p.name} | Prazo: ${p.dueDate?.slice(0,10)} | Progresso: ${p.progress}%`).join("\n") || "Sem dados"}

LISTA COMPLETA DE PROJETOS:
${projects.map(p => `- [${STATUS_LABEL[p.status]}] ${p.name} | ${PRIORITY_LABEL[p.priority]} | Resp: ${p.responsible ?? "—"} | ${p.progress}% concluído`).join("\n")}
`.trim()
}

function generateCSV(projects: ProjectData[]): string {
  const header = ["Projeto","Responsável","Prioridade","Status","Início","Prazo","Progresso (%)","Etapas Totais","Etapas Concluídas","Tarefas Totais","Tarefas Concluídas","Entregas Totais","Entregas Concluídas","Atrasado"].join(",")
  const rows = projects.map(p => [
    `"${p.name.replace(/"/g,'""')}"`,
    `"${(p.responsible ?? "").replace(/"/g,'""')}"`,
    PRIORITY_LABEL[p.priority] ?? p.priority,
    STATUS_LABEL[p.status]     ?? p.status,
    p.startDate ? p.startDate.slice(0,10) : "",
    p.dueDate   ? p.dueDate.slice(0,10)   : "",
    p.progress,
    p.totalStages,
    p.doneStages,
    p.totalTasks,
    p.doneTasks,
    p.milestones?.length ?? 0,
    p.milestones?.filter(m => m.status === "CONCLUIDA").length ?? 0,
    p.isOverdue ? "Sim" : "Não",
  ].join(",")).join("\n")
  return `${header}\n${rows}`
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: mime })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AcompanhamentoGerencialClient() {
  const [allProjects, setAllProjects] = useState<ProjectData[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filters,     setFilters]     = useState<Filters>(EMPTY_FILTERS)
  const [applied,     setApplied]     = useState<Filters>(EMPTY_FILTERS)
  const [iaResult,    setIaResult]    = useState<IAResult | null>(null)
  const [iaLoading,   setIaLoading]   = useState(false)
  const [showPrint,   setShowPrint]   = useState(false)
  const [sortCol,     setSortCol]     = useState<string>("name")
  const [sortAsc,     setSortAsc]     = useState(true)

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => { setAllProjects(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // ── Responsáveis únicos ──
  const responsaveis = useMemo(() =>
    [...new Set(allProjects.map(p => p.responsible).filter(Boolean))] as string[],
    [allProjects]
  )

  // ── Filtros aplicados ──
  const filtered = useMemo(() => {
    return allProjects.filter(p => {
      if (applied.responsible && p.responsible !== applied.responsible) return false
      if (applied.status      && p.status      !== applied.status)      return false
      if (applied.priority    && p.priority    !== applied.priority)    return false
      if (applied.periodFrom) {
        if (!p.startDate || p.startDate.slice(0,10) < applied.periodFrom) return false
      }
      if (applied.periodTo) {
        if (!p.dueDate || p.dueDate.slice(0,10) > applied.periodTo) return false
      }
      if (applied.onlyOverdue  && !p.isOverdue)                        return false
      if (applied.onlyDone     && p.status !== "CONCLUIDO")             return false
      if (applied.onlyActive   && !["PLANEJADO","EM_ANDAMENTO"].includes(p.status)) return false
      return true
    })
  }, [allProjects, applied])

  // ── KPIs ──
  const kpis = useMemo(() => computeKpis(filtered), [filtered])

  // ── Tabela ordenada ──
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string | number = ""
      let vb: string | number = ""
      switch (sortCol) {
        case "name":        va = a.name;       vb = b.name; break
        case "responsible": va = a.responsible ?? ""; vb = b.responsible ?? ""; break
        case "status":      va = a.status;     vb = b.status; break
        case "priority":    va = a.priority;   vb = b.priority; break
        case "progress":    va = a.progress;   vb = b.progress; break
        case "dueDate":     va = a.dueDate ?? ""; vb = b.dueDate ?? ""; break
        case "tasks":       va = a.totalTasks; vb = b.totalTasks; break
      }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })
  }, [filtered, sortCol, sortAsc])

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(true) }
  }

  // ── Status pie data ──
  const pieData = useMemo(() => Object.entries(STATUS_LABEL).map(([k, label]) => ({
    label, value: filtered.filter(p => p.status === k).length, color: STATUS_COLOR[k],
  })).filter(d => d.value > 0), [filtered])

  // ── Bar chart — por responsável ──
  const byResp = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(p => { const k = p.responsible ?? "Sem responsável"; map[k] = (map[k] ?? 0) + 1 })
    return Object.entries(map).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  // ── Bar chart — entregas ──
  const entregasData = useMemo(() => [
    { label: "Concluídas", value: kpis.doneEntregas },
    { label: "Pendentes",  value: kpis.pendingEntregas },
  ], [kpis])

  // ── Rankings ──
  const rankings = useMemo(() => ({
    maisAtrasados: [...filtered]
      .filter(p => p.isOverdue && p.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5),
    maisAdiantados: [...filtered]
      .filter(p => p.status !== "CONCLUIDO" && p.status !== "CANCELADO")
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5),
    maisProduticos: [...filtered]
      .filter(p => p.totalTasks > 0)
      .sort((a, b) => b.doneTasks - a.doneTasks)
      .slice(0, 5),
    maiorTarefas: [...filtered]
      .sort((a, b) => b.totalTasks - a.totalTasks)
      .slice(0, 5),
    proximoVencimento: [...filtered]
      .filter(p => p.dueDate && p.status !== "CONCLUIDO" && p.status !== "CANCELADO")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5),
  }), [filtered])

  // ── AI Analysis ──
  async function handleAnalyzeAI() {
    setIaLoading(true)
    try {
      const summary = generateSummaryText(filtered, kpis)
      const res = await fetch("/api/projects/relatorios/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      })
      const data = await res.json()
      setIaResult({ content: data.content ?? data.error ?? "Erro", aiPowered: data.aiPowered ?? false, aiConfigured: data.aiConfigured ?? false })
    } finally {
      setIaLoading(false)
    }
  }

  // ── Exports ──
  const emitDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

  function handlePDF() { setShowPrint(true) }
  function handleCSV() { downloadFile(generateCSV(filtered), "relatorio-projetos.csv", "text/csv;charset=utf-8") }
  function handleExcel() {
    // HTML table that Excel can open
    const html = `<html><head><meta charset="UTF-8"><style>th{background:#6366f1;color:white;padding:6px}td{padding:5px;border:1px solid #e2e8f0}</style></head><body><table>${
      ["<tr>"+["Projeto","Responsável","Prioridade","Status","Início","Prazo","Progresso","Etapas","Tarefas","Entregas"].map(h=>`<th>${h}</th>`).join("")+"</tr>",
        ...filtered.map(p => "<tr>"+[
          p.name, p.responsible??"-", PRIORITY_LABEL[p.priority], STATUS_LABEL[p.status],
          p.startDate?.slice(0,10)??"-", p.dueDate?.slice(0,10)??"-",
          p.progress+"%", `${p.doneStages}/${p.totalStages}`,
          `${p.doneTasks}/${p.totalTasks}`,
          `${p.milestones?.filter(m=>m.status==="CONCLUIDA").length??0}/${p.milestones?.length??0}`,
        ].map(v=>`<td>${v}</td>`).join("")+"</tr>")
      ].join("")
    }</table></body></html>`
    downloadFile(html, "relatorio-projetos.xls", "application/vnd.ms-excel;charset=utf-8")
  }

  // ── Print CSS ──
  const printCSS = showPrint ? `
    @media print {
      html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      html body { visibility: hidden !important; }
      #proj-print-area, #proj-print-area * { visibility: visible !important; }
      #proj-print-area { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; background: white !important; overflow: visible !important; padding: 0 !important; }
      .print-hide { display: none !important; }
      @page { size: A4 landscape; margin: 1.5cm; }
    }
  ` : ""

  const SortTh = ({ col, label }: { col: string; label: string }) => (
    <th
      onClick={() => toggleSort(col)}
      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap"
    >
      {label} {sortCol === col ? (sortAsc ? "↑" : "↓") : ""}
    </th>
  )

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_,i) => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}</div>
        <div className="h-48 bg-slate-200 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      {printCSS && <style dangerouslySetInnerHTML={{ __html: printCSS }} />}

      {/* Print overlay */}
      {showPrint && (
        <div id="proj-print-area" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "white", overflowY: "auto", padding: "40px 48px" }}>
          <div className="print-hide flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800">Pré-visualização do PDF</h2>
              <p className="text-xs text-slate-500 mt-0.5">Verifique o conteúdo e clique em "Imprimir / Salvar PDF"</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
              </button>
              <button onClick={() => setShowPrint(false)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" /> Fechar
              </button>
            </div>
          </div>
          <PrintArea projects={filtered} kpis={kpis} emitDate={emitDate} />
        </div>
      )}

      {/* IA Modal */}
      {iaResult && <IAModal result={iaResult} onClose={() => setIaResult(null)} />}

      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              Relatórios Gerenciais
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{filtered.length} projeto{filtered.length !== 1 ? "s" : ""} analisado{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleAnalyzeAI} disabled={iaLoading} className="flex items-center gap-1.5 px-3 py-2 text-sm text-violet-600 border border-violet-200 bg-violet-50 rounded-xl hover:bg-violet-100 transition-colors font-medium disabled:opacity-50">
              {iaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {iaLoading ? "Analisando…" : "Analisar com IA"}
            </button>
            <button onClick={handlePDF} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Printer className="w-4 h-4 text-slate-400" /> PDF
            </button>
            <button onClick={handleExcel} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel
            </button>
            <button onClick={handleCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4 text-slate-400" /> CSV
            </button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtros</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <select value={filters.responsible} onChange={e => setFilters(f => ({ ...f, responsible: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30">
              <option value="">Todos responsáveis</option>
              {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30">
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30">
              <option value="">Todas as prioridades</option>
              {Object.entries(PRIORITY_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 mb-1">De</label>
                <input type="date" value={filters.periodFrom} onChange={e => setFilters(f => ({ ...f, periodFrom: e.target.value }))} className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 mb-1">Até</label>
                <input type="date" value={filters.periodTo} onChange={e => setFilters(f => ({ ...f, periodTo: e.target.value }))} className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { k: "onlyOverdue" as const,  label: "Somente atrasados"  },
              { k: "onlyDone"    as const,  label: "Somente concluídos" },
              { k: "onlyActive"  as const,  label: "Somente ativos"     },
            ].map(({ k, label }) => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input type="checkbox" checked={filters[k]} onChange={e => setFilters(f => ({ ...f, [k]: e.target.checked }))} className="rounded accent-indigo-600" />
                {label}
              </label>
            ))}
            <div className="ml-auto flex gap-2">
              <button onClick={() => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS) }} className="text-xs text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors">Limpar</button>
              <button onClick={() => setApplied(filters)} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-1.5 font-semibold transition-colors">Gerar Relatório</button>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <KpiCard label="Total"          value={kpis.total}          color="text-indigo-700" bg="bg-indigo-50 border-indigo-200" />
          <KpiCard label="Em andamento"   value={kpis.emAndamento}    color="text-blue-700"   bg="bg-blue-50 border-blue-200" />
          <KpiCard label="Concluídos"     value={kpis.concluidos}     color="text-green-700"  bg="bg-green-50 border-green-200" />
          <KpiCard label="Atrasados"      value={kpis.atrasados}      color="text-orange-700" bg="bg-orange-50 border-orange-200" />
          <KpiCard label="Pausados"       value={kpis.pausados}       color="text-yellow-700" bg="bg-yellow-50 border-yellow-200" />
          <KpiCard label="Cancelados"     value={kpis.cancelados}     color="text-red-700"    bg="bg-red-50 border-red-200" />
          <KpiCard label="Progresso médio" value={`${kpis.avgProgress}%`} color="text-indigo-700" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiCard label="Tarefas total"     value={kpis.totalTasks}    />
          <KpiCard label="Tarefas concluídas" value={kpis.doneTasks}    color="text-green-700"  />
          <KpiCard label="Tarefas pendentes"  value={kpis.pendingTasks} color="text-orange-600" />
          <KpiCard label="Entregas concluídas" value={kpis.doneEntregas}   color="text-green-700" />
          <KpiCard label="Entregas pendentes"  value={kpis.pendingEntregas} color="text-orange-600" />
          <KpiCard label="Média de atraso"    value={`${kpis.avgDelay}d`}   sub="dias" color="text-red-600"    />
          <KpiCard label="Duração média"      value={`${kpis.avgDuration}d`} sub="dias" />
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Status Pie */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Status dos Projetos
            </h4>
            <PieChart data={pieData} />
          </div>

          {/* By Responsible */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Projetos por Responsável
            </h4>
            <BarChart data={byResp} color="#6366f1" />
          </div>

          {/* Entregas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Evolução das Entregas
            </h4>
            <BarChart data={entregasData} color="#22c55e" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                <p className="text-2xl font-bold text-green-700">{kpis.doneEntregas}</p>
                <p className="text-xs text-slate-500 mt-0.5">Concluídas</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-xl border border-orange-100">
                <p className="text-2xl font-bold text-orange-700">{kpis.pendingEntregas}</p>
                <p className="text-xs text-slate-500 mt-0.5">Pendentes</p>
              </div>
            </div>
          </div>

          {/* Progress distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Evolução dos Projetos
            </h4>
            <div className="space-y-2.5">
              {sorted.slice(0, 7).map(p => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-600 truncate max-w-[70%]" title={p.name}>{p.name}</p>
                    <span className="text-xs font-bold" style={{ color: STATUS_COLOR[p.status] }}>{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} color={p.isOverdue ? "bg-orange-400" : "bg-indigo-500"} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Cronograma (Timeline) ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" /> Cronograma dos Projetos
          </h4>
          <TimelineView projects={sorted} />
        </div>

        {/* ── Tabela Gerencial ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">Tabela Gerencial</h4>
            <span className="text-xs text-slate-400">{sorted.length} projeto{sorted.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <SortTh col="name"        label="Projeto"        />
                  <SortTh col="responsible" label="Responsável"    />
                  <SortTh col="priority"    label="Prioridade"     />
                  <SortTh col="status"      label="Status"         />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Início</th>
                  <SortTh col="dueDate"     label="Prazo"          />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Dias rest.</th>
                  <SortTh col="progress"    label="% Concl."       />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Etapas</th>
                  <SortTh col="tasks"       label="Tarefas"        />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Entregas</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map(p => {
                  const remainDays = p.dueDate
                    ? Math.ceil((new Date(p.dueDate).getTime() - Date.now()) / 86400000)
                    : null
                  const entregasTotal = p.milestones?.length ?? 0
                  const entregasDone  = p.milestones?.filter(m => m.status === "CONCLUIDA").length ?? 0
                  return (
                    <tr key={p.id} className={cn("hover:bg-slate-50 transition-colors", p.isOverdue && "bg-orange-50/30")}>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-semibold text-slate-800 max-w-[180px] truncate" title={p.name}>{p.name}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{p.responsible ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={{ color: PRIORITY_COLOR[p.priority], borderColor: PRIORITY_COLOR[p.priority] + "60", background: PRIORITY_COLOR[p.priority] + "15" }}>
                          {PRIORITY_LABEL[p.priority]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: STATUS_COLOR[p.status], background: STATUS_COLOR[p.status] + "20" }}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-400">{formatDate(p.startDate)}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className={p.isOverdue ? "text-orange-600 font-medium" : "text-slate-400"}>
                          {p.isOverdue && <AlertTriangle className="inline w-3 h-3 mr-0.5" />}
                          {formatDate(p.dueDate)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium">
                        {remainDays === null ? "—" : (
                          <span className={remainDays < 0 ? "text-red-600" : remainDays < 7 ? "text-orange-600" : "text-slate-600"}>
                            {remainDays < 0 ? `${Math.abs(remainDays)}d atraso` : `${remainDays}d`}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={p.progress} />
                          <span className="text-xs font-bold text-slate-700 w-8 shrink-0">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 text-center">{p.doneStages}/{p.totalStages}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 text-center">{p.doneTasks}/{p.totalTasks}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 text-center">{entregasDone}/{entregasTotal}</td>
                      <td className="px-3 py-2.5">
                        {p.isOverdue
                          ? <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">⚠ Atrasado</span>
                          : p.status === "CONCLUIDO"
                          ? <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">✅ Concluído</span>
                          : <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Em andamento</span>
                        }
                      </td>
                    </tr>
                  )
                })}
                {sorted.length === 0 && (
                  <tr><td colSpan={12} className="px-5 py-10 text-center text-sm text-slate-400">Nenhum projeto encontrado com os filtros atuais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Rankings ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Mais atrasados */}
          <div className="bg-white border border-orange-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
              <h4 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Mais Atrasados
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {rankings.maisAtrasados.length === 0
                ? <p className="px-4 py-6 text-xs text-slate-400 text-center">✅ Nenhum atrasado</p>
                : rankings.maisAtrasados.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                      <p className="text-[10px] text-orange-500">Prazo: {formatDate(p.dueDate)}</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600">{p.progress}%</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Mais adiantados */}
          <div className="bg-white border border-green-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-100">
              <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Mais Adiantados
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {rankings.maisAdiantados.length === 0
                ? <p className="px-4 py-6 text-xs text-slate-400 text-center">Sem dados</p>
                : rankings.maisAdiantados.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                    <p className="flex-1 text-xs font-medium text-slate-700 truncate">{p.name}</p>
                    <span className="text-xs font-bold text-green-600">{p.progress}%</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Maior produtividade */}
          <div className="bg-white border border-indigo-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
              <h4 className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5" /> Maior Produtividade
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {rankings.maisProduticos.length === 0
                ? <p className="px-4 py-6 text-xs text-slate-400 text-center">Sem dados</p>
                : rankings.maisProduticos.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                    <p className="flex-1 text-xs font-medium text-slate-700 truncate">{p.name}</p>
                    <span className="text-xs text-slate-500">{p.doneTasks}/{p.totalTasks} tarefas</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Mais tarefas */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <ListChecks className="w-3.5 h-3.5" /> Mais Tarefas
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {rankings.maiorTarefas.length === 0
                ? <p className="px-4 py-6 text-xs text-slate-400 text-center">Sem dados</p>
                : rankings.maiorTarefas.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                    <p className="flex-1 text-xs font-medium text-slate-700 truncate">{p.name}</p>
                    <span className="text-xs font-bold text-slate-600">{p.totalTasks}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Próximos do vencimento */}
          <div className="bg-white border border-yellow-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
              <h4 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Próximos do Vencimento
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {rankings.proximoVencimento.length === 0
                ? <p className="px-4 py-6 text-xs text-slate-400 text-center">Sem dados</p>
                : rankings.proximoVencimento.map((p, i) => {
                  const dias = p.dueDate ? Math.ceil((new Date(p.dueDate).getTime() - Date.now()) / 86400000) : null
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(p.dueDate)}</p>
                      </div>
                      {dias !== null && (
                        <span className={cn("text-xs font-bold", dias < 0 ? "text-red-600" : dias < 7 ? "text-orange-600" : "text-slate-500")}>
                          {dias < 0 ? `${Math.abs(dias)}d atraso` : `${dias}d`}
                        </span>
                      )}
                    </div>
                  )
                })
              }
            </div>
          </div>

          {/* Etapas */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> Mais Etapas
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {[...filtered].sort((a,b) => b.totalStages - a.totalStages).slice(0,5).length === 0
                ? <p className="px-4 py-6 text-xs text-slate-400 text-center">Sem dados</p>
                : [...filtered].sort((a,b) => b.totalStages - a.totalStages).slice(0,5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-slate-300 w-4">{i + 1}</span>
                    <p className="flex-1 text-xs font-medium text-slate-700 truncate">{p.name}</p>
                    <span className="text-xs text-slate-500">{p.doneStages}/{p.totalStages}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
