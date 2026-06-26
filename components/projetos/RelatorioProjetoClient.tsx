"use client"

import { useState } from "react"
import {
  Bot, X, Loader2, Printer, FileSpreadsheet, Info,
  CheckCircle2, AlertTriangle, Calendar, Layers,
  ListChecks, Flag, Clock, TrendingUp, Zap,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectTask {
  id: string; title: string; responsible: string | null
  startDate: string | null; dueDate: string | null
  status: string; priority: string; progress: number
  stageId: string | null; createdAt: string
}

interface ProjectStage {
  id: string; name: string; order: number
  startDate: string | null; dueDate: string | null
  status: string; progress: number
  tasks: ProjectTask[]
}

interface ProjectMilestone {
  id: string; title: string; description: string | null
  dueDate: string | null; completedAt: string | null; status: string; createdAt: string
}

interface ProjectHistoryItem {
  id: string; type: string; title: string; description: string | null; createdAt: string
}

interface ProjectDetail {
  id: string; name: string; description: string | null; objective: string | null
  responsible: string | null; startDate: string | null; dueDate: string | null
  priority: string; status: string; progress: number; notes: string | null
  isOverdue: boolean; totalDays: number | null; elapsedDays: number | null
  remainDays: number | null; totalTasks: number; doneTasks: number
  stages: ProjectStage[]; tasks: ProjectTask[]
  milestones: ProjectMilestone[]; history: ProjectHistoryItem[]
}

interface IAResult { content: string; aiPowered: boolean; aiConfigured: boolean }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEJADO: "Planejado", EM_ANDAMENTO: "Em andamento",
  PAUSADO: "Pausado",     ATRASADO: "Atrasado",
  CONCLUIDO: "Concluído", CANCELADO: "Cancelado",
}
const PRIORITY_LABEL: Record<string, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente",
}
const STAGE_STATUS_LABEL: Record<string, string> = {
  NAO_INICIADA: "Não iniciada", EM_ANDAMENTO: "Em andamento",
  AGUARDANDO: "Aguardando",     CONCLUIDA: "Concluída",
  ATRASADA: "Atrasada",         CANCELADA: "Cancelada",
}
const TASK_STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",               EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_RETORNO: "Ag. retorno",  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",             ATRASADA: "Atrasada",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function kpiValue(v: number | null | undefined, suffix = ""): string {
  if (v === null || v === undefined) return "—"
  return `${v}${suffix}`
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: mime })
  const a    = document.createElement("a")
  a.href     = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

