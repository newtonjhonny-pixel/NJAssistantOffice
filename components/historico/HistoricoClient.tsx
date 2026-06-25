"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Clock, Search, X, Plus, Edit3, RefreshCw,
  Zap, Calendar, XCircle, Mail, Bot, CheckCircle2,
  ChevronDown, ChevronUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { cn, STATUS_COLORS, STATUS_LABELS, PRIORITY_LABELS } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: string
  action: string
  description: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
  task: {
    id: string
    title: string
    status: string
    priority: string
    origin: string | null
  }
}

// ─── Action metadata ──────────────────────────────────────────────────────────

const ACTION_META: Record<string, {
  label: string
  icon: React.ReactNode
  dot: string
  badge: string
}> = {
  CRIACAO: {
    label: "Criação",
    icon: <Plus className="w-3.5 h-3.5" />,
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  EDICAO: {
    label: "Edição",
    icon: <Edit3 className="w-3.5 h-3.5" />,
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
  },
  STATUS: {
    label: "Mudança de Status",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  PRIORIDADE: {
    label: "Mudança de Prioridade",
    icon: <Zap className="w-3.5 h-3.5" />,
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  },
  PRAZO: {
    label: "Mudança de Prazo",
    icon: <Calendar className="w-3.5 h-3.5" />,
    dot: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
  CONCLUSAO: {
    label: "Conclusão",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELAMENTO: {
    label: "Cancelamento",
    icon: <XCircle className="w-3.5 h-3.5" />,
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  EMAIL: {
    label: "Criação por E-mail",
    icon: <Mail className="w-3.5 h-3.5" />,
    dot: "bg-cyan-500",
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  IA: {
    label: "Análise por IA",
    icon: <Bot className="w-3.5 h-3.5" />,
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
  },
}

function getMeta(action: string) {
  return ACTION_META[action] ?? {
    label: action,
    icon: <Clock className="w-3.5 h-3.5" />,
    dot: "bg-slate-300",
    badge: "bg-slate-50 text-slate-500 border-slate-200",
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "",            label: "Todos"      },
  { key: "CRIACAO",     label: "Criação"    },
  { key: "EDICAO",      label: "Edição"     },
  { key: "STATUS",      label: "Status"     },
  { key: "PRIORIDADE",  label: "Prioridade" },
  { key: "PRAZO",       label: "Prazo"      },
  { key: "CONCLUSAO",   label: "Conclusão"  },
  { key: "CANCELAMENTO",label: "Cancelamento"},
  { key: "EMAIL",       label: "E-mail"     },
  { key: "IA",          label: "IA"         },
]

// ─── Value translation helpers ────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_RETORNO: "Aguardando retorno", CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
}
const PRIORITY_MAP: Record<string, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente",
}

function translateValue(action: string, value: string): string {
  if (action === "STATUS")     return STATUS_MAP[value]     ?? value
  if (action === "PRIORIDADE") return PRIORITY_MAP[value]   ?? value
  return value
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Aplica máscara dd/mm/aaaa ao texto digitado */
function maskDateBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** Converte "dd/mm/aaaa" para Date ou null (nunca usa new Date("dd/mm/aaaa")) */
function parseDateBR(value: string): Date | null {
  if (!value || value.length < 10) return null
  const [day, month, year] = value.split("/").map(Number)
  if (!day || !month || !year || year < 1900) return null
  const d = new Date(year, month - 1, day)
  if (isNaN(d.getTime())) return null
  return d
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10) // YYYY-MM-DD
}

function formatDateKey(key: string): string {
  return new Date(key + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, count, icon, color, active, onClick,
}: {
  label: string
  count: number
  icon: React.ReactNode
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 px-4 py-3 rounded-xl border text-left transition-all",
        active
          ? `${color} shadow-sm ring-2 ring-offset-1 ring-current/20`
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm text-slate-600",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold leading-none">{count}</p>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HistoricoClient() {
  const [history,   setHistory]   = useState<HistoryItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState("")
  const [search,    setSearch]    = useState("")
  const [dateFrom,  setDateFrom]  = useState("")
  const [dateTo,    setDateTo]    = useState("")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLoading(true)
    fetch("/api/history")
      .then(r => r.json())
      .then(setHistory)
      .finally(() => setLoading(false))
  }, [])

  // ── Client-side filtering (tab + search + dates) ──
  const filtered = useMemo(() => {
    const fromDate = parseDateBR(dateFrom)
    const toDate   = parseDateBR(dateTo)
    return history.filter(item => {
      if (activeTab && item.action !== activeTab) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !item.task.title.toLowerCase().includes(q) &&
          !item.description.toLowerCase().includes(q) &&
          !(item.oldValue?.toLowerCase().includes(q) ?? false) &&
          !(item.newValue?.toLowerCase().includes(q) ?? false)
        ) return false
      }
      const itemDate = new Date(item.createdAt)
      if (fromDate) {
        const from = new Date(fromDate); from.setHours(0, 0, 0, 0)
        if (itemDate < from) return false
      }
      if (toDate) {
        const to = new Date(toDate); to.setHours(23, 59, 59, 999)
        if (itemDate > to) return false
      }
      return true
    })
  }, [history, activeTab, search, dateFrom, dateTo])

  // ── Summary counts (from full history, not filtered) ──
  const counts = useMemo(() => ({
    total:        history.length,
    CRIACAO:      history.filter(h => h.action === "CRIACAO").length,
    EDICAO:       history.filter(h => h.action === "EDICAO").length,
    CONCLUSAO:    history.filter(h => h.action === "CONCLUSAO").length,
    CANCELAMENTO: history.filter(h => h.action === "CANCELAMENTO").length,
    IA:           history.filter(h => h.action === "IA").length,
  }), [history])

  // ── Group filtered records by date ──
  const grouped = useMemo(() => {
    const map: Record<string, HistoryItem[]> = {}
    filtered.forEach(item => {
      const key = toDateKey(item.createdAt)
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  function toggleCollapse(key: string) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function clearFilters() {
    setActiveTab("")
    setSearch("")
    setDateFrom("")
    setDateTo("")
  }

  const hasActiveFilters = !!(activeTab || search || dateFrom || dateTo)

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
        </div>
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
      </div>
    )
  }

  // ── Render ──
  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard
          label="Total" count={counts.total}
          icon={<Clock className="w-3.5 h-3.5" />}
          color="bg-slate-800 text-white border-slate-800"
          active={!activeTab && !search && !dateFrom && !dateTo}
          onClick={clearFilters}
        />
        <SummaryCard
          label="Criações" count={counts.CRIACAO}
          icon={<Plus className="w-3.5 h-3.5" />}
          color="bg-green-600 text-white border-green-600"
          active={activeTab === "CRIACAO"}
          onClick={() => setActiveTab(t => t === "CRIACAO" ? "" : "CRIACAO")}
        />
        <SummaryCard
          label="Edições" count={counts.EDICAO}
          icon={<Edit3 className="w-3.5 h-3.5" />}
          color="bg-slate-600 text-white border-slate-600"
          active={activeTab === "EDICAO"}
          onClick={() => setActiveTab(t => t === "EDICAO" ? "" : "EDICAO")}
        />
        <SummaryCard
          label="Conclusões" count={counts.CONCLUSAO}
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          color="bg-emerald-600 text-white border-emerald-600"
          active={activeTab === "CONCLUSAO"}
          onClick={() => setActiveTab(t => t === "CONCLUSAO" ? "" : "CONCLUSAO")}
        />
        <SummaryCard
          label="Cancelamentos" count={counts.CANCELAMENTO}
          icon={<XCircle className="w-3.5 h-3.5" />}
          color="bg-red-600 text-white border-red-600"
          active={activeTab === "CANCELAMENTO"}
          onClick={() => setActiveTab(t => t === "CANCELAMENTO" ? "" : "CANCELAMENTO")}
        />
        <SummaryCard
          label="IA/Análises" count={counts.IA}
          icon={<Bot className="w-3.5 h-3.5" />}
          color="bg-violet-600 text-white border-violet-600"
          active={activeTab === "IA"}
          onClick={() => setActiveTab(t => t === "IA" ? "" : "IA")}
        />
      </div>

      {/* ── Filters row ── */}
      <div className="flex flex-col gap-3">
        {/* Search + date */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por tarefa, descrição…"
              className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
            <span className="text-xs">De</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              value={dateFrom}
              onChange={e => setDateFrom(maskDateBR(e.target.value))}
              className="w-32 text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
            <span className="text-xs">até</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              value={dateTo}
              onChange={e => setDateTo(maskDateBR(e.target.value))}
              className="w-32 text-sm border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 rounded-lg px-3 py-2 transition-colors shrink-0"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(t => t === tab.key ? "" : tab.key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
                activeTab === tab.key
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              {tab.label}
              {tab.key && (
                <span className={cn(
                  "ml-1.5 text-xs px-1 rounded",
                  activeTab === tab.key ? "text-white/70" : "text-slate-400",
                )}>
                  {history.filter(h => h.action === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Result count ── */}
      <p className="text-sm text-slate-500">
        {filtered.length === history.length
          ? <><strong className="text-slate-700">{filtered.length}</strong> registro(s) no histórico</>
          : <><strong className="text-slate-700">{filtered.length}</strong> de {history.length} registro(s)</>
        }
      </p>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">Nenhum registro encontrado</p>
          <p className="text-sm mt-1">Tente ajustar os filtros.</p>
        </div>
      )}

      {/* ── Timeline by date ── */}
      <div className="space-y-6">
        {grouped.map(([dateKey, items]) => {
          const isCollapsed = collapsed[dateKey]
          return (
            <div key={dateKey}>
              {/* Date header */}
              <button
                onClick={() => toggleCollapse(dateKey)}
                className="flex items-center gap-3 w-full mb-3 group"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700 capitalize">
                    {formatDateKey(dateKey)}
                  </p>
                  <span className="text-xs text-slate-400 font-normal">
                    — {items.length} registro{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                  {isCollapsed
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronUp className="w-4 h-4" />
                  }
                </div>
              </button>

              {!isCollapsed && (
                <div className="ml-5 border-l-2 border-slate-100 pl-5 space-y-2">
                  {items.map(item => {
                    const meta = getMeta(item.action)
                    return (
                      <div
                        key={item.id}
                        className="relative flex items-start gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:shadow-sm transition-all group"
                      >
                        {/* Timeline dot */}
                        <div className={cn(
                          "absolute -left-[23px] top-4 w-2.5 h-2.5 rounded-full border-2 border-white",
                          meta.dot,
                        )} />

                        {/* Action icon */}
                        <div className={cn(
                          "shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center mt-0.5",
                          meta.badge,
                        )}>
                          {meta.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={cn(
                              "text-xs border rounded-full px-2.5 py-0.5 font-medium",
                              meta.badge,
                            )}>
                              {meta.label}
                            </span>
                            <Link
                              href={`/tasks/${item.task.id}`}
                              className="text-sm font-medium text-slate-700 hover:text-blue-600 truncate transition-colors"
                              title={item.task.title}
                            >
                              {item.task.title}
                            </Link>
                          </div>

                          {/* Description */}
                          {item.description && item.description !== "Tarefa criada" && item.description !== "Tarefa editada" && (
                            <p className="text-xs text-slate-500">{item.description}</p>
                          )}

                          {/* Old → New values */}
                          {item.oldValue && item.newValue && (
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span className="line-through">{translateValue(item.action, item.oldValue)}</span>
                              <span className="text-slate-300">→</span>
                              <span className="text-slate-600 font-medium">{translateValue(item.action, item.newValue)}</span>
                            </p>
                          )}
                        </div>

                        {/* Right meta */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={cn(
                            "text-xs border rounded-full px-2 py-0.5",
                            STATUS_COLORS[item.task.status],
                          )}>
                            {STATUS_LABELS[item.task.status]}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
