"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  Plus, Search, AlertCircle, Clock, CheckCircle2, XCircle, Circle,
  ChevronRight, ArrowUpDown, Layers, X, Calendar, User, MapPin,
  Inbox, Timer, RefreshCw, Tag,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, formatDate } from "@/lib/utils"
import { OrigemManagementModal } from "@/components/origens/OrigemManagementModal"
import { ExportButtons } from "@/components/export/ExportButtons"

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface TaskOrigin {
  id: string
  name: string
  color: string
  icon: string
}

interface Task {
  id: string
  title: string
  description: string | null
  origin: string | null
  originId: string | null
  taskOrigin: TaskOrigin | null
  priority: string
  status: string
  person: string | null
  responsible: string | null
  observations: string | null
  dueDate: string | null
  receivedAt: string | null
  createdAt: string
  updatedAt: string
  _count?: { attachments: number }
}

type SortField =
  | "dueDate" | "receivedAt" | "createdAt" | "updatedAt"
  | "priority" | "status" | "responsible" | "person" | "origin" | "title"

type SortOrder = "asc" | "desc"

type GroupField =
  | "none" | "dueDate" | "receivedAt" | "createdAt"
  | "status" | "priority" | "responsible" | "origin"

type QuickFilter =
  | "todos" | "urgentes" | "atrasadas" | "venceHoje" | "venceAmanha"
  | "proximos7" | "recebidasHoje" | "recebidasSemana"
  | "pendentes" | "emAndamento" | "aguardando" | "concluidas" | "canceladas"

interface Prefs {
  sortField: SortField
  sortOrder: SortOrder
  groupField: GroupField
  activeFilters: QuickFilter[]
  search: string
  dateFrom: string  // "YYYY-MM-DD" or ""
  dateTo: string    // "YYYY-MM-DD" or ""
}

const DEFAULT_PREFS: Prefs = {
  sortField: "dueDate",
  sortOrder: "asc",
  groupField: "none",
  activeFilters: ["todos"],
  search: "",
  dateFrom: "",
  dateTo: "",
}

const PREFS_KEY = "njao_tasks_prefs_v2"

// Campos de data que ativam o filtro de período
const DATE_SORT_FIELDS: SortField[] = ["dueDate", "receivedAt", "createdAt"]

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "dueDate",     label: "Data de vencimento" },
  { value: "receivedAt",  label: "Data de recebimento" },
  { value: "createdAt",   label: "Data de criação" },
  { value: "updatedAt",   label: "Última atualização" },
  { value: "priority",    label: "Prioridade" },
  { value: "status",      label: "Status" },
  { value: "responsible", label: "Responsável" },
  { value: "person",      label: "Solicitante" },
  { value: "origin",      label: "Origem" },
  { value: "title",       label: "Ordem alfabética" },
]

const GROUP_OPTIONS: { value: GroupField; label: string }[] = [
  { value: "none",        label: "Nenhum" },
  { value: "dueDate",     label: "Data de vencimento" },
  { value: "receivedAt",  label: "Data de recebimento" },
  { value: "createdAt",   label: "Data de criação" },
  { value: "status",      label: "Status" },
  { value: "priority",    label: "Prioridade" },
  { value: "responsible", label: "Responsável" },
  { value: "origin",      label: "Origem" },
]

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "todos",           label: "Todos" },
  { key: "urgentes",        label: "Urgentes" },
  { key: "atrasadas",       label: "Atrasadas" },
  { key: "venceHoje",       label: "Vence Hoje" },
  { key: "venceAmanha",     label: "Vence Amanhã" },
  { key: "proximos7",       label: "Próximos 7 dias" },
  { key: "recebidasHoje",   label: "Recebidas Hoje" },
  { key: "recebidasSemana", label: "Recebidas Esta Semana" },
  { key: "pendentes",       label: "Pendentes" },
  { key: "emAndamento",     label: "Em andamento" },
  { key: "aguardando",      label: "Aguardando retorno" },
  { key: "concluidas",      label: "Concluídas" },
  { key: "canceladas",      label: "Canceladas" },
]

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

