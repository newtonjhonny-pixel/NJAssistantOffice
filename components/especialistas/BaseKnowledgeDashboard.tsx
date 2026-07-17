"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, RefreshCw, FileText, Clock, CheckCircle, AlertCircle,
  XCircle, Loader2, BarChart3, Eye, History, Settings, ChevronRight,
  Sparkles, Database, TrendingUp, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SPECIALISTS } from "@/lib/especialistas/config"

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

type UpdateProgress = {
  step: number
  label: string
  done: boolean
}

const PROGRESS_STEPS = [
  "Consultando Portal Oficial...",
  "Verificando versões...",
  "Baixando documentos...",
  "Atualizando Base...",
  "Indexando documentos...",
  "Finalizando...",
]

const CATEGORY_LABELS: Record<string, string> = {
  legislacao: "Leis", norma: "Normas", norma_tecnica: "Notas Técnicas",
  jurisprudencia: "Jurisprudências", metodologia: "Metodologias",
  procedimentos: "Procedimentos", faq: "FAQ", geral: "Documentos",
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const INITIAL_LOAD_SPECIALISTS = ["esocial"]
const INITIAL_LOAD_STEPS_DASHBOARD = [
  "Conectando ao Portal Oficial...",
  "Buscando MOS e histórico...",
  "Indexando leiautes e eventos...",
  "Indexando tabelas e notas técnicas...",
  "Indexando FAQ e legislação...",
  "Finalizando carga histórica...",
]

function StatusBadge({ status, initialLoadDone, specialist }: { status: string; initialLoadDone?: boolean; specialist?: string }) {
  if (status === "ATUALIZADO") return (
    <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 text-xs font-medium">
      <CheckCircle className="w-3 h-3" /> Atualizado
    </span>
  )
  if (status === "DISPONIVEL") return (
    <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5 text-xs font-medium">
      <AlertCircle className="w-3 h-3" /> Disponível
    </span>
  )
  if (status === "CARGA_PENDENTE" || (specialist && INITIAL_LOAD_SPECIALISTS.includes(specialist) && !initialLoadDone)) return (
    <span className="flex items-center gap-1 text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 text-xs font-medium">
      <Database className="w-3 h-3" /> Carga Pendente
    </span>
  )
  if (status === "CARGA_EM_ANDAMENTO") return (
    <span className="flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 text-xs font-medium">
      <Loader2 className="w-3 h-3 animate-spin" /> Carregando
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 text-xs font-medium">
      <XCircle className="w-3 h-3" /> Desatualizado
    </span>
  )
}

export function BaseKnowledgeDashboard() {
  const [bases, setBases]             = useState<KnowledgeBase[]>([])
  const [logs, setLogs]               = useState<UpdateLog[]>([])
  const [loading, setLoading]         = useState(true)
  const [updating, setUpdating]       = useState<string | null>(null)
  const [progress, setProgress]       = useState<UpdateProgress[]>([])
  const [updateResult, setUpdateResult] = useState<{ logs: UpdateLog[]; count: number } | null>(null)
  const [showHistory, setShowHistory] = useState<string | null>(null)
  const [specLogs, setSpecLogs]       = useState<UpdateLog[]>([])
  const [initialLoading, setInitialLoading]   = useState<string | null>(null) // specialist id
  const [initialLoadStep, setInitialLoadStep] = useState(0)
  const [initialLoadResult, setInitialLoadResult] = useState<{ specialist: string; indexed: number; duration: number; version: string } | null>(null)

  const [reindexing,      setReindexing]      = useState<string | null>(null)
  const [verifying,       setVerifying]       = useState<string | null>(null)
  const [integrityResults, setIntegrityResults] = useState<Record<string, { coverage: number; status: string; withEmbedding: number; active: number }>>({})


  const loadData = useCallback(async () => {
    setLoading(true)
    const [basesRes, logsRes] = await Promise.all([
      fetch("/api/especialistas/base"),
      fetch("/api/especialistas/base/log"),
    ])
    setBases(await basesRes.json())
    setLogs(await logsRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function doUpdate(action: "update-all" | "update-outdated" | string) {
    const specialistKey = !["update-all", "update-outdated"].includes(action) ? action : undefined
    setUpdating(action)
    setUpdateResult(null)

    // Animated progress
    const steps: UpdateProgress[] = PROGRESS_STEPS.map((label, i) => ({ step: i, label, done: false }))
    setProgress(steps)

    let stepIdx = 0
    const ticker = setInterval(() => {
      stepIdx++
      if (stepIdx < PROGRESS_STEPS.length) {
        setProgress(prev => prev.map((s, i) => i < stepIdx ? { ...s, done: true } : s))
      }
    }, 600)

    try {
      const body = specialistKey
        ? { specialist: specialistKey, force: true, triggeredBy: "manual" }
        : { action, triggeredBy: "manual" }

      const res  = await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      clearInterval(ticker)
      setProgress(PROGRESS_STEPS.map((label, i) => ({ step: i, label, done: true })))

      await new Promise(r => setTimeout(r, 500))

      const returnedLogs: UpdateLog[] = data.log
        ? [data.log]
        : data.logs ?? []
      setUpdateResult({ logs: returnedLogs, count: returnedLogs.length })

      await loadData()
    } catch {
      clearInterval(ticker)
    } finally {
      setUpdating(null)
      setProgress([])
    }
  }

  async function doReindex(specialistId: string) {
    setReindexing(specialistId)
    try {
      await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reindex", specialist: specialistId }),
      })
      await loadData()
    } catch { /* silent */ } finally {
      setReindexing(null)
    }
  }

  async function doVerifyIntegrity(specialistId: string) {
    setVerifying(specialistId)
    try {
      const res  = await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verificar-integridade", specialist: specialistId }),
      })
      const data = await res.json()
      setIntegrityResults(prev => ({ ...prev, [specialistId]: data }))
    } catch { /* silent */ } finally {
      setVerifying(null)
    }
  }

  async function doInitialLoad(specialistId: string) {
    setInitialLoading(specialistId)
    setInitialLoadStep(0)
    setInitialLoadResult(null)

    let step = 0
    const ticker = setInterval(() => {
      step = Math.min(step + 1, INITIAL_LOAD_STEPS_DASHBOARD.length - 1)
      setInitialLoadStep(step)
    }, 900)

    try {
      const res  = await fetch("/api/especialistas/base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initial-load", specialist: specialistId }),
      })
      const data = await res.json()
      clearInterval(ticker)
      setInitialLoadStep(INITIAL_LOAD_STEPS_DASHBOARD.length - 1)
      if (data.log) {
        setInitialLoadResult({
          specialist: specialistId,
          indexed: data.indexed,
          duration: data.log.duration,
          version: data.log.version,
        })
      }
      await new Promise(r => setTimeout(r, 600))
      await loadData()
    } catch {
      clearInterval(ticker)
    } finally {
      setInitialLoading(null)
      setInitialLoadStep(0)
    }
  }

  async function viewHistory(specialistId: string) {
    const res  = await fetch(`/api/especialistas/base/log?specialist=${specialistId}`)
    const data = await res.json()
    setSpecLogs(data)
    setShowHistory(specialistId)
  }

  // Summary stats
  const totalDocs      = bases.reduce((s, b) => s + b.docCount, 0)
  const updatedCount   = bases.filter(b => b.status === "ATUALIZADO").length
  const pendingLoad    = bases.filter(b => b.status === "CARGA_PENDENTE" || (!b.initialLoadDone && INITIAL_LOAD_SPECIALISTS.includes(b.specialist))).length
  const outdatedCount  = bases.filter(b => b.status !== "ATUALIZADO" && b.status !== "CARGA_PENDENTE").length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/especialistas" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Database className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-800">Central da Base de Conhecimento</h1>
        </div>
        <p className="text-xs text-slate-500 ml-10">Gerencie e monitore a Base de Conhecimento de todos os Especialistas</p>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de Documentos", value: totalDocs, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Especialistas Ativos", value: bases.length, icon: Sparkles, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Bases Atualizadas", value: updatedCount, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
            { label: "Precisam Atualizar", value: outdatedCount, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", c.bg)}>
                <c.icon className={cn("w-5 h-5", c.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{c.value}</p>
                <p className="text-xs text-slate-500 leading-tight">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => doUpdate("update-all")}
            disabled={!!updating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {updating === "update-all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Atualizar Todos
          </button>
          <button
            onClick={() => doUpdate("update-outdated")}
            disabled={!!updating}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {updating === "update-outdated" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Atualizar Desatualizados
          </button>
        </div>

        {/* Initial load progress modal */}
        {initialLoading && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
            <p className="text-sm font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Carga Inicial eSocial em andamento...
            </p>
            <div className="space-y-2">
              {INITIAL_LOAD_STEPS_DASHBOARD.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  {i < initialLoadStep ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : i === initialLoadStep ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />
                  )}
                  <span className={cn("text-sm", i <= initialLoadStep ? "text-slate-700" : "text-slate-400")}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Initial load result */}
        {initialLoadResult && !initialLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-blue-800">Carga Inicial do eSocial Concluída</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-slate-500 text-xs">Documentos indexados</p><p className="font-bold text-blue-700 text-lg">{initialLoadResult.indexed}</p></div>
              <div><p className="text-slate-500 text-xs">Versão</p><p className="font-mono text-slate-700">{initialLoadResult.version}</p></div>
              <div><p className="text-slate-500 text-xs">Tempo total</p><p className="text-slate-700">{fmtDuration(initialLoadResult.duration)}</p></div>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              MOS, Leiautes, Eventos, Tabelas, Notas Técnicas, FAQ, FGTS Digital e Legislação agora disponíveis.
              As próximas atualizações serão incrementais.
            </p>
            <button onClick={() => setInitialLoadResult(null)} className="mt-2 text-xs text-blue-700 hover:underline">Fechar</button>
          </div>
        )}

        {/* Progress modal */}
        {progress.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              Atualizando Base de Conhecimento...
            </p>
            <div className="space-y-2">
              {progress.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  {s.done ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : i === progress.filter(x => x.done).length ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />
                  )}
                  <span className={cn("text-sm", s.done ? "text-slate-700" : "text-slate-400")}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Update result */}
        {updateResult && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm font-semibold text-green-800">
                {updateResult.count} especialista(s) atualizado(s) com sucesso
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {updateResult.logs.map(log => {
                const sp = SPECIALISTS.find(s => s.id === log.specialist)
                return (
                  <div key={log.id} className="bg-white rounded-xl border border-green-100 p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">{sp?.emoji} {sp?.shortName ?? log.specialist}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-slate-500">Novos docs</span>
                      <span className="font-medium text-green-700">{log.newDocs}</span>
                      <span className="text-slate-500">Atualizados</span>
                      <span className="font-medium text-blue-700">{log.updatedDocs}</span>
                      <span className="text-slate-500">Tempo</span>
                      <span className="font-medium text-slate-700">{fmtDuration(log.duration)}</span>
                      <span className="text-slate-500">Versão</span>
                      <span className="font-mono text-slate-700">{log.version}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={() => setUpdateResult(null)} className="mt-3 text-xs text-green-700 hover:underline">Fechar</button>
          </div>
        )}

        {/* Specialists table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">Especialistas — Base de Conhecimento</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Especialista", "Status", "Documentos", "Versão", "Última Atualização", "Próxima Atualização", "Ações"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {SPECIALISTS.map(sp => {
                    const base = bases.find(b => b.specialist === sp.id)
                    const cats = base?.docsByCategory ? (() => {
                      try { return JSON.parse(base.docsByCategory) as Record<string, number> } catch { return {} }
                    })() : {}
                    return (
                      <tr key={sp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{sp.emoji}</span>
                            <div>
                              <p className="font-medium text-slate-800 text-sm leading-tight">{sp.shortName}</p>
                              <p className="text-[11px] text-slate-400 leading-tight">{sp.area}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={base?.status ?? "DESATUALIZADO"}
                            initialLoadDone={base?.initialLoadDone}
                            specialist={sp.id}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-slate-800">{base?.docCount ?? 0}</p>
                            {Object.keys(cats).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(cats).map(([cat, n]) => (
                                  <span key={cat} className="text-[10px] bg-slate-100 text-slate-500 rounded px-1">{CATEGORY_LABELS[cat] ?? cat}: {n}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-600">{base?.version ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(base?.lastUpdated ?? null)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(base?.nextUpdate ?? null)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Show "Carga Inicial" for specialists that need it */}
                            {INITIAL_LOAD_SPECIALISTS.includes(sp.id) && !base?.initialLoadDone ? (
                              <button
                                onClick={() => doInitialLoad(sp.id)}
                                disabled={!!initialLoading}
                                title="Executar Carga Inicial"
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 text-[11px] font-semibold disabled:opacity-40 transition-colors"
                              >
                                {initialLoading === sp.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Database className="w-3 h-3" />}
                                {initialLoading === sp.id ? "Carregando..." : "Carga Inicial"}
                              </button>
                            ) : (
                              <button
                                onClick={() => doUpdate(sp.id)}
                                disabled={!!updating || !!initialLoading}
                                title="Atualizar agora"
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 disabled:opacity-40 transition-colors"
                              >
                                {updating === sp.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <RefreshCw className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button
                              onClick={() => viewHistory(sp.id)}
                              title="Histórico"
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => doReindex(sp.id)}
                              disabled={!!reindexing || !!updating || !!initialLoading}
                              title="Reconstruir Base Vetorial / Reindexar Documentos"
                              className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-500 disabled:opacity-40 transition-colors"
                            >
                              {reindexing === sp.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Sparkles className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => doVerifyIntegrity(sp.id)}
                              disabled={!!verifying || !!updating || !!initialLoading}
                              title="Verificar Integridade da Base"
                              className={cn(
                                "p-1.5 rounded-lg transition-colors disabled:opacity-40",
                                integrityResults[sp.id]?.status === "ok"      && "text-green-500 bg-green-50 hover:bg-green-100",
                                integrityResults[sp.id]?.status === "parcial"  && "text-yellow-500 bg-yellow-50 hover:bg-yellow-100",
                                integrityResults[sp.id]?.status === "critico"  && "text-red-500 bg-red-50 hover:bg-red-100",
                                !integrityResults[sp.id] && "hover:bg-slate-100 text-slate-500",
                              )}
                            >
                              {verifying === sp.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                            <Link
                              href={`/especialistas?specialist=${sp.id}`}
                              title="Ver documentos"
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent update log */}
        {logs.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">Histórico Recente de Atualizações</p>
            </div>
            <div className="divide-y divide-slate-50">
              {logs.slice(0, 15).map(log => {
                const sp = SPECIALISTS.find(s => s.id === log.specialist)
                return (
                  <div key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/60">
                    <span className="text-xl shrink-0">{sp?.emoji ?? "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{sp?.shortName ?? log.specialist}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString("pt-BR")} · {log.triggeredBy === "auto" ? "Automático" : "Manual"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs text-slate-600">{log.version}</p>
                      <p className="text-[11px] text-slate-400">
                        +{log.newDocs} novos · {fmtDuration(log.duration)}
                      </p>
                    </div>
                    <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* History drawer */}
      {showHistory && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]" onClick={() => setShowHistory(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b border-slate-200">
              <History className="w-4 h-4 text-slate-500" />
              <p className="font-semibold text-slate-800">
                {SPECIALISTS.find(s => s.id === showHistory)?.emoji}{" "}
                {SPECIALISTS.find(s => s.id === showHistory)?.shortName} — Histórico
              </p>
              <button onClick={() => setShowHistory(null)} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {specLogs.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">Nenhum histórico disponível.</p>
              ) : specLogs.map(log => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-semibold text-blue-700">{log.version}</span>
                    <span className="text-[11px] text-slate-400">
                      {log.triggeredBy === "auto" ? "⚡ Auto" : "🖱 Manual"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </p>
                  <div className="mt-1.5 flex gap-3 text-[11px]">
                    <span className="text-green-700">+{log.newDocs} novos</span>
                    <span className="text-blue-700">{log.updatedDocs} atualizados</span>
                    <span className="text-red-500">{log.removedDocs} removidos</span>
                    <span className="text-slate-500">{fmtDuration(log.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
