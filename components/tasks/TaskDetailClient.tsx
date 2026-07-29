"use client"

import { useEffect, useState, useCallback, useRef, KeyboardEvent } from "react"
import Link from "next/link"
import {
  ArrowLeft, Edit, Bot, Clock, User, Calendar, Tag,
  AlertCircle, Loader2, Sparkles, Info, ArrowRight,
  CheckCircle2, XCircle, Timer, RefreshCw, Circle,
  ChevronRight, ChevronDown, FileText, ImageIcon, ZoomIn, X, Trash2,
  BarChart2, Paperclip, History, LayoutDashboard,
  Send, Copy, Check, MessageSquare, Mail, AlertTriangle,
  CheckSquare, BookOpen, Scale, ClipboardList, ListChecks,
  Plus, FileCheck, ClipboardCheck, CalendarDays, Target,
} from "lucide-react"
import { RelatorioTarefaClient } from "./RelatorioTarefaClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import {
  cn, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS,
  formatDate, formatDateTime, formatRelativeTime, isOverdue,
} from "@/lib/utils"

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface StatusHistoryEntry {
  id: string; statusAnterior: string; statusNovo: string
  observacao: string; responsavel: string
  waitingFor: string | null; waitingReason: string | null; createdAt: string
}

interface TaskAttachment {
  id: string; fileName: string; fileType: string; fileSize: number
  filePath: string; createdAt: string
}

interface TaskChatMsg {
  id: string; role: 'user' | 'assistant'; content: string
  mode?: string | null; createdAt: string
}

