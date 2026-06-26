"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  FolderKanban, Plus, Search, X, AlertTriangle, CheckCircle2,
  Clock, PauseCircle, XCircle, ChevronRight, Calendar, Users,
  Layers, ListChecks, TrendingUp, BarChart2,
} from "lucide-react"
import { cn, formatDate, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/utils"
import { NovoProjetoModal } from "./NovoProjetoModal"
import { RelatoriosClient } from "./RelatoriosClient"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectSummary {
  id: string
  name: string
  description: string | null
  objective: string | null
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
}

// ─── Card filter key type ──────────────────────────────────────────────────────

type CardKey = "" | "EM_ANDAMENTO" | "ATRASADO" | "CONCLUIDO" | "PAUSADO"

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PLANEJADO:    { label: "Planejado",    color: "bg-slate-100 text-slate-600 border-slate-200",   icon: <Clock className="w-3 h-3" /> },
  EM_ANDAMENTO: { label: "Em andamento", color: "bg-blue-50 text-blue-700 border-blue-200",       icon: <TrendingUp className="w-3 h-3" /> },
  PAUSADO:      { label: "Pausado",      color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: <PauseCircle className="w-3 h-3" /> },
  ATRASADO:     { label: "Atrasado",     color: "bg-orange-50 text-orange-700 border-orange-200", icon: <AlertTriangle className="w-3 h-3" /> },
  CONCLUIDO:    { label: "Concluído",    color: "bg-green-50 text-green-700 border-green-200",    icon: <CheckCircle2 className="w-3 h-3" /> },
  CANCELADO:    { label: "Cancelado",    color: "bg-red-50 text-red-600 border-red-200",          icon: <XCircle className="w-3 h-3" /> },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-100 text-slate-600 border-slate-200", icon: null }
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs border rounded-full px-2.5 py-0.5 font-medium", cfg.color)}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 bg-slate-100 rounded-full overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all", value >= 100 ? "bg-green-500" : value > 0 ? "bg-blue-500" : "bg-slate-200")}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

// ─── Dashboard card ────────────────────────────────────────────────────────────

interface DashCard {
  key: CardKey
  label: string
  value: number
  total: number
  activeColor: string
  inactiveColor: string
  icon: React.ReactNode
}

