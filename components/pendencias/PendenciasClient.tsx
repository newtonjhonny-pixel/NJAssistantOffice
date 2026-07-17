"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import Link from "next/link"
import {
  AlertCircle, Clock, FileText, ChevronRight, Sparkles, Loader2, X, Info,
  Search, ArrowUpDown, Layers, Calendar, MapPin, User,
  Circle, Timer, RefreshCw, CheckCircle2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, formatDate } from "@/lib/utils"
import { ExportButtons } from "@/components/export/ExportButtons"

// ─── TYPES ─────────────────────────────────────────────────────────────────────

interface TaskOrigin {
  id: string; name: string; color: string; icon: string
}

interface Task {
  id: string; title: string; description: string | null
  origin: string | null; originId: string | null; taskOrigin: TaskOrigin | null
  priority: string; status: string; person: string | null; responsible: string | null
  observations: string | null; dueDate: string | null; receivedAt: string | null
  createdAt: string; updatedAt: string; history: { createdAt: string }[]
  _count?: { attachments: number }
}

type SortField = "dueDate" | "receivedAt" | "createdAt" | "updatedAt" | "priority" | "status" | "responsible" | "person" | "origin" | "title"
type SortOrder = "asc" | "desc"
type PendGroupField = "none" | "situacao" | "dueDate" | "status" | "priority" | "responsible" | "person" | "origin"
type PendQuickFilter =
  | "todas" | "atrasadas" | "aguardando" | "semAtualizacao"
  | "venceHoje" | "venceAmanha" | "proximos7" | "urgentes" | "pendentes" | "emAndamento"
type LoadState = "loading" | "success" | "error" | "empty"

interface Prefs {
  search: string
  sortField: SortField
  sortOrder: SortOrder
  groupField: PendGroupField
  quickFilters: PendQuickFilter[]
  dateFrom: string
  dateTo: string
}

const DEFAULT_PREFS: Prefs = {
  search: "", sortField: "dueDate", sortOrder: "asc",
  groupField: "situacao", quickFilters: ["todas"], dateFrom: "", dateTo: "",
}
const PREFS_KEY = "njao_pendencias_prefs_v1"
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

const GROUP_OPTIONS: { value: PendGroupField; label: string }[] = [
  { value: "situacao",    label: "Situação da pendência" },
  { value: "dueDate",     label: "Data de vencimento" },
  { value: "status",      label: "Status" },
  { value: "priority",    label: "Prioridade" },
  { value: "responsible", label: "Responsável" },
  { value: "person",      label: "Solicitante" },
  { value: "origin",      label: "Origem" },
  { value: "none",        label: "Sem agrupamento" },
]

const QUICK_FILTERS: { key: PendQuickFilter; label: string }[] = [
  { key: "todas",          label: "Todas" },
  { key: "atrasadas",      label: "Atrasadas" },
  { key: "aguardando",     label: "Aguardando retorno" },
  { key: "semAtualizacao", label: "Sem atualização" },
  { key: "venceHoje",      label: "Vence hoje" },
  { key: "venceAmanha",    label: "Vence amanhã" },
  { key: "proximos7",      label: "Próximos 7 dias" },
  { key: "urgentes",       label: "Urgentes" },
  { key: "pendentes",      label: "Pendentes" },
  { key: "emAndamento",    label: "Em andamento" },
]

// ─── DATE HELPERS ──────────────────────────────────────────────────────────────

function startOfDay(d = new Date()) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r
}
function daysDiff(dateStr: string): number {
  return Math.round((startOfDay(new Date(dateStr)).getTime() - startOfDay().getTime()) / 86400000)
}
function daysSinceUpdate(task: Task): number {
  const lastUpdate = task.history?.[0]?.createdAt || task.updatedAt
  return Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 86400000)
}

// ─── CATEGORIZAÇÃO DE PENDÊNCIAS ───────────────────────────────────────────────

