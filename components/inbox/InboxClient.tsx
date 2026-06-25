"use client"

import { useEffect, useState } from "react"
import {
  Mail, Eye, X, Plus, FileText, Loader2, RefreshCw,
  Paperclip, AlertTriangle, Calendar, Tag, Plug
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn, formatRelativeTime } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface InboxItem {
  id: string
  sender: string
  senderEmail: string | null
  subject: string
  body: string
  summary: string | null
  suggestedTask: string | null
  suggestedReply: string | null
  // campos Phase 4
  provider: string | null
  externalId: string | null
  hasAttachments: boolean | null
  aiSuggestedTaskTitle: string | null
  aiSuggestedPriority: string | null
  aiSuggestedDueDate: string | null
  aiSuggestedResponse: string | null
  receivedAt: string
  isRead: boolean
  isIgnored: boolean
  taskCreated: boolean
}

interface EmailAccount {
  id: string
  provider: "OUTLOOK" | "GMAIL"
  email: string
  _count: { inboxItems: number }
}

const PROVIDER_BADGES: Record<string, { label: string; classes: string }> = {
  OUTLOOK: { label: "Outlook", classes: "bg-blue-100 text-blue-700 border-blue-200" },
  GMAIL: { label: "Gmail", classes: "bg-red-100 text-red-700 border-red-200" },
  SIMULATED: { label: "Simulado", classes: "bg-slate-100 text-slate-500 border-slate-200" },
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENTE: "text-red-700 bg-red-50 border-red-200",
  ALTA: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIA: "text-blue-700 bg-blue-50 border-blue-200",
  BAIXA: "text-slate-600 bg-slate-50 border-slate-200",
}

