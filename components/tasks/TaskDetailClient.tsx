"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, Edit, Bot, Clock, User, Calendar, Tag,
  AlertCircle, Loader2, Sparkles, Info, ArrowRight,
  CheckCircle2, XCircle, Timer, RefreshCw, Circle,
  ChevronRight, FileText, ImageIcon, ZoomIn, X, Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import {
  cn, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS,
  AGENT_COLORS, AGENT_ICONS, AGENT_NAMES, formatDate, formatDateTime,
  formatRelativeTime, isOverdue
} from "@/lib/utils"

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface StatusHistoryEntry {
  id: string
  statusAnterior: string
  statusNovo: string
  observacao: string
  responsavel: string
  waitingFor: string | null
  waitingReason: string | null
  createdAt: string
}

interface TaskAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  createdAt: string
}

interface Task {
  id: string
  title: string
  description: string | null
  origin: string | null
  priority: string
  status: string
  person: string | null
  responsible: string | null
  observations: string | null
  dueDate: string | null
  receivedAt: string | null
  createdAt: string
  updatedAt: string
  statusHistory: StatusHistoryEntry[]
  attachments: TaskAttachment[]
  history: {
    id: string
    action: string
    description: string
    oldValue: string | null
    newValue: string | null
    createdAt: string
  }[]
}

interface AgentResponse {
  agent: string
  agentName: string
  content: string
  icon: string
  aiPowered: boolean
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDENTE:           <Circle        className="w-4 h-4" />,
  EM_ANDAMENTO:       <Timer         className="w-4 h-4" />,
  AGUARDANDO_RETORNO: <RefreshCw     className="w-4 h-4" />,
  CONCLUIDA:          <CheckCircle2  className="w-4 h-4" />,
  CANCELADA:          <XCircle       className="w-4 h-4" />,
}

const STATUS_TIMELINE_COLORS: Record<string, string> = {
  PENDENTE:           "bg-yellow-400 text-yellow-800 border-yellow-300",
  EM_ANDAMENTO:       "bg-blue-500   text-white       border-blue-400",
  AGUARDANDO_RETORNO: "bg-purple-500 text-white       border-purple-400",
  CONCLUIDA:          "bg-green-500  text-white       border-green-400",
  CANCELADA:          "bg-slate-400  text-white       border-slate-300",
}

const STATUS_LINE_COLORS: Record<string, string> = {
  PENDENTE:           "border-yellow-300",
  EM_ANDAMENTO:       "border-blue-400",
  AGUARDANDO_RETORNO: "border-purple-400",
  CONCLUIDA:          "border-green-400",
  CANCELADA:          "border-slate-300",
}

function durationBetween(from: string, to?: string): string {
  const start = new Date(from).getTime()
  const end   = to ? new Date(to).getTime() : Date.now()
  const diff  = Math.max(0, end - start)
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (days > 1)  return `${days} dias`
  if (days === 1) return "1 dia"
  if (hours > 1) return `${hours} horas`
  if (hours === 1) return "1 hora"
  if (mins > 1)  return `${mins} minutos`
  return "agora mesmo"
}

function renderContent(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>")
}

// ─── LIGHTBOX ────────────────────────────────────────────────────────────────

function Lightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-9 right-0 flex items-center gap-1.5 text-white/70 hover:text-white text-sm"
        >
          <X className="w-4 h-4" /> Fechar (Esc)
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl"
        />
        <p className="text-center text-white/50 text-xs mt-2">{name}</p>
      </div>
    </div>
  )
}

// ─── SEÇÃO DE EVIDÊNCIAS ──────────────────────────────────────────────────────