const isActive = (t: Task) => t.status !== "CONCLUIDA" && t.status !== "CANCELADA"
const isAtrasada = (t: Task) => isActive(t) && !!t.dueDate && daysDiff(t.dueDate) < 0
const isAguardando = (t: Task) => t.status === "AGUARDANDO_RETORNO"
const isSemAtualizacao = (t: Task) => isActive(t) && !isAtrasada(t) && !isAguardando(t) && daysSinceUpdate(t) >= 3

function getSituacao(t: Task): string {
  if (isAtrasada(t)) return "Atrasadas"
  if (isAguardando(t)) return "Aguardando retorno"
  if (isSemAtualizacao(t)) return "Sem atualização (+3 dias)"
  return "Em dia"
}

// ─── FILTRO ────────────────────────────────────────────────────────────────────

function matchesPendFilter(task: Task, filter: PendQuickFilter): boolean {
  switch (filter) {
    case "todas":          return true
    case "atrasadas":      return isAtrasada(task)
    case "aguardando":     return isAguardando(task)
    case "semAtualizacao": return isSemAtualizacao(task)
    case "venceHoje":      return !!task.dueDate && daysDiff(task.dueDate) === 0
    case "venceAmanha":    return !!task.dueDate && daysDiff(task.dueDate) === 1
    case "proximos7":      return !!task.dueDate && daysDiff(task.dueDate) >= 0 && daysDiff(task.dueDate) <= 7
    case "urgentes":       return task.priority === "URGENTE"
    case "pendentes":      return task.status === "PENDENTE"
    case "emAndamento":    return task.status === "EM_ANDAMENTO"
    default: return true
  }
}

// ─── ORDENAÇÃO ─────────────────────────────────────────────────────────────────

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
    const va = getSortVal(a, field), vb = getSortVal(b, field)
    let cmp = 0
    if (typeof va === "number" && typeof vb === "number") {
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

// ─── AGRUPAMENTO ───────────────────────────────────────────────────────────────

const GROUP_SITUACAO_ORDER: Record<string, number> = {
  "Atrasadas": 0, "Aguardando retorno": 1, "Sem atualização (+3 dias)": 2, "Em dia": 3,
}
const GROUP_DUE_ORDER: Record<string, number> = {
  "Atrasadas": 0, "Vence Hoje": 1, "Vence Amanhã": 2,
  "Próximos 7 dias": 3, "Próximos 30 dias": 4, "Após 30 dias": 5, "Sem prazo": 6,
}

function getGroupKey(task: Task, field: PendGroupField): string {
  if (field === "situacao")    return getSituacao(task)
  if (field === "status")      return STATUS_LABELS[task.status]    ?? task.status
  if (field === "priority")    return PRIORITY_LABELS[task.priority] ?? task.priority
  if (field === "responsible") return task.responsible ?? "Sem responsável"
  if (field === "person")      return task.person ?? "Sem solicitante"
  if (field === "origin")      return task.taskOrigin?.name ?? task.origin ?? "Sem origem"
  if (field === "dueDate") {
    if (!task.dueDate) return "Sem prazo"
    const diff = daysDiff(task.dueDate)
    if (diff < 0)   return "Atrasadas"
    if (diff === 0) return "Vence Hoje"
    if (diff === 1) return "Vence Amanhã"
    if (diff <= 7)  return "Próximos 7 dias"
    if (diff <= 30) return "Próximos 30 dias"
    return "Após 30 dias"
  }
  return ""
}

// ─── PESQUISA ──────────────────────────────────────────────────────────────────

function matchesSearch(task: Task, q: string): boolean {
  if (!q.trim()) return true
  const lower = q.toLowerCase()
  return [task.title, task.description, task.person, task.responsible,
          task.taskOrigin?.name ?? task.origin, task.observations]
    .some(f => f?.toLowerCase().includes(lower))
}

function taskDateStr(task: Task, field: SortField): string | null {
  switch (field) {
    case "dueDate":    return task.dueDate    ? task.dueDate.slice(0, 10)    : null
    case "receivedAt": return task.receivedAt ? task.receivedAt.slice(0, 10) : null
    case "createdAt":  return task.createdAt  ? task.createdAt.slice(0, 10)  : null
    default:           return null
  }
}

function sortByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const da = a.dueDate?.slice(0, 10) ?? null
    const db = b.dueDate?.slice(0, 10) ?? null
    if (!da && !db) return 0; if (!da) return 1; if (!db) return -1
    return da.localeCompare(db)
  })
}

