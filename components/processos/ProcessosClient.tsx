"use client"

import { useEffect, useState } from "react"
import {
  Workflow, FileText, GitBranch, ShieldCheck, BarChart2, Users2,
  ClipboardList, CheckSquare, AlertTriangle, Sparkles,
  ChevronRight, LayoutDashboard, FileBarChart2,
  TrendingDown, Clock, AlertCircle, Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TabProcedimentos } from "@/components/gestao-equipe/TabProcedimentos"
import { TabCadastroProcessos } from "@/components/processos/TabCadastroProcessos"
import { TabFluxogramas } from "@/components/processos/TabFluxogramas"
import { TabRaci } from "@/components/processos/TabRaci"
import { TabEvidencias } from "@/components/processos/TabEvidencias"
import { TabConformidade } from "@/components/processos/TabConformidade"
import { TabRiscos } from "@/components/processos/TabRiscos"
import { TabControles } from "@/components/processos/TabControles"
import { TabIndicadores } from "@/components/processos/TabIndicadores"
import { TabAuditoria } from "@/components/processos/TabAuditoria"
import { TabIAProcessos } from "@/components/processos/TabIAProcessos"
import { TabRelatorios } from "@/components/processos/TabRelatorios"

// ── Tipos ──────────────────────────────────────────────────────────────────────

type TabId =
  | "visao-geral"
  | "processos"
  | "procedimentos"
  | "fluxogramas"
  | "raci"
  | "riscos"
  | "controles"
  | "evidencias"
  | "conformidade"
  | "indicadores"
  | "auditoria"
  | "ia-processos"
  | "relatorios"

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "visao-geral",   label: "Visão Geral",           icon: LayoutDashboard },
  { id: "processos",     label: "Cadastro de Processos", icon: Workflow },
  { id: "procedimentos", label: "Procedimentos",         icon: ClipboardList },
  { id: "fluxogramas",   label: "Fluxogramas",           icon: GitBranch },
  { id: "raci",          label: "RACI",                  icon: Users2 },
  { id: "riscos",        label: "Riscos / FMEA",         icon: AlertTriangle },
  { id: "controles",     label: "Controles",             icon: ShieldCheck },
  { id: "evidencias",    label: "Evidências",            icon: FileText },
  { id: "conformidade",  label: "Conformidade",          icon: CheckSquare },
  { id: "indicadores",   label: "Indicadores",           icon: BarChart2 },
  { id: "auditoria",     label: "Auditoria",             icon: ShieldCheck },
  { id: "ia-processos",  label: "IA Processos",          icon: Sparkles },
  { id: "relatorios",    label: "Relatórios",            icon: FileBarChart2 },
]

// ── Dashboard executivo ────────────────────────────────────────────────────────

interface DashboardData {
  processos:        { total: number; ativos: number; emRevisao: number }
  procedimentos:    { total: number; byType: Record<string, number> }
  riscos:           { total: number; criticos: number; altos: number }
  auditorias:       { total: number; pendentes: number; atrasadas: number }
  conformidade:     { total: number; vencidas: number; proximasVencer: number }
  indicadores:      { total: number; vermelhos: number; amarelos: number }
}

function StatCard({
  label, value, sub, icon: Icon, color, onClick, badge, badgeColor,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  color: string
  onClick?: () => void
  badge?: string | number
  badgeColor?: string
}) {
  const inner = (
    <div className={cn(
      "rounded-xl overflow-hidden border border-white/10 shadow-sm transition-all",
      onClick && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer group",
    )}>
      <div className={cn("p-4 bg-gradient-to-br text-white relative", color)}>
        <Icon className="w-5 h-5 mb-2 opacity-80" />
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs opacity-80 mt-1">{label}</p>
        {badge !== undefined && badge !== 0 && (
          <span className={cn(
            "absolute top-3 right-3 text-[10px] font-bold rounded-full px-1.5 py-0.5",
            badgeColor ?? "bg-white/25 text-white",
          )}>
            {badge}
          </span>
        )}
      </div>
      <div className="bg-white px-4 py-2 flex items-center justify-between">
        <p className="text-[11px] text-slate-500">{sub}</p>
        {onClick && <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />}
      </div>
    </div>
  )
  return onClick ? <button onClick={onClick} className="text-left w-full">{inner}</button> : <div>{inner}</div>
}

