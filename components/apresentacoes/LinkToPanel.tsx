"use client"

import { useEffect, useState } from "react"
import { Link2, X, Search, Loader2, FolderKanban, CheckSquare, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

type LinkType = "project" | "task" | "note"

interface LinkItem {
  id:    string
  label: string
  type:  LinkType
}

interface Props {
  presentationId: string
  linkedTo:       string | null
  onLinked:       (linkedTo: string | null) => void
}

const TYPE_CONFIG: Record<LinkType, { label: string; icon: React.ElementType; color: string; endpoint: string }> = {
  project: { label: "Projeto",  icon: FolderKanban, color: "text-blue-600",   endpoint: "/api/projects" },
  task:    { label: "Tarefa",   icon: CheckSquare,  color: "text-amber-600",  endpoint: "/api/tasks" },
  note:    { label: "Nota",     icon: FileText,     color: "text-green-600",  endpoint: "/api/notes" },
}

function parseLinkedTo(raw: string | null): { type: LinkType; id: string; label: string } | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function LinkToPanel({ presentationId, linkedTo, onLinked }: Props) {
  const [open,       setOpen]       = useState(false)
  const [activeType, setActiveType] = useState<LinkType>("project")
  const [query,      setQuery]      = useState("")
  const [items,      setItems]      = useState<LinkItem[]>([])
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)

  const current = parseLinkedTo(linkedTo)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    setItems([])

    const cfg = TYPE_CONFIG[activeType]
    const url = `${cfg.endpoint}?q=${encodeURIComponent(query)}&limit=10`

    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        // normalize different API shapes
        const list: LinkItem[] = (Array.isArray(data) ? data : data.items ?? data.projects ?? data.notes ?? [])
          .slice(0, 10)
          .map((item: any) => ({
            id:    item.id,
            label: item.name ?? item.title ?? item.text ?? item.id,
            type:  activeType,
          }))
        setItems(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [open, activeType, query])

  async function link(item: LinkItem) {
    setSaving(true)
    try {
      const val = JSON.stringify({ type: item.type, id: item.id, label: item.label })
      await fetch(`/api/apresentacoes/${presentationId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ linkedTo: val, historyNote: `Vinculado a ${TYPE_CONFIG[item.type].label}: ${item.label}` }),
      })
      onLinked(val)
      setOpen(false)
      setQuery("")
    } finally {
      setSaving(false)
    }
  }

  async function unlink() {
    setSaving(true)
    try {
      await fetch(`/api/apresentacoes/${presentationId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ linkedTo: null, historyNote: "Vínculo removido" }),
      })
      onLinked(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vinculado a</h3>
      </div>

      {current ? (
        <div className="flex items-center gap-2">
          {(() => {
            const cfg = TYPE_CONFIG[current.type]
            const Icon = cfg.icon
            return (
              <>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", cfg.color)} />
                  <span className="text-xs font-medium text-slate-600 truncate">{current.label}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">({cfg.label})</span>
                </div>
                <button
                  onClick={unlink}
                  disabled={saving}
                  title="Remover vínculo"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </>
            )
          })()}
        </div>
      ) : (
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
        >
          <Link2 className="w-3.5 h-3.5" />
          {open ? "Fechar" : "Vincular a projeto, tarefa ou nota…"}
        </button>
      )}

      {open && !current && (
        <div className="mt-3 space-y-2">
          {/* Type tabs */}
          <div className="flex gap-1">
            {(Object.keys(TYPE_CONFIG) as LinkType[]).map(t => {
              const { label, icon: Icon } = TYPE_CONFIG[t]
              return (
                <button
                  key={t}
                  onClick={() => { setActiveType(t); setQuery("") }}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                    activeType === t
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-200",
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Buscar ${TYPE_CONFIG[activeType].label.toLowerCase()}…`}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Results */}
          <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum resultado</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map(item => {
                  const Icon = TYPE_CONFIG[item.type].icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => link(item)}
                      disabled={saving}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white transition-colors disabled:opacity-50"
                    >
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", TYPE_CONFIG[item.type].color)} />
                      <span className="text-xs text-slate-700 truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