// ─── PREFS ─────────────────────────────────────────────────────────────────────

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? sanitizePrefs(JSON.parse(raw)) : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}
function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* */ }
}

function sanitizePrefs(value: Partial<Prefs>): Prefs {
  const quickFilters = Array.isArray(value.quickFilters)
    ? value.quickFilters.filter((f): f is PendQuickFilter => QUICK_FILTERS.some(q => q.key === f))
    : DEFAULT_PREFS.quickFilters

  return {
    ...DEFAULT_PREFS,
    ...value,
    sortField: SORT_OPTIONS.some(o => o.value === value.sortField) ? value.sortField! : DEFAULT_PREFS.sortField,
    sortOrder: value.sortOrder === "asc" || value.sortOrder === "desc" ? value.sortOrder : DEFAULT_PREFS.sortOrder,
    groupField: GROUP_OPTIONS.some(o => o.value === value.groupField) ? value.groupField! : DEFAULT_PREFS.groupField,
    quickFilters: quickFilters.length ? quickFilters : DEFAULT_PREFS.quickFilters,
    search: typeof value.search === "string" ? value.search : DEFAULT_PREFS.search,
    dateFrom: typeof value.dateFrom === "string" ? value.dateFrom : DEFAULT_PREFS.dateFrom,
    dateTo: typeof value.dateTo === "string" ? value.dateTo : DEFAULT_PREFS.dateTo,
  }
}

// ─── ANALYSIS ──────────────────────────────────────────────────────────────────

interface AnalysisResult {
  content: string; aiPowered: boolean; aiConfigured: boolean
}

// ─── STATUS ICONS ──────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDENTE:           <Circle       className="w-4 h-4 text-yellow-500" />,
  EM_ANDAMENTO:       <Timer        className="w-4 h-4 text-blue-500" />,
  AGUARDANDO_RETORNO: <RefreshCw    className="w-4 h-4 text-purple-500" />,
  CONCLUIDA:          <CheckCircle2 className="w-4 h-4 text-green-500" />,
}

// ─── TASK ROW ──────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task:       Task
  analyzing:  string | null
  onAnalyze:  (task: Task) => void
  onCobranca: (task: Task) => void
}