function startOfDay(d = new Date()) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function daysDiff(dateStr: string): number {
  const t = startOfDay().getTime()
  const d = startOfDay(new Date(dateStr)).getTime()
  return Math.round((d - t) / 86400000)
}

// ─── DEADLINE INDICATOR ───────────────────────────────────────────────────────

function deadlineInfo(task: Task): { dot: string; label: string; cls: string } | null {
  if (!task.dueDate) return null
  if (task.status === "CONCLUIDA" || task.status === "CANCELADA") {
    return { dot: "⚫", label: "Concluída", cls: "text-slate-400" }
  }
  const diff = daysDiff(task.dueDate)
  if (diff < 0)   return { dot: "🔴", label: `Atrasada há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? "s" : ""}`, cls: "text-red-600 font-semibold" }
  if (diff === 0) return { dot: "🔴", label: "Vence hoje",    cls: "text-red-600 font-semibold" }
  if (diff === 1) return { dot: "🟠", label: "Vence amanhã",  cls: "text-orange-500 font-medium" }
  if (diff <= 3)  return { dot: "🟡", label: `Faltam ${diff} dias`, cls: "text-yellow-600 font-medium" }
  return { dot: "🟢", label: `Faltam ${diff} dias`, cls: "text-green-600" }
}

// ─── QUICK FILTER MATCH ───────────────────────────────────────────────────────

function matchesFilter(task: Task, filter: QuickFilter): boolean {
  const active = task.status !== "CONCLUIDA" && task.status !== "CANCELADA"
  const ref    = task.receivedAt || task.createdAt
  switch (filter) {
    case "todos":           return true
    case "urgentes":        return task.priority === "URGENTE" && active
    case "atrasadas":       return !!task.dueDate && daysDiff(task.dueDate) < 0 && active
    case "venceHoje":       return !!task.dueDate && daysDiff(task.dueDate) === 0
    case "venceAmanha":     return !!task.dueDate && daysDiff(task.dueDate) === 1
    case "proximos7":       return !!task.dueDate && daysDiff(task.dueDate) >= 0 && daysDiff(task.dueDate) <= 7
    case "recebidasHoje":   return daysDiff(ref) === 0
    case "recebidasSemana": return daysDiff(ref) >= -7 && daysDiff(ref) <= 0
    case "pendentes":       return task.status === "PENDENTE"
    case "emAndamento":     return task.status === "EM_ANDAMENTO"
    case "aguardando":      return task.status === "AGUARDANDO_RETORNO"
    case "concluidas":      return task.status === "CONCLUIDA"
    case "canceladas":      return task.status === "CANCELADA"
    default: return true
  }
}

// ─── SORT ─────────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 }
const STATUS_ORDER:   Record<string, number> = { PENDENTE: 0, EM_ANDAMENTO: 1, AGUARDANDO_RETORNO: 2, CONCLUIDA: 3, CANCELADA: 4 }

function getSortVal(task: Task, field: SortField): string | number {
  switch (field) {
    case "dueDate":     return task.dueDate     ? new Date(task.dueDate).getTime()    : Infinity
    case "receivedAt":  return task.receivedAt  ? new Date(task.receivedAt).getTime() : new Date(task.createdAt).getTime()
    case "createdAt":   return new Date(task.createdAt).getTime()
    case "updatedAt":   return new Date(task.updatedAt).getTime()
    case "priority":    return PRIORITY_ORDER[task.priority] ?? 99
    case "status":      return STATUS_ORDER[task.status] ?? 99
    case "responsible": return (task.responsible ?? "").toLowerCase()
    case "person":      return (task.person ?? "").toLowerCase()
    case "origin":      return (task.taskOrigin?.name ?? task.origin ?? "").toLowerCase()
    case "title":       return task.title.toLowerCase()
    default: return ""
  }
}

