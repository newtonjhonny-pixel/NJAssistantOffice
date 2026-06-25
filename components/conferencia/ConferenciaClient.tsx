"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ShieldCheck, Plus, Search, AlertTriangle, CheckCircle2, Clock,
  XCircle, FileCheck, Filter, X, ChevronDown,
} from "lucide-react"
import { cn, formatDate, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/utils"
import { NovaConferenciaModal } from "./NovaConferenciaModal"

// ─── Constants ────────────────────────────────────────────────────────────────

export const PROCESS_TYPE_LABELS: Record<string, string> = {
  FOLHA: "Folha de Pagamento", RESCISAO: "Rescisão", FERIAS: "Férias",
  ADMISSAO: "Admissão", BENEFICIOS: "Benefícios", ENCARGOS: "Encargos",
  PAGAMENTO: "Pagamento", MOVIMENTACAO: "Movimentação", PONTO: "Ponto",
  ESOCIAL: "eSocial", FGTS: "FGTS", IRRF: "IRRF", DCTFWEB: "DCTFWeb", OUTROS: "Outros",
}

export const STATUS_LABELS: Record<string, string> = {
  PENDENTE:            "Pendente",
  EM_CONFERENCIA:      "Em conferência",
  COM_INCONSISTENCIA:  "Com inconsistência",
  AGUARDANDO_CORRECAO: "Aguardando correção",
  CORRIGIDO:           "Corrigido",
  APROVADO:            "Aprovado",
  REPROVADO:           "Reprovado",
  CANCELADO:           "Cancelado",
}

export const STATUS_COLORS: Record<string, string> = {
  PENDENTE:            "bg-slate-100 text-slate-600 border-slate-200",
  EM_CONFERENCIA:      "bg-blue-50 text-blue-700 border-blue-200",
  COM_INCONSISTENCIA:  "bg-orange-50 text-orange-700 border-orange-200",
  AGUARDANDO_CORRECAO: "bg-yellow-50 text-yellow-700 border-yellow-200",
  CORRIGIDO:           "bg-teal-50 text-teal-700 border-teal-200",
  APROVADO:            "bg-green-50 text-green-700 border-green-200",
  REPROVADO:           "bg-red-50 text-red-700 border-red-200",
  CANCELADO:           "bg-slate-100 text-slate-400 border-slate-200",
}

const SEVERITY_COLORS: Record<string, string> = {
  BAIXA: "bg-blue-100 text-blue-700", MEDIA: "bg-yellow-100 text-yellow-700",
  ALTA:  "bg-orange-100 text-orange-700", CRITICA: "bg-red-100 text-red-700",
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConferenceRow {
  id: string; title: string; processType: string; competence: string | null
  companyUnit: string | null; analystName: string | null; coordinatorName: string | null
  conferenceDate: string | null; correctionDueDate: string | null
  status: string; priority: string; description: string | null
  issueCount: number; checklistCount: number; correctionCount: number
  hasOpenIssues: boolean; isOverdue: boolean; createdAt: string
  issues: { id: string; severity: string; correctionStatus: string }[]
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string; value: number; total: number
  icon: React.ReactNode; color: string; activeColor: string
  isActive: boolean; onClick: () => void
}
function SummaryCard({ label, value, total, icon, color, activeColor, isActive, onClick }: SummaryCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left p-4 rounded-xl border transition-all duration-150 w-full",
        isActive
          ? `${activeColor} shadow-md ring-2 ring-offset-1 scale-[1.02]`
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>{icon}</div>
        <span className="text-xs text-slate-400">{pct}%</span>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ConferenciaClient() {
  const [conferences, setConferences] = useState<ConferenceRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [search,      setSearch]      = useState("")
  const [filterStatus,      setFilterStatus]      = useState("")
  const [filterPriority,    setFilterPriority]    = useState("")
  const [filterProcessType, setFilterProcessType] = useState("")
  const [filterAnalyst,     setFilterAnalyst]     = useState("")
  const [filterUnit,        setFilterUnit]        = useState("")
  const [activeCard, setActiveCard] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/conferencia")
    if (res.ok) setConferences(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const total   = conferences.length
  const counts = useMemo(() => ({
    pendentes:        conferences.filter(c => c.status === "PENDENTE" || c.status === "EM_CONFERENCIA").length,
    comInconsistencia:conferences.filter(c => c.issueCount > 0).length,
    aprovadas:        conferences.filter(c => c.status === "APROVADO").length,
    reprovadas:       conferences.filter(c => c.status === "REPROVADO").length,
    corrigidas:       conferences.filter(c => c.status === "CORRIGIDO").length,
  }), [conferences])

  const filtered = useMemo(() => {
    let list = conferences
    if (activeCard === "PENDENTE")           list = list.filter(c => c.status === "PENDENTE" || c.status === "EM_CONFERENCIA")
    if (activeCard === "COM_INCONSISTENCIA") list = list.filter(c => c.issueCount > 0)
    if (activeCard === "APROVADO")           list = list.filter(c => c.status === "APROVADO")
    if (activeCard === "REPROVADO")          list = list.filter(c => c.status === "REPROVADO")
    if (activeCard === "CORRIGIDO")          list = list.filter(c => c.status === "CORRIGIDO")

    if (filterStatus)      list = list.filter(c => c.status === filterStatus)
    if (filterPriority)    list = list.filter(c => c.priority === filterPriority)
    if (filterProcessType) list = list.filter(c => c.processType === filterProcessType)
    if (filterAnalyst)     list = list.filter(c => c.analystName?.toLowerCase().includes(filterAnalyst.toLowerCase()))
    if (filterUnit)        list = list.filter(c => c.companyUnit?.toLowerCase().includes(filterUnit.toLowerCase()))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (PROCESS_TYPE_LABELS[c.processType] ?? c.processType).toLowerCase().includes(q) ||
        c.analystName?.toLowerCase().includes(q) ||
        c.companyUnit?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      )
    }
    return list
  }, [conferences, activeCard, filterStatus, filterPriority, filterProcessType, filterAnalyst, filterUnit, search])

  const activeCardLabel: Record<string, string> = {
    PENDENTE: "Pendentes", COM_INCONSISTENCIA: "Com inconsistência",
    APROVADO: "Aprovadas", REPROVADO: "Reprovadas", CORRIGIDO: "Corrigidas",
  }

  const hasFilters = filterStatus || filterPriority || filterProcessType || filterAnalyst || filterUnit

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Conferência</h1>
            <p className="text-xs text-slate-500">Controle de qualidade dos processos administrativos</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nova Conferência
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard
          label="Total" value={total} total={total}
          icon={<ShieldCheck className="w-4 h-4 text-slate-600" />}
          color="bg-slate-100" activeColor="border-slate-400 bg-slate-50 ring-slate-300"
          isActive={activeCard === ""} onClick={() => setActiveCard("")}
        />
        <SummaryCard
          label="Pendentes" value={counts.pendentes} total={total}
          icon={<Clock className="w-4 h-4 text-blue-600" />}
          color="bg-blue-100" activeColor="border-blue-400 bg-blue-50 ring-blue-300"
          isActive={activeCard === "PENDENTE"} onClick={() => setActiveCard(activeCard === "PENDENTE" ? "" : "PENDENTE")}
        />
        <SummaryCard
          label="Com inconsistência" value={counts.comInconsistencia} total={total}
          icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
          color="bg-orange-100" activeColor="border-orange-400 bg-orange-50 ring-orange-300"
          isActive={activeCard === "COM_INCONSISTENCIA"} onClick={() => setActiveCard(activeCard === "COM_INCONSISTENCIA" ? "" : "COM_INCONSISTENCIA")}
        />
        <SummaryCard
          label="Aprovadas" value={counts.aprovadas} total={total}
          icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
          color="bg-green-100" activeColor="border-green-400 bg-green-50 ring-green-300"
          isActive={activeCard === "APROVADO"} onClick={() => setActiveCard(activeCard === "APROVADO" ? "" : "APROVADO")}
        />
        <SummaryCard
          label="Reprovadas" value={counts.reprovadas} total={total}
          icon={<XCircle className="w-4 h-4 text-red-600" />}
          color="bg-red-100" activeColor="border-red-400 bg-red-50 ring-red-300"
          isActive={activeCard === "REPROVADO"} onClick={() => setActiveCard(activeCard === "REPROVADO" ? "" : "REPROVADO")}
        />
        <SummaryCard
          label="Corrigidas" value={counts.corrigidas} total={total}
          icon={<FileCheck className="w-4 h-4 text-teal-600" />}
          color="bg-teal-100" activeColor="border-teal-400 bg-teal-50 ring-teal-300"
          isActive={activeCard === "CORRIGIDO"} onClick={() => setActiveCard(activeCard === "CORRIGIDO" ? "" : "CORRIGIDO")}
        />
      </div>

      {/* Search & filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, tipo, analista, empresa..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors",
              showFilters || hasFilters
                ? "border-teal-400 bg-teal-50 text-teal-700"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            )}
          >
            <Filter className="w-4 h-4" /> Filtros
            {hasFilters && <span className="w-2 h-2 rounded-full bg-teal-500 ml-0.5" />}
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
              <option value="">Todas as prioridades</option>
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterProcessType} onChange={e => setFilterProcessType(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
              <option value="">Todos os tipos</option>
              {Object.entries(PROCESS_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input value={filterAnalyst} onChange={e => setFilterAnalyst(e.target.value)}
              placeholder="Filtrar por analista"
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            <input value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
              placeholder="Filtrar por empresa/unidade"
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          </div>
        )}

        {/* Active filter badge */}
        {(activeCard || hasFilters) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {activeCard && (
              <span className="flex items-center gap-1.5 text-xs bg-teal-50 border border-teal-200 text-teal-700 rounded-full px-2.5 py-0.5">
                Filtro: {activeCardLabel[activeCard]}
                <button onClick={() => setActiveCard("")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {hasFilters && (
              <button onClick={() => { setFilterStatus(""); setFilterPriority(""); setFilterProcessType(""); setFilterAnalyst(""); setFilterUnit("") }}
                className="text-xs text-slate-500 hover:text-red-600 underline">
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mr-2" />
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <ShieldCheck className="w-12 h-12 text-slate-200" />
          <p className="text-sm font-medium">Nenhuma conferência encontrada</p>
          <p className="text-xs">Clique em "Nova Conferência" para começar</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-medium">{filtered.length} conferência(s)</p>
          {filtered.map(conf => (
            <Link
              key={conf.id}
              href={`/conferencia/${conf.id}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn("inline-flex items-center text-xs border rounded-full px-2.5 py-0.5 font-medium", STATUS_COLORS[conf.status])}>
                      {STATUS_LABELS[conf.status] ?? conf.status}
                    </span>
                    <span className={cn("inline-flex items-center text-xs border rounded-full px-2.5 py-0.5 font-medium", PRIORITY_COLORS[conf.priority])}>
                      {PRIORITY_LABELS[conf.priority] ?? conf.priority}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
                      {PROCESS_TYPE_LABELS[conf.processType] ?? conf.processType}
                    </span>
                    {conf.competence && (
                      <span className="text-xs text-slate-400">{conf.competence}</span>
                    )}
                    {conf.isOverdue && (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle className="w-3 h-3" /> Prazo vencido
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-slate-800 truncate">{conf.title}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                    {conf.analystName && <span>Analista: {conf.analystName}</span>}
                    {conf.companyUnit && <span>Empresa: {conf.companyUnit}</span>}
                    {conf.conferenceDate && <span>Conferida em: {formatDate(conf.conferenceDate)}</span>}
                    {conf.correctionDueDate && <span>Prazo: {formatDate(conf.correctionDueDate)}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {conf.issueCount > 0 && (
                    <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium",
                      conf.issues.some(i => i.severity === 'CRITICA') ? "bg-red-100 text-red-700" :
                      conf.issues.some(i => i.severity === 'ALTA')    ? "bg-orange-100 text-orange-700" :
                      "bg-yellow-100 text-yellow-700"
                    )}>
                      {conf.issueCount} inconsistência(s)
                    </span>
                  )}
                  {conf.checklistCount > 0 && (
                    <span className="text-xs text-slate-400">{conf.checklistCount} itens</span>
                  )}
                  <span className="text-xs text-slate-300">{formatDate(conf.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <NovaConferenciaModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
