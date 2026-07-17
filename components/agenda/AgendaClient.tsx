"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, X, AlertTriangle, Calendar, FileText, Printer, Plus } from "lucide-react"
import { cn, isOverdue } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  priority: string
  status: string
  person: string | null
  responsible: string | null
  origin: string | null
  dueDate: string | null
  receivedAt: string | null
}

interface Filters {
  status: string
  priority: string
  overdue: boolean
  waiting: boolean
}

interface PrintConfig {
  includeDone: boolean
  includeCancelled: boolean
  onlyUrgent: boolean
  includeLegend: boolean
  includeSummary: boolean
  orientation: "landscape" | "portrait"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
]
const WEEKDAYS_LONG  = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"]
const WEEKDAYS_SHORT = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"]

const PRIORITY_DOT: Record<string, string> = {
  URGENTE: "bg-red-500",
  ALTA:    "bg-orange-500",
  MEDIA:   "bg-blue-500",
  BAIXA:   "bg-green-500",
}
const PRIORITY_PILL: Record<string, string> = {
  URGENTE: "bg-red-100 text-red-700",
  ALTA:    "bg-orange-100 text-orange-700",
  MEDIA:   "bg-blue-100 text-blue-700",
  BAIXA:   "bg-green-100 text-green-700",
}
const PRIORITY_CELL: Record<string, string> = {
  URGENTE: "bg-red-100 text-red-800 hover:bg-red-200",
  ALTA:    "bg-orange-100 text-orange-800 hover:bg-orange-200",
  MEDIA:   "bg-blue-100 text-blue-800 hover:bg-blue-200",
  BAIXA:   "bg-green-100 text-green-800 hover:bg-green-200",
}
const PRIORITY_LABEL: Record<string, string> = {
  URGENTE: "Urgente", ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa",
}
const STATUS_LABEL: Record<string, string> = {
  PENDENTE:           "Pendente",
  EM_ANDAMENTO:       "Em andamento",
  AGUARDANDO_RETORNO: "Aguardando retorno",
  CONCLUIDA:          "Concluída",
  CANCELADA:          "Cancelada",
}

// Print inline colors (reliable across all browsers/print)
const PCOL: Record<string, { border: string; bg: string; text: string }> = {
  URGENTE: { border: "#ef4444", bg: "#fef2f2", text: "#991b1b" },
  ALTA:    { border: "#f97316", bg: "#fff7ed", text: "#9a3412" },
  MEDIA:   { border: "#3b82f6", bg: "#eff6ff", text: "#1e40af" },
  BAIXA:   { border: "#22c55e", bg: "#f0fdf4", text: "#166534" },
  DONE:    { border: "#94a3b8", bg: "#f8fafc", text: "#64748b"  },
  OVERDUE: { border: "#b91c1c", bg: "#fee2e2", text: "#7f1d1d"  },
}

const DEFAULT_PRINT_CONFIG: PrintConfig = {
  includeDone:      false,
  includeCancelled: false,
  onlyUrgent:       false,
  includeLegend:    true,
  includeSummary:   true,
  orientation:      "landscape",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function taskOnDay(dueDate: string, y: number, m: number, day: number): boolean {
  const [py, pm, pd] = dueDate.slice(0, 10).split("-").map(Number)
  return py === y && pm - 1 === m && pd === day
}

// ─── TaskChip (grid cell) ─────────────────────────────────────────────────────

function TaskChip({ task, onClick }: { task: Task; onClick: (e: React.MouseEvent) => void }) {
  const overdue =
    isOverdue(task.dueDate) &&
    task.status !== "CONCLUIDA" &&
    task.status !== "CANCELADA"

  const chipClass =
    task.status === "CONCLUIDA"
      ? "bg-slate-100 text-slate-400 line-through"
      : task.status === "CANCELADA"
      ? "bg-slate-100 text-slate-300 line-through"
      : overdue
      ? "bg-red-100 text-red-800 hover:bg-red-200"
      : PRIORITY_CELL[task.priority] ?? "bg-slate-100 text-slate-600"

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-1 px-1.5 py-[3px] rounded text-[11px] font-medium transition-colors",
        chipClass,
      )}
      title={task.title}
    >
      {overdue && <AlertTriangle className="w-2.5 h-2.5 shrink-0 opacity-80 mt-[1px]" />}
      {/* break-words e whitespace-normal permitem quebra de linha no título */}
      <span className="break-words whitespace-normal leading-tight min-w-0">{task.title}</span>
    </button>
  )
}