function sortTasks(tasks: Task[], field: SortField, order: SortOrder): Task[] {
  return [...tasks].sort((a, b) => {
    const va = getSortVal(a, field)
    const vb = getSortVal(b, field)
    let cmp = 0
    if (typeof va === "number" && typeof vb === "number") {
      // Put Infinity (no due date) last regardless of sort order
      if (va === Infinity && vb === Infinity) cmp = 0
      else if (va === Infinity) cmp = 1
      else if (vb === Infinity) cmp = -1
      else cmp = va - vb
    } else {
      cmp = String(va).localeCompare(String(vb), "pt-BR")
    }
    return order === "desc" ? -cmp : cmp
  })
}

// ─── GROUP ────────────────────────────────────────────────────────────────────

const GROUP_DUE_ORDER: Record<string, number> = {
  "Atrasadas": 0, "Vence Hoje": 1, "Vence Amanhã": 2,
  "Próximos 7 dias": 3, "Próximos 30 dias": 4, "Após 30 dias": 5, "Sem prazo": 6,
}

function getGroupKey(task: Task, field: GroupField): string {
  if (field === "none") return ""

  if (field === "dueDate") {
    if (!task.dueDate) return "Sem prazo"
    if (task.status === "CONCLUIDA") return "Concluídas"
    if (task.status === "CANCELADA") return "Canceladas"
    const diff = daysDiff(task.dueDate)
    if (diff < 0)   return "Atrasadas"
    if (diff === 0) return "Vence Hoje"
    if (diff === 1) return "Vence Amanhã"
    if (diff <= 7)  return "Próximos 7 dias"
    if (diff <= 30) return "Próximos 30 dias"
    return "Após 30 dias"
  }

  if (field === "receivedAt") {
    const ref = task.receivedAt || task.createdAt
    return new Date(ref).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  }

  if (field === "createdAt") {
    return new Date(task.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  }

  if (field === "status")      return STATUS_LABELS[task.status]    ?? task.status
  if (field === "priority")    return PRIORITY_LABELS[task.priority] ?? task.priority
  if (field === "responsible") return task.responsible ?? "Sem responsável"
  if (field === "origin")      return task.taskOrigin?.name ?? task.origin ?? "Sem origem"
  return ""
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

function matchesSearch(task: Task, q: string): boolean {
  if (!q.trim()) return true
  const lower = q.toLowerCase()
  return [task.title, task.description, task.person, task.responsible,
          task.taskOrigin?.name ?? task.origin, task.observations]
    .some(f => f?.toLowerCase().includes(lower))
}

// Extrai string "YYYY-MM-DD" da data conforme o campo de ordenação (evita fuso horário)
function taskDateStr(task: Task, field: SortField): string | null {
  switch (field) {
    case "dueDate":    return task.dueDate    ? task.dueDate.slice(0, 10)    : null
    case "receivedAt": return task.receivedAt ? task.receivedAt.slice(0, 10) : null
    case "createdAt":  return task.createdAt  ? task.createdAt.slice(0, 10)  : null
    default:           return null
  }
}

// Ordena tarefas dentro do grupo: prazo crescente, sem prazo por último
function sortByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const da = a.dueDate?.slice(0, 10) ?? null
    const db = b.dueDate?.slice(0, 10) ?? null
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return da.localeCompare(db)
  })
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

function computeKpis(tasks: Task[]) {
  const active = (t: Task) => t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
  return {
    total:       tasks.length,
    urgentes:    tasks.filter(t => t.priority === "URGENTE" && active(t)).length,
    venceHoje:   tasks.filter(t => t.dueDate && daysDiff(t.dueDate) === 0 && active(t)).length,
    venceAmanha: tasks.filter(t => t.dueDate && daysDiff(t.dueDate) === 1 && active(t)).length,
    proximos7:   tasks.filter(t => t.dueDate && daysDiff(t.dueDate) >= 0 && daysDiff(t.dueDate) <= 7 && active(t)).length,
    pendentes:   tasks.filter(t => t.status === "PENDENTE").length,
    emAndamento: tasks.filter(t => t.status === "EM_ANDAMENTO").length,
    aguardando:  tasks.filter(t => t.status === "AGUARDANDO_RETORNO").length,
    concluidas:  tasks.filter(t => t.status === "CONCLUIDA").length,
  }
}

// ─── PREFS PERSISTENCE ────────────────────────────────────────────────────────

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch { return DEFAULT_PREFS }
}

