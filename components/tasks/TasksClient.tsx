"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus, Search, AlertCircle, Clock, CheckCircle2,
  XCircle, Circle, ChevronRight
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import {
  cn, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS,
  formatDate, isOverdue
} from "@/lib/utils"

interface Task {
  id: string
  title: string
  description: string | null
  origin: string | null
  priority: string
  status: string
  person: string | null
  dueDate: string | null
  createdAt: string
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDENTE: <Circle className="w-4 h-4 text-yellow-500" />,
  EM_ANDAMENTO: <Clock className="w-4 h-4 text-blue-500" />,
  AGUARDANDO_RETORNO: <AlertCircle className="w-4 h-4 text-purple-500" />,
  CONCLUIDA: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  CANCELADA: <XCircle className="w-4 h-4 text-slate-400" />,
}

export function TasksClient() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const searchParams = useSearchParams()

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterStatus) params.set("status", filterStatus)
    if (filterPriority) params.set("priority", filterPriority)
    if (search) params.set("q", search)
    const res = await fetch(`/api/tasks?${params}`)
    const data = await res.json()
    setTasks(data)
    setLoading(false)
  }, [filterStatus, filterPriority, search])

  useEffect(() => {
    const priority = searchParams.get("priority") || ""
    setFilterPriority(priority)
  }, [searchParams])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const filtered = tasks.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description?.toLowerCase().includes(search.toLowerCase())) ||
    (t.person?.toLowerCase().includes(search.toLowerCase()))
  )

  const countUrgent   = tasks.filter(t => t.priority === "URGENTE" && t.status !== "CONCLUIDA" && t.status !== "CANCELADA").length
  const countPending  = tasks.filter(t => t.status === "PENDENTE").length
  const countDone     = tasks.filter(t => t.status === "CONCLUIDA").length

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Cabeçalho interno */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap text-sm">
          {!loading && (
            <>
              <span className="text-slate-600"><strong className="text-slate-800">{tasks.length}</strong> tarefas cadastradas</span>
              {countUrgent > 0 && <span className="text-red-600 font-medium">{countUrgent} urgente{countUrgent > 1 ? "s" : ""}</span>}
              {countPending > 0 && <span className="text-yellow-600 font-medium">{countPending} pendente{countPending > 1 ? "s" : ""}</span>}
              {countDone > 0   && <span className="text-green-600 font-medium">{countDone} concluída{countDone > 1 ? "s" : ""}</span>}
              {filtered.length !== tasks.length && (
                <span className="text-slate-400">· {filtered.length} exibida{filtered.length !== 1 ? "s" : ""}</span>
              )}
            </>
          )}
        </div>
        <Link href="/tasks/new">
          <Button>
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar tarefas..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="">Todas as prioridades</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {(filterStatus || filterPriority || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(""); setFilterPriority(""); setSearch("") }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma tarefa encontrada</p>
          <p className="text-sm mt-1">Tente ajustar os filtros ou crie uma nova tarefa.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <div className={cn(
                "bg-white border rounded-xl px-5 py-4 flex items-start gap-4 hover:shadow-md transition-all group cursor-pointer",
                isOverdue(task.dueDate) && task.status !== 'CONCLUIDA' && task.status !== 'CANCELADA'
                  ? "border-red-200 bg-red-50/30"
                  : "border-slate-200"
              )}>
                <div className="mt-0.5 shrink-0">
                  {STATUS_ICONS[task.status]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {task.title}
                    </p>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
                  </div>

                  {task.description && (
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={cn("text-xs border rounded-full px-2.5 py-0.5 font-medium", PRIORITY_COLORS[task.priority])}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    <span className={cn("text-xs border rounded-full px-2.5 py-0.5", STATUS_COLORS[task.status])}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    {task.person && (
                      <span className="text-xs text-slate-400">👤 {task.person}</span>
                    )}
                    {task.origin && (
                      <span className="text-xs text-slate-400">📌 {task.origin}</span>
                    )}
                    {task.dueDate && (
                      <span className={cn(
                        "text-xs font-medium",
                        isOverdue(task.dueDate) && task.status !== 'CONCLUIDA' ? "text-red-500" : "text-slate-400"
                      )}>
                        {isOverdue(task.dueDate) && task.status !== 'CONCLUIDA' ? "⚠️ " : "📅 "}
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