// ─── DayCell ─────────────────────────────────────────────────────────────────

function DayCell({
  day, year, month, tasks, isToday, isSelected, onClick, onTaskClick,
}: {
  day: number; year: number; month: number; tasks: Task[]
  isToday: boolean; isSelected: boolean
  onClick: () => void; onTaskClick: (id: string) => void
}) {
  const hasOverdue = tasks.some(
    t => isOverdue(t.dueDate) && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  )
  const visible = tasks.slice(0, 4)
  const extra   = tasks.length - 4

  return (
    <div
      onClick={onClick}
      className={cn(
        // min-h permite expansão automática quando títulos quebram linha
        "min-h-[100px] p-1.5 cursor-pointer transition-colors group relative",
        "border-b border-r border-slate-100",
        isSelected && "ring-2 ring-inset ring-blue-400 bg-blue-50/60",
        !isSelected && hasOverdue && "bg-red-50/30",
        !isSelected && !hasOverdue && "hover:bg-slate-50/70",
      )}
    >
      <div className="flex items-start justify-between mb-1">
        <span className={cn(
          "inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full",
          isToday
            ? "bg-blue-600 text-white shadow-sm"
            : isSelected
            ? "bg-blue-200 text-blue-800"
            : "text-slate-600 group-hover:text-slate-800",
        )}>
          {day}
        </span>
        {tasks.length > 0 && (
          <span className="text-[9px] text-slate-300 leading-none pt-1">{tasks.length}</span>
        )}
      </div>

      <div className="space-y-[3px]">
        {visible.map(t => (
          <TaskChip
            key={t.id}
            task={t}
            onClick={e => { e.stopPropagation(); onTaskClick(t.id) }}
          />
        ))}
        {extra > 0 && (
          <p className="text-[10px] text-slate-400 px-1.5 leading-tight">+{extra} mais</p>
        )}
      </div>
    </div>
  )
}

// ─── MobileDayRow ─────────────────────────────────────────────────────────────