function SummaryCard({ card, isActive, onClick }: { card: DashCard; isActive: boolean; onClick: () => void }) {
  const pct = card.total > 0 && card.key !== "" ? Math.round((card.value / card.total) * 100) : null

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 px-4 py-3 rounded-xl border text-left transition-all cursor-pointer",
        isActive
          ? `${card.activeColor} shadow-md ring-2 ring-offset-1 ring-white/30 scale-[1.02]`
          : `${card.inactiveColor} hover:shadow-sm hover:scale-[1.01] hover:border-opacity-70`,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-85">
        {card.icon}
        {card.label}
      </div>
      <p className="text-2xl font-bold leading-none">{card.value}</p>
      {pct !== null && (
        <p className="text-[10px] font-medium opacity-70">{pct}% do total</p>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjetosClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const activeTab    = searchParams.get("tab") === "relatorios" ? "relatorios" : "lista"

  const [projects,       setProjects]       = useState<ProjectSummary[]>([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState("")
  const [filterStatus,   setFilterStatus]   = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [activeCard,     setActiveCard]     = useState<CardKey>("")
  const [showModal,      setShowModal]      = useState(false)

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === "lista") params.delete("tab")
    else params.set("tab", tab)
    router.push(`/projetos?${params.toString()}`)
  }

  function load() {
    setLoading(true)
    fetch("/api/projects")
      .then(r => r.json())
      .then(setProjects)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // ── Counts derived from all projects (not filtered) ──
  const counts = useMemo(() => ({
    total:       projects.length,
    emAndamento: projects.filter(p => p.status === "EM_ANDAMENTO").length,
    atrasados:   projects.filter(p => p.isOverdue || p.status === "ATRASADO").length,
    concluidos:  projects.filter(p => p.status === "CONCLUIDO").length,
    pausados:    projects.filter(p => p.status === "PAUSADO").length,
  }), [projects])

  const cards: DashCard[] = [
    {
      key:           "",
      label:         "Total",
      value:         counts.total,
      total:         counts.total,
      activeColor:   "bg-slate-800 text-white border-slate-800",
      inactiveColor: "bg-white text-slate-700 border-slate-200",
      icon:          <FolderKanban className="w-3.5 h-3.5" />,
    },
    {
      key:           "EM_ANDAMENTO",
      label:         "Em andamento",
      value:         counts.emAndamento,
      total:         counts.total,
      activeColor:   "bg-blue-600 text-white border-blue-600",
      inactiveColor: "bg-white text-slate-700 border-slate-200",
      icon:          <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      key:           "ATRASADO",
      label:         "Atrasados",
      value:         counts.atrasados,
      total:         counts.total,
      activeColor:   "bg-orange-600 text-white border-orange-600",
      inactiveColor: "bg-white text-slate-700 border-slate-200",
      icon:          <AlertTriangle className="w-3.5 h-3.5" />,
    },
    {
      key:           "CONCLUIDO",
      label:         "Concluídos",
      value:         counts.concluidos,
      total:         counts.total,
      activeColor:   "bg-green-600 text-white border-green-600",
      inactiveColor: "bg-white text-slate-700 border-slate-200",
      icon:          <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    {
      key:           "PAUSADO",
      label:         "Pausados",
      value:         counts.pausados,
      total:         counts.total,
      activeColor:   "bg-yellow-500 text-white border-yellow-500",
      inactiveColor: "bg-white text-slate-700 border-slate-200",
      icon:          <PauseCircle className="w-3.5 h-3.5" />,
    },
  ]

  // ── Filtered list — card + search + status select + priority ──
  const filtered = useMemo(() => {
    return projects.filter(p => {
      // Card filter
      if (activeCard === "ATRASADO") {
        if (!p.isOverdue && p.status !== "ATRASADO") return false
      } else if (activeCard !== "") {
        if (p.status !== activeCard) return false
      }
      // Status select (combines with card)
      if (filterStatus && p.status !== filterStatus) return false
      // Priority
      if (filterPriority && p.priority !== filterPriority) return false
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.description?.toLowerCase().includes(q)) &&
          !(p.responsible?.toLowerCase().includes(q)) &&
          !(p.objective?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [projects, search, filterStatus, filterPriority, activeCard])

  const hasFilters = !!(search || filterStatus || filterPriority || activeCard)

  function clearFilters() {
    setSearch("")
    setFilterStatus("")
    setFilterPriority("")
    setActiveCard("")
  }

  function handleCardClick(key: CardKey) {
    // Clicking the active card (or "Total") resets to show all
    setActiveCard(prev => (prev === key || key === "") ? "" : key)
  }

  const activeCardLabel = cards.find(c => c.key === activeCard && activeCard !== "")?.label

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Projetos</h1>
            <p className="text-sm text-slate-500">
              {projects.length} projeto{projects.length !== 1 ? "s" : ""} cadastrado{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {activeTab === "lista" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Projeto
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: "lista",      label: "Lista de Projetos", icon: FolderKanban },
          { key: "relatorios", label: "Relatórios",        icon: BarChart2    },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Relatórios tab */}
      {activeTab === "relatorios" && <RelatoriosClient />}

      {/* Lista tab — only render when active */}
      {activeTab === "lista" && <>

      {/* Dashboard cards — clickable filters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map(card => (
          <SummaryCard
            key={card.key}
            card={card}
            isActive={activeCard === card.key}
            onClick={() => handleCardClick(card.key)}
          />
        ))}
      </div>

      {/* Search + select filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar projeto, responsável…"
            className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 rounded-lg px-3 py-2 transition-colors"
          >
            <X className="w-3 h-3" /> Limpar filtros
          </button>
        )}
      </div>

      {/* Active card indicator */}
      {activeCardLabel && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Filtro ativo:</span>
          <span className="font-semibold text-slate-700">{activeCardLabel}</span>
          <button
            onClick={() => setActiveCard("")}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-300 rounded-full px-2 py-0.5 transition-colors"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        </div>
      )}

      {/* Result count */}
      <p className="text-sm text-slate-500">
        {filtered.length === projects.length
          ? <><strong className="text-slate-700">{filtered.length}</strong> projeto{filtered.length !== 1 ? "s" : ""}</>
          : <><strong className="text-slate-700">{filtered.length}</strong> de {projects.length} projetos</>
        }
      </p>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">{hasFilters ? "Nenhum projeto encontrado" : "Nenhum projeto cadastrado"}</p>
          <p className="text-sm mt-1">
            {hasFilters ? "Tente ajustar os filtros ou limpar a seleção." : "Clique em \"Novo Projeto\" para começar."}
          </p>
        </div>
      )}

      {/* Project list */}
      {!loading && (
        <div className="space-y-3">
          {filtered.map(project => (
            <Link
              key={project.id}
              href={`/projetos/${project.id}`}
              className="block bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Progress indicator */}
                <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold text-indigo-700 leading-none">{project.progress}%</span>
                  <span className="text-[9px] text-indigo-400 leading-none mt-0.5">concluído</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {project.name}
                      </h3>
                      {(project.isOverdue || project.status === "ATRASADO") && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Atrasado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs border rounded-full px-2.5 py-0.5 font-medium", PRIORITY_COLORS[project.priority])}>
                        {PRIORITY_LABELS[project.priority]}
                      </span>
                      <StatusBadge status={project.status} />
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-xs text-slate-500 mb-2 line-clamp-1">{project.description}</p>
                  )}

                  <ProgressBar value={project.progress} className="mb-3" />

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    {project.responsible && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {project.responsible}
                      </span>
                    )}
                    {project.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(project.startDate)}
                        {project.dueDate && ` → ${formatDate(project.dueDate)}`}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {project.doneStages}/{project.totalStages} etapa{project.totalStages !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <ListChecks className="w-3 h-3" />
                      {project.doneTasks}/{project.totalTasks} tarefa{project.totalTasks !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <NovoProjetoModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}

      </> /* end lista tab */}
    </div>
  )
}
