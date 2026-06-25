"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, Clock, FileText, ChevronRight, Sparkles, Loader2, X, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn, PRIORITY_COLORS, PRIORITY_LABELS, formatDate, isOverdue } from "@/lib/utils"

interface Task {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  person: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  history: { createdAt: string }[]
}

interface AnalysisResult {
  content: string
  aiPowered: boolean
  aiConfigured: boolean
}

function daysSinceUpdate(task: Task): number {
  const lastUpdate = task.history[0]?.createdAt || task.updatedAt
  return Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 86400000)
}

export function PendenciasClient() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [cobranca, setCobranca] = useState<{ taskId: string; text: string } | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null) // taskId sendo analisado
  const [analysis, setAnalysis] = useState<{ taskId: string; title: string } & AnalysisResult | null>(null)

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then((data: Task[]) => { setTasks(data); setLoading(false) })
  }, [])

  const overdue = tasks.filter(
    t => t.dueDate && isOverdue(t.dueDate) && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA'
  )
  const waiting = tasks.filter(t => t.status === 'AGUARDANDO_RETORNO')
  const stale = tasks.filter(
    t => t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA' && daysSinceUpdate(t) >= 3
  ).filter(t => !overdue.find(o => o.id === t.id) && !waiting.find(w => w.id === t.id))

  function generateCobranca(task: Task) {
    const text = `Prezado(a) ${task.person ?? '[Nome]'},

Venho por meio desta mensagem verificar o andamento da seguinte atividade:

📋 Assunto: ${task.title}
📅 Prazo: ${task.dueDate ? formatDate(task.dueDate) : 'A definir'}
${isOverdue(task.dueDate) ? '⚠️ Atividade com prazo vencido.' : ''}

Solicito, por gentileza, um retorno com a atualização do status desta atividade.

Em caso de necessidade de prorrogação ou qualquer dificuldade, por favor, me comunique o quanto antes para que possamos tomar as providências necessárias.

Conto com sua atenção.

Atenciosamente,
Newton
Gestão Administrativa

⚠️ Esta é apenas uma sugestão. Revise antes de enviar.`
    setCobranca({ taskId: task.id, text })
  }

  async function analyzeWithAI(task: Task) {
    setAnalyzing(task.id)
    try {
      const res = await fetch("/api/pendencias/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      })
      const data = await res.json()
      setAnalysis({
        taskId: task.id,
        title: task.title,
        content: data.content,
        aiPowered: data.aiPowered ?? false,
        aiConfigured: data.aiConfigured ?? false,
      })
    } finally {
      setAnalyzing(null)
    }
  }

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />)}</div>
  }

  const TaskRow = ({ task }: { task: Task }) => {
    const days = daysSinceUpdate(task)
    const isAnalyzing = analyzing === task.id
    return (
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/tasks/${task.id}`}
              className="font-semibold text-sm text-slate-800 hover:text-blue-600 transition-colors flex items-center gap-1 group"
            >
              {task.title}
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {task.person && <span className="text-xs text-slate-500">👤 {task.person}</span>}
              {task.dueDate && (
                <span className={cn("text-xs font-medium", isOverdue(task.dueDate) ? "text-red-500" : "text-slate-400")}>
                  📅 {formatDate(task.dueDate)}
                </span>
              )}
              <span className={cn("text-xs border rounded-full px-2 py-0.5", PRIORITY_COLORS[task.priority])}>
                {PRIORITY_LABELS[task.priority]}
              </span>
              {days > 0 && (
                <span className={cn("text-xs font-medium", days >= 5 ? "text-red-500" : days >= 3 ? "text-orange-500" : "text-slate-400")}>
                  ⏱️ {days} dia(s) sem atualização
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => analyzeWithAI(task)}
              disabled={isAnalyzing}
              className="text-violet-600 border-violet-200 hover:bg-violet-50"
            >
              {isAnalyzing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />
              }
              Analisar IA
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateCobranca(task)}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <FileText className="w-3.5 h-3.5" />
              Cobrança
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const Section = ({ title, icon, items, emptyText, color }: {
    title: string
    icon: React.ReactNode
    items: Task[]
    emptyText: string
    color: string
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", color)}>
          {icon}
          {title}
          <span className="ml-auto text-sm font-normal text-slate-500">{items.length} atividade(s)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!items.length ? (
          <p className="px-5 py-6 text-sm text-slate-400 text-center">{emptyText}</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map((task) => <TaskRow key={task.id} task={task} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Central de Pendências</h2>
          <p className="text-sm text-slate-500">⚠️ Gestor de Pendências — monitorando {overdue.length + waiting.length + stale.length} atividade(s)</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Atrasadas",              count: overdue.length,  color: "text-red-600",    bg: "bg-red-50 border-red-200"      },
          { label: "Aguard. retorno",        count: waiting.length,  color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
          { label: "Sem atualização (+3d)",  count: stale.length,    color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border p-4 text-center", s.bg)}>
            <p className={cn("text-3xl font-bold", s.color)}>{s.count}</p>
            <p className="text-xs text-slate-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <Section title="Atividades Atrasadas"       icon={<AlertCircle className="w-4 h-4" />} items={overdue}  emptyText="✅ Nenhuma atividade atrasada!"                    color="text-red-600"    />
      <Section title="Aguardando Retorno"          icon={<Clock className="w-4 h-4" />}       items={waiting}  emptyText="✅ Nenhuma atividade aguardando retorno!"           color="text-purple-600" />
      <Section title="Sem Movimentação (+3 dias)"  icon={<Clock className="w-4 h-4" />}       items={stale}    emptyText="✅ Todas as atividades estão sendo atualizadas!"   color="text-orange-600" />

      {/* Modal de análise de IA */}
      {analysis && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAnalysis(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                ⚠️ Gestor de Pendências
                {analysis.aiPowered && (
                  <span className="text-xs font-normal bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">
                    ✨ IA Real
                  </span>
                )}
              </h3>
              <button onClick={() => setAnalysis(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">
                {analysis.title}
              </p>

              {!analysis.aiConfigured && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>IA não configurada.</strong> Adicione{' '}
                    <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code> no{' '}
                    <code className="bg-amber-100 px-1 rounded">.env</code> para análises reais.
                  </p>
                </div>
              )}

              <div
                className="text-sm text-slate-700 leading-relaxed agent-content"
                dangerouslySetInnerHTML={{
                  __html: analysis.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }}
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 shrink-0">
              <Button onClick={() => setAnalysis(null)} variant="outline" size="sm">Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cobrança */}
      {cobranca && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCobranca(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">✍️ Texto de cobrança gerado</h3>
              <button onClick={() => setCobranca(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <pre className="text-sm text-emerald-800 whitespace-pre-wrap font-sans">{cobranca.text}</pre>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => navigator.clipboard?.writeText(cobranca.text)} variant="outline" size="sm">
                  Copiar texto
                </Button>
                <Button onClick={() => setCobranca(null)} variant="ghost" size="sm">Fechar</Button>
              </div>
              <p className="text-xs text-slate-400 mt-3">⚠️ Revise e adapte o texto antes de enviar. Nenhuma mensagem é enviada automaticamente.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