function MobileDayRow({
  day, year, month, tasks, isToday, onTaskClick,
}: {
  day: number; year: number; month: number; tasks: Task[]
  isToday: boolean; onTaskClick: (id: string) => void
}) {
  if (tasks.length === 0) return null
  const date = new Date(year, month, day)
  return (
    <div className={cn("border-b border-slate-100 last:border-0", isToday && "bg-blue-50/40")}>
      <div className="px-4 py-2 flex items-center gap-2">
        <span className={cn(
          "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold shrink-0",
          isToday ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
        )}>
          {day}
        </span>
        <span className="text-xs text-slate-400">
          {date.toLocaleDateString("pt-BR", { weekday: "long" })}
        </span>
      </div>
      <div className="px-4 pb-2 space-y-1.5">
        {tasks.map(t => {
          const overdue = isOverdue(t.dueDate) && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
          return (
            <button
              key={t.id}
              onClick={() => onTaskClick(t.id)}
              className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[t.priority] ?? "bg-slate-400")} />
              <span className="flex-1 text-sm text-slate-700 break-words">{t.title}</span>
              {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded shrink-0", PRIORITY_PILL[t.priority])}>
                {PRIORITY_LABEL[t.priority]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── DayPanel ────────────────────────────────────────────────────────────────

function DayPanel({
  day, year, month, tasks, onClose, onTaskClick,
}: {
  day: number; year: number; month: number; tasks: Task[]
  onClose: () => void; onTaskClick: (id: string) => void
}) {
  const date = new Date(year, month, day)
  return (
    <div className="bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-100">
        <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {date.toLocaleDateString("pt-BR", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric",
          })}
        </h4>
        <div className="flex items-center gap-2">
          <Link href="/tasks/new">
            <button className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <Plus className="w-3.5 h-3.5" /> Nova Tarefa
            </button>
          </Link>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-blue-200 transition-colors text-blue-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-400 text-center">
          Nenhuma tarefa para este dia.
        </p>
      ) : (
        <div className="divide-y divide-slate-50">
          {tasks.map(t => {
            const overdue = isOverdue(t.dueDate) && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
            return (
              <button
                key={t.id}
                onClick={() => onTaskClick(t.id)}
                className="w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
              >
                <span className={cn("mt-1 w-2.5 h-2.5 rounded-full shrink-0", PRIORITY_DOT[t.priority] ?? "bg-slate-400")} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium group-hover:text-blue-600 transition-colors flex items-center gap-1.5",
                    t.status === "CONCLUIDA" ? "line-through text-slate-400" : "text-slate-800",
                  )}>
                    {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <span className="break-words">{t.title}</span>
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {t.person      && <span className="text-xs text-slate-400">👤 {t.person}</span>}
                    {t.responsible && <span className="text-xs text-slate-400">🔧 {t.responsible}</span>}
                    {t.origin      && <span className="text-xs text-slate-400">📌 {t.origin}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", PRIORITY_PILL[t.priority])}>
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                  <span className="text-[11px] text-slate-400">{STATUS_LABEL[t.status]}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── PrintModal ──────────────────────────────────────────────────────────────

function PrintModal({
  config, onChange, onConfirm, onClose, month, year,
}: {
  config: PrintConfig; onChange: (c: PrintConfig) => void
  onConfirm: () => void; onClose: () => void
  month: number; year: number
}) {
  function toggle(key: keyof PrintConfig) {
    onChange({ ...config, [key]: !config[key] })
  }

  const CheckRow = ({ k, label }: { k: keyof PrintConfig; label: string }) => (
    <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={config[k] as boolean}
        onChange={() => toggle(k)}
        className="w-4 h-4 rounded accent-blue-600"
      />
      {label}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full overflow-hidden rounded-2xl bg-white shadow-xl sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-800">Exportar Calendário — PDF</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Período */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Período</p>
            <p className="text-sm font-semibold text-slate-700">
              {MONTHS[month]} / {year}
            </p>
          </div>

          {/* Filtros de conteúdo */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Incluir no PDF</p>
            <div className="space-y-3">
              <CheckRow k="includeDone"      label="Tarefas concluídas" />
              <CheckRow k="includeCancelled" label="Tarefas canceladas" />
              <CheckRow k="onlyUrgent"       label="Somente urgentes" />
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <CheckRow k="includeLegend"  label="Legenda de cores" />
                <CheckRow k="includeSummary" label="Resumo do mês" />
              </div>
            </div>
          </div>

          {/* Orientação */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Orientação do papel</p>
            <div className="flex gap-4">
              {(["landscape", "portrait"] as const).map(o => (
                <label key={o} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="pdf-orientation"
                    value={o}
                    checked={config.orientation === o}
                    onChange={() => onChange({ ...config, orientation: o })}
                    className="accent-blue-600"
                  />
                  {o === "landscape" ? "🖼 Paisagem (recomendado)" : "📄 Retrato"}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:px-6">
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Visualizar e Imprimir
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CalendarPrintArea ────────────────────────────────────────────────────────

function CalendarPrintArea({
  tasks, month, year, config,
}: {
  tasks: Task[]; month: number; year: number; config: PrintConfig
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset      = (new Date(year, month, 1).getDay() + 6) % 7
  const monthStr    = `${year}-${String(month + 1).padStart(2, "0")}`
  const today       = new Date()

  const printTasks = tasks.filter(t => {
    if (!t.dueDate) return false
    if (!t.dueDate.startsWith(monthStr)) return false
    if (!config.includeDone      && t.status === "CONCLUIDA")  return false
    if (!config.includeCancelled && t.status === "CANCELADA")  return false
    if (config.onlyUrgent        && t.priority !== "URGENTE")  return false
    return true
  })

  const allMonth = tasks.filter(t => t.dueDate?.startsWith(monthStr))

  const stats = {
    total:     printTasks.length,
    urgente:   printTasks.filter(t => t.priority === "URGENTE").length,
    alta:      printTasks.filter(t => t.priority === "ALTA").length,
    media:     printTasks.filter(t => t.priority === "MEDIA").length,
    baixa:     printTasks.filter(t => t.priority === "BAIXA").length,
    atrasadas: printTasks.filter(t => isOverdue(t.dueDate) && t.status !== "CONCLUIDA" && t.status !== "CANCELADA").length,
    aguardando: printTasks.filter(t => t.status === "AGUARDANDO_RETORNO").length,
    concluidas: allMonth.filter(t => t.status === "CONCLUIDA").length,
  }

  function getDayTasks(day: number) {
    return printTasks.filter(t => t.dueDate && taskOnDay(t.dueDate, year, month, day))
  }

  const firstDay = new Date(year, month, 1).toLocaleDateString("pt-BR")
  const lastDay  = new Date(year, month, daysInMonth).toLocaleDateString("pt-BR")

  // Build calendar rows
  const allCells: React.ReactNode[] = []
  for (let i = 0; i < offset; i++) {
    allCells.push(
      <td key={`e${i}`} style={{ border: "1px solid #e2e8f0", verticalAlign: "top", padding: "4px", background: "#f8fafc" }} />
    )
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayTasks = getDayTasks(day)
    const isTodayCell = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
    allCells.push(
      <td key={day} style={{ border: "1px solid #e2e8f0", verticalAlign: "top", padding: "4px", minHeight: "70px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "18px", height: "18px", borderRadius: "50%",
          background: isTodayCell ? "#2563eb" : "transparent",
          color: isTodayCell ? "white" : "#374151",
          fontSize: "10px", fontWeight: 700, marginBottom: "3px",
        }}>
          {day}
        </div>
        {dayTasks.map(t => {
          const overdue = isOverdue(t.dueDate) && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
          const done    = t.status === "CONCLUIDA" || t.status === "CANCELADA"
          const c = done ? PCOL.DONE : overdue ? PCOL.OVERDUE : PCOL[t.priority] ?? PCOL.MEDIA
          return (
            <div key={t.id} style={{
              borderLeft: `3px solid ${c.border}`, background: c.bg, color: c.text,
              padding: "2px 4px", marginBottom: "2px", borderRadius: "0 2px 2px 0",
              fontSize: "8px", lineHeight: "1.35", wordBreak: "break-word",
              textDecoration: done ? "line-through" : "none",
            }}>
              {overdue && "⚠ "}{t.title}
            </div>
          )
        })}
      </td>
    )
  }
  // Fill last row
  while (allCells.length % 7 !== 0) {
    allCells.push(
      <td key={`ef${allCells.length}`} style={{ border: "1px solid #e2e8f0", verticalAlign: "top", padding: "4px", background: "#f8fafc" }} />
    )
  }

  const rows: React.ReactNode[] = []
  for (let i = 0; i < allCells.length; i += 7) {
    rows.push(<tr key={i}>{allCells.slice(i, i + 7)}</tr>)
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Arial, sans-serif", color: "#1e293b", background: "white" }}>
      {/* Cabeçalho */}
      <div style={{ textAlign: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "2px solid #e2e8f0" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0", color: "#0f172a" }}>
          Calendário de Tarefas — {MONTHS[month]} {year}
        </h1>
        <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
          Período: {firstDay} a {lastDay}
        </p>
      </div>

      {/* Grade */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            {WEEKDAYS_LONG.map((d, i) => (
              <th key={d} style={{
                padding: "5px 4px", textAlign: "center",
                fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                color: i >= 5 ? "#94a3b8" : "#475569",
                background: "#f8fafc", borderBottom: "2px solid #cbd5e1",
                border: "1px solid #e2e8f0",
              }}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>

      {/* Legenda */}
      {config.includeLegend && (
        <div style={{ marginTop: "10px", display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Legenda:
          </span>
          {[
            { c: PCOL.URGENTE.border, label: "Urgente"  },
            { c: PCOL.ALTA.border,    label: "Alta"     },
            { c: PCOL.MEDIA.border,   label: "Média"    },
            { c: PCOL.BAIXA.border,   label: "Baixa"    },
            { c: PCOL.DONE.border,    label: "Concluída/Cancelada" },
            { c: PCOL.OVERDUE.border, label: "⚠ Atrasada" },
          ].map(({ c, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", color: "#374151" }}>
              <span style={{ width: "14px", height: "8px", background: c, borderRadius: "1px", display: "inline-block" }} />
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Resumo */}
      {config.includeSummary && (
        <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
            Resumo — {MONTHS[month]} {year}
          </p>
          <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
            {[
              { label: "Total",        value: stats.total,      color: "#0f172a" },
              { label: "Urgentes",     value: stats.urgente,    color: "#991b1b" },
              { label: "Altas",        value: stats.alta,       color: "#9a3412" },
              { label: "Médias",       value: stats.media,      color: "#1e40af" },
              { label: "Baixas",       value: stats.baixa,      color: "#166534" },
              { label: "Atrasadas",    value: stats.atrasadas,  color: "#b91c1c" },
              { label: "Ag. retorno",  value: stats.aguardando, color: "#6b21a8" },
              { label: "Concluídas",   value: stats.concluidas, color: "#166534" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ fontSize: "10px" }}>
                <span style={{ color: "#64748b" }}>{label}: </span>
                <strong style={{ color }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AgendaClient() {
  const router = useRouter()

  const [tasks, setTasks]             = useState<Task[]>([])
  const [today]                       = useState(() => new Date())
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [filters, setFilters]         = useState<Filters>({ status: "", priority: "", overdue: false, waiting: false })
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printConfig, setPrintConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG)
  const [showPrintArea, setShowPrintArea]   = useState(false)

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setTasks(data) : [])
      .catch(() => {})
  }, [])

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset      = (new Date(year, month, 1).getDay() + 6) % 7

  function prevMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDay(null) }
  function nextMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDay(null) }
  function goToday()   { setCurrentDate(new Date()); setSelectedDay(today.getDate()) }

  const hasFilters = !!(filters.status || filters.priority || filters.overdue || filters.waiting)

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (filters.status   && t.status   !== filters.status)   return false
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.overdue  && (!isOverdue(t.dueDate) || t.status === "CONCLUIDA" || t.status === "CANCELADA")) return false
    if (filters.waiting  && t.status !== "AGUARDANDO_RETORNO") return false
    return true
  }), [tasks, filters])

  function getTasksForDay(day: number) {
    return filteredTasks.filter(t => t.dueDate && taskOnDay(t.dueDate, year, month, day))
  }

  const isToday    = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  const isSelected = (day: number) => selectedDay === day

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : []
  const overdueTasks     = tasks.filter(t => t.dueDate && isOverdue(t.dueDate) && t.status !== "CONCLUIDA" && t.status !== "CANCELADA")
  const waitingTasks     = tasks.filter(t => t.status === "AGUARDANDO_RETORNO")
  const monthTasks       = tasks.filter(t => {
    if (!t.dueDate) return false
    const [py, pm] = t.dueDate.slice(0, 7).split("-").map(Number)
    return py === year && pm - 1 === month
  })

  function handlePrintConfirm() {
    setShowPrintModal(false)
    setShowPrintArea(true)
  }

  function handlePrint() {
    window.print()
  }

  function handleClosePrint() {
    setShowPrintArea(false)
  }

  // CSS de impressão — injetado apenas quando a área de impressão está ativa
  const printCSS = showPrintArea ? `
    @media print {
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html body { visibility: hidden !important; }
      #calendar-print-overlay, #calendar-print-overlay * { visibility: visible !important; }
      #calendar-print-overlay {
        position: fixed !important;
        top: 0 !important; left: 0 !important;
        width: 100% !important;
        background: white !important;
        overflow: visible !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      .print-hide { display: none !important; }
      @page { size: A4 ${printConfig.orientation}; margin: 1.5cm; }
    }
  ` : ""

  return (
    <>
      {/* ── Inject print CSS ─── */}
      {printCSS && <style dangerouslySetInnerHTML={{ __html: printCSS }} />}

      {/* ── Overlay de impressão ─── */}
      {showPrintArea && (
        <div
          id="calendar-print-overlay"
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "white", overflowY: "auto", padding: "40px 48px",
          }}
        >
          {/* Controles da pré-visualização (ocultos na impressão) */}
          <div className="print-hide flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800">Pré-visualização do PDF</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Revise o layout e clique em "Imprimir / Salvar PDF"
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
              </button>
              <button
                onClick={handleClosePrint}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-sm text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" /> Fechar
              </button>
            </div>
          </div>
          <CalendarPrintArea tasks={tasks} month={month} year={year} config={printConfig} />
        </div>
      )}

      {/* ── Modal de configuração ─── */}
      {showPrintModal && (
        <PrintModal
          config={printConfig}
          onChange={setPrintConfig}
          onConfirm={handlePrintConfirm}
          onClose={() => setShowPrintModal(false)}
          month={month}
          year={year}
        />
      )}

      {/* ── Conteúdo principal ─── */}
      <div className="space-y-4 animate-fade-in">

        {/* Cabeçalho */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Calendário</h2>
            <p className="text-sm text-slate-400 mt-0.5">Visão mensal das tarefas por prazo</p>
          </div>
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 shadow-xs sm:w-auto"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            Exportar PDF
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Filtros</span>

          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="AGUARDANDO_RETORNO">Aguardando retorno</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <select
            value={filters.priority}
            onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          >
            <option value="">Todas as prioridades</option>
            <option value="URGENTE">Urgente</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={filters.overdue} onChange={e => setFilters(f => ({ ...f, overdue: e.target.checked }))} className="rounded accent-red-500" />
            Somente atrasadas
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={filters.waiting} onChange={e => setFilters(f => ({ ...f, waiting: e.target.checked }))} className="rounded accent-purple-500" />
            Aguardando retorno
          </label>

          {hasFilters && (
            <button
              onClick={() => setFilters({ status: "", priority: "", overdue: false, waiting: false })}
              className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 items-start">

          {/* Calendário — 3/4 */}
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

              {/* Navegação de mês */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500" aria-label="Mês anterior">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-slate-800">{MONTHS[month]} {year}</h3>
                  <button onClick={goToday} className="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors font-medium">
                    Hoje
                  </button>
                </div>
                <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500" aria-label="Próximo mês">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Grade — desktop */}
              <div className="hidden sm:block">
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                  {WEEKDAYS_LONG.map((d, i) => (
                    <div key={d} className={cn("py-2.5 text-center text-xs font-semibold uppercase tracking-wide", i >= 5 ? "text-slate-300" : "text-slate-400")}>
                      <span className="hidden lg:block">{d}</span>
                      <span className="block lg:hidden">{WEEKDAYS_SHORT[i]}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {Array.from({ length: offset }).map((_, i) => (
                    <div key={`e${i}`} className="min-h-[100px] bg-slate-50/40 border-b border-r border-slate-100" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    return (
                      <DayCell
                        key={day}
                        day={day} year={year} month={month}
                        tasks={getTasksForDay(day)}
                        isToday={isToday(day)}
                        isSelected={isSelected(day)}
                        onClick={() => setSelectedDay(isSelected(day) ? null : day)}
                        onTaskClick={id => router.push(`/tasks/${id}`)}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Lista — mobile */}
              <div className="block sm:hidden divide-y divide-slate-100">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">
                    Dias com tarefas — {MONTHS[month]} {year}
                  </p>
                </div>
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  return (
                    <MobileDayRow
                      key={day}
                      day={day} year={year} month={month}
                      tasks={getTasksForDay(day)}
                      isToday={isToday(day)}
                      onTaskClick={id => router.push(`/tasks/${id}`)}
                    />
                  )
                })}
                {monthTasks.length === 0 && (
                  <p className="px-5 py-8 text-sm text-slate-400 text-center">Nenhuma tarefa este mês.</p>
                )}
              </div>

              {/* Legenda */}
              <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Legenda:</span>
                {[
                  { cls: "bg-red-100 text-red-700",    label: "Urgente / Atrasada" },
                  { cls: "bg-orange-100 text-orange-700", label: "Alta" },
                  { cls: "bg-blue-100 text-blue-700",  label: "Média" },
                  { cls: "bg-green-100 text-green-700", label: "Baixa" },
                  { cls: "bg-slate-100 text-slate-400", label: "Concluída" },
                ].map(({ cls, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={cn("w-3 h-3 rounded-sm shrink-0", cls)} />
                    <span className="text-[11px] text-slate-500">{label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-[11px] text-slate-500">Atrasada</span>
                </div>
              </div>
            </div>

            {/* Painel do dia selecionado */}
            {selectedDay && (
              <DayPanel
                day={selectedDay} year={year} month={month}
                tasks={selectedDayTasks}
                onClose={() => setSelectedDay(null)}
                onTaskClick={id => router.push(`/tasks/${id}`)}
              />
            )}
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">

            {/* Resumo do mês */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                <h4 className="text-sm font-semibold text-slate-700">📊 {MONTHS[month]}</h4>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {[
                  { label: "Total no mês",   value: monthTasks.length,                                                                                     color: "text-slate-700" },
                  { label: "Urgentes",        value: monthTasks.filter(t => t.priority === "URGENTE").length,                                               color: "text-red-600"   },
                  { label: "Em andamento",    value: monthTasks.filter(t => t.status === "EM_ANDAMENTO").length,                                            color: "text-blue-600"  },
                  { label: "Concluídas",      value: monthTasks.filter(t => t.status === "CONCLUIDA").length,                                               color: "text-green-600" },
                  { label: "Atrasadas",       value: monthTasks.filter(t => isOverdue(t.dueDate) && t.status !== "CONCLUIDA" && t.status !== "CANCELADA").length, color: "text-red-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className={cn("text-sm font-bold", color)}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Atrasadas */}
            <div className="bg-white border border-red-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                <h4 className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Atrasadas ({overdueTasks.length})
                </h4>
              </div>
              {overdueTasks.length === 0 ? (
                <p className="px-4 py-4 text-xs text-slate-400 text-center">✅ Nenhuma atrasada</p>
              ) : (
                <div className="divide-y divide-red-50 max-h-56 overflow-y-auto">
                  {overdueTasks.map(t => (
                    <Link key={t.id} href={`/tasks/${t.id}`}
                      className="flex items-start gap-2 px-4 py-2.5 hover:bg-red-50 transition-colors">
                      <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[t.priority] ?? "bg-slate-400")} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 break-words">{t.title}</p>
                        {t.dueDate && (
                          <p className="text-[11px] text-red-500 mt-0.5">
                            {t.dueDate.slice(0, 10).split("-").reverse().join("/")}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Aguardando retorno */}
            <div className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                <h4 className="text-sm font-semibold text-purple-700">⏳ Aguardando retorno ({waitingTasks.length})</h4>
              </div>
              {waitingTasks.length === 0 ? (
                <p className="px-4 py-4 text-xs text-slate-400 text-center">✅ Nenhuma aguardando</p>
              ) : (
                <div className="divide-y divide-purple-50 max-h-48 overflow-y-auto">
                  {waitingTasks.map(t => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="block px-4 py-2.5 hover:bg-purple-50 transition-colors">
                      <p className="text-xs font-medium text-slate-700 break-words">{t.title}</p>
                      {t.person && <p className="text-[11px] text-slate-400 mt-0.5">{t.person}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