function EvidenciasSection({ taskId, attachments: initial }: { taskId: string; attachments: TaskAttachment[] }) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>(initial)
  const [lightbox,    setLightbox]    = useState<{ src: string; name: string } | null>(null)

  function fmtSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta imagem da tarefa?")) return
    await fetch(`/api/tasks/${taskId}/attachments/${id}`, { method: "DELETE" })
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  if (attachments.length === 0) return null

  return (
    <>
      {lightbox && <Lightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox(null)} />}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            Evidências
            <span className="text-xs font-normal text-slate-400">({attachments.length} imagem{attachments.length !== 1 ? "ns" : ""})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {attachments.map(att => (
              <div key={att.id} className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <div className="aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={att.filePath}
                    alt={att.fileName}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setLightbox({ src: att.filePath, name: att.fileName })}
                    className="w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-slate-700 hover:bg-white shadow-sm"
                    title="Ampliar"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-red-500 hover:bg-white shadow-sm"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Info */}
                <div className="p-2 bg-white border-t border-slate-100">
                  <p className="text-xs text-slate-600 truncate font-medium" title={att.fileName}>{att.fileName}</p>
                  <p className="text-xs text-slate-400">{fmtSize(att.fileSize)} · {new Date(att.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ─── MODAL DE ALTERAÇÃO DE STATUS ────────────────────────────────────────────

interface StatusModalProps {
  currentStatus: string
  onClose: () => void
  onSaved: () => void
  taskId: string
}

function StatusChangeModal({ currentStatus, onClose, onSaved, taskId }: StatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState("")
  const [observacao,     setObservacao]     = useState("")
  const [responsavel,    setResponsavel]    = useState("")
  const [waitingFor,     setWaitingFor]     = useState("")
  const [waitingReason,  setWaitingReason]  = useState("")
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState("")

  const statusOptions = Object.entries(STATUS_LABELS).filter(([k]) => k !== currentStatus)

  const observacaoLabel: Record<string, string> = {
    EM_ANDAMENTO:       "O que está sendo executado?",
    AGUARDANDO_RETORNO: "Motivo da espera",
    CONCLUIDA:          "Como a tarefa foi concluída?",
    CANCELADA:          "Motivo do cancelamento",
    PENDENTE:           "Observação",
  }

  const observacaoPlaceholder: Record<string, string> = {
    EM_ANDAMENTO:       "Ex: Realizando cálculo da rescisão. Conferindo documentação enviada pelo colaborador.",
    AGUARDANDO_RETORNO: "Ex: Aguardando aprovação do pagamento pelo financeiro.",
    CONCLUIDA:          "Ex: Pagamento efetuado. Documentação enviada. Rescisão homologada.",
    CANCELADA:          "Ex: Solicitação duplicada. Cliente desistiu. Lançamento incorreto.",
    PENDENTE:           "Informe o motivo da alteração...",
  }

  async function handleSave() {
    setError("")
    if (!selectedStatus) { setError("Selecione o novo status."); return }
    if (!observacao.trim()) { setError("A observação é obrigatória para alteração do status."); return }
    if (!responsavel.trim()) { setError("Informe o responsável pela alteração."); return }
    if (selectedStatus === "AGUARDANDO_RETORNO" && !waitingFor.trim()) {
      setError("Informe de quem está aguardando retorno."); return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusNovo:   selectedStatus,
          observacao:   observacao.trim(),
          responsavel:  responsavel.trim(),
          waitingFor:   waitingFor.trim()    || undefined,
          waitingReason: waitingReason.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Erro ao salvar."); return }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Alterar Status</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Status atual */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Status atual:</span>
            <span className={cn("border rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[currentStatus])}>
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>

          {/* Novo status */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Novo Status <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map(([k, v]) => (
                <label
                  key={k}
                  className={cn(
                    "flex items-center gap-2.5 border rounded-lg px-3 py-2.5 cursor-pointer transition-all text-sm",
                    selectedStatus === k
                      ? "border-blue-500 bg-blue-50 text-blue-800 font-medium"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    value={k}
                    checked={selectedStatus === k}
                    onChange={() => { setSelectedStatus(k); setError("") }}
                    className="accent-blue-600"
                  />
                  <span className="flex items-center gap-1.5">
                    {STATUS_ICONS[k]}
                    {v}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Campos contextuais para AGUARDANDO_RETORNO */}
          {selectedStatus === "AGUARDANDO_RETORNO" && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-1">
                  De quem está aguardando retorno? <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={waitingFor}
                  onChange={e => setWaitingFor(e.target.value)}
                  placeholder="Ex: Financeiro, RH, Colaborador João..."
                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-1">
                  Motivo da espera
                </label>
                <input
                  type="text"
                  value={waitingReason}
                  onChange={e => setWaitingReason(e.target.value)}
                  placeholder="Ex: Aguardando envio dos documentos..."
                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                />
              </div>
            </div>
          )}

          {/* Observação */}
          {selectedStatus && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {observacaoLabel[selectedStatus] || "Observação"} <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder={observacaoPlaceholder[selectedStatus]}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              />
            </div>
          )}

          {/* Responsável */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Responsável pela alteração <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={responsavel}
              onChange={e => setResponsavel(e.target.value)}
              placeholder="Seu nome ou departamento..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !selectedStatus}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Salvando...</> : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── TIMELINE ────────────────────────────────────────────────────────────────

function Timeline({ entries, createdAt, receivedAt }: {
  entries: StatusHistoryEntry[]
  createdAt: string
  receivedAt: string | null
}) {
  const allEntries: Array<{ type: "received" | "created" | "status"; data?: StatusHistoryEntry; date: string }> = []

  if (receivedAt) allEntries.push({ type: "received", date: receivedAt })
  allEntries.push({ type: "created", date: createdAt })
  entries.forEach(e => allEntries.push({ type: "status", data: e, date: e.createdAt }))
  allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (allEntries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          Timeline da Tarefa
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <div className="relative px-5">
          {/* Linha vertical */}
          <div className="absolute left-[1.875rem] top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-1">
            {allEntries.map((entry, idx) => {
              if (entry.type === "received") {
                return (
                  <div key="received" className="flex gap-4 py-3 relative">
                    <div className="w-4 h-4 rounded-full bg-slate-300 border-2 border-white ring-1 ring-slate-300 flex items-center justify-center mt-0.5 shrink-0 z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recebida</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(entry.date)}</p>
                    </div>
                  </div>
                )
              }

              if (entry.type === "created") {
                return (
                  <div key="created" className="flex gap-4 py-3 relative">
                    <div className="w-4 h-4 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center mt-0.5 shrink-0 z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tarefa criada</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(entry.date)}</p>
                    </div>
                  </div>
                )
              }

              const h = entry.data!
              const nextEntry = allEntries[idx + 1]
              const duration = nextEntry
                ? durationBetween(h.createdAt, nextEntry.date)
                : durationBetween(h.createdAt)

              return (
                <div key={h.id} className="flex gap-4 py-3 relative">
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center mt-0.5 shrink-0 z-10 shadow-sm",
                    STATUS_TIMELINE_COLORS[h.statusNovo]
                  )}>
                    {STATUS_ICONS[h.statusNovo]}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    {/* Transição de status */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[h.statusAnterior])}>
                        {STATUS_LABELS[h.statusAnterior]}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[h.statusNovo])}>
                        {STATUS_LABELS[h.statusNovo]}
                      </span>
                    </div>

                    {/* Observação */}
                    <p className="text-sm text-slate-700 mt-1.5 font-medium">{h.observacao}</p>

                    {/* Aguardando retorno de */}
                    {h.waitingFor && (
                      <div className="mt-1.5 bg-purple-50 border border-purple-100 rounded-md px-2.5 py-1.5 text-xs text-purple-800">
                        <span className="font-medium">Aguardando retorno de:</span> {h.waitingFor}
                        {h.waitingReason && <> — {h.waitingReason}</>}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {h.responsavel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(h.createdAt)}
                      </span>
                    </div>

                    {/* Duração no status */}
                    {idx < allEntries.length - 1 && (
                      <p className="text-xs text-slate-300 mt-1">
                        ↓ permaneceu {duration}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Estado atual (último) */}
            <div className="flex gap-4 py-3 relative">
              <div className={cn(
                "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shrink-0 z-10 shadow-sm animate-pulse",
                STATUS_TIMELINE_COLORS[allEntries[0]?.data?.statusNovo ?? "PENDENTE"]
              )}>
                <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
              </div>
              <div className="pt-2">
                <p className="text-xs text-slate-400 italic">Aguardando próxima ação…</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export function TaskDetailClient({ id }: { id: string }) {
  const [task,          setTask]          = useState<Task | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [analyzing,     setAnalyzing]     = useState(false)
  const [analyses,      setAnalyses]      = useState<AgentResponse[]>([])
  const [aiConfigured,  setAiConfigured]  = useState<boolean | null>(null)
  const [showModal,     setShowModal]     = useState(false)

  const load = useCallback(() => {
    return fetch(`/api/tasks/${id}`)
      .then(r => r.json())
      .then(setTask)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  async function analyzeWithAI() {
    setAnalyzing(true)
    setAnalyses([])
    try {
      const res  = await fetch(`/api/tasks/${id}/analyze`, { method: "POST" })
      const data = await res.json()
      setAnalyses(data.responses ?? [])
      setAiConfigured(data.aiConfigured ?? false)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Tarefa não encontrada.</p>
        <Link href="/tasks" className="text-blue-600 text-sm mt-2 inline-block">← Voltar para tarefas</Link>
      </div>
    )
  }

  const overdue = isOverdue(task.dueDate) && task.status !== "CONCLUIDA" && task.status !== "CANCELADA"

  // Indicadores de tempo
  const baseDate      = task.receivedAt || task.createdAt
  const receivedAgo   = formatRelativeTime(baseDate)
  const lastUpdateAgo = formatRelativeTime(task.updatedAt)

  // Tempo no status atual
  const lastStatusChange = task.statusHistory.length > 0
    ? task.statusHistory[task.statusHistory.length - 1].createdAt
    : task.createdAt
  const currentStatusDuration = durationBetween(lastStatusChange)

  const isFinished = task.status === "CONCLUIDA" || task.status === "CANCELADA"

  return (
    <>
      {showModal && (
        <StatusChangeModal
          currentStatus={task.status}
          taskId={id}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setLoading(true); load() }}
        />
      )}

      <div className="space-y-5 animate-fade-in max-w-4xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <Link href="/tasks" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Tarefas
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/tasks/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-3.5 h-3.5" />
                Editar
              </Button>
            </Link>
            <Button
              onClick={analyzeWithAI}
              disabled={analyzing}
              size="sm"
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
            >
              {analyzing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />}
              {analyzing ? "Analisando..." : "Analisar com IA"}
            </Button>
          </div>
        </div>

        {/* Alerta de atraso */}
        {overdue && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-medium">Esta tarefa está atrasada. Verifique o prazo imediatamente.</p>
          </div>
        )}

        {/* Título + status */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-800 leading-snug">{task.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-sm border rounded-full px-3 py-1 font-medium", PRIORITY_COLORS[task.priority])}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span className={cn("text-sm border rounded-full px-3 py-1 font-medium flex items-center gap-1.5", STATUS_COLORS[task.status])}>
              {STATUS_ICONS[task.status]}
              {STATUS_LABELS[task.status]}
            </span>
          </div>
        </div>

        {/* Painel Resumo + Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Painel Resumo */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Painel Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {task.receivedAt && (
                  <div>
                    <p className="text-xs text-slate-400">Recebida em</p>
                    <p className="text-sm font-medium text-slate-700">{formatDateTime(task.receivedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400">Criada em</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(task.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Última atualização</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(task.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Status atual</p>
                  <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[task.status])}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
                {task.responsible && (
                  <div>
                    <p className="text-xs text-slate-400">Responsável</p>
                    <p className="text-sm font-medium text-slate-700">{task.responsible}</p>
                  </div>
                )}
                {task.person && (
                  <div>
                    <p className="text-xs text-slate-400">Pessoa / Solicitante</p>
                    <p className="text-sm font-medium text-slate-700">{task.person}</p>
                  </div>
                )}
                {task.origin && (
                  <div>
                    <p className="text-xs text-slate-400">Origem</p>
                    <p className="text-sm font-medium text-slate-700">{task.origin}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400">Prioridade</p>
                  <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", PRIORITY_COLORS[task.priority])}>
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </div>
                {task.dueDate && (
                  <div>
                    <p className="text-xs text-slate-400">Prazo</p>
                    <p className={cn("text-sm font-medium", overdue ? "text-red-600" : "text-slate-700")}>
                      {formatDate(task.dueDate)} {overdue && "⚠️"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Indicadores de tempo */}
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-0.5">
                {task.receivedAt ? "Recebida" : "Criada"} há
              </p>
              <p className="text-lg font-bold text-slate-700">{receivedAgo}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-500 mb-0.5">
                {STATUS_LABELS[task.status]} há
              </p>
              <p className="text-lg font-bold text-blue-700">{currentStatusDuration}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-0.5">Última atualização</p>
              <p className="text-sm font-semibold text-slate-600">{lastUpdateAgo}</p>
            </div>
          </div>
        </div>

        {/* Descrição */}
        {task.description && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-slate-400 mb-1.5">Descrição</p>
              <p className="text-sm text-slate-700 leading-relaxed">{task.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Observações iniciais */}
        {task.observations && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-700 mb-1">Observações iniciais</p>
            <p className="text-sm text-amber-800">{task.observations}</p>
          </div>
        )}

        {/* Evidências */}
        {task.attachments?.length > 0 && (
          <EvidenciasSection taskId={id} attachments={task.attachments} />
        )}

        {/* Botão Alterar Status */}
        {!isFinished && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowModal(true)}
              className="bg-slate-800 hover:bg-slate-900 text-white"
            >
              <ChevronRight className="w-4 h-4" />
              Alterar Status
            </Button>
            <p className="text-xs text-slate-400">
              Toda alteração de status requer justificativa e responsável.
            </p>
          </div>
        )}

        {/* Aviso de IA não configurada */}
        {aiConfigured === false && analyses.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Integração com IA não configurada.</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Adicione <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY=sk-...</code> no arquivo <code className="bg-amber-100 px-1 rounded">.env</code> para ativar análises reais.
              </p>
            </div>
          </div>
        )}

        {/* Análise com IA */}
        {analyses.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              {aiConfigured ? <Sparkles className="w-5 h-5 text-violet-500" /> : <Bot className="w-5 h-5 text-slate-400" />}
              Análise dos Agentes
              {aiConfigured && (
                <span className="text-xs font-normal bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 ml-1">
                  ✨ IA Real
                </span>
              )}
            </h3>
            {analyses.map((a) => (
              <Card key={a.agent} className="overflow-hidden">
                <div className={cn("h-1 bg-gradient-to-r", AGENT_COLORS[a.agent])} />
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-lg">{a.icon}</span>
                    {a.agentName}
                    {a.aiPowered && (
                      <span className="text-xs font-normal text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                        ✨ GPT
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div
                    className="text-sm text-slate-700 leading-relaxed agent-content"
                    dangerouslySetInnerHTML={{ __html: renderContent(a.content) }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Timeline */}
        {(task.statusHistory.length > 0 || task.receivedAt) && (
          <Timeline
            entries={task.statusHistory}
            createdAt={task.createdAt}
            receivedAt={task.receivedAt}
          />
        )}
      </div>
    </>
  )
}