interface Task {
  id: string; title: string; description: string | null; origin: string | null
  originId: string | null
  taskOrigin: { id: string; name: string; icon: string; color: string } | null
  priority: string; status: string; person: string | null; responsible: string | null
  observations: string | null; dueDate: string | null; receivedAt: string | null
  createdAt: string; updatedAt: string
  statusHistory: StatusHistoryEntry[]
  attachments: TaskAttachment[]
  chats: TaskChatMsg[]
  history: { id: string; action: string; description: string; oldValue: string | null; newValue: string | null; createdAt: string }[]
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

function durationBetween(from: string, to?: string): string {
  const diff  = Math.max(0, (to ? new Date(to) : new Date()).getTime() - new Date(from).getTime())
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const mins  = Math.floor(diff / 60000)
  if (days > 1)   return `${days} dias`
  if (days === 1)  return "1 dia"
  if (hours > 1)   return `${hours} horas`
  if (hours === 1) return "1 hora"
  if (mins > 1)    return `${mins} minutos`
  return "agora mesmo"
}

// ─── SPECIALISTS ─────────────────────────────────────────────────────────────

export const SPECIALIST_LIST = [
  'Departamento Pessoal', 'Recursos Humanos', 'Jurídico Trabalhista',
  'Jurídico Empresarial', 'Jurídico Cível', 'Administração', 'Gestão Empresarial',
  'Financeiro', 'Fiscal', 'Tributário', 'Contabilidade', 'Compras', 'Contratos',
  'Compliance', 'Auditoria', 'Controladoria', 'Saúde e Segurança do Trabalho',
  'Medicina do Trabalho', 'Tecnologia da Informação', 'Projetos', 'Qualidade',
  'ISO', 'Licitações', 'Gestão Pública', 'Administrativo',
]

const SPECIALIST_PATTERNS: [RegExp, string][] = [
  [/\b(ccf?t|ccv?|clt|holerite|folha|contracheque|fgts|inss|esocial|e-social|admiss[aã]o|demiss[aã]o|rescis[aã]o|f[eé]rias|aviso.?pr[eé]vio|sindicato|conven[cç][aã]o.?coletiva|homologa[cç][aã]o|ppp|caged|rais|cat\b|afastamento)\b/i, 'Departamento Pessoal'],
  [/\b(nr[-\s]?\d{1,2}|ppra|pcmso|epi|epc|cipa|laudo|ltcat|pgt|higiene.?ocupacional|seguran[cç]a.?trabalho|acid?ente.?trabalho|medicina.?trabalho|est[aá]gio|insalubridade|periculosidade)\b/i, 'Saúde e Segurança do Trabalho'],
  [/\b(processo|trt|tst|reclama[cç][aã]o.?trabalhista|a[cç][aã]o.?trabalhista|audi[eê]ncia|sentença|acórd[aã]o|perito|recurs[ao]|execu[cç][aã]o|advo[ck]ado|petição|jurisprud[eê]ncia|s[uú]mula)\b/i, 'Jurídico Trabalhista'],
  [/\b(contrato|cl[aá]usula|aditivo|fornecedor|presta[cç][aã]o.?servi[cç]o|terceiriz|nota.?de.?empenho|ordem.?de.?servi[cç]o|vigência|rescis[aã]o.?contratual)\b/i, 'Contratos'],
  [/\b(nf-?e|nfs-?e|ibs|cbs|xml|sped|ecf|ecd|efd|obriga[cç][aã]o.?fiscal|apura[cç][aã]o|regime.?tribut|simples.?nacional|lucro.?presumido|lucro.?real|icms|pis|cofins|iss|ipi)\b/i, 'Fiscal'],
  [/\b(tribut|imposto|irpj|irrf|csll|contribui[cç][aã]o|receita.?federal|parcelamento|d[eé]bito.?fiscal|dctfweb|darf|gps|gfip|sefaz)\b/i, 'Tributário'],
  [/\b(balan[cç]o|dre|balancete|ativo|passivo|demonstra[cç][aã]o|cont[aá]bil|plano.?de.?contas|lan[cç]amento|deprecia[cç][aã]o|amortiza[cç][aã]o|provisão|concilia[cç][aã]o|auditoria.?contábil)\b/i, 'Contabilidade'],
  [/\b(or[cç]amento|cronograma|entrega|implanta[cç][aã]o|milestone|escopo|pmbok|agile|sprint|backlog|projeto|ger[eê]ncia.?projeto|prazo.?entrega)\b/i, 'Projetos'],
  [/\b(fluxo.?caixa|contas.?pagar|contas.?receber|cobran[cç]a|inadimpl|boleto|pagamento|receita|despesa|dre.?financeiro|tesouraria|capital.?giro)\b/i, 'Financeiro'],
  [/\b(lgpd|privacidade|dados.?pessoais|compliance|conformidade|política|regulat[oó]rio|due.?diligence|antissuborno|anticorrup[cç][aã]o|ética|canal.?den[uú]ncia)\b/i, 'Compliance'],
  [/\b(licit[aç][aã]o|pregão|edital|proposta|lei.?8666|lei.?14133|dispensa|inexigibilidade|adjudica[cç][aã]o|homologa[cç][aã]o.?licit|concorr[eê]ncia|tomada.?pre[cç]o)\b/i, 'Licitações'],
  [/\b(norma|iso\s?\d{4}|abnt|certifica[cç][aã]o|qualidade|processo.?qualidade|melhoria.?contínua|kaizen|pdca|indicador|kpi|m[eé]trica)\b/i, 'Qualidade'],
  [/\b(rh\b|recursos.?humanos|recrutamento|sele[cç][aã]o|onboarding|treinamento|avalia[cç][aã]o.?desempenho|cargos?.e.?sal[aá]rios|clima.?organizacional|benefícios|plano.?carreira)\b/i, 'Recursos Humanos'],
  [/\b(ti\b|tecnologia|sistema|software|hardware|infraestrutura|servidor|backup|seguran[cç]a.?info|firewall|acesso|banco.?de.?dados|api|deploy|suporte.?t[eé]cnico)\b/i, 'Tecnologia da Informação'],
  [/\b(compras?|aquisi[cç][aã]o|cotação|fornecimento|estoque|almoxarifado|requisição|pedido.?compra|supply|cadeia.?suprimentos)\b/i, 'Compras'],
  [/\b(gest[aã]o|planejamento|estratégia|processos|indicadores|bsc|okr|governan[cç]a|organograma|procedimento|manual|política|regulamento.?interno)\b/i, 'Gestão Empresarial'],
]

function detectSpecialistLocal(text: string): string {
  for (const [pattern, specialist] of SPECIALIST_PATTERNS) {
    if (pattern.test(text)) return specialist
  }
  return 'Administrativo'
}

// ─── QUICK ACTIONS ───────────────────────────────────────────────────────────

const TASK_QUICK_ACTIONS = [
  { mode: 'analyze',              label: 'Analisar tarefa',           icon: Sparkles,      color: 'text-violet-600 hover:bg-violet-50'  },
  { mode: 'technical-opinion',    label: 'Gerar parecer técnico',     icon: FileText,      color: 'text-indigo-600 hover:bg-indigo-50'  },
  { mode: 'action-plan',          label: 'Gerar plano de ação',       icon: ListChecks,    color: 'text-green-600  hover:bg-green-50'   },
  { mode: 'identify-risks',       label: 'Identificar riscos',        icon: AlertTriangle, color: 'text-red-600    hover:bg-red-50'     },
  { mode: 'identify-pending',     label: 'Identificar pendências',    icon: ClipboardList, color: 'text-orange-600 hover:bg-orange-50'  },
  { mode: 'identify-responsible', label: 'Identificar responsável',   icon: User,          color: 'text-slate-600  hover:bg-slate-50'   },
  { mode: 'send-demand',          label: 'Gerar demanda',             icon: Send,          color: 'text-blue-700   hover:bg-blue-50 font-semibold' },
  { mode: 'generate-reply',       label: 'Gerar resposta',            icon: MessageSquare, color: 'text-sky-600    hover:bg-sky-50'     },
  { mode: 'generate-email',       label: 'Gerar e-mail',              icon: Mail,          color: 'text-teal-600   hover:bg-teal-50'    },
  { mode: 'improve-description',  label: 'Melhorar descrição',        icon: Info,          color: 'text-cyan-600   hover:bg-cyan-50'    },
  { mode: 'create-checklist',     label: 'Criar checklist',           icon: ClipboardCheck,color: 'text-emerald-600 hover:bg-emerald-50'},
  { mode: 'create-schedule',      label: 'Criar cronograma',          icon: CalendarDays,  color: 'text-blue-600   hover:bg-blue-50'    },
  { mode: 'suggest-priority',     label: 'Sugerir prioridade',        icon: Target,        color: 'text-rose-600   hover:bg-rose-50'    },
  { mode: 'suggest-deadline',     label: 'Sugerir prazo',             icon: Clock,         color: 'text-amber-600  hover:bg-amber-50'   },
  { mode: 'suggest-correction',   label: 'Sugerir correção',          icon: FileCheck,     color: 'text-purple-600 hover:bg-purple-50'  },
  { mode: 'summarize',            label: 'Resumir tarefa',            icon: BookOpen,      color: 'text-slate-500  hover:bg-slate-50'   },
] as const

// ─── LIGHTBOX ────────────────────────────────────────────────────────────────

function Lightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-9 right-0 flex items-center gap-1.5 text-white/70 hover:text-white text-sm">
          <X className="w-4 h-4" /> Fechar (Esc)
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl" />
        <p className="text-center text-white/50 text-xs mt-2">{name}</p>
      </div>
    </div>
  )
}