function generateCSV(p: ProjectDetail): string {
  const rows: string[][] = [
    ["Campo", "Valor"],
    ["Projeto",      p.name],
    ["Responsável",  p.responsible ?? "—"],
    ["Prioridade",   PRIORITY_LABEL[p.priority] ?? p.priority],
    ["Status",       STATUS_LABEL[p.status]     ?? p.status],
    ["Início",       p.startDate ? p.startDate.slice(0, 10) : "—"],
    ["Prazo",        p.dueDate   ? p.dueDate.slice(0, 10)   : "—"],
    ["Progresso",    `${p.progress}%`],
    ["Tarefas concluídas", `${p.doneTasks}/${p.totalTasks}`],
    ["Etapas concluídas",  `${p.stages.filter(s => s.status === "CONCLUIDA").length}/${p.stages.length}`],
    ["Entregas concluídas",`${p.milestones.filter(m => m.status === "CONCLUIDA").length}/${p.milestones.length}`],
    ["Dias decorridos",    kpiValue(p.elapsedDays, "d")],
    ["Dias restantes",     kpiValue(p.remainDays,  "d")],
    [],
    ["Etapa", "Status", "Progresso", "Início", "Prazo"],
    ...p.stages.map(s => [s.name, STAGE_STATUS_LABEL[s.status] ?? s.status, `${s.progress}%`, s.startDate?.slice(0,10) ?? "—", s.dueDate?.slice(0,10) ?? "—"]),
    [],
    ["Tarefa", "Responsável", "Status", "Prioridade", "Prazo"],
    ...p.tasks.map(t => [t.title, t.responsible ?? "—", TASK_STATUS_LABEL[t.status] ?? t.status, PRIORITY_LABEL[t.priority] ?? t.priority, t.dueDate?.slice(0,10) ?? "—"]),
    [],
    ["Entrega", "Status", "Prazo", "Conclusão"],
    ...p.milestones.map(m => [m.title, m.status, m.dueDate?.slice(0,10) ?? "—", m.completedAt?.slice(0,10) ?? "—"]),
  ]
  return rows.map(r => r.map(c => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
}

function generateSummaryText(p: ProjectDetail): string {
  const doneStages     = p.stages.filter(s => s.status === "CONCLUIDA").length
  const doneMilestones = p.milestones.filter(m => m.status === "CONCLUIDA").length
  const lateTasks      = p.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "CONCLUIDA" && t.status !== "CANCELADA")

  return `
PROJETO: ${p.name}
Responsável: ${p.responsible ?? "—"}
Prioridade: ${PRIORITY_LABEL[p.priority]} | Status: ${STATUS_LABEL[p.status]}
Objetivo: ${p.objective ?? "Não informado"}
Descrição: ${p.description ?? "Não informada"}

CRONOGRAMA:
- Início: ${p.startDate ? p.startDate.slice(0,10) : "—"}
- Prazo: ${p.dueDate ? p.dueDate.slice(0,10) : "—"}
- Dias totais: ${p.totalDays ?? "—"} | Decorridos: ${p.elapsedDays ?? "—"} | Restantes: ${p.remainDays ?? "—"}
- Atrasado: ${p.isOverdue ? "SIM" : "Não"}

PROGRESSO GERAL: ${p.progress}%

ETAPAS: ${doneStages}/${p.stages.length} concluídas
${p.stages.map(s => `  [${STAGE_STATUS_LABEL[s.status]}] ${s.name} — ${s.progress}%`).join("\n")}

TAREFAS: ${p.doneTasks}/${p.totalTasks} concluídas
- Tarefas atrasadas (${lateTasks.length}): ${lateTasks.map(t => t.title).join(", ") || "Nenhuma"}
${p.tasks.map(t => `  [${TASK_STATUS_LABEL[t.status]}] ${t.title} | ${PRIORITY_LABEL[t.priority]} | Resp: ${t.responsible ?? "—"}`).join("\n")}

ENTREGAS: ${doneMilestones}/${p.milestones.length} concluídas
${p.milestones.map(m => `  [${m.status}] ${m.title} | Prazo: ${m.dueDate?.slice(0,10) ?? "—"} | Conclusão: ${m.completedAt?.slice(0,10) ?? "Pendente"}`).join("\n")}

HISTÓRICO RECENTE:
${p.history.slice(0, 10).map(h => `  [${h.createdAt.slice(0,10)}] ${h.title}`).join("\n")}
`.trim()
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", accent ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200")}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn("text-2xl font-bold leading-none", accent ? "text-indigo-700" : "text-slate-800")}>{value}</p>
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
            Análise de IA — {result.aiPowered ? "Análise Real" : "Sem IA configurada"}
            {result.aiPowered && (
              <span className="text-xs font-normal bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">✨ IA Real</span>
            )}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
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
          <button onClick={onClose} className="text-sm border border-slate-200 rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-50 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Print Area ───────────────────────────────────────────────────────────────

