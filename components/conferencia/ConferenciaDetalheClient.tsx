"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, ShieldCheck, Pencil, Trash2, Plus, CheckCircle2,
  AlertTriangle, Clock, XCircle, FileCheck, Bot, History,
  ClipboardList, Bug, Wrench, ChevronDown, ChevronUp,
  Calendar, User, Building2, Sparkles,
} from "lucide-react"
import { cn, formatDate, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/utils"
import { PROCESS_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from "./ConferenciaClient"
import { NovaConferenciaModal } from "./NovaConferenciaModal"
import { ConferenciaIAModal } from "./ConferenciaIAModal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string; description: string; result: string; notes: string | null
  correctionResponsible: string | null; correctionDueDate: string | null
  order: number; createdAt: string
}

interface Issue {
  id: string; title: string; description: string | null; severity: string
  impact: string | null; probableCause: string | null; recommendedSolution: string | null
  correctionResponsible: string | null; correctionDueDate: string | null
  correctionStatus: string; finalNotes: string | null; createdAt: string
}

interface Correction {
  id: string; issueId: string | null; responsible: string | null
  dueDate: string | null; status: string; notes: string | null
  correctedAt: string | null; validatedAt: string | null; createdAt: string
  issue: { id: string; title: string } | null
}

interface AiAnalysis {
  id: string; analysisType: string; content: string; aiPowered: boolean; createdAt: string
}

interface HistoryEntry {
  id: string; type: string; title: string; description: string | null; createdAt: string
}

interface ConferenceDetail {
  id: string; title: string; processType: string; competence: string | null
  companyUnit: string | null; analystName: string | null; coordinatorName: string | null
  conferenceDate: string | null; correctionDueDate: string | null
  status: string; priority: string; description: string | null; notes: string | null
  createdAt: string; updatedAt: string
  checklist:   ChecklistItem[]
  issues:      Issue[]
  corrections: Correction[]
  analyses:    AiAnalysis[]
  history:     HistoryEntry[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RESULT_LABELS: Record<string, string> = {
  CONFORME: "Conforme", NAO_CONFORME: "Não conforme",
  NAO_APLICA: "Não se aplica", PENDENTE_ANALISE: "Pendente de análise",
}
const RESULT_COLORS: Record<string, string> = {
  CONFORME:       "bg-green-50 text-green-700 border-green-200",
  NAO_CONFORME:   "bg-red-50 text-red-700 border-red-200",
  NAO_APLICA:     "bg-slate-100 text-slate-500 border-slate-200",
  PENDENTE_ANALISE:"bg-yellow-50 text-yellow-700 border-yellow-200",
}
const SEVERITY_LABELS: Record<string, string> = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", CRITICA: "Crítica" }
const SEVERITY_COLORS: Record<string, string> = {
  BAIXA: "bg-blue-50 text-blue-700 border-blue-200",
  MEDIA: "bg-yellow-50 text-yellow-700 border-yellow-200",
  ALTA:  "bg-orange-50 text-orange-700 border-orange-200",
  CRITICA:"bg-red-50 text-red-700 border-red-200",
}
const CORRECTION_STATUS_LABELS: Record<string, string> = {
  ABERTA: "Aberta", EM_CORRECAO: "Em correção", CORRIGIDA: "Corrigida",
  VALIDADA: "Validada", CANCELADA: "Cancelada",
}
const CORRECTION_STATUS_COLORS: Record<string, string> = {
  ABERTA:      "bg-red-50 text-red-700 border-red-200",
  EM_CORRECAO: "bg-yellow-50 text-yellow-700 border-yellow-200",
  CORRIGIDA:   "bg-teal-50 text-teal-700 border-teal-200",
  VALIDADA:    "bg-green-50 text-green-700 border-green-200",
  CANCELADA:   "bg-slate-100 text-slate-400 border-slate-200",
}
const HISTORY_ICONS: Record<string, React.ReactNode> = {
  CRIACAO:              <ShieldCheck className="w-3.5 h-3.5" />,
  STATUS:               <Clock className="w-3.5 h-3.5" />,
  ITEM_CONFERIDO:       <ClipboardList className="w-3.5 h-3.5" />,
  INCONSISTENCIA:       <Bug className="w-3.5 h-3.5" />,
  IA_ANALISE:           <Bot className="w-3.5 h-3.5" />,
  CORRECAO_SOLICITADA:  <Wrench className="w-3.5 h-3.5" />,
  CORRECAO_REALIZADA:   <CheckCircle2 className="w-3.5 h-3.5" />,
  APROVADA:             <CheckCircle2 className="w-3.5 h-3.5" />,
  REPROVADA:            <XCircle className="w-3.5 h-3.5" />,
  EDICAO:               <Pencil className="w-3.5 h-3.5" />,
}
const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  COMPLETA:            "Análise completa",
  TEXTO_CORRECAO:      "Texto de correção",
  ORIENTACAO_ANALISTA: "Orientação ao analista",
  PARECER_FINAL:       "Parecer final",
  PLANO_PREVENCAO:     "Plano de prevenção",
  CHECKLIST_SUGERIDO:  "Checklist sugerido",
}

type Tab = "geral" | "checklist" | "inconsistencias" | "analise_ia" | "correcoes" | "historico"

// ─── Main component ───────────────────────────────────────────────────────────

export function ConferenciaDetalheClient({ id }: { id: string }) {
  const [conf,       setConf]       = useState<ConferenceDetail | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState<Tab>("geral")
  const [showEdit,   setShowEdit]   = useState(false)
  const [showIA,     setShowIA]     = useState(false)
  const [iaInitType, setIAInitType] = useState("COMPLETA")
  const [deleting,   setDeleting]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/conferencia/${id}`)
    if (res.ok) setConf(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function updateStatus(status: string) {
    await fetch(`/api/conferencia/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mr-2" />
      Carregando...
    </div>
  )
  if (!conf) return (
    <div className="p-8 text-center text-slate-500">
      <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
      <p>Conferência não encontrada.</p>
      <Link href="/conferencia" className="text-teal-600 text-sm hover:underline mt-2 inline-block">← Voltar</Link>
    </div>
  )

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "geral",           label: "Visão Geral",    icon: <ShieldCheck className="w-4 h-4" /> },
    { key: "checklist",       label: "Checklist",      icon: <ClipboardList className="w-4 h-4" />, count: conf.checklist.length },
    { key: "inconsistencias", label: "Inconsistências",icon: <Bug className="w-4 h-4" />,           count: conf.issues.length },
    { key: "analise_ia",      label: "Análise IA",     icon: <Bot className="w-4 h-4" />,           count: conf.analyses.length },
    { key: "correcoes",       label: "Correções",      icon: <Wrench className="w-4 h-4" />,        count: conf.corrections.length },
    { key: "historico",       label: "Histórico",      icon: <History className="w-4 h-4" />,       count: conf.history.length },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/conferencia" className="mt-1 text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={cn("text-xs border rounded-full px-2.5 py-0.5 font-medium", STATUS_COLORS[conf.status])}>
                {STATUS_LABELS[conf.status] ?? conf.status}
              </span>
              <span className={cn("text-xs border rounded-full px-2.5 py-0.5 font-medium", PRIORITY_COLORS[conf.priority])}>
                {PRIORITY_LABELS[conf.priority] ?? conf.priority}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5">
                {PROCESS_TYPE_LABELS[conf.processType] ?? conf.processType}
              </span>
              {conf.competence && <span className="text-xs text-slate-500">{conf.competence}</span>}
            </div>
            <h1 className="text-lg font-bold text-slate-800">{conf.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { setIAInitType("COMPLETA"); setShowIA(true) }}
            className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 border border-dashed border-teal-300 hover:border-teal-500 hover:bg-teal-50 rounded-xl px-3 py-2 transition-all">
            <Bot className="w-4 h-4" /> Analisar com IA
          </button>
          <button onClick={() => setShowEdit(true)}
            className="text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status quick actions */}
      <div className="flex flex-wrap gap-2">
        {["EM_CONFERENCIA", "COM_INCONSISTENCIA", "AGUARDANDO_CORRECAO", "CORRIGIDO", "APROVADO", "REPROVADO"].map(s => (
          conf.status !== s && (
            <button key={s} onClick={() => updateStatus(s)}
              className="text-xs border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 rounded-lg px-2.5 py-1 transition-colors">
              → {STATUS_LABELS[s]}
            </button>
          )
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0.5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                tab === t.key
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}>
              {t.icon} {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5 ml-0.5">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── VISÃO GERAL ── */}
      {tab === "geral" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dados da conferência</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Tipo" value={PROCESS_TYPE_LABELS[conf.processType] ?? conf.processType} />
                {conf.competence      && <InfoRow label="Competência"  value={conf.competence} />}
                {conf.companyUnit     && <InfoRow label="Empresa"      value={conf.companyUnit} />}
                {conf.analystName     && <InfoRow label="Analista"     value={conf.analystName} icon={<User className="w-3 h-3" />} />}
                {conf.coordinatorName && <InfoRow label="Coordenador"  value={conf.coordinatorName} icon={<User className="w-3 h-3" />} />}
                {conf.conferenceDate  && <InfoRow label="Data conferência" value={formatDate(conf.conferenceDate)} icon={<Calendar className="w-3 h-3" />} />}
                {conf.correctionDueDate && <InfoRow label="Prazo correção" value={formatDate(conf.correctionDueDate)} icon={<Calendar className="w-3 h-3" />} />}
              </div>
            </div>
            {conf.description && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Descrição</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{conf.description}</p>
              </div>
            )}
            {conf.notes && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Observações</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{conf.notes}</p>
              </div>
            )}
          </div>

          {/* Right column — stats */}
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumo</h3>
              <StatRow icon={<ClipboardList className="w-4 h-4 text-blue-500" />} label="Itens checklist" value={conf.checklist.length} />
              <StatRow icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} label="Conformes" value={conf.checklist.filter(i => i.result === "CONFORME").length} />
              <StatRow icon={<XCircle className="w-4 h-4 text-red-500" />} label="Não conformes" value={conf.checklist.filter(i => i.result === "NAO_CONFORME").length} />
              <StatRow icon={<Bug className="w-4 h-4 text-orange-500" />} label="Inconsistências" value={conf.issues.length} />
              <StatRow icon={<Wrench className="w-4 h-4 text-purple-500" />} label="Correções" value={conf.corrections.length} />
              <StatRow icon={<Sparkles className="w-4 h-4 text-teal-500" />} label="Análises IA" value={conf.analyses.length} />
            </div>

            {/* IA quick actions */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ações de IA</h3>
              {[
                { type: "COMPLETA",            label: "Analisar conferência" },
                { type: "TEXTO_CORRECAO",      label: "Gerar texto de correção" },
                { type: "ORIENTACAO_ANALISTA", label: "Orientação ao analista" },
                { type: "PARECER_FINAL",       label: "Gerar parecer final" },
                { type: "PLANO_PREVENCAO",     label: "Plano de prevenção" },
                { type: "CHECKLIST_SUGERIDO",  label: "Gerar checklist sugerido" },
              ].map(a => (
                <button key={a.type}
                  onClick={() => { setIAInitType(a.type); setShowIA(true) }}
                  className="w-full flex items-center gap-2 text-xs text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 rounded-lg px-3 py-1.5 transition-all text-left">
                  <Bot className="w-3 h-3 shrink-0 text-teal-500" /> {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CHECKLIST ── */}
      {tab === "checklist" && (
        <ChecklistTab conferenceId={id} items={conf.checklist} onRefresh={load} />
      )}

      {/* ── INCONSISTÊNCIAS ── */}
      {tab === "inconsistencias" && (
        <IssuesTab conferenceId={id} issues={conf.issues} onRefresh={load} />
      )}

      {/* ── ANÁLISE IA ── */}
      {tab === "analise_ia" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Análises geradas ({conf.analyses.length})</p>
            <button onClick={() => { setIAInitType("COMPLETA"); setShowIA(true) }}
              className="flex items-center gap-2 text-sm text-teal-600 border border-teal-200 hover:bg-teal-50 rounded-xl px-4 py-2 transition-colors">
              <Bot className="w-4 h-4" /> Nova análise
            </button>
          </div>
          {conf.analyses.length === 0 ? (
            <EmptyState icon={<Bot className="w-10 h-10 text-slate-200" />} message="Nenhuma análise gerada ainda" hint='Clique em "Analisar com IA" para começar' />
          ) : (
            conf.analyses.map(a => <AiAnalysisCard key={a.id} analysis={a} />)
          )}
        </div>
      )}

      {/* ── CORREÇÕES ── */}
      {tab === "correcoes" && (
        <CorrecoesTab conferenceId={id} corrections={conf.corrections} issues={conf.issues} onRefresh={load} />
      )}

      {/* ── HISTÓRICO ── */}
      {tab === "historico" && (
        <div className="space-y-2">
          {conf.history.length === 0 ? (
            <EmptyState icon={<History className="w-10 h-10 text-slate-200" />} message="Nenhum evento registrado" hint="" />
          ) : (
            conf.history.map(h => (
              <div key={h.id} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  {HISTORY_ICONS[h.type] ?? <Clock className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{h.title}</p>
                  {h.description && <p className="text-xs text-slate-500 mt-0.5">{h.description}</p>}
                </div>
                <span className="text-xs text-slate-400 shrink-0">{formatDate(h.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showEdit && (
        <NovaConferenciaModal
          editId={id}
          initial={{
            title:             conf.title,
            processType:       conf.processType,
            competence:        conf.competence        ?? "",
            companyUnit:       conf.companyUnit       ?? "",
            analystName:       conf.analystName       ?? "",
            coordinatorName:   conf.coordinatorName   ?? "",
            conferenceDate:    conf.conferenceDate    ? conf.conferenceDate.slice(0, 10) : "",
            correctionDueDate: conf.correctionDueDate ? conf.correctionDueDate.slice(0, 10) : "",
            status:            conf.status,
            priority:          conf.priority,
            description:       conf.description ?? "",
            notes:             conf.notes        ?? "",
          }}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load() }}
        />
      )}
      {showIA && (
        <ConferenciaIAModal
          conferenceId={id}
          conferenceTitle={conf.title}
          initialType={iaInitType}
          onClose={() => { setShowIA(false); load() }}
        />
      )}
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-sm text-slate-700 flex items-center gap-1">{icon}{value}</p>
    </div>
  )
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-slate-600">{icon} {label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  )
}

function EmptyState({ icon, message, hint }: { icon: React.ReactNode; message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
      {icon}
      <p className="text-sm font-medium">{message}</p>
      {hint && <p className="text-xs">{hint}</p>}
    </div>
  )
}

function AiAnalysisCard({ analysis }: { analysis: AiAnalysis }) {
  const [open, setOpen] = useState(false)

  function renderMarkdown(raw: string): string {
    let html = raw
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^## (.+)$/gm, '<h2 class="text-sm font-bold text-teal-700 mt-4 mb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-base font-bold text-slate-800 mt-3 mb-1">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>')
      .replace(/^[-*] (.+)$/gm, '<li class="ml-4 text-sm text-slate-700 list-disc list-inside">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm text-slate-700 list-decimal list-inside">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-sm text-slate-700 my-1.5">')
      .replace(/\n/g, '<br />')
    return `<p class="text-sm text-slate-700">${html}</p>`
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <Bot className="w-4 h-4 text-teal-600" />
          <div>
            <p className="text-sm font-medium text-slate-700">{ANALYSIS_TYPE_LABELS[analysis.analysisType] ?? analysis.analysisType}</p>
            <p className="text-xs text-slate-400">{formatDate(analysis.createdAt)} · {analysis.aiPowered ? "OpenAI" : "Local"}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="mt-3 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis.content) }} />
        </div>
      )}
    </div>
  )
}

// ─── Checklist tab ────────────────────────────────────────────────────────────

function ChecklistTab({ conferenceId, items, onRefresh }: { conferenceId: string; items: ChecklistItem[]; onRefresh: () => void }) {
  const [showForm,  setShowForm]  = useState(false)
  const [generating, setGenerating] = useState(false)
  const [desc, setDesc]  = useState("")
  const [saving, setSaving] = useState(false)

  async function addItem() {
    if (!desc.trim()) return
    setSaving(true)
    await fetch(`/api/conferencia/${conferenceId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc.trim() }),
    })
    setSaving(false); setDesc(""); setShowForm(false); onRefresh()
  }

  async function updateResult(itemId: string, result: string) {
    await fetch(`/api/conferencia/${conferenceId}/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    })
    onRefresh()
  }

  async function deleteItem(itemId: string) {
    await fetch(`/api/conferencia/${conferenceId}/checklist/${itemId}`, { method: "DELETE" })
    onRefresh()
  }

  async function generateChecklist() {
    setGenerating(true)
    const res = await fetch(`/api/conferencia/${conferenceId}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisType: "CHECKLIST_SUGERIDO" }),
    })
    setGenerating(false)
    if (!res.ok) return
    const data = await res.json()
    // Parse numbered list from AI content
    const lines = (data.content as string).split('\n')
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(l => l.length > 4 && !l.startsWith('#') && !l.startsWith('*') && !l.startsWith('—') && !l.startsWith('-'))
      .slice(0, 20)
    if (lines.length > 0) {
      await fetch(`/api/conferencia/${conferenceId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lines.map(d => ({ description: d }))),
      })
      onRefresh()
    }
  }

  const summary = {
    conforme: items.filter(i => i.result === "CONFORME").length,
    naoConforme: items.filter(i => i.result === "NAO_CONFORME").length,
    pendente: items.filter(i => i.result === "PENDENTE_ANALISE").length,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="text-green-600 font-medium">✓ {summary.conforme} conformes</span>
          <span className="text-red-600 font-medium">✗ {summary.naoConforme} não conformes</span>
          <span className="text-yellow-600 font-medium">? {summary.pendente} pendentes</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateChecklist} disabled={generating}
            className="flex items-center gap-1.5 text-xs text-teal-600 border border-teal-200 hover:bg-teal-50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
            <Bot className="w-3.5 h-3.5" /> {generating ? "Gerando..." : "Sugerir com IA"}
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Adicionar item
          </button>
        </div>
      </div>

      {showForm && (
        <div className="flex gap-2 bg-teal-50 border border-teal-200 rounded-xl p-3">
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Descrição do item de verificação..."
            onKeyDown={e => e.key === "Enter" && addItem()}
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
          <button onClick={addItem} disabled={saving || !desc.trim()}
            className="text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
            {saving ? "..." : "Adicionar"}
          </button>
          <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 px-1">✕</button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-10 h-10 text-slate-200" />} message="Nenhum item no checklist" hint='Adicione itens manualmente ou use "Sugerir com IA"' />
      ) : (
        <div className="space-y-1.5">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 font-medium">{item.description}</p>
                {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select value={item.result} onChange={e => updateResult(item.id, e.target.value)}
                  className={cn("text-xs border rounded-full px-2.5 py-0.5 font-medium focus:outline-none", RESULT_COLORS[item.result])}>
                  {Object.entries(RESULT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Issues tab ───────────────────────────────────────────────────────────────

function IssuesTab({ conferenceId, issues, onRefresh }: { conferenceId: string; issues: Issue[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", severity: "MEDIA", impact: "", probableCause: "", recommendedSolution: "", correctionResponsible: "", correctionDueDate: "" })
  const [saving, setSaving] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function addIssue(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await fetch(`/api/conferencia/${conferenceId}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setForm({ title: "", description: "", severity: "MEDIA", impact: "", probableCause: "", recommendedSolution: "", correctionResponsible: "", correctionDueDate: "" })
    setShowForm(false); onRefresh()
  }

  async function updateStatus(issueId: string, correctionStatus: string) {
    await fetch(`/api/conferencia/${conferenceId}/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correctionStatus }),
    })
    onRefresh()
  }

  async function deleteIssue(issueId: string) {
    await fetch(`/api/conferencia/${conferenceId}/issues/${issueId}`, { method: "DELETE" })
    onRefresh()
  }

  const fieldClass = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{issues.length} inconsistência(s) registrada(s)</p>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Registrar inconsistência
        </button>
      </div>

      {showForm && (
        <form onSubmit={addIssue} className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">Nova inconsistência</h4>
          <input value={form.title} onChange={set("title")} required placeholder="Título do problema *"
            className={fieldClass} />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.severity} onChange={set("severity")} className={fieldClass}>
              {Object.entries(SEVERITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input value={form.correctionResponsible} onChange={set("correctionResponsible")}
              placeholder="Responsável pela correção" className={fieldClass} />
          </div>
          <textarea value={form.description} onChange={set("description")} rows={2}
            placeholder="Descrição do problema" className={fieldClass + " resize-none"} />
          <textarea value={form.impact} onChange={set("impact")} rows={1}
            placeholder="Impacto" className={fieldClass + " resize-none"} />
          <textarea value={form.probableCause} onChange={set("probableCause")} rows={1}
            placeholder="Causa provável" className={fieldClass + " resize-none"} />
          <textarea value={form.recommendedSolution} onChange={set("recommendedSolution")} rows={2}
            placeholder="Solução recomendada" className={fieldClass + " resize-none"} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5">Cancelar</button>
            <button type="submit" disabled={saving}
              className="text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-lg px-4 py-1.5 disabled:opacity-50">
              {saving ? "Salvando..." : "Registrar"}
            </button>
          </div>
        </form>
      )}

      {issues.length === 0 ? (
        <EmptyState icon={<Bug className="w-10 h-10 text-slate-200" />} message="Nenhuma inconsistência registrada" hint="Registro de conformidades vai aqui" />
      ) : (
        issues.map(issue => (
          <div key={issue.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={cn("text-xs border rounded-full px-2.5 py-0.5 font-medium", SEVERITY_COLORS[issue.severity])}>
                    {SEVERITY_LABELS[issue.severity] ?? issue.severity}
                  </span>
                  <select value={issue.correctionStatus} onChange={e => updateStatus(issue.id, e.target.value)}
                    className={cn("text-xs border rounded-full px-2 py-0.5 font-medium focus:outline-none", CORRECTION_STATUS_COLORS[issue.correctionStatus])}>
                    {Object.entries(CORRECTION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <p className="font-semibold text-sm text-slate-800">{issue.title}</p>
              </div>
              <button onClick={() => deleteIssue(issue.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {issue.description && <p className="text-xs text-slate-600">{issue.description}</p>}
            {issue.impact && <p className="text-xs text-slate-500"><span className="font-medium">Impacto:</span> {issue.impact}</p>}
            {issue.probableCause && <p className="text-xs text-slate-500"><span className="font-medium">Causa:</span> {issue.probableCause}</p>}
            {issue.recommendedSolution && (
              <div className="bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                <p className="text-xs text-teal-700"><span className="font-medium">Solução:</span> {issue.recommendedSolution}</p>
              </div>
            )}
            {issue.correctionResponsible && <p className="text-xs text-slate-500">Responsável: {issue.correctionResponsible}</p>}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Correções tab ────────────────────────────────────────────────────────────

function CorrecoesTab({ conferenceId, corrections, issues, onRefresh }: {
  conferenceId: string; corrections: Correction[]; issues: Issue[]; onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ issueId: "", responsible: "", dueDate: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function addCorrection(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/conferencia/${conferenceId}/corrections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, issueId: form.issueId || null }),
    })
    setSaving(false); setForm({ issueId: "", responsible: "", dueDate: "", notes: "" }); setShowForm(false); onRefresh()
  }

  async function updateCorrStatus(corrId: string, status: string) {
    await fetch(`/api/conferencia/${conferenceId}/corrections/${corrId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    onRefresh()
  }

  const fieldClass = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{corrections.length} correção(ões)</p>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Solicitar correção
        </button>
      </div>

      {showForm && (
        <form onSubmit={addCorrection} className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">Solicitar correção</h4>
          {issues.length > 0 && (
            <select value={form.issueId} onChange={set("issueId")} className={fieldClass}>
              <option value="">Selecionar inconsistência (opcional)</option>
              {issues.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input value={form.responsible} onChange={set("responsible")} placeholder="Responsável" className={fieldClass} />
            <input type="date" value={form.dueDate} onChange={set("dueDate")} className={fieldClass} />
          </div>
          <textarea value={form.notes} onChange={set("notes")} rows={2}
            placeholder="Observações sobre a correção..." className={fieldClass + " resize-none"} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5">Cancelar</button>
            <button type="submit" disabled={saving}
              className="text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-1.5 disabled:opacity-50">
              {saving ? "Salvando..." : "Solicitar"}
            </button>
          </div>
        </form>
      )}

      {corrections.length === 0 ? (
        <EmptyState icon={<Wrench className="w-10 h-10 text-slate-200" />} message="Nenhuma correção solicitada" hint="Solicite correções a partir das inconsistências registradas" />
      ) : (
        corrections.map(corr => (
          <div key={corr.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {corr.issue && (
                  <p className="text-xs text-orange-700 font-medium mb-1">↳ {corr.issue.title}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <select value={corr.status} onChange={e => updateCorrStatus(corr.id, e.target.value)}
                    className={cn("text-xs border rounded-full px-2 py-0.5 font-medium focus:outline-none", CORRECTION_STATUS_COLORS[corr.status])}>
                    {Object.entries(CORRECTION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {corr.responsible && <span className="text-xs text-slate-500">Responsável: {corr.responsible}</span>}
                  {corr.dueDate && <span className="text-xs text-slate-500">Prazo: {formatDate(corr.dueDate)}</span>}
                </div>
              </div>
            </div>
            {corr.notes && <p className="text-xs text-slate-600">{corr.notes}</p>}
            {corr.correctedAt && <p className="text-xs text-teal-600">✓ Corrigida em {formatDate(corr.correctedAt)}</p>}
            {corr.validatedAt && <p className="text-xs text-green-600">✓ Validada em {formatDate(corr.validatedAt)}</p>}
          </div>
        ))
      )}
    </div>
  )
}
