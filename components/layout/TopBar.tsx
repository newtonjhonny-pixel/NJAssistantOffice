"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Search, Bell, FileText, Mail, Clock, CheckCheck,
  Loader2, AlertCircle, Sparkles, X, Menu,
  BookOpen, AlertTriangle, FileX, ShieldAlert,
} from "lucide-react"
import { cn, formatDate, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, isOverdue } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchTask {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  person: string | null
  dueDate: string | null
}

interface SearchInboxItem {
  id: string
  sender: string
  subject: string
  summary: string | null
  receivedAt: string
}

interface SearchResults {
  tasks: SearchTask[]
  inbox: SearchInboxItem[]
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  relatedType: string | null
  relatedId: string | null
  isRead: boolean
  createdAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_LABELS: Record<string, string> = {
  "/":              "Dashboard",
  "/inbox":         "Caixa de Entrada",
  "/agenda":        "Calendário",
  "/tasks":         "Tarefas",
  "/especialistas": "Especialistas",
  "/projetos":      "Projetos",
  "/conferencia":   "Conferência",
  "/gestao-equipe": "Gestão de Equipe",
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  TASK_CREATED:       <FileText      className="w-3.5 h-3.5 text-blue-500"   />,
  TASK_URGENT:        <AlertCircle   className="w-3.5 h-3.5 text-red-500"    />,
  TASK_OVERDUE:       <Clock         className="w-3.5 h-3.5 text-orange-500" />,
  TASK_WAITING:       <Clock         className="w-3.5 h-3.5 text-purple-500" />,
  EMAIL_RECEIVED:     <Mail          className="w-3.5 h-3.5 text-green-500"  />,
  AI_SUGGESTION:      <Sparkles      className="w-3.5 h-3.5 text-violet-500" />,
  // Procedimentos
  PROC_SEM_LEITURA:      <BookOpen      className="w-3.5 h-3.5 text-amber-500"  />,
  PROC_REVISAO_VENCIDA:  <Clock         className="w-3.5 h-3.5 text-orange-600" />,
  PROC_RISCO_CRITICO:    <ShieldAlert   className="w-3.5 h-3.5 text-red-600"    />,
  PROC_ABANDONADO:       <FileX         className="w-3.5 h-3.5 text-slate-400"  />,
}

const NOTIF_GROUP: Record<string, string> = {
  PROC_SEM_LEITURA:     'Procedimentos',
  PROC_REVISAO_VENCIDA: 'Procedimentos',
  PROC_RISCO_CRITICO:   'Procedimentos',
  PROC_ABANDONADO:      'Procedimentos',
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname  = usePathname()
  const router    = useRouter()

  // ── Search ──
  const [searchQuery,   setSearchQuery]   = useState("")
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen,    setSearchOpen]    = useState(false)
  const searchInputRef    = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // ── Notifications ──
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen,     setNotifOpen]     = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.isRead).length

  // ── CTRL+K & ESC shortcut ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
        setSearchOpen(true)
        setNotifOpen(false)
      }
      if (e.key === "Escape") {
        setSearchOpen(false)
        setNotifOpen(false)
        searchInputRef.current?.blur()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  // ── Click outside to close dropdowns ──
  useEffect(() => {
    function onMouse(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouse)
    return () => document.removeEventListener("mousedown", onMouse)
  }, [])

  // ── Debounced search ──
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      setSearchOpen(false)
      return
    }
    setSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(data)
        setSearchOpen(true)
      } finally {
        setSearchLoading(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // ── Notifications fetch (mount + polling 60s) ──
  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications")
      const data = await res.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // ── Actions ──
  function navigateTo(path: string) {
    setSearchOpen(false)
    setSearchQuery("")
    setSearchResults(null)
    router.push(path)
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  function notifLink(n: Notification) {
    if (n.relatedType === "task"      && n.relatedId) return `/tasks/${n.relatedId}`
    if (n.relatedType === "inbox")                    return "/inbox"
    if (n.relatedType === "procedure")                return "/processos"
    return null
  }

  // ── Derived ──
  const label = PAGE_LABELS[pathname] ?? "NJ Assistant Office"

  const now = new Date()
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  })

  const totalResults = (searchResults?.tasks.length ?? 0) + (searchResults?.inbox.length ?? 0)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5 lg:px-6">

      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Title */}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-slate-800 sm:text-lg">{label}</h2>
        <p className="hidden truncate text-xs capitalize text-slate-400 sm:block">{dateStr}</p>
      </div>

      {/* ── Global Search ── */}
      <div ref={searchContainerRef} className="relative hidden min-w-0 sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults) setSearchOpen(true) }}
            placeholder="Busca global… (Ctrl+K)"
            className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 md:w-56 xl:w-64"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
          )}
          {searchQuery && !searchLoading && (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults(null); setSearchOpen(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {searchOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-[min(480px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {totalResults === 0 && !searchLoading && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhum resultado encontrado para &ldquo;{searchQuery}&rdquo;
              </div>
            )}

            {/* Tasks */}
            {(searchResults?.tasks.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tarefas ({searchResults!.tasks.length})
                  </span>
                </div>
                {searchResults!.tasks.slice(0, 5).map(task => (
                  <button
                    key={task.id}
                    onClick={() => navigateTo(`/tasks/${task.id}`)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                  >
                    <FileText className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={cn("text-xs border rounded-full px-2 py-0.5", PRIORITY_COLORS[task.priority])}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className={cn("text-xs border rounded-full px-2 py-0.5", STATUS_COLORS[task.status])}>
                          {STATUS_LABELS[task.status]}
                        </span>
                        {task.dueDate && (
                          <span className={cn("text-xs", isOverdue(task.dueDate) && task.status !== "CONCLUIDA" ? "text-red-500" : "text-slate-400")}>
                            📅 {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Inbox */}
            {(searchResults?.inbox.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <Mail className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Caixa de Entrada ({searchResults!.inbox.length})
                  </span>
                </div>
                {searchResults!.inbox.slice(0, 4).map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigateTo("/inbox")}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                  >
                    <Mail className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.sender} · {formatDate(item.receivedAt)}
                      </p>
                      {item.summary && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.summary}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bell / Notifications ── */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => { setNotifOpen(v => !v); if (!notifOpen) fetchNotifications() }}
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Notificações"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1 leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Notification dropdown */}
        {notifOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 max-h-[75vh] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-800 text-sm">Notificações</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 font-medium px-1.5 py-0.5 rounded-full">
                    {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map(n => {
                  const link = notifLink(n)
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 transition-colors",
                        !n.isRead ? "bg-blue-50/50" : "bg-white",
                      )}
                    >
                      <div className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        {NOTIF_ICONS[n.type] ?? <Bell className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {NOTIF_GROUP[n.type] && (
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                            {NOTIF_GROUP[n.type]}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-slate-700">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-slate-300 mt-1">
                          {new Date(n.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {link && (
                          <button
                            onClick={() => { navigateTo(link); if (!n.isRead) markRead(n.id) }}
                            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                          >
                            Ver →
                          </button>
                        )}
                        {!n.isRead && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                            title="Marcar como lida"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