function PrintArea({ p, iaContent, emitDate }: { p: ProjectDetail; iaContent: string | null; emitDate: string }) {
  const doneStages     = p.stages.filter(s => s.status === "CONCLUIDA").length
  const doneMilestones = p.milestones.filter(m => m.status === "CONCLUIDA").length

  const tdStyle = (bold = false): React.CSSProperties => ({
    padding: "5px 8px", fontSize: "11px", borderBottom: "1px solid #e2e8f0",
    fontWeight: bold ? 600 : 400, color: bold ? "#1e293b" : "#475569",
  })

  const thStyle: React.CSSProperties = {
    padding: "6px 8px", fontSize: "10px", fontWeight: 700,
    background: "#6366f1", color: "white", textAlign: "left",
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Arial, sans-serif", color: "#1e293b", background: "white" }}>

      {/* Cover */}
      <div style={{ textAlign: "center", paddingBottom: "28px", borderBottom: "3px solid #6366f1", marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>
          Relatório do Projeto
        </h1>
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#6366f1", margin: "0 0 12px" }}>{p.name}</h2>
        <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
          Responsável: <strong>{p.responsible ?? "—"}</strong> ·
          Status: <strong>{STATUS_LABEL[p.status] ?? p.status}</strong> ·
          Emitido em: <strong>{emitDate}</strong>
        </p>
      </div>

      {/* Resumo Executivo */}
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px", marginTop: 0 }}>Resumo Executivo</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <tbody>
          {[
            ["Projeto",      p.name],
            ["Responsável",  p.responsible ?? "—"],
            ["Prioridade",   PRIORITY_LABEL[p.priority] ?? p.priority],
            ["Status",       STATUS_LABEL[p.status]     ?? p.status],
            ["Início",       formatDate(p.startDate)],
            ["Prazo",        formatDate(p.dueDate)],
            ["Objetivo",     p.objective   ?? "—"],
            ["Descrição",    p.description ?? "—"],
          ].map(([k, v], i) => (
            <tr key={k} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
              <td style={{ ...tdStyle(true), width: "22%" }}>{k}</td>
              <td style={tdStyle()}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Indicadores */}
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Indicadores</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <tbody>
          {[
            ["% Concluído",          `${p.progress}%`,                     "Dias decorridos",    kpiValue(p.elapsedDays, "d")],
            ["Tarefas concluídas",   `${p.doneTasks}/${p.totalTasks}`,     "Dias restantes",     kpiValue(p.remainDays, "d")],
            ["Etapas concluídas",    `${doneStages}/${p.stages.length}`,   "Prazo final",        formatDate(p.dueDate)],
            ["Entregas concluídas",  `${doneMilestones}/${p.milestones.length}`, "Atrasado",     p.isOverdue ? "Sim ⚠" : "Não"],
          ].map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
              <td style={{ ...tdStyle(true), width: "22%" }}>{row[0]}</td>
              <td style={{ ...tdStyle(), width: "28%" }}>{row[1]}</td>
              <td style={{ ...tdStyle(true), width: "22%" }}>{row[2]}</td>
              <td style={tdStyle()}>{row[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Etapas */}
      {p.stages.length > 0 && (
        <>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Etapas</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
            <thead>
              <tr>
                {["Etapa", "Status", "Progresso", "Início", "Prazo"].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {p.stages.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                  <td style={{ ...tdStyle(true) }}>{s.name}</td>
                  <td style={tdStyle()}>{STAGE_STATUS_LABEL[s.status] ?? s.status}</td>
                  <td style={{ ...tdStyle(), fontWeight: 700, color: s.progress >= 100 ? "#22c55e" : "#6366f1" }}>{s.progress}%</td>
                  <td style={tdStyle()}>{s.startDate ? s.startDate.slice(0,10).split("-").reverse().join("/") : "—"}</td>
                  <td style={tdStyle()}>{s.dueDate ? s.dueDate.slice(0,10).split("-").reverse().join("/") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Tarefas */}
      {p.tasks.length > 0 && (
        <>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Tarefas</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
            <thead>
              <tr>
                {["Tarefa", "Responsável", "Status", "Prioridade", "Prazo"].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {p.tasks.map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                  <td style={{ ...tdStyle(true) }}>{t.title}</td>
                  <td style={tdStyle()}>{t.responsible ?? "—"}</td>
                  <td style={tdStyle()}>{TASK_STATUS_LABEL[t.status] ?? t.status}</td>
                  <td style={tdStyle()}>{PRIORITY_LABEL[t.priority] ?? t.priority}</td>
                  <td style={tdStyle()}>{t.dueDate ? t.dueDate.slice(0,10).split("-").reverse().join("/") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Entregas */}
      {p.milestones.length > 0 && (
        <>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Entregas</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
            <thead>
              <tr>
                {["Entrega", "Status", "Prazo", "Data de conclusão"].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {p.milestones.map((m, i) => (
                <tr key={m.id} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                  <td style={{ ...tdStyle(true) }}>{m.title}</td>
                  <td style={tdStyle()}>{m.status === "CONCLUIDA" ? "✅ Concluída" : m.status === "ATRASADA" ? "⚠ Atrasada" : "Pendente"}</td>
                  <td style={tdStyle()}>{m.dueDate ? m.dueDate.slice(0,10).split("-").reverse().join("/") : "—"}</td>
                  <td style={tdStyle()}>{m.completedAt ? m.completedAt.slice(0,10).split("-").reverse().join("/") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Análise IA */}
      {iaContent && (
        <>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Análise de Inteligência Artificial</h3>
          <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "8px", padding: "16px", marginBottom: "24px", fontSize: "11px", lineHeight: 1.7, color: "#374151" }}>
            <div dangerouslySetInnerHTML={{ __html: iaContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") }} />
          </div>
        </>
      )}

      {/* Linha do tempo */}
      {p.history.length > 0 && (
        <>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Linha do Tempo</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
            <thead>
              <tr>{["Data", "Evento", "Descrição"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {p.history.map((h, i) => (
                <tr key={h.id} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                  <td style={{ ...tdStyle(), width: "12%", whiteSpace: "nowrap" }}>{h.createdAt.slice(0,10).split("-").reverse().join("/")}</td>
                  <td style={{ ...tdStyle(true), width: "30%" }}>{h.title}</td>
                  <td style={tdStyle()}>{h.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", fontSize: "10px", color: "#94a3b8", textAlign: "center" }}>
        Relatório do Projeto · {p.name} · Emitido em {emitDate} · Confidencial
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RelatorioProjetoClient({ project: p, onReload }: { project: ProjectDetail; onReload: () => void }) {
  const [iaResult,  setIaResult]  = useState<IAResult | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [savedIA,   setSavedIA]   = useState<string | null>(null)

  const emitDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

  const doneStages     = p.stages.filter(s => s.status === "CONCLUIDA").length
  const pendingStages  = p.stages.length - doneStages
  const doneMilestones = p.milestones.filter(m => m.status === "CONCLUIDA").length
  const pendingMilest  = p.milestones.length - doneMilestones
  const lateTasks      = p.tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() &&
    t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  ).length
  const productivity   = p.totalTasks > 0
    ? Math.round((p.doneTasks / p.totalTasks) * 100)
    : 0

  async function handleAnalyzeAI() {
    setIaLoading(true)
    try {
      const summary = generateSummaryText(p)
      const res  = await fetch("/api/projects/relatorios/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, projectName: p.name }),
      })
      const data = await res.json()
      const result: IAResult = {
        content:     data.content ?? data.error ?? "Erro ao analisar.",
        aiPowered:   data.aiPowered   ?? false,
        aiConfigured: data.aiConfigured ?? false,
      }
      setIaResult(result)
      setSavedIA(result.content)
    } finally {
      setIaLoading(false)
    }
  }

  function handleCSV() {
    downloadFile(generateCSV(p), `relatorio-${p.name.replace(/\s+/g, "-").toLowerCase()}.csv`, "text/csv;charset=utf-8")
  }

  function handleExcel() {
    const stages    = p.stages.map(s => `<tr><td>${s.name}</td><td>${STAGE_STATUS_LABEL[s.status]}</td><td>${s.progress}%</td><td>${s.startDate?.slice(0,10) ?? "—"}</td><td>${s.dueDate?.slice(0,10) ?? "—"}</td></tr>`).join("")
    const tasks     = p.tasks.map(t => `<tr><td>${t.title}</td><td>${t.responsible ?? "—"}</td><td>${TASK_STATUS_LABEL[t.status]}</td><td>${PRIORITY_LABEL[t.priority]}</td><td>${t.dueDate?.slice(0,10) ?? "—"}</td></tr>`).join("")
    const entregas  = p.milestones.map(m => `<tr><td>${m.title}</td><td>${m.status}</td><td>${m.dueDate?.slice(0,10) ?? "—"}</td><td>${m.completedAt?.slice(0,10) ?? "—"}</td></tr>`).join("")
    const html = `<html><head><meta charset="UTF-8"><style>th{background:#6366f1;color:white;padding:6px}td{padding:5px;border:1px solid #e2e8f0}table{border-collapse:collapse;margin-bottom:16px}h2{color:#1e293b}</style></head><body>
      <h2>Projeto: ${p.name}</h2>
      <p>Responsável: ${p.responsible ?? "—"} | Status: ${STATUS_LABEL[p.status]} | Progresso: ${p.progress}%</p>
      <h3>Etapas</h3><table><tr><th>Etapa</th><th>Status</th><th>Progresso</th><th>Início</th><th>Prazo</th></tr>${stages}</table>
      <h3>Tarefas</h3><table><tr><th>Tarefa</th><th>Responsável</th><th>Status</th><th>Prioridade</th><th>Prazo</th></tr>${tasks}</table>
      <h3>Entregas</h3><table><tr><th>Entrega</th><th>Status</th><th>Prazo</th><th>Conclusão</th></tr>${entregas}</table>
    </body></html>`
    downloadFile(html, `relatorio-${p.name.replace(/\s+/g, "-").toLowerCase()}.xls`, "application/vnd.ms-excel;charset=utf-8")
  }

  const printCSS = showPrint ? `
    @media print {
      html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      html body { visibility: hidden !important; }
      #proj-rel-print, #proj-rel-print * { visibility: visible !important; }
      #proj-rel-print { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; background: white !important; overflow: visible !important; padding: 0 !important; }
      .print-hide { display: none !important; }
      @page { size: A4 portrait; margin: 1.5cm; }
    }
  ` : ""

  return (
    <>
      {printCSS && <style dangerouslySetInnerHTML={{ __html: printCSS }} />}

      {/* Print overlay */}
      {showPrint && (
        <div id="proj-rel-print" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "white", overflowY: "auto", padding: "40px 48px" }}>
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
          <PrintArea p={p} iaContent={savedIA} emitDate={emitDate} />
        </div>
      )}

      {/* IA Modal */}
      {iaResult && <IAModal result={iaResult} onClose={() => setIaResult(null)} />}

      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">Relatório do Projeto</h3>
            <p className="text-xs text-slate-400 mt-0.5">Emitido em {emitDate}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAnalyzeAI}
              disabled={iaLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-violet-600 border border-violet-200 bg-violet-50 rounded-xl hover:bg-violet-100 transition-colors font-medium disabled:opacity-50"
            >
              {iaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {iaLoading ? "Analisando…" : "Analisar Projeto com IA"}
            </button>
            <button onClick={() => setShowPrint(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Printer className="w-4 h-4 text-slate-400" /> Exportar PDF
            </button>
            <button onClick={handleExcel} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-green-500" /> Exportar Excel
            </button>
          </div>
        </div>

        {/* ── Resumo Executivo ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Resumo Executivo
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ["Projeto",     p.name],
              ["Responsável", p.responsible ?? "—"],
              ["Prioridade",  PRIORITY_LABEL[p.priority] ?? p.priority],
              ["Status",      STATUS_LABEL[p.status] ?? p.status],
              ["Início",      formatDate(p.startDate)],
              ["Prazo final", formatDate(p.dueDate)],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-slate-400 w-24 shrink-0">{k}:</span>
                <span className="font-medium text-slate-700">{v}</span>
              </div>
            ))}
          </div>
          {p.objective && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Objetivo</p>
              <p className="text-sm text-slate-700">{p.objective}</p>
            </div>
          )}
          {p.description && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Descrição</p>
              <p className="text-sm text-slate-600">{p.description}</p>
            </div>
          )}
        </div>

        {/* ── Indicadores ── */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Indicadores
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Progresso"          value={`${p.progress}%`}              accent />
            <KpiCard label="Tarefas concluídas" value={`${p.doneTasks}/${p.totalTasks}`} />
            <KpiCard label="Etapas concluídas"  value={`${doneStages}/${p.stages.length}`} />
            <KpiCard label="Entregas concluídas" value={`${doneMilestones}/${p.milestones.length}`} />
            <KpiCard label="Tarefas atrasadas"  value={lateTasks} sub={lateTasks > 0 ? "⚠ atenção" : "✅ em dia"} />
            <KpiCard label="Produtividade"       value={`${productivity}%`} sub="tarefas concluídas" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <KpiCard label="Dias decorridos"   value={kpiValue(p.elapsedDays, "d")} />
            <KpiCard label="Dias restantes"    value={kpiValue(p.remainDays,  "d")} />
            <KpiCard label="Etapas pendentes"  value={pendingStages} />
            <KpiCard label="Entregas pendentes" value={pendingMilest} />
          </div>
        </div>

        {/* ── Linha do Tempo ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" /> Linha do Tempo
          </h4>
          {p.history.length === 0
            ? <p className="text-xs text-slate-400 py-4 text-center">Nenhum evento registrado.</p>
            : (
              <div className="relative pl-6">
                {/* vertical line */}
                <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200" />
                <div className="space-y-4">
                  {p.history.map((h, i) => (
                    <div key={h.id} className="relative flex items-start gap-3">
                      {/* dot */}
                      <div className="absolute -left-4 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-700">{h.title}</p>
                          <span className="text-xs text-slate-400 shrink-0">{formatDate(h.createdAt)}</span>
                        </div>
                        {h.description && <p className="text-xs text-slate-400 mt-0.5">{h.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>

        {/* ── Etapas ── */}
        {p.stages.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" /> Etapas ({doneStages}/{p.stages.length} concluídas)
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {p.stages.map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {STAGE_STATUS_LABEL[s.status] ?? s.status}
                      {s.dueDate && ` · prazo ${formatDate(s.dueDate)}`}
                    </p>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 max-w-xs">
                      <div className={cn("h-full rounded-full", s.progress >= 100 ? "bg-green-500" : "bg-indigo-500")} style={{ width: `${s.progress}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-700 shrink-0">{s.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tarefas ── */}
        {p.tasks.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-indigo-500" /> Tarefas ({p.doneTasks}/{p.totalTasks} concluídas)
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Tarefa","Responsável","Status","Prioridade","Prazo"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {p.tasks.map(t => {
                    const isLate = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
                    return (
                      <tr key={t.id} className={cn("hover:bg-slate-50", isLate && "bg-orange-50/30")}>
                        <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">{t.title}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{t.responsible ?? "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{TASK_STATUS_LABEL[t.status] ?? t.status}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{PRIORITY_LABEL[t.priority] ?? t.priority}</td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className={cn(isLate ? "text-orange-600 font-medium" : "text-slate-400")}>
                            {isLate && <AlertTriangle className="inline w-3 h-3 mr-0.5" />}
                            {formatDate(t.dueDate)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Entregas ── */}
        {p.milestones.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Flag className="w-4 h-4 text-indigo-500" /> Entregas ({doneMilestones}/{p.milestones.length} concluídas)
              </h4>
            </div>
            <div className="divide-y divide-slate-50">
              {p.milestones.map(m => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-4">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", m.status === "CONCLUIDA" ? "bg-green-500" : m.status === "ATRASADA" ? "bg-orange-500" : "bg-slate-300")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{m.title}</p>
                    {m.description && <p className="text-xs text-slate-400">{m.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">Prazo: {formatDate(m.dueDate)}</p>
                    {m.completedAt && <p className="text-xs text-green-600">✅ {formatDate(m.completedAt)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Análise IA ── */}
        {savedIA && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-violet-800 flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4" /> Análise de IA
            </h4>
            <div
              className="text-sm text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: savedIA
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n/g, "<br/>"),
              }}
            />
          </div>
        )}

        {/* CTA se IA ainda não foi executada */}
        {!savedIA && (
          <div className="bg-violet-50 border border-dashed border-violet-300 rounded-2xl p-6 text-center">
            <Bot className="w-8 h-8 text-violet-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 mb-1">Análise de IA disponível</p>
            <p className="text-xs text-slate-400 mb-4">
              Clique em "Analisar Projeto com IA" para obter riscos, gargalos, previsão de conclusão e recomendações personalizadas.
            </p>
            <button
              onClick={handleAnalyzeAI}
              disabled={iaLoading}
              className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-violet-600 border border-violet-300 bg-white rounded-xl hover:bg-violet-100 transition-colors font-medium disabled:opacity-50"
            >
              {iaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {iaLoading ? "Analisando…" : "Analisar Projeto com IA"}
            </button>
          </div>
        )}

      </div>
    </>
  )
}
