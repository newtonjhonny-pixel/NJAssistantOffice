"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  Plus, Search, Star, Archive, Trash2, Edit3, Check, X,
  Send, Loader2, ChevronDown, RefreshCw, Download,
  MessageSquare, BookOpen, Clock, Sparkles, Users, Scale,
  Database, ShieldAlert, Stethoscope, UserSearch, GitBranch,
  BadgeCheck, Landmark, TrendingUp, Brain, Bot, FileText,
  MoreVertical, Info, Menu, Zap, CheckCircle, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SPECIALISTS, type Specialist } from "@/lib/especialistas/config"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  title: string
  specialist: string
  isFavorite: boolean
  isArchived: boolean
  messageCount: number
  createdAt: string
  updatedAt: string
}

interface Message {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  sources: string | null
  specialist: string | null
  docsUsed: string | null       // JSON array of doc titles
  autoUpdated: boolean
  baseVersion?: string | null   // enriched client-side
  createdAt: string
}

interface KnowledgeBase {
  id: string
  specialist: string
  status: string
  lastUpdated: string | null
  version: string | null
  docCount: number
  lastChecked: string | null
  sources: string | null
  docsByCategory: string | null
  nextUpdate: string | null
  initialLoadDone: boolean
  initialLoadAt: string | null
}

interface UpdateLog {
  id: string
  specialist: string
  version: string
  newDocs: number
  updatedDocs: number
  removedDocs: number
  duration: number
  triggeredBy: string
  createdAt: string
}

const UPDATE_PROGRESS_STEPS = [
  "Consultando Portal Oficial...",
  "Verificando versões...",
  "Baixando documentos...",
  "Atualizando Base...",
  "Indexando documentos...",
  "Finalizado.",
]

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users, Scale, Database, ShieldAlert, Stethoscope, UserSearch,
  GitBranch, BadgeCheck, Landmark, TrendingUp, Brain, Bot,
}

function SpecialistIcon({ id, className }: { id: string; className?: string }) {
  const s = SPECIALISTS.find(x => x.id === id)
  if (!s) return <Bot className={className} />
  const Icon = ICON_MAP[s.icon] ?? Bot
  return <Icon className={className} />
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}
function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}
function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "agora"
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return fmtDate(iso)
}

function getSpecialist(id: string): Specialist {
  return SPECIALISTS.find(s => s.id === id) ?? SPECIALISTS[0]
}

const INITIAL_LOAD_STEPS = [
  "Conectando ao Portal Oficial...",
  "Buscando MOS e histórico de versões...",
  "Indexando leiautes e eventos...",
  "Indexando tabelas e notas técnicas...",
  "Indexando FAQ e orientações...",
  "Indexando legislação e portarias...",
  "Finalizando carga histórica...",
  "Carga Inicial concluída.",
]

// Specialists that require initial load (must match server-side list)
const REQUIRES_INITIAL_LOAD_IDS = ["esocial"]

function baseStatusColor(status: string) {
  if (status === "ATUALIZADO")          return "bg-green-500"
  if (status === "DISPONIVEL")          return "bg-yellow-500"
  if (status === "CARGA_PENDENTE")      return "bg-orange-400"
  if (status === "CARGA_EM_ANDAMENTO")  return "bg-blue-400"
  return "bg-red-500"
}