export function InboxClient() {
  const router = useRouter()
  const [items, setItems] = useState<InboxItem[]>([])
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [selected, setSelected] = useState<InboxItem | null>(null)
  const [showReply, setShowReply] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function fetchItems() {
    const res = await fetch("/api/inbox")
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  async function fetchAccounts() {
    const res = await fetch("/api/integrations/accounts")
    const data = await res.json()
    setAccounts(data.accounts ?? [])
  }

  useEffect(() => {
    fetchItems()
    fetchAccounts()
  }, [])

  async function markRead(item: InboxItem) {
    if (!item.isRead) {
      await fetch(`/api/inbox/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isRead: true } : i))
    }
    setSelected(item)
    setShowReply(false)
  }

  async function ignore(id: string) {
    setActionLoading(id)
    await fetch(`/api/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isIgnored: true }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
    if (selected?.id === id) setSelected(null)
    setActionLoading(null)
  }

  async function createTask(item: InboxItem) {
    setActionLoading(item.id)
    const title = item.aiSuggestedTaskTitle || item.suggestedTask || item.subject
    const priority = item.aiSuggestedPriority || "MEDIA"
    const dueDate = item.aiSuggestedDueDate || undefined
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: item.summary || item.body.slice(0, 300),
        origin: `E-mail de ${item.sender}`,
        priority,
        status: "PENDENTE",
        person: item.sender,
        dueDate,
        inboxItemId: item.id,
      }),
    })
    await fetch(`/api/inbox/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskCreated: true }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, taskCreated: true } : i))
    if (selected?.id === item.id) setSelected({ ...item, taskCreated: true })
    setActionLoading(null)
    router.refresh()
  }

  async function syncAccount(accountId: string) {
    setSyncing(accountId)
    setSyncMsg(null)
    try {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      })
      const data = await res.json()
      if (data.error) {
        setSyncMsg({ type: "err", text: data.error })
      } else {
        setSyncMsg({ type: "ok", text: `${data.totalNew} novo(s) e-mail(s) importado(s)` })
        await fetchItems()
      }
    } catch {
      setSyncMsg({ type: "err", text: "Erro ao sincronizar" })
    } finally {
      setSyncing(null)
      setTimeout(() => setSyncMsg(null), 5000)
    }
  }

  const visibleItems = selectedAccountId === "all"
    ? items
    : items.filter(i => {
        const acc = accounts.find(a => a.id === selectedAccountId)
        return acc ? i.provider === acc.provider : true
      })

  const unread = visibleItems.filter(i => !i.isRead).length
  const hasRealAccounts = accounts.length > 0

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Caixa de Entrada</h2>
          <p className="text-sm text-slate-500">
            {unread > 0 ? `${unread} não lido(s) · ` : ''}{visibleItems.length} mensagem(ns)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Filtro por conta */}
          {hasRealAccounts && (
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as contas</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.provider === "OUTLOOK" ? "Outlook" : "Gmail"} — {a.email}</option>
              ))}
            </select>
          )}

          {/* Botão de sync */}
          {hasRealAccounts ? (
            accounts.map(a => (
              <Button
                key={a.id}
                size="sm"
                variant="outline"
                disabled={syncing === a.id}
                onClick={() => syncAccount(a.id)}
                className="text-xs"
              >
                {syncing === a.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />
                }
                Sync {a.provider === "OUTLOOK" ? "Outlook" : "Gmail"}
              </Button>
            ))
          ) : (
            <Link href="/integracoes">
              <Button size="sm" variant="outline" className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                <Plug className="w-3.5 h-3.5" />
                Conectar e-mail
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Msg de sync */}
      {syncMsg && (
        <div className={cn(
          "flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border",
          syncMsg.type === "ok"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        )}>
          {syncMsg.type === "ok" ? "✅" : "⚠️"} {syncMsg.text}
        </div>
      )}

      {/* Aviso sem conta */}
      {!hasRealAccounts && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-lg">🔗</span>
          <p className="text-sm text-amber-800">
            Dados simulados. <Link href="/integracoes" className="font-semibold underline">Conecte seu Outlook ou Gmail</Link> para ver e-mails reais.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-260px)]">
        {/* Lista */}
        <div className="lg:col-span-2 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
          ) : !visibleItems.length ? (
            <div className="text-center py-16 text-slate-400">
              <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma mensagem</p>
              {hasRealAccounts && (
                <p className="text-xs mt-2">Clique em "Sync" para importar e-mails</p>
              )}
            </div>
          ) : (
            visibleItems.map((item) => {
              const providerMeta = PROVIDER_BADGES[item.provider ?? "SIMULATED"] ?? PROVIDER_BADGES.SIMULATED
              return (
                <div
                  key={item.id}
                  onClick={() => markRead(item)}
                  className={cn(
                    "border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm",
                    selected?.id === item.id
                      ? "border-blue-400 bg-blue-50/50 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300",
                    !item.isRead && "border-l-4 border-l-blue-500"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {!item.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      <p className={cn("text-sm truncate", !item.isRead ? "font-semibold text-slate-800" : "text-slate-700")}>
                        {item.sender}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.hasAttachments && <Paperclip className="w-3 h-3 text-slate-400" />}
                      <p className="text-xs text-slate-400">{formatRelativeTime(item.receivedAt)}</p>
                    </div>
                  </div>

                  <p className={cn("text-sm truncate mb-1.5", !item.isRead ? "font-medium text-slate-700" : "text-slate-600")}>
                    {item.subject}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {item.provider && (
                      <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", providerMeta.classes)}>
                        {providerMeta.label}
                      </span>
                    )}
                    {item.aiSuggestedPriority && item.aiSuggestedPriority !== "MEDIA" && (
                      <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", PRIORITY_COLORS[item.aiSuggestedPriority] ?? "")}>
                        {item.aiSuggestedPriority}
                      </span>
                    )}
                    {item.summary && (
                      <p className="text-xs text-slate-400 line-clamp-1 flex-1">{item.summary}</p>
                    )}
                  </div>

                  {item.taskCreated && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 mt-2">
                      Tarefa criada
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Detalhe */}
        <div className="lg:col-span-3 overflow-y-auto">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Selecione uma mensagem para visualizar</p>
              </div>
            </div>
          ) : (
            <Card className="flex flex-col" style={{ minHeight: "100%" }}>
              <CardHeader className="border-b shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-base leading-tight">{selected.subject}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      <strong>{selected.sender}</strong>
                      {selected.senderEmail && ` <${selected.senderEmail}>`}
                      {" · "}{formatRelativeTime(selected.receivedAt)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {selected.provider && (
                        <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5",
                          (PROVIDER_BADGES[selected.provider] ?? PROVIDER_BADGES.SIMULATED).classes
                        )}>
                          {(PROVIDER_BADGES[selected.provider] ?? PROVIDER_BADGES.SIMULATED).label}
                        </span>
                      )}
                      {selected.hasAttachments && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">
                          <Paperclip className="w-2.5 h-2.5" /> Anexos
                        </span>
                      )}
                      {selected.aiSuggestedPriority && (
                        <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5",
                          PRIORITY_COLORS[selected.aiSuggestedPriority] ?? ""
                        )}>
                          Prioridade: {selected.aiSuggestedPriority}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => ignore(selected.id)}
                      disabled={actionLoading === selected.id}
                    >
                      <X className="w-3.5 h-3.5" />
                      Ignorar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => createTask(selected)}
                      disabled={selected.taskCreated || actionLoading === selected.id}
                    >
                      {actionLoading === selected.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Plus className="w-3.5 h-3.5" />}
                      {selected.taskCreated ? "Tarefa criada" : "Criar tarefa"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Resumo da IA */}
                {selected.summary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Resumo do Assistente</p>
                    <p className="text-sm text-blue-800">{selected.summary}</p>
                  </div>
                )}

                {/* Sugestões de IA */}
                {(selected.aiSuggestedTaskTitle || selected.aiSuggestedDueDate) && (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-violet-700">Sugestões da IA</p>
                    {selected.aiSuggestedTaskTitle && (
                      <div className="flex items-start gap-2">
                        <Tag className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-violet-600 font-medium">Tarefa sugerida</p>
                          <p className="text-sm text-violet-800">{selected.aiSuggestedTaskTitle}</p>
                        </div>
                      </div>
                    )}
                    {selected.aiSuggestedDueDate && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-violet-600 font-medium">Prazo sugerido</p>
                          <p className="text-sm text-violet-800">{selected.aiSuggestedDueDate}</p>
                        </div>
                      </div>
                    )}
                    {!selected.taskCreated && (
                      <Button size="sm" className="mt-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => createTask(selected)}>
                        <Plus className="w-3.5 h-3.5" />
                        Criar tarefa com essas sugestões
                      </Button>
                    )}
                  </div>
                )}

                {/* Tarefa sugerida (legada) */}
                {!selected.aiSuggestedTaskTitle && selected.suggestedTask && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Sugestão de tarefa</p>
                    <p className="text-sm text-slate-700">{selected.suggestedTask}</p>
                    {!selected.taskCreated && (
                      <Button size="sm" className="mt-2" onClick={() => createTask(selected)}>
                        <Plus className="w-3.5 h-3.5" />
                        Criar esta tarefa
                      </Button>
                    )}
                  </div>
                )}

                {/* Corpo */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Mensagem original</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{selected.body}</p>
                </div>

                {/* Resposta sugerida */}
                {(selected.aiSuggestedResponse || selected.suggestedReply) && (
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowReply(!showReply)}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {showReply ? "Ocultar" : "Ver"} resposta sugerida
                    </Button>

                    {showReply && (
                      <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-emerald-700 mb-2">Redator — Sugestão de resposta</p>
                        <p className="text-sm text-emerald-800 whitespace-pre-line">
                          {selected.aiSuggestedResponse || selected.suggestedReply}
                        </p>
                        <p className="text-xs text-emerald-600 mt-3 font-medium">
                          Revise e adapte antes de enviar. Esta é apenas uma sugestão.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
