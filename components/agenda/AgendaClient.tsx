"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus, X, AlertTriangle, Calendar } from "lucide-react"
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
  PENDENTE:            "Pendente",
  EM_ANDAMENTO:        "Em andamento",
  AGUARDANDO_RETORNO:  "Aguardando retorno",
  CONCLUIDA:           "Concluída",
  CANCELADA:           "Cancelada",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sameDay(d: Date, y: number, m: number, day: number) {
  return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day
}

// ─── Task chip (dentro da célula) ────────────────────────────────────────────

function TaskChip({ task, onClick }: { task: Task; onClick: () => void }) {
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
        "w-full text-left flex items-center gap-1 px-1.5 py-[3px] rounded text-[11px] font-medium truncate transition-colors",
        chipClass,
      )}
      title={task.title}
    >
      {overdue && <AlertTriangle className="w-2.5 h-2.5 shrink-0 opacity-80" />}
      <span className="truncate">{task.title}</span>
    </button>
  )
}

// ─── Célula do dia ────────────────────────────────────────────────────────────

function DayCell({
  day, year, month, tasks, isToday, isSelected, onClick, onTaskClick,
}: {
  day: number
  year: number
  month: number
  tasks: Task[]
  isToday: boolean
  isSelected: boolean
  onClick: () => void
  onTaskClick: (id: string) => void
}) {
  const hasOverdue = tasks.some(
    t => isOverdue(t.dueDate) && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  )
  const visible = tasks.slice(0, 3)
  const extra   = tasks.length - 3

  return (
    <div
      onClick={onClick}
      className={cn(
        "min-h-[96px] p-1.5 cursor-pointer transition-colors group relative",
        "border-b border-r border-slate-100",
        isSelected && "ring-2 ring-inset ring-blue-400 bg-blue-50/60",
        !isSelected && hasOverdue && "bg-red-50/30",
        !isSelected && !hasOverdue && "hover:bg-slate-50/70",
      )}
    >
      {/* Número do dia */}
      <div className="flex items-start justify-between mb-1">
        <span
          className={cn(
            "inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full",
            isToday
              ? "bg-blue-600 text-white shadow-sm"
              : isSelected
              ? "bg-blue-200 text-blue-800"
              : "text-slate-600 group-hover:text-slate-800",
          )}
        >
          {day}
        </span>
        {tasks.length > 0 && (
          <span className="text-[9px] text-slate-300 leading-none pt-1">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Chips de tarefas */}
      <div className="space-y-[3px]">
        {visible.map(t => (
          <TaskChip
            key={t.id}
            task={t}
            onClick={e => { (e as unknown as Event).stopPropagation?.(); onTaskClick(t.id) }}
          />
        ))}
        {extra > 0 && (
          <p className="text-[10px] text-slate-400 px-1.5 leading-tight">
            +{extra} mais
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Lista mobile de um dia ───────────────────────────────────────────────────

function MobileDayRow({
  day, year, month, tasks, isToday, onTaskClick,
}: {
  day: number
  year: number
  month: number
  tasks: Task[]
  isToday: boolean
  onTaskClick: (id: string) => void
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
              className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className={cn("w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[t.priority] ?? "bg-slate-400")} />
              <span className="flex-1 text-sm text-slate-700 truncate">{t.title}</span>
              {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded", PRIORITY_PILL[t.priority])}>
                {PRIORITY_LABEL[t.priority]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Painel do dia selecionado ────────────────────────────────────────────────

function DayPanel({
  day, year, month, tasks, onClose, onTaskClick,
}: {
  day: number
  year: number
  month: number
  tasks: Task[]
  onClose: () => void
  onTaskClick: (id: string) => void
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
              <Plus className="w-3.5 h-3.5" /> Nova tarefa
            </button>
          </Link>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-blue-200 transition-colors text-blue-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-400 text-center">
          Nenhuma atividade para este dia.
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
                <span className={cn(
                  "mt-1 w-2.5 h-2.5 rounded-full shrink-0",
                  PRIORITY_DOT[t.priority] ?? "bg-slate-400"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium group-hover:text-blue-600 transition-colors flex items-center gap-1.5",
                    t.status === "CONCLUIDA" ? "line-through text-slate-400" : "text-slate-800",
                  )}>
                    {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <span className="truncate">{t.title}</span>
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

// ─── Componente principal ─────────────────────────────────────────────────────

export function AgendaClient() {
  const router = useRouter()
  const [tasks, setTasks]           = useState<Task[]>([])
  const [today]                     = useState(() => new Date())
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [filters, setFilters]       = useState<Filters>({
    status: "", priority: "", overdue: false, waiting: false,
  })

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setTasks(data) : [])
      .catch(() => {})
  }, [])

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday-first offset: (getDay() + 6) % 7  →  0=Mon … 6=Sun
  const offset = (new Date(year, month, 1).getDay() + 6) % 7

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

  function getTasksForDay(day: number): Task[] {
    return filteredTasks.filter(t => {
      if (!t.dueDate) return false
      return sameDay(new Date(t.dueDate), year, month, day)
    })
  }

  const isToday    = (day: number) => sameDay(today, year, month, day)
  const isSelected = (day: number) => selectedDay === day

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : []

  const overdueTasks = tasks.filter(
    t => t.dueDate && isOverdue(t.dueDate) && t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  )
  const waitingTasks = tasks.filter(t => t.status === "AGUARDANDO_RETORNO")

  const monthTasks = tasks.filter(t => {
    if (!t.dueDate) return false
    const d = new Date(t.dueDate)
    return d.getFullYear() === year && d.getMonth() === month
  })

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Agenda</h2>
          <p className="text-sm text-slate-400 mt-0.5">Visão mensal das atividades por prazo</p>
        </div>
        <Link href="/tasks/new">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Nova Atividade
          </button>
        </Link>
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Filtros</span>

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
          <input
            type="checkbox"
            checked={filters.overdue}
            onChange={e => setFilters(f => ({ ...f, overdue: e.target.checked }))}
            className="rounded accent-red-500"
          />
          Somente atrasadas
        </label>

        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.waiting}
            onChange={e => setFilters(f => ({ ...f, waiting: e.target.checked }))}
            className="rounded accent-purple-500"
          />
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

      {/* ── Layout ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 items-start">

        {/* Calendário — 3/4 no xl */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

            {/* Navegação */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-800">
                  {MONTHS[month]} {year}
                </h3>
                <button
                  onClick={goToday}
                  className="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors font-medium"
                >
                  Hoje
                </button>
              </div>

              <button
                onClick={nextMonth}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* ─── Visão Desktop/Tablet: grade ─── */}
            <div className="hidden sm:block">
              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                {WEEKDAYS_LONG.map((d, i) => (
                  <div
                    key={d}
                    className={cn(
                      "py-2 text-center text-xs font-semibold uppercase tracking-wide",
                      i >= 5 ? "text-slate-300" : "text-slate-400",
                    )}
                  >
                    <span className="hidden lg:block">{d}</span>
                    <span className="block lg:hidden">{WEEKDAYS_SHORT[i]}</span>
                  </div>
                ))}
              </div>

              {/* Grade de dias */}
              <div className="grid grid-cols-7">
                {/* Células vazias */}
                {Array.from({ length: offset }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[96px] bg-slate-50/40 border-b border-r border-slate-100"
                  />
                ))}

                {/* Dias */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  return (
                    <DayCell
                      key={day}
                      day={day}
                      year={year}
                      month={month}
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

            {/* ─── Visão Mobile: lista por dia ─── */}
            <div className="block sm:hidden divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-xs text-slate-400 font-medium">
                  Somente dias com atividades — {MONTHS[month]} {year}
                </p>
              </div>
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayTasks = getTasksForDay(day)
                return (
                  <MobileDayRow
                    key={day}
                    day={day}
                    year={year}
                    month={month}
                    tasks={dayTasks}
                    isToday={isToday(day)}
                    onTaskClick={id => router.push(`/tasks/${id}`)}
                  />
                )
              })}
              {monthTasks.length === 0 && (
                <p className="px-5 py-8 text-sm text-slate-400 text-center">
                  Nenhuma atividade este mês.
                </p>
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
              <div className="flex items-center gap-1.5 ml-2">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-[11px] text-slate-500">Atrasada</span>
              </div>
            </div>
          </div>

          {/* Painel do dia selecionado */}
          {selectedDay && (
            <DayPanel
              day={selectedDay}
              year={year}
              month={month}
              tasks={selectedDayTasks}
              onClose={() => setSelectedDay(null)}
              onTaskClick={id => router.push(`/tasks/${id}`)}
            />
          )}
        </div>

        {/* ── Painel lateral ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Resumo do mês */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <h4 className="text-sm font-semibold text-slate-700">
                📊 {MONTHS[month]}
              </h4>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {[
                { label: "Total no mês",   value: monthTasks.length,                                                                               color: "text-slate-700" },
                { label: "Urgentes",        value: monthTasks.filter(t => t.priority === "URGENTE").length,                                         color: "text-red-600"   },
                { label: "Em andamento",    value: monthTasks.filter(t => t.status === "EM_ANDAMENTO").length,                                      color: "text-blue-600"  },
                { label: "Concluídas",      value: monthTasks.filter(t => t.status === "CONCLUIDA").length,                                         color: "text-green-600" },
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
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    className="flex items-start gap-2 px-4 py-2.5 hover:bg-red-50 transition-colors"
                  >
                    <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[t.priority] ?? "bg-slate-400")} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{t.title}</p>
                      {t.dueDate && (
                        <p className="text-[11px] text-red-500 mt-0.5">
                          {new Date(t.dueDate).toLocaleDateString("pt-BR")}
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
              <h4 className="text-sm font-semibold text-purple-700">
                ⏳ Aguardando retorno ({waitingTasks.length})
              </h4>
            </div>
            {waitingTasks.length === 0 ? (
              <p className="px-4 py-4 text-xs text-slate-400 text-center">✅ Nenhuma aguardando</p>
            ) : (
              <div className="divide-y divide-purple-50 max-h-48 overflow-y-auto">
                {waitingTasks.map(t => (
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    className="block px-4 py-2.5 hover:bg-purple-50 transition-colors"
                  >
                    <p className="text-xs font-medium text-slate-700 truncate">{t.title}</p>
                    {t.person && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{t.person}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
