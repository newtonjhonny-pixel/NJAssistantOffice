"use client"

import { useEffect, useState } from "react"
import {
  CheckSquare, AlertCircle, Clock, TrendingUp, Inbox,
  ArrowRight, Flame, Sparkles, Loader2, Info, RefreshCw, Tag
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import {
  PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS,
  formatDate, isOverdue, cn
} from "@/lib/utils"

interface DashboardData {
  counts: {
    open: number
    completed: number
    urgent: number
    overdue: number
    waiting: number
    inbox: number
  }
  topPriorities: Task[]
  alerts: Task[]
  waiting: Task[]
  recentTasks: Task[]
}

interface Task {
  id: string
  title: string
  priority: string
  status: string
  person: string | null
  dueDate: string | null
}

interface OrigemStat {
  id: string
  name: string
  color: string
  icon: string
  count: number
}

interface SummaryData {
  content: string
  aiPowered: boolean
  aiConfigured: boolean
}

const statCards = [
  { key: "open",      label: "Tarefas Abertas",   icon: CheckSquare, color: "text-blue-600",   bg: "bg-blue-50"   },
  { key: "urgent",    label: "Urgentes",           icon: Flame,       color: "text-red-600",    bg: "bg-red-50"    },
  { key: "overdue",   label: "Atrasadas",          icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
  { key: "waiting",   label: "Aguard. Retorno",    icon: Clock,       color: "text-purple-600", bg: "bg-purple-50" },
  { key: "completed", label: "Concluídas",         icon: TrendingUp,  color: "text-green-600",  bg: "bg-green-50"  },
  { key: "inbox",     label: "Caixa de Entrada",   icon: Inbox,       color: "text-slate-600",  bg: "bg-slate-50"  },
]

export function DashboardClient() {
  const [data, setData]           = useState<DashboardData | null>(null)
  const [summary, setSummary]     = useState<SummaryData | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [origens, setOrigens]     = useState<{ byOrigin: OrigemStat[]; noOriginCount: number } | null>(null)

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
    fetch("/api/dashboard/origens")
      .then(r => r.json())
      .then(setOrigens)
      .catch(() => {})
  }, [])

  async function loadSummary() {
    setSummaryLoading(true)
    try {
      const res = await fetch("/api/dashboard/summary")
      const d = await res.json()
      setSummary(d)
    } finally {
      setSummaryLoading(false)
    }
  }

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Saudação */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 p-4 text-white sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-slate-300 text-sm mb-1">Coordenador Administrativo 🎯</p>
            <h1 className="mb-2 text-xl font-bold sm:text-2xl">{greeting}, Newton.</h1>
            <p className="text-slate-300 max-w-xl">
              {data?.counts.overdue
                ? `Você tem ${data.counts.overdue} atividade(s) atrasada(s) e ${data.counts.urgent ?? 0} urgente(s) para hoje. Vamos resolver?`
                : `Nenhuma atividade atrasada. Hoje você tem ${data?.counts.open ?? 0} tarefas abertas para acompanhar.`}
            </p>
          </div>
          <div className="text-left text-sm text-slate-400 sm:text-right">
            <p>{now.toLocaleDateString("pt-BR", { weekday: "long" })}</p>
            <p className="text-2xl font-bold text-white">{now.getDate()}</p>
            <p>{now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {statCards.map(({ key, label, icon: Icon, color, bg }) => (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {data?.counts[key as keyof typeof data.counts] ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo Inteligente do Dia */}
      <Card className={cn(
        "border-2 transition-colors",
        summary?.aiPowered ? "border-violet-200 bg-violet-50/20" : "border-slate-200"
      )}>
        <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Sparkles className={cn("w-5 h-5", summary?.aiPowered ? "text-violet-500" : "text-slate-400")} />
            Resumo Inteligente do Dia
            {summary?.aiPowered && (
              <span className="text-xs font-normal bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">
                ✨ IA Real
              </span>
            )}
          </CardTitle>
          <button
            onClick={loadSummary}
            disabled={summaryLoading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-100 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 disabled:opacity-50 sm:w-auto sm:border-0 sm:p-0"
          >
            {summaryLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />
            }
            {summary ? "Atualizar" : "Gerar resumo"}
          </button>
        </CardHeader>

        <CardContent>
          {!summary && !summaryLoading && (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 text-sm font-medium">Resumo Inteligente do Dia</p>
              <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                O Coordenador Administrativo irá analisar todas as suas tarefas e orientar o foco do dia.
              </p>
              <button
                onClick={loadSummary}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Gerar agora
              </button>
            </div>
          )}

          {summaryLoading && (
            <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
              <p className="text-sm">O Coordenador Administrativo está analisando suas tarefas...</p>
            </div>
          )}

          {summary && !summaryLoading && (
            <>
              {summary.aiConfigured === false && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>IA não configurada.</strong> Para ativar análises reais, adicione{' '}
                    <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY=sk-...</code> no arquivo{' '}
                    <code className="bg-amber-100 px-1 rounded">.env</code> e reinicie o servidor.
                  </p>
                </div>
              )}
              <div
                className="text-sm text-slate-700 leading-relaxed agent-content"
                dangerouslySetInnerHTML={{
                  __html: summary.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prioridades do dia */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                Prioridades do Dia
              </CardTitle>
              <Link href="/tasks" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.topPriorities.length ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">
                  ✅ Nenhuma atividade urgente ou atrasada no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {data.topPriorities.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 group sm:flex-row sm:items-start sm:gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {task.person && <span className="text-xs text-slate-400">{task.person}</span>}
                          {task.dueDate && (
                            <span className={cn(
                              "text-xs",
                              isOverdue(task.dueDate) ? "text-red-500 font-medium" : "text-slate-400"
                            )}>
                              {isOverdue(task.dueDate) ? "⚠️ " : "📅 "}
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className={cn("text-xs border rounded-full px-2 py-0.5", PRIORITY_COLORS[task.priority])}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className={cn("text-xs border rounded-full px-2 py-0.5", STATUS_COLORS[task.status])}>
                          {STATUS_LABELS[task.status]}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alertas e Pendências */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Alertas — Gestor de Pendências ⚠️
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.alerts.length ? (
                <p className="px-5 py-4 text-xs text-slate-400">Nenhum alerta no momento.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {data.alerts.map((t) => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="block px-4 py-3 hover:bg-slate-50 transition-colors">
                      <p className="text-xs font-medium text-slate-700 truncate">{t.title}</p>
                      <p className="text-xs text-red-500 mt-0.5">Atrasada · {formatDate(t.dueDate)}</p>
                    </Link>
                  ))}
                </div>
              )}
              {(data?.counts.overdue ?? 0) > 0 && (
                <div className="px-4 py-3 border-t border-slate-50">
                  <Link href="/pendencias" className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1">
                    Ver Central de Pendências <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-purple-500" />
                Aguardando Retorno
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.waiting.length ? (
                <p className="px-5 py-4 text-xs text-slate-400">Nenhuma pendência aguardando retorno.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {data.waiting.map((t) => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="block px-4 py-3 hover:bg-slate-50 transition-colors">
                      <p className="text-xs font-medium text-slate-700 truncate">{t.title}</p>
                      {t.person && <p className="text-xs text-slate-400 mt-0.5">{t.person}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Origem das Demandas */}
      {origens && origens.byOrigin.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-blue-500" />
              Origem das Demandas
            </CardTitle>
            <Link href="/origens" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Gerenciar origens <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {(() => {
              const total = origens.byOrigin.reduce((s, o) => s + o.count, 0)
              const top = [...origens.byOrigin].sort((a, b) => b.count - a.count).slice(0, 8)
              const maxCount = top[0]?.count ?? 1
              return (
                <div className="space-y-2">
                  {top.map(o => (
                    <div key={o.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-40 shrink-0">
                        <span className="text-sm leading-none">{o.icon}</span>
                        <span className="text-xs text-slate-600 truncate">{o.name}</span>
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${(o.count / maxCount) * 100}%`, backgroundColor: o.color }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-8 text-right shrink-0">{o.count}</span>
                      <span className="text-xs text-slate-400 w-10 text-right shrink-0">
                        {total > 0 ? `${Math.round((o.count / total) * 100)}%` : ""}
                      </span>
                    </div>
                  ))}
                  {origens.noOriginCount > 0 && (
                    <div className="flex items-center gap-3 opacity-50">
                      <div className="flex items-center gap-1.5 w-40 shrink-0">
                        <span className="text-sm leading-none">❓</span>
                        <span className="text-xs text-slate-500 truncate">Sem origem</span>
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-slate-300"
                          style={{ width: `${(origens.noOriginCount / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-400 w-8 text-right shrink-0">{origens.noOriginCount}</span>
                      <span className="text-xs text-slate-300 w-10 text-right shrink-0">
                        {total > 0 ? `${Math.round((origens.noOriginCount / (total + origens.noOriginCount)) * 100)}%` : ""}
                      </span>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Sugestões do Assistente */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-blue-800">
            🗂️ Assistente Administrativo — Sugestões para o dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: "📋", title: "Verificar atividades urgentes",
                desc: "Resolva primeiro as tarefas marcadas como urgentes para evitar impactos maiores.",
                href: "/tasks?priority=URGENTE",
              },
              {
                icon: "📬", title: "Processar caixa de entrada",
                desc: `Você tem ${data?.counts.inbox || 0} item(s) não lido(s). Crie tarefas para as demandas prioritárias.`,
                href: "/inbox",
              },
              {
                icon: "🔔", title: "Cobrar retornos pendentes",
                desc: `${data?.counts.waiting || 0} atividade(s) aguardando retorno. Considere enviar lembretes.`,
                href: "/pendencias",
              },
            ].map((s) => (
              <Link key={s.href} href={s.href} className="bg-white rounded-lg p-4 border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