function VisaoGeral({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    const in30  = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]

    Promise.all([
      fetch("/api/processes").then(r => r.json()).catch(() => []),
      fetch("/api/procedures").then(r => r.json()).catch(() => []),
      fetch("/api/riscos").then(r => r.json()).catch(() => []),
      fetch("/api/auditoria").then(r => r.json()).catch(() => []),
      fetch("/api/conformidade").then(r => r.json()).catch(() => []),
      fetch("/api/indicadores").then(r => r.json()).catch(() => []),
    ]).then(([procs, docs, risks, audits, compliance, indicators]) => {
      const byType: Record<string, number> = {}
      for (const d of (docs as { type: string }[])) byType[d.type] = (byType[d.type] ?? 0) + 1

      setData({
        processos: {
          total:     (procs as { status: string }[]).length,
          ativos:    (procs as { status: string }[]).filter(p => p.status === "ATIVO").length,
          emRevisao: (procs as { status: string }[]).filter(p => p.status === "EM_REVISAO").length,
        },
        procedimentos: { total: (docs as unknown[]).length, byType },
        riscos: {
          total:    (risks as { riskLevel: string }[]).length,
          criticos: (risks as { riskLevel: string }[]).filter(r => r.riskLevel === "CRITICO").length,
          altos:    (risks as { riskLevel: string }[]).filter(r => r.riskLevel === "ALTO").length,
        },
        auditorias: {
          total:     (audits as { status: string; plannedDate: string }[]).length,
          pendentes: (audits as { status: string }[]).filter(a => a.status === "PLANEJADA" || a.status === "EM_ANDAMENTO").length,
          atrasadas: (audits as { status: string; plannedDate: string }[]).filter(a =>
            a.status === "PLANEJADA" && a.plannedDate < today).length,
        },
        conformidade: {
          total:          (compliance as { status: string; dueDate: string }[]).length,
          vencidas:       (compliance as { status: string; dueDate: string }[]).filter(c =>
            c.dueDate < today && c.status !== "EM_DIA" && c.status !== "NAO_APLICA").length,
          proximasVencer: (compliance as { status: string; dueDate: string }[]).filter(c =>
            c.dueDate >= today && c.dueDate <= in30 && c.status !== "EM_DIA").length,
        },
        indicadores: {
          total:     (indicators as { status: string }[]).length,
          vermelhos: (indicators as { status: string }[]).filter(i => i.status === "VERMELHO").length,
          amarelos:  (indicators as { status: string }[]).filter(i => i.status === "AMARELO").length,
        },
      })
    }).finally(() => setLoading(false))
  }, [])

  const v = (n: number | undefined) => loading ? "…" : (n ?? 0)

  return (
    <div className="space-y-6">
      {/* Processos */}
      <section>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Processos</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Processos" value={v(data?.processos.total)} sub="Total cadastrado"
            icon={Workflow} color="from-slate-600 to-slate-700"
            onClick={() => onNavigate("processos")}
          />
          <StatCard
            label="Ativos" value={v(data?.processos.ativos)} sub="Em operação"
            icon={Activity} color="from-emerald-500 to-emerald-600"
            onClick={() => onNavigate("processos")}
          />
          <StatCard
            label="Em Revisão" value={v(data?.processos.emRevisao)} sub="Aguardando aprovação"
            icon={RefreshCwIcon} color="from-amber-500 to-amber-600"
            badge={data?.processos.emRevisao || undefined}
            onClick={() => onNavigate("processos")}
          />
          <StatCard
            label="Procedimentos" value={v(data?.procedimentos.total)} sub="POPs, ITs e Checklists"
            icon={ClipboardList} color="from-violet-500 to-violet-600"
            onClick={() => onNavigate("procedimentos")}
          />
        </div>
      </section>

      {/* Procedimentos por tipo */}
      <section>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Documentação por tipo</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { key: "POP",         label: "POPs",         color: "bg-blue-50 border-blue-200 text-blue-700",    dot: "bg-blue-500" },
            { key: "IT",          label: "ITs",          color: "bg-violet-50 border-violet-200 text-violet-700", dot: "bg-violet-500" },
            { key: "CHECKLIST",   label: "Checklists",   color: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500" },
            { key: "POLITICA",    label: "Políticas",    color: "bg-red-50 border-red-200 text-red-700",       dot: "bg-red-500" },
            { key: "NORMA",       label: "Normas",       color: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-500" },
            { key: "CONTINGENCIA",label: "Planos",       color: "bg-orange-50 border-orange-200 text-orange-700", dot: "bg-orange-500" },
            { key: "TERMO",       label: "Termos",       color: "bg-slate-50 border-slate-200 text-slate-600", dot: "bg-slate-400" },
          ].map(t => (
            <button key={t.key} onClick={() => onNavigate("procedimentos")}
              className={cn("rounded-xl border p-3 text-left hover:shadow-sm transition-all", t.color)}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn("w-2 h-2 rounded-full shrink-0", t.dot)} />
                <span className="text-xs font-semibold">{t.label}</span>
              </div>
              <p className="text-xl font-bold">{v(data?.procedimentos.byType[t.key])}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Riscos e Conformidade */}
      <section>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Riscos e Conformidade</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Riscos" value={v(data?.riscos.total)} sub="Total mapeado"
            icon={AlertTriangle} color="from-orange-500 to-orange-600"
            onClick={() => onNavigate("riscos")}
          />
          <StatCard
            label="Críticos" value={v(data?.riscos.criticos)} sub="Ação imediata"
            icon={AlertCircle} color="from-red-500 to-red-600"
            badge={data?.riscos.criticos || undefined} badgeColor="bg-white/30 text-white"
            onClick={() => onNavigate("riscos")}
          />
          <StatCard
            label="Altos" value={v(data?.riscos.altos)} sub="Monitoramento próximo"
            icon={TrendingDown} color="from-amber-500 to-amber-600"
            onClick={() => onNavigate("riscos")}
          />
          <StatCard
            label="Obrigações" value={v(data?.conformidade.total)} sub="Total conformidade"
            icon={CheckSquare} color="from-blue-500 to-blue-600"
            onClick={() => onNavigate("conformidade")}
          />
          <StatCard
            label="Vencidas" value={v(data?.conformidade.vencidas)} sub="Requere ação"
            icon={AlertCircle} color="from-red-600 to-red-700"
            badge={data?.conformidade.vencidas || undefined} badgeColor="bg-white/30 text-white"
            onClick={() => onNavigate("conformidade")}
          />
          <StatCard
            label="Vencendo em 30d" value={v(data?.conformidade.proximasVencer)} sub="Atenção necessária"
            icon={Clock} color="from-amber-600 to-amber-700"
            onClick={() => onNavigate("conformidade")}
          />
        </div>
      </section>

      {/* Auditoria e Indicadores */}
      <section>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Auditoria e Desempenho</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Auditorias" value={v(data?.auditorias.total)} sub="Total registradas"
            icon={ShieldCheck} color="from-cyan-500 to-cyan-600"
            onClick={() => onNavigate("auditoria")}
          />
          <StatCard
            label="Pendentes" value={v(data?.auditorias.pendentes)} sub="Planejadas / em andamento"
            icon={Clock} color="from-indigo-500 to-indigo-600"
            onClick={() => onNavigate("auditoria")}
          />
          <StatCard
            label="Atrasadas" value={v(data?.auditorias.atrasadas)} sub="Prazo ultrapassado"
            icon={AlertCircle} color="from-rose-500 to-rose-600"
            badge={data?.auditorias.atrasadas || undefined} badgeColor="bg-white/30 text-white"
            onClick={() => onNavigate("auditoria")}
          />
          <StatCard
            label="Indicadores" value={v(data?.indicadores.total)} sub="KPIs monitorados"
            icon={BarChart2} color="from-teal-500 to-teal-600"
            onClick={() => onNavigate("indicadores")}
          />
          <StatCard
            label="Críticos" value={v(data?.indicadores.vermelhos)} sub="Abaixo da meta mínima"
            icon={TrendingDown} color="from-red-500 to-red-600"
            badge={data?.indicadores.vermelhos || undefined} badgeColor="bg-white/30 text-white"
            onClick={() => onNavigate("indicadores")}
          />
        </div>
      </section>

      {/* Atalhos rápidos */}
      <section>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Acesso rápido</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "IA Processos",    icon: Sparkles,      tab: "ia-processos" as TabId, color: "text-violet-600 bg-violet-50 border-violet-200" },
            { label: "Relatórios",      icon: FileBarChart2, tab: "relatorios"   as TabId, color: "text-blue-600 bg-blue-50 border-blue-200" },
            { label: "RACI",            icon: Users2,        tab: "raci"         as TabId, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
            { label: "Fluxogramas",     icon: GitBranch,     tab: "fluxogramas"  as TabId, color: "text-orange-600 bg-orange-50 border-orange-200" },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate(a.tab)}
              className={cn("flex items-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm hover:shadow-sm transition-all", a.color)}>
              <a.icon className="w-4 h-4" />
              {a.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

// placeholder icon (RefreshCw sem import duplicado)
function RefreshCwIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ProcessosClient() {
  const [activeTab, setActiveTab] = useState<TabId>("visao-geral")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Processos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Documentação, BPMN, controles e conformidade</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === "visao-geral"   && <VisaoGeral onNavigate={setActiveTab} />}
        {activeTab === "processos"     && <TabCadastroProcessos />}
        {activeTab === "procedimentos" && <TabProcedimentos />}
        {activeTab === "fluxogramas"   && <TabFluxogramas />}
        {activeTab === "raci"          && <TabRaci />}
        {activeTab === "riscos"        && <TabRiscos />}
        {activeTab === "controles"     && <TabControles />}
        {activeTab === "evidencias"    && <TabEvidencias />}
        {activeTab === "conformidade"  && <TabConformidade />}
        {activeTab === "indicadores"   && <TabIndicadores />}
        {activeTab === "auditoria"     && <TabAuditoria />}
        {activeTab === "ia-processos"  && <TabIAProcessos />}
        {activeTab === "relatorios"    && <TabRelatorios />}
      </div>
    </div>
  )
}
