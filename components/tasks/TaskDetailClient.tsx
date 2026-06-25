"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Edit, Bot, Clock, User, Calendar,
  Tag, AlertCircle, Loader2, Sparkles, Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import {
  cn, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS,
  AGENT_COLORS, AGENT_ICONS, AGENT_NAMES, formatDate, formatDateTime, isOverdue
} from "@/lib/utils"

interface Task {
  id: string
  title: string
  description: string | null
  origin: string | null
  priority: string
  status: string
  person: string | null
  observations: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
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

const ACTION_LABELS: Record<string, string> = {
  CRIACAO: 'Criação',
  STATUS: 'Mudança de status',
  PRIORIDADE: 'Mudança de prioridade',
  PRAZO: 'Alteração de prazo',
  EDICAO: 'Edição',
  CANCELAMENTO: 'Cancelamento',
  CONCLUSAO: 'Conclusão',
}

function renderContent(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}

export function TaskDetailClient({ id }: { id: string }) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyses, setAnalyses] = useState<AgentResponse[]>([])
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then(r => r.json())
      .then(setTask)
      .finally(() => setLoading(false))
  }, [id])

  async function updateStatus(status: string) {
    setUpdating(true)
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const updated = await fetch(`/api/tasks/${id}`).then(r => r.json())
    setTask(updated)
    setUpdating(false)
  }

  async function analyzeWithAI() {
    setAnalyzing(true)
    setAnalyses([])
    try {
      const res = await fetch(`/api/tasks/${id}/analyze`, { method: "POST" })
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

  const overdue = isOverdue(task.dueDate) && task.status !== 'CONCLUIDA' && task.status !== 'CANCELADA'

  return (
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
              : <Sparkles className="w-3.5 h-3.5" />
            }
            {analyzing ? "Analisando..." : "Analisar com IA"}
          </Button>
        </div>
      </div>

      {/* Card principal */}
      <Card className={cn(overdue && "border-red-200")}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <h1 className="text-xl font-bold text-slate-800 leading-snug">{task.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn("text-sm border rounded-full px-3 py-1 font-medium", PRIORITY_COLORS[task.priority])}>
                {PRIORITY_LABELS[task.priority]}
              </span>
              <span className={cn("text-sm border rounded-full px-3 py-1", STATUS_COLORS[task.status])}>
                {STATUS_LABELS[task.status]}
              </span>
            </div>
          </div>

          {overdue && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium">Esta tarefa está atrasada. Verifique o prazo imediatamente.</p>
            </div>
          )}

          {task.description && (
            <div className="mb-5">
              <p className="text-sm font-medium text-slate-500 mb-1">Descrição</p>
              <p className="text-slate-700">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {task.person && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Pessoa</p>
                  <p className="text-sm text-slate-700">{task.person}</p>
                </div>
              </div>
            )}
            {task.origin && (
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Origem</p>
                  <p className="text-sm text-slate-700">{task.origin}</p>
                </div>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-start gap-2">
                <Calendar className={cn("w-4 h-4 mt-0.5 shrink-0", overdue ? "text-red-400" : "text-slate-400")} />
                <div>
                  <p className="text-xs text-slate-400">Prazo</p>
                  <p className={cn("text-sm font-medium", overdue ? "text-red-600" : "text-slate-700")}>
                    {formatDate(task.dueDate)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Criada em</p>
                <p className="text-sm text-slate-700">{formatDate(task.createdAt)}</p>
              </div>
            </div>
          </div>

          {task.observations && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-medium text-amber-700 mb-1">Observações</p>
              <p className="text-sm text-amber-800">{task.observations}</p>
            </div>
          )}

          {/* Ações rápidas de status */}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 flex-wrap">
            <span className="text-xs text-slate-500 font-medium mr-1">Alterar status:</span>
            {Object.entries(STATUS_LABELS).filter(([k]) => k !== task.status).map(([k, v]) => (
              <button
                key={k}
                onClick={() => updateStatus(k)}
                disabled={updating}
                className={cn(
                  "text-xs border rounded-full px-3 py-1.5 font-medium transition-all hover:shadow-sm disabled:opacity-50",
                  STATUS_COLORS[k]
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Aviso de IA não configurada */}
      {aiConfigured === false && analyses.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">A integração com IA ainda não foi configurada.</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Para ativar análises reais, adicione sua chave no arquivo <code className="bg-amber-100 px-1 rounded">.env</code>:
              {' '}<code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY=sk-...</code>
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

      {/* Histórico */}
      {task.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Histórico da Tarefa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {task.history.map((h) => (
                <div key={h.id} className="px-5 py-3 flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-700">
                        {ACTION_LABELS[h.action] || h.action}
                      </p>
                      <p className="text-xs text-slate-400 shrink-0">{formatDateTime(h.createdAt)}</p>
                    </div>
                    {h.description && h.description !== 'Tarefa criada' && (
                      <p className="text-xs text-slate-500 mt-0.5">{h.description}</p>
                    )}
                    {h.oldValue && h.newValue && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="line-through">{h.oldValue}</span>
                        {' → '}
                        <span className="text-blue-600">{h.newValue}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