function TaskRow({ task, analyzing, onAnalyze, onCobranca }: TaskRowProps) {
  const days       = daysSinceUpdate(task)
  const isAnalyzng = analyzing === task.id
  const overdue    = isAtrasada(task)
  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 shrink-0">{STATUS_ICONS[task.status]}</div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/tasks/${task.id}`}
            className="font-semibold text-sm text-slate-800 hover:text-blue-600 transition-colors flex items-center gap-1 group"
          >
            {task.title}
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {task.person && <span className="text-xs text-slate-500">👤 {task.person}</span>}
            {task.responsible && <span className="text-xs text-slate-500">🙋 {task.responsible}</span>}
            {task.dueDate && (
              <span className={cn("text-xs font-medium", overdue ? "text-red-500" : "text-slate-400")}>
                📅 {formatDate(task.dueDate)}
              </span>
            )}
            <span className={cn("text-xs border rounded-full px-2 py-0.5", PRIORITY_COLORS[task.priority])}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span className={cn("text-xs border rounded-full px-2 py-0.5", STATUS_COLORS[task.status])}>
              {STATUS_LABELS[task.status]}
            </span>
            {(task.taskOrigin || task.origin) && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                {task.taskOrigin ? (
                  <>
                    <span className="leading-none">{task.taskOrigin.icon}</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.taskOrigin.color }} />
                    <span>{task.taskOrigin.name}</span>
                  </>
                ) : (
                  <><MapPin className="w-3 h-3 shrink-0" /> {task.origin}</>
                )}
              </span>
            )}
            {days > 0 && (
              <span className={cn("text-xs font-medium", days >= 5 ? "text-red-500" : days >= 3 ? "text-orange-500" : "text-slate-400")}>
                ⏱️ {days} dia(s) sem atualização
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onAnalyze(task)} disabled={isAnalyzng} className="text-violet-600 border-violet-200 hover:bg-violet-50">
            {isAnalyzng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Analisar IA
          </Button>
          <Button size="sm" variant="outline" onClick={() => onCobranca(task)} className="text-orange-600 border-orange-200 hover:bg-orange-50">
            <FileText className="w-3.5 h-3.5" />
            Cobrança
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

export function PendenciasClient() {
  const [tasks,       setTasks]       = useState<Task[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadState,   setLoadState]   = useState<LoadState>("loading")
  const [loadError,   setLoadError]   = useState<string | null>(null)
  const [prefs,       setPrefs]       = useState<Prefs>(DEFAULT_PREFS)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [cobranca,    setCobranca]    = useState<{ taskId: string; text: string } | null>(null)
  const [analyzing,   setAnalyzing]   = useState<string | null>(null)
  const [analysis,    setAnalysis]    = useState<({ taskId: string; title: string } & AnalysisResult) | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => { setPrefs(loadPrefs()); setPrefsLoaded(true) }, [])
  useEffect(() => { if (prefsLoaded) savePrefs(prefs) }, [prefs, prefsLoaded])

  const set = useCallback((patch: Partial<Prefs>) => setPrefs(p => ({ ...p, ...patch })), [])

  const loadTasks = useCallback(async (signal?: AbortSignal) => {
    const canUpdate = () => mountedRef.current && !signal?.aborted

    setLoading(true)
    setLoadState("loading")
    setLoadError(null)

    try {
      const res = await fetch("/api/tasks", { signal })
      if (!res.ok) {
        throw new Error(`TASKS_FETCH_FAILED:${res.status}`)
      }

      const data: unknown = await res.json()
      const nextTasks = Array.isArray(data) ? (data as Task[]) : []

      if (!canUpdate()) return
      setTasks(nextTasks)
      setLoadState(nextTasks.length ? "success" : "empty")
    } catch (error) {
      if (signal?.aborted) return
      console.error("[PendenciasClient] failed to load tasks", error)
      if (!canUpdate()) return
      setTasks([])
      setLoadError("Não foi possível carregar a Central de Pendências.")
      setLoadState("error")
    } finally {
      if (canUpdate()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const controller = new AbortController()
    loadTasks(controller.signal)
    return () => {
      mountedRef.current = false
      controller.abort()
    }
  }, [loadTasks])

  function toggleFilter(key: PendQuickFilter) {
    if (key === "todas") { set({ quickFilters: ["todas"] }); return }
    const curr = prefs.quickFilters.filter(f => f !== "todas")
    if (curr.includes(key)) {
      const next = curr.filter(f => f !== key)
      set({ quickFilters: next.length ? next : ["todas"] })
    } else {
      set({ quickFilters: [...curr, key] })
    }
  }

  // Contagens dos cards (baseadas em todas as tarefas, não afetadas pelos filtros)
  const cardCounts = useMemo(() => ({
    atrasadas:      tasks.filter(isAtrasada).length,
    aguardando:     tasks.filter(isAguardando).length,
    semAtualizacao: tasks.filter(isSemAtualizacao).length,
  }), [tasks])

  // Base = apenas tarefas ativas
  const activeTasks = useMemo(() => tasks.filter(isActive), [tasks])

  // Aplicar filtros
  const filtered = useMemo(() => {
    let r = activeTasks
    if (prefs.search.trim()) r = r.filter(t => matchesSearch(t, prefs.search))
    if (!prefs.quickFilters.includes("todas")) {
      r = r.filter(t => prefs.quickFilters.some(f => matchesPendFilter(t, f)))
    }
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
  }, [activeTasks, prefs.search, prefs.quickFilters, prefs.sortField, prefs.dateFrom, prefs.dateTo])

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
      .map(([key, tasks]) => ({ key, tasks: sortByDueDate(tasks) }))
      .sort((a, b) => {
        if (prefs.groupField === "situacao") {
          return (GROUP_SITUACAO_ORDER[a.key] ?? 99) - (GROUP_SITUACAO_ORDER[b.key] ?? 99)
        }
        if (prefs.groupField === "dueDate") {
          return (GROUP_DUE_ORDER[a.key] ?? 99) - (GROUP_DUE_ORDER[b.key] ?? 99)
        }
        return a.key.localeCompare(b.key, "pt-BR")
      })
  }, [sorted, prefs.groupField])

  const isDateSortField = DATE_SORT_FIELDS.includes(prefs.sortField)
  const hasDateFilter   = isDateSortField && (!!prefs.dateFrom || !!prefs.dateTo)
  const hasActiveFilter = !prefs.quickFilters.includes("todas") || !!prefs.search.trim() || hasDateFilter

  function generateCobranca(task: Task) {
    const text = `Prezado(a) ${task.person ?? '[Nome]'},

Venho por meio desta mensagem verificar o andamento da seguinte atividade:

📋 Assunto: ${task.title}
📅 Prazo: ${task.dueDate ? formatDate(task.dueDate) : 'A definir'}
${isAtrasada(task) ? '⚠️ Atividade com prazo vencido.\n' : ''}
Solicito, por gentileza, um retorno com a atualização do status desta atividade.

Em caso de necessidade de prorrogação ou qualquer dificuldade, por favor, me comunique o quanto antes para que possamos tomar as providências necessárias.

Conto com sua atenção.

Atenciosamente,
Newton
Gestão Administrativa

⚠️ Esta é apenas uma sugestão. Revise antes de enviar.`
    setCobranca({ taskId: task.id, text })
  }

  async function analyzeWithAI(task: Task) {
    setAnalyzing(task.id)
    try {
      const res = await fetch("/api/pendencias/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      })
      const data = await res.json()
      setAnalysis({ taskId: task.id, title: task.title, content: data.content, aiPowered: data.aiPowered ?? false, aiConfigured: data.aiConfigured ?? false })
    } finally { setAnalyzing(null) }
  }

  const CARDS = [
    { key: "atrasadas"      as PendQuickFilter, label: "Atrasadas",            count: cardCounts.atrasadas,      textColor: "text-red-600",    bg: "bg-red-50 border-red-200",       activeBg: "bg-red-100 border-red-400 ring-2 ring-red-400/40"       },
    { key: "aguardando"     as PendQuickFilter, label: "Aguard. retorno",       count: cardCounts.aguardando,     textColor: "text-purple-600", bg: "bg-purple-50 border-purple-200", activeBg: "bg-purple-100 border-purple-400 ring-2 ring-purple-400/40" },
    { key: "semAtualizacao" as PendQuickFilter, label: "Sem atualização (+3d)", count: cardCounts.semAtualizacao, textColor: "text-orange-600", bg: "bg-orange-50 border-orange-200", activeBg: "bg-orange-100 border-orange-400 ring-2 ring-orange-400/40" },
  ]

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />)}</div>
  }

  if (loadState === "error") {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
          <h2 className="text-lg font-bold text-slate-800">{loadError ?? "Não foi possível carregar a Central de Pendências."}</h2>
          <p className="text-sm text-slate-500 mt-1">Aguarde alguns segundos e tente novamente.</p>
          <Button className="mt-5" onClick={() => loadTasks()}>
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Central de Pendências</h2>
        <p className="text-sm text-slate-500">
          {filtered.length !== activeTasks.length
            ? <>⚠️ Exibindo <strong>{filtered.length}</strong> de <strong>{activeTasks.length}</strong> pendência(s)</>
            : <>⚠️ Monitorando <strong>{activeTasks.length}</strong> pendência(s) ativa(s)</>
          }
        </p>
      </div>

      {/* Cards clicáveis */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map(card => {
          const active = prefs.quickFilters.includes(card.key)
          return (
            <button
              key={card.key}
              onClick={() => toggleFilter(card.key)}
              className={cn(
                "rounded-xl border p-4 text-center transition-all hover:shadow-sm cursor-pointer",
                active ? card.activeBg : card.bg
              )}
            >
              <p className={cn("text-3xl font-bold", card.textColor)}>{card.count}</p>
              <p className="text-xs text-slate-600 mt-1">{card.label}</p>
              {active && <p className="text-xs font-medium mt-1.5 text-blue-600">● filtro ativo</p>}
            </button>
          )
        })}
      </div>

      {/* Controles */}
      <Card>
        <CardContent className="p-4 space-y-3">

          {/* Pesquisa */}
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
              <button onClick={() => set({ search: "" })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Ordenar + Agrupar + Export */}
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 shrink-0">Ordenar por</span>
              <select
                value={prefs.sortField}
                onChange={e => set({
                  sortField: e.target.value as SortField,
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
                onChange={e => set({ groupField: e.target.value as PendGroupField })}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <ExportButtons
              sorted={sorted}
              grouped={grouped}
              title="Central de Pendências"
              groupField={prefs.groupField}
              filenameBase="Central_Pendencias"
              className="lg:ml-auto"
            />
          </div>

          {/* Filtro por período */}
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

          {/* Filtros rápidos */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map(f => {
              const active = prefs.quickFilters.includes(f.key)
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
                onClick={() => set({ quickFilters: ["todas"], search: "", dateFrom: "", dateTo: "" })}
                className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-all"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loadState === "empty" || activeTasks.length === 0 || sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma pendência encontrada</p>
          <p className="text-sm mt-1">Ajuste os filtros ou aproveite — tudo em dia! 🎉</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.key || "_none"}>
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
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-50">
                    {group.tasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        analyzing={analyzing}
                        onAnalyze={analyzeWithAI}
                        onCobranca={generateCobranca}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Modal de análise de IA */}
      {analysis && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4" onClick={() => setAnalysis(null)}>
          <div className="flex max-h-[94vh] w-full flex-col rounded-2xl bg-white shadow-2xl sm:max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                ⚠️ Gestor de Pendências
                {analysis.aiPowered && (
                  <span className="text-xs font-normal bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">✨ IA Real</span>
                )}
              </h3>
              <button onClick={() => setAnalysis(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">{analysis.title}</p>
              {!analysis.aiConfigured && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>IA não configurada.</strong> Adicione{" "}
                    <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code> no{" "}
                    <code className="bg-amber-100 px-1 rounded">.env</code> para análises reais.
                  </p>
                </div>
              )}
              <div
                className="text-sm text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: analysis.content
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n/g, "<br/>"),
                }}
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 shrink-0">
              <Button onClick={() => setAnalysis(null)} variant="outline" size="sm">Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cobrança */}
      {cobranca && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4" onClick={() => setCobranca(null)}>
          <div className="w-full rounded-2xl bg-white shadow-2xl sm:max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">✍️ Texto de cobrança gerado</h3>
              <button onClick={() => setCobranca(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <pre className="text-sm text-emerald-800 whitespace-pre-wrap font-sans">{cobranca.text}</pre>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => navigator.clipboard?.writeText(cobranca.text)} variant="outline" size="sm">
                  Copiar texto
                </Button>
                <Button onClick={() => setCobranca(null)} variant="ghost" size="sm">Fechar</Button>
              </div>
              <p className="text-xs text-slate-400 mt-3">⚠️ Revise e adapte o texto antes de enviar. Nenhuma mensagem é enviada automaticamente.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