// Render markdown-lite: **bold**, newlines
function RenderMessage({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
        return <span key={i}>{p}</span>
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EspecialistasClient() {
  // Layout state
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [rightOpen,   setRightOpen]     = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  // Conversations
  const [conversations, setConversations]       = useState<Conversation[]>([])
  const [activeConvId,  setActiveConvId]        = useState<string | null>(null)
  const [messages,      setMessages]            = useState<Message[]>([])
  const [loadingConvs,  setLoadingConvs]        = useState(true)
  const [loadingMsgs,   setLoadingMsgs]         = useState(false)

  // Specialist
  const [activeSpecialist, setActiveSpecialist] = useState<Specialist>(SPECIALISTS[0])
  const [showSpecPicker,   setShowSpecPicker]   = useState(false)

  // Input
  const [input,    setInput]    = useState("")
  const [sending,  setSending]  = useState(false)
  const inputRef               = useRef<HTMLTextAreaElement>(null)
  const bottomRef              = useRef<HTMLDivElement>(null)

  // Rename
  const [renamingId,   setRenamingId]   = useState<string | null>(null)
  const [renameValue,  setRenameValue]  = useState("")

  // Search
  const [searchQ, setSearchQ] = useState("")

  // Knowledge base
  const [bases,            setBases]           = useState<KnowledgeBase[]>([])
  const [updatingBase,     setUpdatingBase]    = useState<string | null>(null)
  const [updateDropdown,   setUpdateDropdown]  = useState(false)
  const [updateProgress,   setUpdateProgress]  = useState<number>(-1) // -1 = not running
  const [updateResult,     setUpdateResult]    = useState<UpdateLog | null>(null)
  const [initialLoading,   setInitialLoading]  = useState(false)
  const [initialLoadStep,  setInitialLoadStep] = useState(0)
  const [initialLoadResult, setInitialLoadResult] = useState<{ indexed: number; duration: number; version: string } | null>(null)
  // Auto-retry: se base estava sendo inicializada, re-enviar depois do seed
  const [pendingRetry,   setPendingRetry]  = useState<string | null>(null)

  const [reindexing,       setReindexing]       = useState<string | null>(null)
  const [verifying,        setVerifying]        = useState<string | null>(null)
  const [integrityResult,  setIntegrityResult]  = useState<{
    total: number; active: number; revoked: number;
    withEmbedding: number; withoutEmbedding: number;
    coverage: number; status: string; message: string;
  } | null>(null)

  // UpdateManager
  const [checkingStatus,    setCheckingStatus]    = useState<string | null>(null)
  const [updatingViaManager, setUpdatingViaManager] = useState<string | null>(null)
  const [statusResult,      setStatusResult]      = useState<{
    needsUpdate: boolean; isDue: boolean; reason: string;
    staleDays: number | null; changedSources: string[]; newSources: string[];
    docCount: number; version: string | null; checkedAt: string;
  } | null>(null)
  const [managerUpdateResult, setManagerUpdateResult] = useState<{
    status: string; newDocs: number; updatedDocs: number; removedDocs: number;
    duration: number; version: string; cacheInvalidated: boolean;
    docCount: number; message: string; error: string | null;
  } | null>(null)

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true)
    const params = new URLSearchParams()
    params.set("archived", showArchived ? "true" : "false")
    if (searchQ) params.set("q", searchQ)
    const res  = await fetch(`/api/especialistas/conversations?${params}`)
    const data = await res.json()
    setConversations(data)
    setLoadingConvs(false)
  }, [showArchived, searchQ])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Load knowledge bases ──
  useEffect(() => {
    fetch("/api/especialistas/base").then(r => r.json()).then(setBases)
  }, [])

  // ── Load messages when conversation changes ──
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return }
    setLoadingMsgs(true)
    fetch(`/api/especialistas/conversations/${activeConvId}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? [])
        const spec = getSpecialist(data.specialist)
        setActiveSpecialist(spec)
        setLoadingMsgs(false)
      })
  }, [activeConvId])

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Create new conversation ──
  async function newConversation() {
    const res  = await fetch("/api/especialistas/conversations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title: "Nova conversa", specialist: activeSpecialist.id }),
    })
    const conv = await res.json()
    await loadConversations()
    setActiveConvId(conv.id)
    setMessages([])
    setShowSpecPicker(false)
    inputRef.current?.focus()
  }

  // ── Send message ──
  async function sendMessage() {
    if (!input.trim() || sending) return

    // Create conversation on first send if none active
    let convId = activeConvId
    if (!convId) {
      const res  = await fetch("/api/especialistas/conversations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title: input.trim().slice(0, 60), firstMessage: input.trim(), specialist: activeSpecialist.id }),
      })
      const conv = await res.json()
      convId = conv.id
      setActiveConvId(conv.id)
    }

    const userMsg: Message = {
      id: `tmp-${Date.now()}`, conversationId: convId!, role: "user",
      content: input.trim(), sources: null, specialist: activeSpecialist.id,
      docsUsed: null, autoUpdated: false,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    const sent = input.trim()
    setInput("")
    setSending(true)

    try {
      const res  = await fetch(`/api/especialistas/conversations/${convId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: sent, specialistId: activeSpecialist.id }),
      })
      const data = await res.json()
      if (data.message) {
        // Enriquece a mensagem com metadados retornados pelo servidor
        const enriched = {
          ...data.message,
          docsUsed:    data.docsUsed ? JSON.stringify(data.docsUsed) : data.message.docsUsed,
          autoUpdated: data.autoUpdated ?? data.message.autoUpdated,
          baseVersion: data.baseVersion,
        }
        setMessages(prev => [...prev, enriched])
        setActiveSpecialist(getSpecialist(data.specialist ?? activeSpecialist.id))

        // Atualiza painel da base se houve auto-update
        if (data.autoUpdated) {
          const rBase = await fetch("/api/especialistas/base")
          setBases(await rBase.json())
        }
        // Se base estava sendo inicializada, agenda retry automático
        if (data.message.content?.startsWith("⏳")) {
          setPendingRetry(sent)
          setTimeout(async () => {
            const rBase = await fetch("/api/especialistas/base")
            setBases(await rBase.json())
            setPendingRetry(null)
          }, 6000)
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, conversationId: convId!, role: "assistant",
        content: "Erro ao processar sua mensagem. Tente novamente.", sources: null,
        specialist: activeSpecialist.id, docsUsed: null, autoUpdated: false,
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
      await loadConversations()
    }
  }

  // ── Keyboard ──
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Toggle favorite ──
  async function toggleFavorite(conv: Conversation) {
    await fetch(`/api/especialistas/conversations/${conv.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isFavorite: !conv.isFavorite }),
    })
    loadConversations()
  }

  // ── Toggle archive ──
  async function toggleArchive(conv: Conversation) {
    await fetch(`/api/especialistas/conversations/${conv.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isArchived: !conv.isArchived }),
    })
    if (conv.id === activeConvId) setActiveConvId(null)
    loadConversations()
  }

  // ── Delete ──
  async function deleteConversation(conv: Conversation) {
    if (!confirm(`Excluir "${conv.title}"?`)) return
    await fetch(`/api/especialistas/conversations/${conv.id}`, { method: "DELETE" })
    if (conv.id === activeConvId) setActiveConvId(null)
    loadConversations()
  }

  // ── Rename ──
  async function saveRename(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return }
    await fetch(`/api/especialistas/conversations/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title: renameValue.trim() }),
    })
    setRenamingId(null)
    loadConversations()
  }

  // ── Switch specialist ──
  async function switchSpecialist(spec: Specialist) {
    setActiveSpecialist(spec)
    setShowSpecPicker(false)
    if (activeConvId) {
      await fetch(`/api/especialistas/conversations/${activeConvId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ specialist: spec.id }),
      })
    }
  }

  // ── Export conversation as text ──
  function exportConversation() {
    if (!messages.length) return
    const lines = messages.map(m => {
      const who = m.role === "user" ? "VOCÊ" : `${activeSpecialist.name.toUpperCase()}`
      const src = m.sources ? `\n[Fontes: ${m.sources}]` : ""
      return `─── ${who} ───\n${m.content}${src}`
    })
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = `conversa_${Date.now()}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Update knowledge base with progress ──
  async function updateBase(specialist: string, action?: string) {
    setUpdatingBase(specialist)
    setUpdateDropdown(false)
    setUpdateResult(null)
    setUpdateProgress(0)

    let stepIdx = 0
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, UPDATE_PROGRESS_STEPS.length - 2)
      setUpdateProgress(stepIdx)
    }, 600)

    try {
      const body = action
        ? { action, triggeredBy: "manual" }
        : { specialist, force: true, triggeredBy: "manual" }

      const res  = await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      clearInterval(ticker)
      setUpdateProgress(UPDATE_PROGRESS_STEPS.length - 1)

      if (data.log) setUpdateResult(data.log)

      await new Promise(r => setTimeout(r, 600))
      const basesRes = await fetch("/api/especialistas/base")
      setBases(await basesRes.json())
    } catch {
      clearInterval(ticker)
    } finally {
      setUpdatingBase(null)
      setUpdateProgress(-1)
    }
  }

  // ── Reindex: gera/regenera embeddings da base vetorial ──
  async function reindexBase(specialistId: string) {
    setReindexing(specialistId)
    setIntegrityResult(null)
    try {
      const res  = await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reindex", specialist: specialistId }),
      })
      await res.json()
      const basesRes = await fetch("/api/especialistas/base")
      setBases(await basesRes.json())
    } catch { /* silent */ } finally {
      setReindexing(null)
    }
  }

  // ── Verificar Integridade: checa cobertura de embeddings ──
  async function verifyIntegrity(specialistId: string) {
    setVerifying(specialistId)
    setIntegrityResult(null)
    try {
      const res  = await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verificar-integridade", specialist: specialistId }),
      })
      const data = await res.json()
      setIntegrityResult(data)
    } catch { /* silent */ } finally {
      setVerifying(null)
    }
  }

  // ── Verificar Status via UpdateManager ──
  async function checkStatus(specialistId: string) {
    setCheckingStatus(specialistId)
    setStatusResult(null)
    setManagerUpdateResult(null)
    try {
      const res  = await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verificar-status", specialist: specialistId }),
      })
      const data = await res.json()
      setStatusResult(data)
    } catch { /* silent */ } finally {
      setCheckingStatus(null)
    }
  }

  // ── Atualizar Base via UpdateManager ──
  async function updateViaManager(specialistId: string) {
    setUpdatingViaManager(specialistId)
    setManagerUpdateResult(null)
    setStatusResult(null)
    try {
      const res  = await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "atualizar-via-manager", specialist: specialistId }),
      })
      const data = await res.json()
      setManagerUpdateResult(data)
      // Atualiza lista de bases para refletir docCount / lastUpdated
      const basesRes = await fetch("/api/especialistas/base")
      setBases(await basesRes.json())
    } catch { /* silent */ } finally {
      setUpdatingViaManager(null)
    }
  }

  // ── Initial load for eSocial ──
  async function runInitialLoad(specialistId: string) {
    setInitialLoading(true)
    setInitialLoadStep(0)
    setInitialLoadResult(null)
    setUpdateDropdown(false)

    let step = 0
    const ticker = setInterval(() => {
      step = Math.min(step + 1, INITIAL_LOAD_STEPS.length - 2)
      setInitialLoadStep(step)
    }, 900)

    try {
      const res  = await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initial-load", specialist: specialistId }),
      })
      const data = await res.json()
      clearInterval(ticker)
      setInitialLoadStep(INITIAL_LOAD_STEPS.length - 1)
      if (data.log) {
        setInitialLoadResult({ indexed: data.indexed, duration: data.log.duration, version: data.log.version })
      }
      await new Promise(r => setTimeout(r, 800))
      const basesRes = await fetch("/api/especialistas/base")
      setBases(await basesRes.json())
    } catch {
      clearInterval(ticker)
    } finally {
      setInitialLoading(false)
      setInitialLoadStep(0)
    }
  }

  // ── Derived data ──
  const activeConv     = conversations.find(c => c.id === activeConvId)
  const favorites      = conversations.filter(c => c.isFavorite && !c.isArchived)
  const recent         = conversations.filter(c => !c.isFavorite && !c.isArchived)
  const activeBase     = bases.find(b => b.specialist === activeSpecialist.id)
  const usedSpecialists = Array.from(new Set(conversations.map(c => c.specialist))).map(getSpecialist)

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">

      {/* ══════════════ LEFT SIDEBAR ══════════════ */}
      {sidebarOpen && (
        <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-100">
            <button
              onClick={newConversation}
              className="w-full flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl px-3 py-2.5 text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova conversa
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setShowArchived(false)}
              className={cn("flex-1 text-xs py-2 font-medium transition-colors",
                !showArchived ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >Ativas</button>
            <button
              onClick={() => setShowArchived(true)}
              className={cn("flex-1 text-xs py-2 font-medium transition-colors",
                showArchived ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >Arquivadas</button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
            ) : (
              <>
                {/* Favorites */}
                {favorites.length > 0 && (
                  <div className="pt-2">
                    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Star className="w-3 h-3" /> Favoritas
                    </p>
                    {favorites.map(c => (
                      <ConvItem key={c.id} conv={c} active={c.id === activeConvId}
                        onSelect={() => setActiveConvId(c.id)}
                        onFavorite={() => toggleFavorite(c)}
                        onArchive={() => toggleArchive(c)}
                        onDelete={() => deleteConversation(c)}
                        onRename={() => { setRenamingId(c.id); setRenameValue(c.title) }}
                        renamingId={renamingId} renameValue={renameValue}
                        setRenameValue={setRenameValue}
                        onSaveRename={() => saveRename(c.id)}
                        onCancelRename={() => setRenamingId(null)}
                      />
                    ))}
                  </div>
                )}

                {/* Recent */}
                {recent.length > 0 && (
                  <div className="pt-2">
                    {favorites.length > 0 && (
                      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Recentes
                      </p>
                    )}
                    {recent.map(c => (
                      <ConvItem key={c.id} conv={c} active={c.id === activeConvId}
                        onSelect={() => setActiveConvId(c.id)}
                        onFavorite={() => toggleFavorite(c)}
                        onArchive={() => toggleArchive(c)}
                        onDelete={() => deleteConversation(c)}
                        onRename={() => { setRenamingId(c.id); setRenameValue(c.title) }}
                        renamingId={renamingId} renameValue={renameValue}
                        setRenameValue={setRenameValue}
                        onSaveRename={() => saveRename(c.id)}
                        onCancelRename={() => setRenamingId(null)}
                      />
                    ))}
                  </div>
                )}

                {favorites.length === 0 && recent.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    {showArchived ? "Nenhuma conversa arquivada." : "Nenhuma conversa ainda."}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Specialists used */}
          {usedSpecialists.length > 0 && (
            <div className="p-3 border-t border-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Especialistas</p>
              <div className="flex flex-wrap gap-1">
                {usedSpecialists.slice(0, 6).map(s => (
                  <button key={s.id} onClick={() => switchSpecialist(s)} title={s.name}
                    className={cn("text-base rounded-lg p-1 hover:bg-slate-100 transition-colors", activeSpecialist.id === s.id && "bg-slate-100")}>
                    {s.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* ══════════════ CENTER — CHAT ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
          <button onClick={() => setSidebarOpen(v => !v)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <Menu className="w-4 h-4" />
          </button>

          {activeConv ? (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{activeConv.title}</p>
              <p className="text-xs text-slate-400">{activeConv.messageCount} mensagens · {fmtRelative(activeConv.updatedAt)}</p>
            </div>
          ) : (
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700">Centro de Especialistas</p>
              <p className="text-xs text-slate-400">Selecione ou inicie uma conversa</p>
            </div>
          )}

          {/* Specialist badge + switcher */}
          <div className="relative">
            <button
              onClick={() => setShowSpecPicker(v => !v)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all shadow-sm",
                `bg-gradient-to-r ${activeSpecialist.gradient}`
              )}
            >
              <span>{activeSpecialist.emoji}</span>
              <span className="hidden sm:inline">{activeSpecialist.shortName}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showSpecPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 px-1">Trocar Especialista</p>
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {SPECIALISTS.map(s => (
                    <button key={s.id} onClick={() => switchSpecialist(s)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors",
                        activeSpecialist.id === s.id && "bg-blue-50"
                      )}
                    >
                      <span className="text-xl shrink-0">{s.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 leading-tight">{s.shortName}</p>
                        <p className="text-[10px] text-slate-400 truncate leading-tight">{s.description}</p>
                      </div>
                      {activeSpecialist.id === s.id && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {activeConv && (
            <button onClick={exportConversation} title="Exportar conversa"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <Download className="w-4 h-4" />
            </button>
          )}

          <button onClick={() => setRightOpen(v => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Painel do especialista">
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!activeConvId ? (
            <WelcomeScreen specialist={activeSpecialist} onSpecialist={switchSpecialist} onNewConv={newConversation} />
          ) : loadingMsgs ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <span className="text-4xl">{activeSpecialist.emoji}</span>
              <p className="mt-3 font-medium">{activeSpecialist.name}</p>
              <p className="text-xs mt-1">{activeSpecialist.description}</p>
              <p className="text-xs mt-3 text-slate-300">Digite sua primeira pergunta abaixo.</p>
            </div>
          ) : (
            messages.map(msg => <MessageBubble key={msg.id} msg={msg} specialist={getSpecialist(msg.specialist ?? activeSpecialist.id)} />)
          )}

          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm shrink-0">
                {activeSpecialist.emoji}
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        {(showSpecPicker) && <div className="fixed inset-0 z-40" onClick={() => setShowSpecPicker(false)} />}

        <div className="px-4 py-3 border-t border-slate-200 bg-white shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Pergunte ao ${activeSpecialist.shortName}…`}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white max-h-36 overflow-y-auto"
              style={{ lineHeight: "1.5" }}
              onInput={e => {
                const t = e.currentTarget
                t.style.height = "auto"
                t.style.height = Math.min(t.scrollHeight, 144) + "px"
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 px-1">
            Enter para enviar · Shift+Enter para nova linha · Respostas baseadas em legislação e normas vigentes
          </p>
        </div>
      </div>

      {/* ══════════════ RIGHT — SPECIALIST PANEL ══════════════ */}
      {rightOpen && (
        <aside className="w-72 shrink-0 flex flex-col bg-white border-l border-slate-200 overflow-y-auto">
          {/* Specialist header */}
          <div className={cn("p-4 text-white bg-gradient-to-br", activeSpecialist.gradient)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl mb-1">{activeSpecialist.emoji}</p>
                <p className="text-sm font-bold leading-tight">{activeSpecialist.name}</p>
                <p className="text-xs opacity-80 mt-0.5">{activeSpecialist.area}</p>
              </div>
              <div className="flex gap-1">
                <Link href="/especialistas/base" title="Central da Base"
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors opacity-80 hover:opacity-100">
                  <Database className="w-4 h-4" />
                </Link>
                <button onClick={() => setRightOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs opacity-70 mt-2 leading-relaxed">{activeSpecialist.description}</p>
          </div>

          {/* Base info */}
          {activeBase && (
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Base de Conhecimento
              </p>

              {/* Status semáforo */}
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className={cn(
                  "w-3 h-3 rounded-full shrink-0",
                  activeBase.status === "ATUALIZADO"         ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" :
                  activeBase.status === "DISPONIVEL"         ? "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]" :
                  activeBase.status === "CARGA_PENDENTE"     ? "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.6)]" :
                  activeBase.status === "CARGA_EM_ANDAMENTO" ? "bg-blue-400 animate-pulse" :
                  "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">
                    {activeBase.status === "ATUALIZADO"         ? "ATUALIZADO" :
                     activeBase.status === "CARGA_PENDENTE"     ? "CARGA INICIAL PENDENTE" :
                     activeBase.status === "CARGA_EM_ANDAMENTO" ? "CARREGANDO..." :
                     activeBase.status}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {activeBase.status === "ATUALIZADO"         ? "Documentos disponíveis" :
                     activeBase.status === "CARGA_PENDENTE"     ? "Execute a Carga Inicial" :
                     activeBase.status === "CARGA_EM_ANDAMENTO" ? "Aguarde a conclusão..." :
                     activeBase.status === "DISPONIVEL"         ? "Atualização disponível" :
                     "Base não inicializada"}
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">{activeBase.version ?? ""}</span>
              </div>

              {/* CARGA_PENDENTE — banner de aviso e botão de carga */}
              {(activeBase.status === "CARGA_PENDENTE" || (!activeBase.initialLoadDone && REQUIRES_INITIAL_LOAD_IDS.includes(activeBase.specialist))) && !initialLoading && (
                <div className="mb-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-orange-800 mb-1 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> Base histórica não carregada
                  </p>
                  <p className="text-[11px] text-orange-700 mb-2.5 leading-relaxed">
                    O Especialista eSocial precisa de uma carga inicial com toda a documentação histórica antes de responder perguntas ou receber atualizações incrementais.
                  </p>
                  <button
                    onClick={() => runInitialLoad(activeSpecialist.id)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Executar Carga Inicial
                  </button>
                  <p className="text-[10px] text-orange-600 mt-1.5 text-center">
                    ~60 documentos históricos · MOS, Leiautes, Eventos, Tabelas, FAQ
                  </p>
                </div>
              )}

              {/* Carga inicial em andamento */}
              {initialLoading && activeBase.specialist === activeSpecialist.id && (
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> Carga Inicial em andamento...
                  </p>
                  <div className="space-y-1.5">
                    {INITIAL_LOAD_STEPS.map((step, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {i < initialLoadStep ? (
                          <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                        ) : i === initialLoadStep ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span className={cn("text-[11px]", i <= initialLoadStep ? "text-slate-700" : "text-slate-400")}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resultado da carga inicial */}
              {initialLoadResult && !initialLoading && activeBase.status === "ATUALIZADO" && (
                <div className="mb-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-green-800 mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Carga Inicial Concluída
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <span className="text-slate-500">Documentos indexados</span>
                    <span className="font-semibold text-green-700">{initialLoadResult.indexed}</span>
                    <span className="text-slate-500">Versão</span>
                    <span className="font-mono text-slate-700">{initialLoadResult.version}</span>
                    <span className="text-slate-500">Tempo</span>
                    <span className="text-slate-700">{initialLoadResult.duration < 1000 ? `${initialLoadResult.duration}ms` : `${(initialLoadResult.duration/1000).toFixed(1)}s`}</span>
                  </div>
                  <p className="text-[10px] text-green-700 mt-1.5">A base histórica está pronta. As próximas atualizações serão incrementais.</p>
                  <button onClick={() => setInitialLoadResult(null)} className="mt-1 text-[10px] text-green-700 hover:underline">Fechar</button>
                </div>
              )}

              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Total de documentos</span>
                  <span className="text-xs font-bold text-slate-700">{activeBase.docCount}</span>
                </div>
                {activeBase.initialLoadDone && activeBase.initialLoadAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Carga inicial em</span>
                    <span className="text-[11px] text-slate-600">{fmtDateFull(activeBase.initialLoadAt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Última atualização</span>
                  <span className="text-[11px] text-slate-600">{activeBase.lastUpdated ? fmtDateFull(activeBase.lastUpdated) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Última verificação</span>
                  <span className="text-[11px] text-slate-600">{activeBase.lastChecked ? fmtRelative(activeBase.lastChecked) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Próx. atualização</span>
                  <span className="text-[11px] text-slate-600">{activeBase.nextUpdate ? fmtDateFull(activeBase.nextUpdate) : "—"}</span>
                </div>
              </div>

              {/* Breakdown por categoria */}
              {activeBase.docsByCategory && (() => {
                let cats: Record<string, number> = {}
                try { cats = JSON.parse(activeBase.docsByCategory) } catch { return null }
                const LABELS: Record<string, string> = {
                  legislacao: "Leis", norma: "Normas", norma_tecnica: "Notas Técnicas",
                  jurisprudencia: "Jurisprudências", metodologia: "Metodologias",
                  procedimentos: "Procedimentos", faq: "FAQ", geral: "Documentos",
                }
                const entries = Object.entries(cats)
                if (!entries.length) return null
                return (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Por categoria</p>
                    <div className="space-y-1">
                      {entries.map(([cat, count]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">{LABELS[cat] ?? cat}</span>
                          <span className="text-[11px] font-medium text-slate-700 bg-slate-100 rounded-full px-1.5">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Indicador de retry pendente */}
              {pendingRetry && (
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  Inicializando base… Sua pergunta será reenviada.
                </div>
              )}

              {/* Progress modal */}
              {updateProgress >= 0 && (
                <div className="mb-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> Atualizando...
                  </p>
                  <div className="space-y-1.5">
                    {UPDATE_PROGRESS_STEPS.map((step, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {i < updateProgress ? (
                          <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                        ) : i === updateProgress ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span className={cn("text-[11px]", i <= updateProgress ? "text-slate-700" : "text-slate-400")}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Update result */}
              {updateResult && updateProgress < 0 && (
                <div className="mb-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-green-800 mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Base Atualizada
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <span className="text-slate-500">Novos docs</span>
                    <span className="font-medium text-green-700">{updateResult.newDocs}</span>
                    <span className="text-slate-500">Atualizados</span>
                    <span className="font-medium text-blue-700">{updateResult.updatedDocs}</span>
                    <span className="text-slate-500">Versão</span>
                    <span className="font-mono text-slate-700">{updateResult.version}</span>
                    <span className="text-slate-500">Tempo</span>
                    <span className="text-slate-700">{updateResult.duration < 1000 ? `${updateResult.duration}ms` : `${(updateResult.duration/1000).toFixed(1)}s`}</span>
                  </div>
                  <button onClick={() => setUpdateResult(null)} className="mt-1.5 text-[10px] text-green-700 hover:underline">Fechar</button>
                </div>
              )}

              {/* Update button with dropdown — hidden while initial load in progress or pending */}
              {!initialLoading && (
                <div className="relative">
                  {/* If initial load required but not done: show disabled button with message */}
                  {REQUIRES_INITIAL_LOAD_IDS.includes(activeSpecialist.id) && !activeBase.initialLoadDone ? (
                    <div className="text-[11px] text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-center">
                      Execute a Carga Inicial antes de atualizar a base.
                    </div>
                  ) : (
                    <>
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => updateBase(activeSpecialist.id)}
                          disabled={!!updatingBase}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 py-1.5 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                          {updatingBase === activeSpecialist.id
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Atualizando…</>
                            : <><RefreshCw className="w-3 h-3" /> Atualizar Base</>
                          }
                        </button>
                        <button
                          onClick={() => setUpdateDropdown(v => !v)}
                          className="px-2 border-l border-slate-200 hover:bg-slate-50 text-slate-400 transition-colors"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      {updateDropdown && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setUpdateDropdown(false)} />
                          <div className="absolute right-0 bottom-full mb-1 z-40 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs">
                            <button onClick={() => updateBase(activeSpecialist.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700">
                              <RefreshCw className="w-3.5 h-3.5 text-blue-500" /> Atualizar este especialista
                            </button>
                            <button onClick={() => updateBase("all", "update-all")}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700">
                              <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Atualizar todos
                            </button>
                            <button onClick={() => updateBase("outdated", "update-outdated")}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700">
                              <Zap className="w-3.5 h-3.5 text-amber-500" /> Atualizar desatualizados
                            </button>
                            <div className="border-t border-slate-100 my-1" />
                            <Link href="/especialistas/base"
                              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700">
                              <Database className="w-3.5 h-3.5 text-slate-400" /> Central da Base
                              <ChevronRight className="w-3 h-3 text-slate-300 ml-auto" />
                            </Link>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Ferramentas da Base Vetorial ── */}
          {activeBase && (
            <div className="p-4 border-b border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Base Vetorial
              </p>

              {/* Reconstruir Base Vetorial */}
              <button
                onClick={() => reindexBase(activeSpecialist.id)}
                disabled={!!reindexing || !!verifying || !!updatingBase}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg py-1.5 hover:bg-violet-100 disabled:opacity-50 transition-colors"
              >
                {reindexing === activeSpecialist.id
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Reconstruindo…</>
                  : <><Sparkles className="w-3 h-3" /> Reconstruir Base Vetorial</>
                }
              </button>

              {/* Reindexar Documentos */}
              <button
                onClick={() => reindexBase(activeSpecialist.id)}
                disabled={!!reindexing || !!verifying || !!updatingBase}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {reindexing === activeSpecialist.id
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Reindexando…</>
                  : <><RefreshCw className="w-3 h-3" /> Reindexar Documentos</>
                }
              </button>

              {/* Verificar Integridade da Base */}
              <button
                onClick={() => verifyIntegrity(activeSpecialist.id)}
                disabled={!!reindexing || !!verifying || !!updatingBase}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {verifying === activeSpecialist.id
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Verificando…</>
                  : <><CheckCircle className="w-3 h-3" /> Verificar Integridade da Base</>
                }
              </button>

              {/* Resultado da verificação */}
              {integrityResult && (
                <div className={cn(
                  "text-[11px] rounded-lg px-3 py-2 border space-y-0.5",
                  integrityResult.status === "ok"      && "bg-green-50 border-green-200 text-green-800",
                  integrityResult.status === "parcial"  && "bg-yellow-50 border-yellow-200 text-yellow-800",
                  integrityResult.status === "critico"  && "bg-red-50 border-red-200 text-red-800",
                )}>
                  <p className="font-semibold">{integrityResult.coverage}% de cobertura semântica</p>
                  <p>{integrityResult.withEmbedding}/{integrityResult.active} docs indexados</p>
                  {integrityResult.revoked > 0 && <p>{integrityResult.revoked} docs revogados</p>}
                  {integrityResult.withoutEmbedding > 0 && (
                    <p className="opacity-80">{integrityResult.withoutEmbedding} docs sem embedding</p>
                  )}
                </div>
              )}

              <div className="border-t border-slate-100 pt-2 mt-1 space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Update Manager
                </p>

                {/* Verificar Status da Base */}
                <button
                  onClick={() => checkStatus(activeSpecialist.id)}
                  disabled={!!checkingStatus || !!updatingViaManager || !!reindexing || !!verifying || !!updatingBase}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg py-1.5 hover:bg-cyan-100 disabled:opacity-50 transition-colors"
                >
                  {checkingStatus === activeSpecialist.id
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Verificando…</>
                    : <><Info className="w-3 h-3" /> Verificar Status da Base</>
                  }
                </button>

                {/* Atualizar Base Agora */}
                <button
                  onClick={() => updateViaManager(activeSpecialist.id)}
                  disabled={!!updatingViaManager || !!checkingStatus || !!reindexing || !!verifying || !!updatingBase}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  {updatingViaManager === activeSpecialist.id
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Atualizando…</>
                    : <><Zap className="w-3 h-3" /> Atualizar Base Agora</>
                  }
                </button>

                {/* Card de status */}
                {statusResult && (
                  <div className={cn(
                    "text-[11px] rounded-lg px-3 py-2 border space-y-1",
                    statusResult.needsUpdate
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-green-50 border-green-200 text-green-800",
                  )}>
                    <p className="font-semibold flex items-center gap-1">
                      {statusResult.needsUpdate
                        ? <><Clock className="w-3 h-3" /> Atualização recomendada</>
                        : <><CheckCircle className="w-3 h-3" /> Base em dia</>
                      }
                    </p>
                    <p className="opacity-90">{statusResult.reason}</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[10px]">
                      <span className="opacity-70">Documentos</span>
                      <span className="font-medium">{statusResult.docCount}</span>
                      {statusResult.staleDays !== null && (
                        <>
                          <span className="opacity-70">Dias sem atualizar</span>
                          <span className="font-medium">{statusResult.staleDays}</span>
                        </>
                      )}
                      {statusResult.isDue && (
                        <>
                          <span className="opacity-70">Agendamento</span>
                          <span className="font-medium text-amber-700">Vencido</span>
                        </>
                      )}
                      {statusResult.version && (
                        <>
                          <span className="opacity-70">Versão</span>
                          <span className="font-mono">{statusResult.version}</span>
                        </>
                      )}
                    </div>
                    {statusResult.newSources.length > 0 && (
                      <p className="opacity-80 mt-0.5">{statusResult.newSources.length} fonte(s) nova(s) detectada(s)</p>
                    )}
                    <button onClick={() => setStatusResult(null)} className="mt-1 text-[10px] opacity-60 hover:opacity-100 hover:underline">Fechar</button>
                  </div>
                )}

                {/* Card de resultado de atualização */}
                {managerUpdateResult && (
                  <div className={cn(
                    "text-[11px] rounded-lg px-3 py-2 border space-y-1",
                    managerUpdateResult.status === "completed"
                      ? "bg-green-50 border-green-200 text-green-800"
                      : managerUpdateResult.status === "skipped"
                      ? "bg-slate-50 border-slate-200 text-slate-600"
                      : "bg-red-50 border-red-200 text-red-800",
                  )}>
                    <p className="font-semibold flex items-center gap-1">
                      {managerUpdateResult.status === "completed" && <><CheckCircle className="w-3 h-3" /> Concluído</>}
                      {managerUpdateResult.status === "skipped"   && <><Clock className="w-3 h-3" /> Ignorado</>}
                      {managerUpdateResult.status === "failed"    && <>Falha na atualização</>}
                    </p>
                    <p className="opacity-90 leading-snug">{managerUpdateResult.message}</p>
                    {managerUpdateResult.status === "completed" && (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[10px]">
                        <span className="opacity-70">Docs atualizados</span>
                        <span className="font-medium">{managerUpdateResult.updatedDocs}</span>
                        <span className="opacity-70">Revogados</span>
                        <span className="font-medium">{managerUpdateResult.removedDocs}</span>
                        <span className="opacity-70">Total</span>
                        <span className="font-medium">{managerUpdateResult.docCount}</span>
                        <span className="opacity-70">Versão</span>
                        <span className="font-mono">{managerUpdateResult.version}</span>
                        <span className="opacity-70">Tempo</span>
                        <span>{managerUpdateResult.duration < 1000 ? `${managerUpdateResult.duration}ms` : `${(managerUpdateResult.duration / 1000).toFixed(1)}s`}</span>
                        {managerUpdateResult.cacheInvalidated && (
                          <>
                            <span className="opacity-70">Cache</span>
                            <span className="text-cyan-700">Invalidado ✓</span>
                          </>
                        )}
                      </div>
                    )}
                    <button onClick={() => setManagerUpdateResult(null)} className="mt-1 text-[10px] opacity-60 hover:opacity-100 hover:underline">Fechar</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sources */}
          <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Fontes
            </p>
            <ul className="space-y-1">
              {activeSpecialist.sources.map((src, i) => (
                <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5 shrink-0">•</span>{src}
                </li>
              ))}
            </ul>
          </div>

          {/* Active conversation info */}
          {activeConv && (
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Conversa Atual
              </p>
              <div className="space-y-1.5">
                <p className="text-xs text-slate-700 font-medium leading-tight">{activeConv.title}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{activeConv.messageCount} mensagens</span>
                  <span>{fmtDate(activeConv.createdAt)}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  <button onClick={() => toggleFavorite(activeConv)}
                    className={cn("flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-colors",
                      activeConv.isFavorite ? "bg-yellow-50 border-yellow-200 text-yellow-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}>
                    <Star className="w-3 h-3" />
                    {activeConv.isFavorite ? "Favoritada" : "Favoritar"}
                  </button>
                  <button onClick={() => toggleArchive(activeConv)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                    <Archive className="w-3 h-3" />
                    Arquivar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* All specialists list */}
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">Todos os Especialistas</p>
            <div className="space-y-1">
              {SPECIALISTS.map(s => (
                <button key={s.id} onClick={() => switchSpecialist(s)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors",
                    activeSpecialist.id === s.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-xs font-medium truncate">{s.shortName}</span>
                  {activeSpecialist.id === s.id && <Check className="w-3 h-3 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

// ─── ConvItem ────────────────────────────────────────────────────────────────

function ConvItem({
  conv, active, onSelect, onFavorite, onArchive, onDelete, onRename,
  renamingId, renameValue, setRenameValue, onSaveRename, onCancelRename,
}: {
  conv: Conversation; active: boolean
  onSelect: () => void; onFavorite: () => void; onArchive: () => void
  onDelete: () => void; onRename: () => void
  renamingId: string | null; renameValue: string
  setRenameValue: (v: string) => void
  onSaveRename: () => void; onCancelRename: () => void
}) {
  const s           = getSpecialist(conv.specialist)
  const [menu, setMenu] = useState(false)

  return (
    <div className={cn("group relative mx-1 mb-0.5 rounded-lg transition-colors",
      active ? "bg-blue-50" : "hover:bg-slate-50"
    )}>
      {renamingId === conv.id ? (
        <div className="flex items-center gap-1 p-2">
          <input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSaveRename(); if (e.key === "Escape") onCancelRename() }}
            className="flex-1 text-xs border border-blue-400 rounded px-2 py-1 focus:outline-none"
            autoFocus
          />
          <button onClick={onSaveRename} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={onCancelRename} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <button onClick={onSelect} className="w-full flex items-center gap-2 px-2 py-2 text-left">
          <span className="text-base shrink-0">{s.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-medium truncate leading-tight",
              active ? "text-blue-700" : "text-slate-700"
            )}>{conv.title}</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
              {conv.messageCount} msg · {fmtRelative(conv.updatedAt)}
            </p>
          </div>
          {conv.isFavorite && <Star className="w-3 h-3 text-yellow-500 shrink-0" />}
        </button>
      )}

      {/* Context menu */}
      {renamingId !== conv.id && (
        <div className="absolute right-1 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); setMenu(v => !v) }}
            className="p-1 rounded hover:bg-slate-200 text-slate-400">
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-6 z-50 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs">
                <button onClick={() => { setMenu(false); onRename() }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700">
                  <Edit3 className="w-3.5 h-3.5" /> Renomear
                </button>
                <button onClick={() => { setMenu(false); onFavorite() }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700">
                  <Star className="w-3.5 h-3.5" /> {conv.isFavorite ? "Desfavoritar" : "Favoritar"}
                </button>
                <button onClick={() => { setMenu(false); onArchive() }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700">
                  <Archive className="w-3.5 h-3.5" /> {conv.isArchived ? "Desarquivar" : "Arquivar"}
                </button>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button onClick={() => { setMenu(false); onDelete() }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, specialist }: { msg: Message; specialist: Specialist }) {
  const isUser   = msg.role === "user"
  const sources  = msg.sources?.split(" | ").filter(Boolean) ?? []
  const docsUsed = (() => {
    try { return msg.docsUsed ? (JSON.parse(msg.docsUsed) as string[]) : [] }
    catch { return [] }
  })()
  const [showDocs, setShowDocs] = useState(false)

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0",
        isUser
          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          : `bg-gradient-to-br ${specialist.gradient} text-white`
      )}>
        {isUser ? "N" : specialist.emoji}
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[80%] space-y-1", isUser && "items-end")}>
        {/* Auto-update indicator */}
        {!isUser && msg.autoUpdated && (
          <div className="flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 w-fit">
            <Zap className="w-3 h-3 shrink-0" />
            Base verificada e atualizada automaticamente
          </div>
        )}

        <div className={cn(
          "rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm"
            : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
        )}>
          {isUser
            ? <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
            : <RenderMessage text={msg.content} />
          }
        </div>

        {/* Response footer — base metadata */}
        {!isUser && (docsUsed.length > 0 || sources.length > 0 || msg.baseVersion) && (
          <div className="px-1 space-y-1">
            {/* Base row */}
            {(msg.baseVersion || specialist.shortName) && (
              <button
                onClick={() => setShowDocs(v => !v)}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                <span className="font-medium">{specialist.shortName}</span>
                {msg.baseVersion && <span className="font-mono">v{msg.baseVersion}</span>}
                {docsUsed.length > 0 && (
                  <span className="bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">{docsUsed.length} docs</span>
                )}
                {docsUsed.length > 0 && <ChevronRight className={cn("w-3 h-3 transition-transform", showDocs && "rotate-90")} />}
              </button>
            )}

            {/* Expanded docs list */}
            {showDocs && docsUsed.length > 0 && (
              <div className="ml-4 space-y-0.5 border-l-2 border-slate-100 pl-2">
                {docsUsed.map((doc, i) => (
                  <p key={i} className="text-[11px] text-slate-500 leading-tight">• {doc}</p>
                ))}
              </div>
            )}

            {/* Sources pills */}
            {sources.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sources.slice(0, 3).map((src, i) => (
                  <span key={i} className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{src}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-slate-400 px-1">{fmtRelative(msg.createdAt)}</p>
      </div>
    </div>
  )
}

// ─── WelcomeScreen ────────────────────────────────────────────────────────────

function WelcomeScreen({
  specialist, onSpecialist, onNewConv,
}: { specialist: Specialist; onSpecialist: (s: Specialist) => void; onNewConv: () => void }) {
  const suggestions = [
    "Como calcular as férias de um colaborador?",
    "Quais são os prazos do eSocial?",
    "Como elaborar um POP eficiente?",
    "Explique a NR-17 Ergonomia.",
    "Como reduzir a procrastinação?",
    "Quais documentos são obrigatórios na admissão?",
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg bg-gradient-to-br", specialist.gradient)}>
        {specialist.emoji}
      </div>
      <h2 className="text-xl font-bold text-slate-800 text-center">{specialist.name}</h2>
      <p className="text-sm text-slate-500 text-center mt-1 max-w-md">{specialist.description}</p>
      <p className="text-xs text-slate-400 text-center mt-1">{specialist.personality}</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map(s => (
          <button key={s} onClick={onNewConv}
            className="text-left text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50 transition-all text-slate-600 shadow-sm">
            {s}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <p className="text-xs text-slate-400 text-center mb-3">Ou escolha outro especialista:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {SPECIALISTS.map(s => (
            <button key={s.id} onClick={() => onSpecialist(s)}
              title={s.name}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all",
                specialist.id === s.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
              )}
            >
              <span>{s.emoji}</span>
              <span className="hidden sm:inline">{s.shortName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
