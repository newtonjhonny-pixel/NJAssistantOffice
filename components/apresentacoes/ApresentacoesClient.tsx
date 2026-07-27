"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Presentation, Plus, Search, Star, StarOff, Archive,
  Trash2, MoreVertical, Brain, GitBranch, LayoutTemplate,
  BarChart2, Clock, FileText, Share2,
  FileQuestion, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NovaApresentacaoModal } from "./NovaApresentacaoModal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PresentationItem {
  id:          string
  title:       string
  description: string | null
  type:        string
  status:      string
  thumbnail:   string | null
  favorite:    boolean
  objective:   string | null
  audience:    string | null
  createdAt:   string
  updatedAt:   string
  _count: { versions: number; history: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  slides:      { label: "Slides",           icon: Presentation,   color: "text-blue-600",   bg: "bg-blue-50" },
  organogram:  { label: "Organograma",      icon: Share2,         color: "text-purple-600", bg: "bg-purple-50" },
  flowchart:   { label: "Fluxograma",       icon: GitBranch,      color: "text-emerald-600",bg: "bg-emerald-50" },
  mindmap:     { label: "Mapa Mental",      icon: Brain,          color: "text-amber-600",  bg: "bg-amber-50" },
  timeline:    { label: "Cronograma",       icon: Clock,          color: "text-cyan-600",   bg: "bg-cyan-50" },
  process:     { label: "Mapa de Processo", icon: LayoutTemplate, color: "text-orange-600", bg: "bg-orange-50" },
  infographic: { label: "Infográfico",      icon: BarChart2,      color: "text-rose-600",   bg: "bg-rose-50" },
  report:      { label: "Relatório Visual", icon: FileText,       color: "text-slate-600",  bg: "bg-slate-100" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:    { label: "Rascunho",    color: "bg-slate-100 text-slate-600" },
  editing:  { label: "Em edição",  color: "bg-blue-50 text-blue-700" },
  done:     { label: "Concluído",  color: "bg-green-50 text-green-700" },
  archived: { label: "Arquivado",  color: "bg-yellow-50 text-yellow-700" },
}

const FILTER_TABS = [
  { key: "all",      label: "Todos" },
  { key: "draft",    label: "Rascunho" },
  { key: "editing",  label: "Em edição" },
  { key: "done",     label: "Concluídos" },
  { key: "archived", label: "Arquivados" },
  { key: "favorite", label: "Favoritos" },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 60) return min <= 1 ? "agora" : `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d === 1) return "ontem"
  if (d < 7) return `${d} dias atrás`
  return fmtDate(s)
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  item:       PresentationItem
  onOpen:     (id: string) => void
  onToggleFav:(id: string, fav: boolean) => void
  onArchive:  (id: string) => void
  onDelete:   (id: string) => void
}

function ApresentacaoCard({ item, onOpen, onToggleFav, onArchive, onDelete }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cfg  = TYPE_CONFIG[item.type] ?? { label: item.type, icon: FileQuestion, color: "text-slate-500", bg: "bg-slate-50" }
  const Icon = cfg.icon
  const st   = STATUS_CONFIG[item.status] ?? { label: item.status, color: "bg-slate-100 text-slate-600" }

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
      onClick={() => onOpen(item.id)}
    >
      {/* Thumbnail / placeholder */}
      <div className={cn("rounded-t-xl h-32 flex items-center justify-center", cfg.bg)}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover rounded-t-xl" />
        ) : (
          <Icon className={cn("w-12 h-12 opacity-30", cfg.color)} />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 flex-1">{item.title}</h3>
          <button
            onClick={e => { e.stopPropagation(); onToggleFav(item.id, !item.favorite) }}
            className="shrink-0 mt-0.5 text-slate-300 hover:text-amber-400 transition-colors"
          >
            {item.favorite
              ? <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              : <StarOff className="w-4 h-4" />}
          </button>
        </div>

        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>
        )}

        <div className="flex items-center gap-2 mt-auto pt-2">
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", st.color)}>{st.label}</span>
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>{cfg.label}</span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
          <span>{timeAgo(item.updatedAt)}</span>
          <div className="flex items-center gap-2">
            {item._count.versions > 0 && <span>{item._count.versions}v</span>}
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(false) }} />
          <div
            className="absolute bottom-10 right-3 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { onArchive(item.id); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Archive className="w-3.5 h-3.5" />
              {item.status === "archived" ? "Desarquivar" : "Arquivar"}
            </button>
            <button
              onClick={() => { onDelete(item.id); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered, onNew }: { filtered: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <Presentation className="w-8 h-8 text-blue-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">
        {filtered ? "Nenhuma apresentação encontrada" : "Nenhuma apresentação ainda"}
      </h3>
      <p className="text-sm text-slate-500 max-w-xs mb-5">
        {filtered
          ? "Tente ajustar os filtros ou a busca."
          : "Crie sua primeira apresentação, organograma, fluxograma ou outro material visual."}
      </p>
      {!filtered && (
        <button
          onClick={onNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Apresentação
        </button>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ApresentacoesClient() {
  const router = useRouter()
  const [items,      setItems]      = useState<PresentationItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState("")
  const [activeTab,  setActiveTab]  = useState("all")
  const [showModal,  setShowModal]  = useState(false)
  const [typeFilter, setTypeFilter] = useState("")

  async function load() {
    try {
      const res  = await fetch("/api/apresentacoes")
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleFavorite(id: string, fav: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, favorite: fav } : i))
    await fetch(`/api/apresentacoes/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ favorite: fav, historyNote: fav ? "Marcado como favorito" : "Removido dos favoritos" }),
    })
  }

  async function handleArchive(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const newStatus = item.status === "archived" ? "draft" : "archived"
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
    await fetch(`/api/apresentacoes/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus, historyNote: newStatus === "archived" ? "Arquivado" : "Desarquivado" }),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta apresentação? Esta ação não pode ser desfeita.")) return
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/apresentacoes/${id}`, { method: "DELETE" })
  }

  function handleCreated(id: string) {
    setShowModal(false)
    router.push(`/apresentacoes/${id}`)
  }

  const filtered = useMemo(() => {
    let list = items
    if (activeTab === "favorite")            list = list.filter(i => i.favorite)
    else if (activeTab !== "all")            list = list.filter(i => i.status === activeTab)
    if (typeFilter)                          list = list.filter(i => i.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        (i.objective   ?? "").toLowerCase().includes(q)
      )
    }
    return list
  }, [items, activeTab, typeFilter, search])

  // summary counts
  const counts = useMemo(() => ({
    all:      items.length,
    draft:    items.filter(i => i.status === "draft").length,
    editing:  items.filter(i => i.status === "editing").length,
    done:     items.filter(i => i.status === "done").length,
    archived: items.filter(i => i.status === "archived").length,
    favorite: items.filter(i => i.favorite).length,
  }), [items])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Presentation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Apresentações</h1>
            <p className="text-xs text-slate-500">
              {items.length === 0 ? "Nenhuma apresentação" : `${items.length} apresentaç${items.length === 1 ? "ão" : "ões"}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Apresentação
        </button>
      </div>

      {/* Filter tabs */}
      <div className="-mx-4 flex items-end gap-0 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
        {FILTER_TABS.map(tab => {
          const count  = counts[tab.key as keyof typeof counts] ?? 0
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-all -mb-[1px]",
                active
                  ? "border-blue-600 text-blue-600 bg-blue-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50/60",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search + type filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar apresentações..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filtered={search.trim() !== "" || activeTab !== "all" || typeFilter !== ""} onNew={() => setShowModal(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <ApresentacaoCard
              key={item.id}
              item={item}
              onOpen={id => router.push(`/apresentacoes/${id}`)}
              onToggleFav={toggleFavorite}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && <NovaApresentacaoModal onClose={() => setShowModal(false)} onSaved={handleCreated} />}
    </div>
  )
}