// ─── EVIDÊNCIAS ───────────────────────────────────────────────────────────────

function EvidenciasSection({ taskId, attachments: initial }: { taskId: string; attachments: TaskAttachment[] }) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>(initial)
  const [lightbox,    setLightbox]    = useState<{ src: string; name: string } | null>(null)

  function fmtSize(bytes: number) {
    if (bytes < 1024)        return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta imagem da tarefa?")) return
    await fetch(`/api/tasks/${taskId}/attachments/${id}`, { method: "DELETE" })
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  if (attachments.length === 0) return (
    <div className="text-center py-10 text-slate-400">
      <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Nenhuma evidência anexada.</p>
    </div>
  )

  return (
    <>
      {lightbox && <Lightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox(null)} />}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-slate-400" />
            Evidências
            <span className="text-xs font-normal text-slate-400">({attachments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {attachments.map(att => (
              <div key={att.id} className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <div className="aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={att.filePath} alt={att.fileName} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button onClick={() => setLightbox({ src: att.filePath, name: att.fileName })}
                    className="w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-slate-700 hover:bg-white shadow-sm">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(att.id)}
                    className="w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-red-500 hover:bg-white shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 bg-white border-t border-slate-100">
                  <p className="text-xs text-slate-600 truncate font-medium">{att.fileName}</p>
                  <p className="text-xs text-slate-400">{fmtSize(att.fileSize)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ─── MODAL DE STATUS ──────────────────────────────────────────────────────────

function StatusChangeModal({ currentStatus, onClose, onSaved, taskId }: {
  currentStatus: string; onClose: () => void; onSaved: () => void; taskId: string
}) {
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
    EM_ANDAMENTO:       "Ex: Realizando cálculo da rescisão.",
    AGUARDANDO_RETORNO: "Ex: Aguardando aprovação do pagamento pelo financeiro.",
    CONCLUIDA:          "Ex: Pagamento efetuado. Documentação enviada.",
    CANCELADA:          "Ex: Solicitação duplicada.",
    PENDENTE:           "Informe o motivo da alteração...",
  }

  async function handleSave() {
    setError("")
    if (!selectedStatus)          { setError("Selecione o novo status."); return }
    if (!observacao.trim())       { setError("A observação é obrigatória."); return }
    if (!responsavel.trim())      { setError("Informe o responsável."); return }
    if (selectedStatus === "AGUARDANDO_RETORNO" && !waitingFor.trim()) {
      setError("Informe de quem está aguardando retorno."); return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusNovo: selectedStatus, observacao: observacao.trim(), responsavel: responsavel.trim(), waitingFor: waitingFor.trim() || undefined, waitingReason: waitingReason.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Erro ao salvar."); return }
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full rounded-2xl bg-white shadow-2xl sm:max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Alterar Status</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Status atual:</span>
            <span className={cn("border rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[currentStatus])}>
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Novo Status <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {statusOptions.map(([k, v]) => (
                <label key={k} className={cn("flex items-center gap-2.5 border rounded-lg px-3 py-2.5 cursor-pointer transition-all text-sm",
                  selectedStatus === k ? "border-blue-500 bg-blue-50 text-blue-800 font-medium" : "border-slate-200 hover:border-slate-300 text-slate-700")}>
                  <input type="radio" name="status" value={k} checked={selectedStatus === k}
                    onChange={() => { setSelectedStatus(k); setError("") }} className="accent-blue-600" />
                  <span className="flex items-center gap-1.5">{STATUS_ICONS[k]}{v}</span>
                </label>
              ))}
            </div>
          </div>
          {selectedStatus === "AGUARDANDO_RETORNO" && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-1">De quem está aguardando? <span className="text-red-500">*</span></label>
                <input type="text" value={waitingFor} onChange={e => setWaitingFor(e.target.value)} placeholder="Ex: Financeiro, RH..."
                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-1">Motivo da espera</label>
                <input type="text" value={waitingReason} onChange={e => setWaitingReason(e.target.value)} placeholder="Ex: Aguardando documentos..."
                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
              </div>
            </div>
          )}
          {selectedStatus && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {observacaoLabel[selectedStatus] || "Observação"} <span className="text-red-500">*</span>
              </label>
              <textarea rows={3} value={observacao} onChange={e => setObservacao(e.target.value)}
                placeholder={observacaoPlaceholder[selectedStatus]}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Responsável <span className="text-red-500">*</span></label>
            <input type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Seu nome ou departamento..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
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
  entries: StatusHistoryEntry[]; createdAt: string; receivedAt: string | null
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
          <FileText className="w-4 h-4 text-slate-400" /> Timeline da Tarefa
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <div className="relative px-5">
          <div className="absolute left-[1.875rem] top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-1">
            {allEntries.map((entry, idx) => {
              if (entry.type === "received") return (
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
              if (entry.type === "created") return (
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
              const h = entry.data!
              const nextEntry = allEntries[idx + 1]
              const duration = nextEntry ? durationBetween(h.createdAt, nextEntry.date) : durationBetween(h.createdAt)
              return (
                <div key={h.id} className="flex gap-4 py-3 relative">
                  <div className={cn("w-8 h-8 rounded-full border-2 border-white flex items-center justify-center mt-0.5 shrink-0 z-10 shadow-sm", STATUS_TIMELINE_COLORS[h.statusNovo])}>
                    {STATUS_ICONS[h.statusNovo]}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[h.statusAnterior])}>{STATUS_LABELS[h.statusAnterior]}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[h.statusNovo])}>{STATUS_LABELS[h.statusNovo]}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1.5 font-medium">{h.observacao}</p>
                    {h.waitingFor && (
                      <div className="mt-1.5 bg-purple-50 border border-purple-100 rounded-md px-2.5 py-1.5 text-xs text-purple-800">
                        <span className="font-medium">Aguardando retorno de:</span> {h.waitingFor}
                        {h.waitingReason && <> — {h.waitingReason}</>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{h.responsavel}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(h.createdAt)}</span>
                    </div>
                    {idx < allEntries.length - 1 && <p className="text-xs text-slate-300 mt-1">↓ permaneceu {duration}</p>}
                  </div>
                </div>
              )
            })}
            <div className="flex gap-4 py-3 relative">
              <div className={cn("w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shrink-0 z-10 shadow-sm animate-pulse",
                STATUS_TIMELINE_COLORS[entries[entries.length - 1]?.statusNovo ?? "PENDENTE"])}>
                <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
              </div>
              <div className="pt-2"><p className="text-xs text-slate-400 italic">Aguardando próxima ação…</p></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── ASSISTENTE DA TAREFA ────────────────────────────────────────────────────

function TaskAssistantPanel({ task, onRefresh }: { task: Task; onRefresh: () => void }) {
  const [messages,        setMessages]        = useState<TaskChatMsg[]>(task.chats || [])
  const [input,           setInput]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [copiedId,        setCopiedId]        = useState<string | null>(null)
  const [specialist,      setSpecialist]      = useState<string>(() => {
    const text = [task.title, task.description, task.observations, task.origin].filter(Boolean).join(' ')
    return detectSpecialistLocal(text)
  })
  const [showSpecChange,  setShowSpecChange]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textRef   = useRef<HTMLTextAreaElement>(null)

  // Re-detect when task changes
  useEffect(() => {
    setMessages(task.chats || [])
    const text = [task.title, task.description, task.observations, task.origin].filter(Boolean).join(' ')
    setSpecialist(detectSpecialistLocal(text))
  }, [task.id, task.chats, task.title, task.description, task.observations, task.origin])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // Close specialist dropdown on outside click
  useEffect(() => {
    if (!showSpecChange) return
    const handler = () => setShowSpecChange(false)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSpecChange])

  async function send(text: string, mode?: string) {
    const msg = text.trim()
    if (!msg && !mode) return
    const label = mode ? TASK_QUICK_ACTIONS.find(a => a.mode === mode)?.label || msg : msg
    const tempUser: TaskChatMsg = {
      id: `tmp-${Date.now()}`, role: 'user', content: label, mode: mode || null, createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUser])
    setInput('')
    setLoading(true)
    try {
      const res  = await fetch(`/api/tasks/${task.id}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg || label, mode: mode || undefined, specialist }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      if (data.specialist) setSpecialist(data.specialist)
      const content = data.response && data.response.trim().length > 0
        ? data.response
        : 'Não foi possível gerar a resposta da IA. Tente novamente.'
      const aiMsg: TaskChatMsg = {
        id: data.id || `tmp-ai-${Date.now()}`, role: 'assistant',
        content, mode: mode || null, createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev.filter(m => m.id !== tempUser.id), tempUser, aiMsg])
      onRefresh()
    } catch {
      setMessages(prev => [...prev.filter(m => m.id !== tempUser.id), tempUser, {
        id: `err-${Date.now()}`, role: 'assistant',
        content: 'Não foi possível gerar a resposta da IA. Tente novamente.', mode: null, createdAt: new Date().toISOString(),
      }])
    }
    setLoading(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function clearChat() {
    fetch(`/api/tasks/${task.id}/chat`, { method: 'DELETE' }).then(() => setMessages([]))
  }

  function extractDemand(content: string): string | null {
    const marker = '--- DEMANDA GERADA ---'
    const idx = content.indexOf(marker)
    return idx >= 0 ? content.slice(idx + marker.length).trim() : null
  }

  async function saveDemandAsHistory(demandText: string) {
    await fetch(`/api/tasks/${task.id}/history`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DEMANDA_ENVIADA', description: demandText.substring(0, 300) }),
    })
    onRefresh()
  }

  function openEmail(demandText: string) {
    const subject = encodeURIComponent(`Demanda – ${task.title}`)
    const body = encodeURIComponent(demandText)
    const to = encodeURIComponent(task.responsible || '')
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank')
  }

  function openWhatsApp(demandText: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(demandText)}`, '_blank')
  }

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center gap-2 bg-gradient-to-r from-violet-50 to-blue-50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">Assistente da Tarefa</p>
          <p className="text-xs text-slate-500 truncate">IA contextualizada · Especialista Sênior</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded" title="Limpar conversa">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Specialist badge ── */}
      <div className="border-b border-slate-100 shrink-0 px-4 py-2 bg-gradient-to-r from-violet-50 to-blue-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span className="text-xs font-semibold text-violet-700 truncate">{specialist} · Especialista Sênior</span>
        </div>
        <div className="relative shrink-0" onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={() => setShowSpecChange(v => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-violet-600 bg-white border border-violet-200 rounded-full px-2.5 py-0.5 hover:bg-violet-50 transition-colors"
          >
            Trocar <ChevronDown className="w-3 h-3" />
          </button>
          {showSpecChange && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto py-1">
              {SPECIALIST_LIST.map(s => (
                <button
                  key={s}
                  onClick={() => { setSpecialist(s); setShowSpecChange(false) }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs transition-colors",
                    s === specialist
                      ? "bg-violet-50 text-violet-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="border-b border-slate-100 shrink-0 px-3 py-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {TASK_QUICK_ACTIONS.map(a => (
            <button key={a.mode} onClick={() => send('', a.mode)} disabled={loading}
              title={a.label}
              className={cn(
                'flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-xs font-medium',
                'border border-current/10 transition-colors disabled:opacity-40 whitespace-nowrap',
                a.color
              )}>
              <a.icon className="w-3 h-3 shrink-0" />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-violet-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Assistente pronto</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-[220px]">
              Use as ações rápidas acima ou faça qualquer pergunta sobre esta tarefa.
              A IA conhece todo o contexto.
            </p>
          </div>
        )}

        {messages.map(msg => {
          const isUser = msg.role === 'user'
          const demand = !isUser && msg.mode === 'send-demand' ? extractDemand(msg.content) : null

          return (
            <div key={msg.id} className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className="max-w-[88%] space-y-1.5">
                <div className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                )}>
                  {msg.content}
                </div>

                {!isUser && (
                  <div className="flex flex-wrap gap-1.5 ml-0.5">
                    <button onClick={() => copyText(msg.content, msg.id)}
                      className="flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-500 rounded-full px-2 py-0.5 hover:bg-slate-50 transition-colors">
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copiedId === msg.id ? 'Copiado' : 'Copiar'}
                    </button>
                    {demand && (
                      <>
                        <button onClick={() => openEmail(demand)}
                          className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5 hover:bg-blue-100 transition-colors">
                          <Mail className="w-3 h-3" /> E-mail
                        </button>
                        <button onClick={() => openWhatsApp(demand)}
                          className="flex items-center gap-1 text-xs bg-green-50 border border-green-200 text-green-700 rounded-full px-2 py-0.5 hover:bg-green-100 transition-colors">
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </button>
                        <button onClick={() => saveDemandAsHistory(demand)}
                          className="flex items-center gap-1 text-xs bg-violet-50 border border-violet-200 text-violet-700 rounded-full px-2 py-0.5 hover:bg-violet-100 transition-colors">
                          <History className="w-3 h-3" /> Salvar histórico
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {isUser && (
                <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="p-3 border-t border-slate-100 shrink-0 bg-white">
        <p className="text-[10px] text-slate-400 mb-1.5 text-center">
          Especialista em <span className="text-violet-600 font-medium">{specialist}</span>
        </p>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pergunte algo sobre esta tarefa…"
            rows={2}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-300 mt-1.5 text-center">Enter para enviar · Shift+Enter nova linha</p>
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export function TaskDetailClient({ id }: { id: string }) {
  const [task,      setTask]      = useState<Task | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<"visao" | "evidencias" | "historico" | "relatorio">("visao")

  const load = useCallback(() => {
    return fetch(`/api/tasks/${id}`)
      .then(r => r.json())
      .then(setTask)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-5xl">
      <div className="h-8 w-48 bg-slate-200 rounded" />
      <div className="h-64 bg-slate-200 rounded-xl" />
    </div>
  )

  if (!task) return (
    <div className="text-center py-16">
      <p className="text-slate-500">Tarefa não encontrada.</p>
      <Link href="/tasks" className="text-blue-600 text-sm mt-2 inline-block">← Voltar para tarefas</Link>
    </div>
  )

  const overdue = isOverdue(task.dueDate) && task.status !== "CONCLUIDA" && task.status !== "CANCELADA"
  const isFinished = task.status === "CONCLUIDA" || task.status === "CANCELADA"

  const baseDate           = task.receivedAt || task.createdAt
  const receivedAgo        = formatRelativeTime(baseDate)
  const lastUpdateAgo      = formatRelativeTime(task.updatedAt)
  const lastStatusChange   = task.statusHistory.length > 0 ? task.statusHistory[task.statusHistory.length - 1].createdAt : task.createdAt
  const currentStatusDuration = durationBetween(lastStatusChange)

  const TABS = [
    { key: "visao"      as const, label: "Visão Geral",  icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { key: "evidencias" as const, label: "Evidências",   icon: <Paperclip       className="w-3.5 h-3.5" />, count: task.attachments?.length },
    { key: "historico"  as const, label: "Histórico",    icon: <History         className="w-3.5 h-3.5" />, count: task.statusHistory?.length },
    { key: "relatorio"  as const, label: "Relatório",    icon: <BarChart2       className="w-3.5 h-3.5" /> },
  ]

  return (
    <>
      {showModal && (
        <StatusChangeModal
          currentStatus={task.status} taskId={id}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setLoading(true); load() }}
        />
      )}

      {/* Wrapper — sem max-width fixo para permitir o layout de 2 colunas na Visão Geral */}
      <div className="space-y-5 animate-fade-in">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between max-w-5xl">
          <Link href="/tasks" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para Tarefas
          </Link>
          <Link href={`/tasks/${id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="w-3.5 h-3.5" /> Editar</Button>
          </Link>
        </div>

        {/* Alerta de atraso */}
        {overdue && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-5xl">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-medium">Esta tarefa está atrasada. Verifique o prazo imediatamente.</p>
          </div>
        )}

        {/* Título + badges */}
        <div className="flex items-start justify-between gap-4 max-w-5xl">
          <h1 className="text-xl font-bold text-slate-800 leading-snug">{task.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-sm border rounded-full px-3 py-1 font-medium", PRIORITY_COLORS[task.priority])}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span className={cn("text-sm border rounded-full px-3 py-1 font-medium flex items-center gap-1.5", STATUS_COLORS[task.status])}>
              {STATUS_ICONS[task.status]} {STATUS_LABELS[task.status]}
            </span>
          </div>
        </div>

        {/* Abas */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-1" aria-label="Abas da tarefa">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300")}>
                {tab.icon} {tab.label}
                {"count" in tab && typeof tab.count === "number" && tab.count > 0 && (
                  <span className={cn("text-xs rounded-full px-1.5 py-0.5 font-semibold",
                    activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ─── VISÃO GERAL — layout 2 colunas ─────────────────────────────────── */}
        {activeTab === "visao" && (
          <div className="flex gap-5 items-start">

            {/* Coluna esquerda — 60% — informações da tarefa */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* Painel Resumo + indicadores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600">Painel Resumo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
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
                        <p className="text-xs text-slate-400">Status</p>
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
                      {(task.taskOrigin?.name ?? task.origin) && (
                        <div>
                          <p className="text-xs text-slate-400">Origem</p>
                          <p className="text-sm font-medium text-slate-700">{task.taskOrigin?.name ?? task.origin}</p>
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

                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-0.5">{task.receivedAt ? "Recebida" : "Criada"} há</p>
                    <p className="text-lg font-bold text-slate-700">{receivedAgo}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs text-blue-500 mb-0.5">{STATUS_LABELS[task.status]} há</p>
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

              {/* Observações */}
              {task.observations && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-amber-700 mb-1">Observações iniciais</p>
                  <p className="text-sm text-amber-800">{task.observations}</p>
                </div>
              )}

              {/* Evidências inline (miniatura) */}
              {task.attachments?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      Evidências
                      <span className="text-xs font-normal text-slate-400">({task.attachments.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                      {task.attachments.slice(0, 4).map(att => (
                        <div key={att.id} className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={att.filePath} alt={att.fileName} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    {task.attachments.length > 4 && (
                      <button onClick={() => setActiveTab('evidencias')} className="mt-2 text-xs text-blue-600 hover:underline">
                        Ver todas as {task.attachments.length} evidências →
                      </button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Histórico de status inline */}
              {task.statusHistory.length > 0 && (
                <Timeline entries={task.statusHistory} createdAt={task.createdAt} receivedAt={task.receivedAt} />
              )}

              {/* Alterar status */}
              {!isFinished && (
                <div className="flex items-center gap-3">
                  <Button onClick={() => setShowModal(true)} className="bg-slate-800 hover:bg-slate-900 text-white">
                    <ChevronRight className="w-4 h-4" /> Alterar Status
                  </Button>
                  <p className="text-xs text-slate-400">Toda alteração requer justificativa e responsável.</p>
                </div>
              )}
            </div>

            {/* Coluna direita — 40% — Assistente da Tarefa */}
            <div className="w-[42%] shrink-0 sticky top-4" style={{ height: 'calc(100vh - 220px)', minHeight: '520px' }}>
              <TaskAssistantPanel task={task} onRefresh={() => { setLoading(true); load() }} />
            </div>
          </div>
        )}

        {/* ─── EVIDÊNCIAS ──────────────────────────────────────────────────────── */}
        {activeTab === "evidencias" && (
          <div className="max-w-4xl">
            <EvidenciasSection taskId={id} attachments={task.attachments} />
          </div>
        )}

        {/* ─── HISTÓRICO ───────────────────────────────────────────────────────── */}
        {activeTab === "historico" && (
          <div className="max-w-4xl">
            {(task.statusHistory.length > 0 || task.receivedAt)
              ? <Timeline entries={task.statusHistory} createdAt={task.createdAt} receivedAt={task.receivedAt} />
              : (
                <div className="text-center py-16 text-slate-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum histórico registrado.</p>
                </div>
              )
            }
          </div>
        )}

        {/* ─── RELATÓRIO — sem IA, apenas visualização e exportação ───────────── */}
        {activeTab === "relatorio" && (
          <div className="max-w-4xl">
            <RelatorioTarefaClient task={task} onReload={() => { setLoading(true); load() }} />
          </div>
        )}
      </div>
    </>
  )
}