function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* */ }
}

// ─── STATUS ICONS ─────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDENTE:           <Circle       className="w-4 h-4 text-yellow-500" />,
  EM_ANDAMENTO:       <Timer        className="w-4 h-4 text-blue-500" />,
  AGUARDANDO_RETORNO: <RefreshCw    className="w-4 h-4 text-purple-500" />,
  CONCLUIDA:          <CheckCircle2 className="w-4 h-4 text-green-500" />,
  CANCELADA:          <XCircle      className="w-4 h-4 text-slate-400" />,
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function TasksClient() {
  const [tasks,          setTasks]          = useState<Task[]>([])
  const [loading,        setLoading]        = useState(true)
  const [prefs,          setPrefs]          = useState<Prefs>(DEFAULT_PREFS)
  const [prefsLoaded,    setPrefsLoaded]    = useState(false)
  const [showOrigens,    setShowOrigens]    = useState(false)

  useEffect(() => {
    setPrefs(loadPrefs())
    setPrefsLoaded(true)
  }, [])

  useEffect(() => {
    if (prefsLoaded) savePrefs(prefs)
  }, [prefs, prefsLoaded])

  const set = useCallback((patch: Partial<Prefs>) => {
    setPrefs(p => ({ ...p, ...patch }))
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const res  = await fetch("/api/tasks")
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  function toggleFilter(key: QuickFilter) {
    if (key === "todos") { set({ activeFilters: ["todos"] }); return }
    const curr = prefs.activeFilters.filter(f => f !== "todos")
    if (curr.includes(key)) {
      const next = curr.filter(f => f !== key)
      set({ activeFilters: next.length ? next : ["todos"] })
    } else {
      set({ activeFilters: [...curr, key] })
    }
  }

  const kpis = useMemo(() => computeKpis(tasks), [tasks])

  const filtered = useMemo(() => {
    let r = tasks
    if (prefs.search.trim()) r = r.filter(t => matchesSearch(t, prefs.search))
    if (!prefs.activeFilters.includes("todos")) {
      r = r.filter(t => prefs.activeFilters.some(f => matchesFilter(t, f)))
    }
    // Filtro de período (só aplica quando sortField é campo de data)
    if (DATE_SORT_FIELDS.includes(prefs.sortField) && (prefs.dateFrom || prefs.dateTo)) {
      r = r.filter(t => {
        const ds = taskDateStr(t, prefs.sortField)
        if (!ds) return false
        if (prefs.dateFrom && ds < prefs.dateFrom) return false
        if (prefs.dateTo   && ds > prefs.dateTo)   return false
        return true
      })
    }
    return r
  }, [tasks, prefs.search, prefs.activeFilters, prefs.sortField, prefs.dateFrom, prefs.dateTo])

  const sorted = useMemo(
    () => sortTasks(filtered, prefs.sortField, prefs.sortOrder),
    [filtered, prefs.sortField, prefs.sortOrder]
  )

  const grouped = useMemo(() => {
    if (prefs.groupField === "none") return [{ key: "", tasks: sorted }]
    const map = new Map<string, Task[]>()
    for (const task of sorted) {
      const k = getGroupKey(task, prefs.groupField)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(task)
    }
    return Array.from(map.entries())
      .map(([key, tasks]) => ({
        key,
        // Dentro de cada grupo: sempre prazo crescente (sem prazo por último)
        tasks: sortByDueDate(tasks),
      }))
      .sort((a, b) => {
        if (prefs.groupField === "dueDate") {
          const oa = GROUP_DUE_ORDER[a.key] ?? 99
          const ob = GROUP_DUE_ORDER[b.key] ?? 99
          return oa - ob
        }
        return a.key.localeCompare(b.key, "pt-BR")
      })
  }, [sorted, prefs.groupField])

  const isDateSortField = DATE_SORT_FIELDS.includes(prefs.sortField)
  const hasDateFilter   = isDateSortField && (!!prefs.dateFrom || !!prefs.dateTo)
  const hasActiveFilter = !prefs.activeFilters.includes("todos") || !!prefs.search.trim() || hasDateFilter

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {!loading && (
            <>
              <strong className="text-slate-800">{tasks.length}</strong> tarefas cadastradas
              {sorted.length !== tasks.length && (
                <> · <strong className="text-blue-600">{sorted.length}</strong> exibidas</>
              )}
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button
            variant="outline"
            onClick={() => setShowOrigens(true)}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <Tag className="w-4 h-4" />
            Gerenciar Origens
          </Button>
          <Link href="/tasks/new" className="w-full sm:w-auto">
            <Button className="w-full flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </Link>
        </div>
      </div>

      {showOrigens && (
        <OrigemManagementModal
          onClose={() => setShowOrigens(false)}
          onRefresh={async () => {}}
          currentValue={null}
          onSelect={() => {}}
        />
      )}

      {/* KPI Panel */}
      {!loading && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          {([
            { label: "Total",      value: kpis.total,       filter: "todos"       , cls: "bg-slate-50  border-slate-200  text-slate-700" },
            { label: "Urgentes",   value: kpis.urgentes,    filter: "urgentes"    , cls: "bg-red-50    border-red-200    text-red-700"   },
            { label: "Vence Hoje", value: kpis.venceHoje,   filter: "venceHoje"   , cls: "bg-red-50    border-red-200    text-red-700"   },
            { label: "Amanhã",     value: kpis.venceAmanha, filter: "venceAmanha" , cls: "bg-orange-50 border-orange-200 text-orange-700"},
            { label: "7 dias",     value: kpis.proximos7,   filter: "proximos7"   , cls: "bg-yellow-50 border-yellow-200 text-yellow-700"},
            { label: "Pendentes",  value: kpis.pendentes,   filter: "pendentes"   , cls: "bg-yellow-50 border-yellow-200 text-yellow-700"},
            { label: "Andamento",  value: kpis.emAndamento, filter: "emAndamento" , cls: "bg-blue-50   border-blue-200   text-blue-700"  },
            { label: "Aguardando", value: kpis.aguardando,  filter: "aguardando"  , cls: "bg-purple-50 border-purple-200 text-purple-700"},
            { label: "Concluídas", value: kpis.concluidas,  filter: "concluidas"  , cls: "bg-green-50  border-green-200  text-green-700" },
          ] as { label: string; value: number; filter: QuickFilter; cls: string }[]).map(k => (
            <button
              key={k.label}
              onClick={() => toggleFilter(k.filter)}
              className={cn(
                "border rounded-xl p-2.5 text-center transition-all hover:shadow-sm",
                k.cls,
                prefs.activeFilters.includes(k.filter) && "ring-2 ring-blue-500 ring-offset-1"
              )}
            >
              <div className="text-xl font-bold">{k.value}</div>
              <div className="text-xs font-medium mt-0.5 leading-tight">{k.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-4 space-y-3">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título, pessoa, responsável, origem, observações..."
              value={prefs.search}
              onChange={e => set({ search: e.target.value })}
              className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            {prefs.search && (
              <button
                onClick={() => set({ search: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort + Group + Export */}
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 shrink-0">Ordenar por</span>
              <select
                value={prefs.sortField}
                onChange={e => set({
                  sortField: e.target.value as SortField,
                  // Limpa datas ao trocar para campo não-data
                  ...(!DATE_SORT_FIELDS.includes(e.target.value as SortField) && { dateFrom: "", dateTo: "" }),
                })}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={prefs.sortOrder}
                onChange={e => set({ sortOrder: e.target.value as SortOrder })}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 shrink-0">Agrupar por</span>
              <select
                value={prefs.groupField}
                onChange={e => set({ groupField: e.target.value as GroupField })}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <ExportButtons
              sorted={sorted}
              grouped={grouped}
              title="Lista de Tarefas"
              groupField={prefs.groupField}
              filenameBase="Lista_Tarefas"
              className="lg:ml-auto"
            />
          </div>

          {/* Filtro por período — aparece apenas quando sortField é campo de data */}
          {isDateSortField && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 shrink-0">Período</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">De</span>
                  <input
                    type="date"
                    value={prefs.dateFrom}
                    onChange={e => set({ dateFrom: e.target.value })}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Até</span>
                  <input
                    type="date"
                    value={prefs.dateTo}
                    min={prefs.dateFrom || undefined}
                    onChange={e => set({ dateTo: e.target.value })}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {hasDateFilter && (
                  <button
                    onClick={() => set({ dateFrom: "", dateTo: "" })}
                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Limpar período
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map(f => {
              const active = prefs.activeFilters.includes(f.key)
              return (
                <button
                  key={f.key}
                  onClick={() => toggleFilter(f.key)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border font-medium transition-all",
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {f.label}
                </button>
              )
            })}
            {hasActiveFilter && (
              <button
                onClick={() => set({ activeFilters: ["todos"], search: "", dateFrom: "", dateTo: "" })}
                className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-all"
              >
                Limpar tudo
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma tarefa encontrada</p>
          <p className="text-sm mt-1">Ajuste os filtros ou crie uma nova tarefa.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(group => (
            <div key={group.key}>

              {/* Group header */}
              {prefs.groupField !== "none" && (
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {group.key}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 shrink-0 bg-slate-100 rounded-full px-2 py-0.5">
                    {group.tasks.length}
                  </span>
                </div>
              )}

              {/* Tasks */}
              <div className="space-y-2">
                {group.tasks.map(task => {
                  const dl      = deadlineInfo(task)
                  const overdue = !!task.dueDate && daysDiff(task.dueDate) < 0 && task.status !== "CONCLUIDA" && task.status !== "CANCELADA"

                  return (
                    <Link key={task.id} href={`/tasks/${task.id}`}>
                      <div className={cn(
                        "bg-white border rounded-xl px-4 py-3.5 hover:shadow-md transition-all group cursor-pointer",
                        overdue ? "border-red-200 bg-red-50/20" : "border-slate-200"
                      )}>
                        <div className="flex items-start gap-3">

                          {/* Status icon */}
                          <div className="mt-1 shrink-0">{STATUS_ICONS[task.status]}</div>

                          <div className="flex-1 min-w-0">

                            {/* Title */}
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug">
                                {task.title}
                              </p>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", PRIORITY_COLORS[task.priority])}>
                                {PRIORITY_LABELS[task.priority]}
                              </span>
                              <span className={cn("text-xs border rounded-full px-2 py-0.5", STATUS_COLORS[task.status])}>
                                {STATUS_LABELS[task.status]}
                              </span>
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-1 mt-2 sm:grid-cols-2 lg:grid-cols-3">
                              {task.person && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 min-w-0">
                                  <User className="w-3 h-3 shrink-0 text-slate-400" />
                                  <span className="truncate" title={task.person}>{task.person}</span>
                                </div>
                              )}
                              {task.responsible && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 min-w-0">
                                  <User className="w-3 h-3 shrink-0 text-blue-400" />
                                  <span className="truncate" title={task.responsible}>{task.responsible}</span>
                                </div>
                              )}
                              {(task.taskOrigin || task.origin) && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 min-w-0">
                                  {task.taskOrigin ? (
                                    <>
                                      <span className="leading-none">{task.taskOrigin.icon}</span>
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: task.taskOrigin.color }}
                                      />
                                      <span className="truncate" title={task.taskOrigin.name}>{task.taskOrigin.name}</span>
                                    </>
                                  ) : (
                                    <>
                                      <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                                      <span className="truncate" title={task.origin!}>{task.origin}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {task.receivedAt && (
                                <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
                                  <Inbox className="w-3 h-3 shrink-0" />
                                  <span>Recebida: {formatDate(task.receivedAt)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span>Criada: {formatDate(task.createdAt)}</span>
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 min-w-0">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>Prazo: {formatDate(task.dueDate)}</span>
                                </div>
                              )}
                            </div>

                            {/* Deadline indicator */}
                            {dl && (
                              <div className={cn("flex items-center gap-1 mt-1.5 text-xs", dl.cls)}>
                                <span>{dl.dot}</span>
                                <span>{dl.label}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
