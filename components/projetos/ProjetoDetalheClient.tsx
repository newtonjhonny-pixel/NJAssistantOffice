"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, FolderKanban, Pencil, Trash2, Plus, CheckCircle2,
  AlertTriangle, Calendar, Users, Layers, ListChecks, Flag,
  History, TrendingUp, XCircle, Clock, ChevronDown,
  ChevronUp, Bot, BarChart2, Circle,
} from "lucide-react"
import { cn, formatDate, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/utils"
import { NovoProjetoModal } from "./NovoProjetoModal"
import { ProjetoIAModal } from "./ProjetoIAModal"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProjectTask {
  id: string; title: string; description: string | null; responsible: string | null
  startDate: string | null; dueDate: string | null
  status: string; priority: string; progress: number; notes: string | null
  stageId: string | null; createdAt: string
}

interface ProjectStage {
  id: string; name: string; description: string | null; order: number
  startDate: string | null; dueDate: string | null
  status: string; progress: number; notes: string | null; createdAt: string
  tasks: ProjectTask[]
}

interface ProjectMilestone {
  id: string; title: string; description: string | null
  dueDate: string | null; completedAt: string | null; status: string; createdAt: string
}

interface ProjectHistoryItem {
  id: string; type: string; title: string; description: string | null; createdAt: string
}

interface ProjectDetail {
  id: string; name: string; description: string | null; objective: string | null
  responsible: string | null; startDate: string | null; dueDate: string | null
  priority: string; status: string; progress: number; notes: string | null
  isOverdue: boolean; totalDays: number | null; elapsedDays: number | null
  remainDays: number | null; totalTasks: number; doneTasks: number
  stages: ProjectStage[]; tasks: ProjectTask[]
  milestones: ProjectMilestone[]; history: ProjectHistoryItem[]
}

// ─── Status configs ─────────────────────────────────────────────────────────────

const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  PLANEJADO:    { label: "Planejado",    color: "bg-slate-100 text-slate-600 border-slate-200" },
  EM_ANDAMENTO: { label: "Em andamento", color: "bg-blue-50 text-blue-700 border-blue-200" },
  PAUSADO:      { label: "Pausado",      color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ATRASADO:     { label: "Atrasado",     color: "bg-orange-50 text-orange-700 border-orange-200" },
  CONCLUIDO:    { label: "Concluído",    color: "bg-green-50 text-green-700 border-green-200" },
  CANCELADO:    { label: "Cancelado",    color: "bg-red-50 text-red-600 border-red-200" },
}

const STAGE_STATUS: Record<string, { label: string; color: string }> = {
  NAO_INICIADA: { label: "Não iniciada", color: "bg-slate-100 text-slate-600 border-slate-200" },
  EM_ANDAMENTO: { label: "Em andamento", color: "bg-blue-50 text-blue-700 border-blue-200" },
  AGUARDANDO:   { label: "Aguardando",   color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  CONCLUIDA:    { label: "Concluída",    color: "bg-green-50 text-green-700 border-green-200" },
  ATRASADA:     { label: "Atrasada",     color: "bg-orange-50 text-orange-700 border-orange-200" },
  CANCELADA:    { label: "Cancelada",    color: "bg-red-50 text-red-600 border-red-200" },
}

const TASK_STATUS: Record<string, { label: string; color: string }> = {
  PENDENTE:           { label: "Pendente",           color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  EM_ANDAMENTO:       { label: "Em andamento",       color: "bg-blue-50 text-blue-700 border-blue-200" },
  AGUARDANDO_RETORNO: { label: "Aguardando retorno", color: "bg-purple-50 text-purple-700 border-purple-200" },
  CONCLUIDA:          { label: "Concluída",          color: "bg-green-50 text-green-700 border-green-200" },
  CANCELADA:          { label: "Cancelada",          color: "bg-red-50 text-red-600 border-red-200" },
  ATRASADA:           { label: "Atrasada",           color: "bg-orange-50 text-orange-700 border-orange-200" },
}

// "Marcos" renamed to "Entregas" in the UI; status CUMPRIDO → CONCLUIDA label
const ENTREGA_STATUS: Record<string, { label: string; color: string }> = {
  PENDENTE:  { label: "Pendente",   color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  CONCLUIDA: { label: "Concluída",  color: "bg-green-50 text-green-700 border-green-200" },
  ATRASADA:  { label: "Atrasada",   color: "bg-orange-50 text-orange-700 border-orange-200" },
  CANCELADA: { label: "Cancelada",  color: "bg-red-50 text-red-600 border-red-200" },
}

const HISTORY_ICONS: Record<string, React.ReactNode> = {
  CRIACAO:          <FolderKanban className="w-3.5 h-3.5" />,
  STATUS:           <TrendingUp className="w-3.5 h-3.5" />,
  PRAZO:            <Calendar className="w-3.5 h-3.5" />,
  ETAPA_CRIADA:     <Layers className="w-3.5 h-3.5" />,
  ETAPA_CONCLUIDA:  <CheckCircle2 className="w-3.5 h-3.5" />,
  TAREFA_CRIADA:    <ListChecks className="w-3.5 h-3.5" />,
  TAREFA_CONCLUIDA: <CheckCircle2 className="w-3.5 h-3.5" />,
  MARCO_CRIADO:     <Flag className="w-3.5 h-3.5" />,
  MARCO_CUMPRIDO:   <Flag className="w-3.5 h-3.5" />,
  EDICAO:           <Pencil className="w-3.5 h-3.5" />,
  IA_ANALISE:       <Bot className="w-3.5 h-3.5" />,
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; color: string }> }) {
  const cfg = map[status] ?? { label: status, color: "bg-slate-100 text-slate-600 border-slate-200" }
  return <span className={cn("inline-flex items-center text-xs border rounded-full px-2.5 py-0.5 font-medium", cfg.color)}>{cfg.label}</span>
}

function ProgressBar({ value, h = "h-2" }: { value: number; h?: string }) {
  return (
    <div className={cn("bg-slate-100 rounded-full overflow-hidden", h)}>
      <div
        className={cn("h-full rounded-full transition-all", value >= 100 ? "bg-green-500" : value > 0 ? "bg-indigo-500" : "bg-slate-200")}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

// ─── Task quick-edit row ─────────────────────────────────────────────────────────

function TaskRow({ task, onUpdate }: { task: ProjectTask; onUpdate: () => void }) {
  const cfg    = TASK_STATUS[task.status] ?? { label: task.status, color: "" }
  const isLate = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "CONCLUIDA" && task.status !== "CANCELADA"

  async function toggleDone() {
    const newStatus = task.status === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA"
    await fetch(`/api/projects/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    onUpdate()
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 group">
      <button onClick={toggleDone} className="shrink-0 text-slate-300 hover:text-indigo-500 transition-colors">
        {task.status === "CONCLUIDA"
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <Circle className="w-4 h-4" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", task.status === "CONCLUIDA" && "line-through text-slate-400")}>
          {task.title}
        </p>
        {task.dueDate && (
          <p className={cn("text-xs", isLate ? "text-orange-600" : "text-slate-400")}>
            {isLate && <AlertTriangle className="inline w-2.5 h-2.5 mr-0.5" />}
            até {formatDate(task.dueDate)}
            {task.responsible && ` · ${task.responsible}`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-xs border rounded-full px-2 py-0.5", PRIORITY_COLORS[task.priority])}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        <select
          value={task.status}
          onChange={async e => {
            await fetch(`/api/projects/tasks/${task.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: e.target.value }),
            })
            onUpdate()
          }}
          className={cn("text-xs border rounded-full px-2 py-0.5 font-medium cursor-pointer focus:outline-none", cfg.color)}
          onClick={e => e.stopPropagation()}
        >
          {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

type Tab = "geral" | "etapas" | "tarefas" | "cronograma" | "entregas" | "historico"

export function ProjetoDetalheClient({ id }: { id: string }) {
  const [project,       setProject]       = useState<ProjectDetail | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [tab,           setTab]           = useState<Tab>("geral")
  const [showEdit,      setShowEdit]      = useState(false)
  const [showIAModal,   setShowIAModal]   = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [showStageForm, setShowStageForm] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})
  const [showEntregaForm, setShowEntregaForm] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(data => { setProject(data); setLoading(false) })
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-40 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-20 text-slate-400">
        <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-25" />
        <p className="font-medium">Projeto não encontrado</p>
        <Link href="/projetos" className="text-indigo-600 text-sm mt-2 inline-block">← Voltar para Projetos</Link>
      </div>
    )
  }

  const pStatus = PROJECT_STATUS[project.status] ?? { label: project.status, color: "" }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "geral",      label: "Visão Geral", icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { key: "etapas",     label: "Etapas",      icon: <Layers className="w-3.5 h-3.5" /> },
    { key: "tarefas",    label: "Tarefas",     icon: <ListChecks className="w-3.5 h-3.5" /> },
    { key: "cronograma", label: "Cronograma",  icon: <Calendar className="w-3.5 h-3.5" /> },
    { key: "entregas",   label: "Entregas",    icon: <Flag className="w-3.5 h-3.5" /> },
    { key: "historico",  label: "Histórico",   icon: <History className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/projetos" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Projetos
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shrink-0">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{project.name}</h1>
              {project.responsible && (
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {project.responsible}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 px-3 py-2 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          <button
            onClick={async () => {
              if (!confirm("Deseja excluir este projeto? Esta ação não pode ser desfeita.")) return
              setDeleting(true)
              await fetch(`/api/projects/${id}`, { method: "DELETE" })
              window.location.href = "/projetos"
            }}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Status + priority badges */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("inline-flex items-center text-xs border rounded-full px-2.5 py-0.5 font-medium", pStatus.color)}>
          {pStatus.label}
        </span>
        <span className={cn("text-xs border rounded-full px-2.5 py-0.5 font-medium", PRIORITY_COLORS[project.priority])}>
          {PRIORITY_LABELS[project.priority]}
        </span>
        {(project.isOverdue || project.status === "ATRASADO") && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-0.5">
            <AlertTriangle className="w-3 h-3" /> Atrasado
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Progresso geral</span>
          <span className="text-2xl font-bold text-indigo-600">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} h="h-3" />
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
          <span>{project.doneTasks} de {project.totalTasks} tarefas concluídas</span>
          {project.totalDays !== null && <span>{project.totalDays} dias totais</span>}
          {project.elapsedDays !== null && project.elapsedDays > 0 && <span>{project.elapsedDays} dias decorridos</span>}
          {project.remainDays !== null && (
            <span className={project.remainDays < 0 ? "text-orange-600 font-medium" : ""}>
              {project.remainDays < 0
                ? `${Math.abs(project.remainDays)} dia(s) de atraso`
                : `${project.remainDays} dia(s) restantes`}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-4 py-2.5 border-b-2 whitespace-nowrap transition-all",
              tab === t.key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── VISÃO GERAL ── */}
      {tab === "geral" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Início",    value: formatDate(project.startDate) },
              { label: "Prazo",     value: formatDate(project.dueDate) },
              { label: "Etapas",    value: `${project.stages.filter(s => s.status === "CONCLUIDA").length}/${project.stages.length}` },
              { label: "Tarefas",   value: `${project.doneTasks}/${project.totalTasks}` },
            ].map(item => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>

          {project.description && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-medium text-slate-500 mb-1">Descrição</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {project.objective && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-medium text-slate-500 mb-1">Objetivo</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{project.objective}</p>
            </div>
          )}

          {project.notes && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-medium text-slate-500 mb-1">Observações</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}

          <button
            onClick={() => setShowIAModal(true)}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl py-3 transition-all"
          >
            <Bot className="w-4 h-4" /> Analisar projeto com IA
          </button>
        </div>
      )}

      {/* ── ETAPAS ── */}
      {tab === "etapas" && (
        <div className="space-y-3">
          {project.stages.length === 0 && !showStageForm && (
            <div className="text-center py-12 text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-25" />
              <p className="text-sm">Nenhuma etapa cadastrada.</p>
            </div>
          )}

          {project.stages.map((stage, idx) => {
            const isExpanded    = expandedStages[stage.id] !== false
            const stageTasks    = stage.tasks
            const doneCount     = stageTasks.filter(t => t.status === "CONCLUIDA").length
            const stageProgress = stageTasks.length > 0
              ? Math.round((doneCount / stageTasks.length) * 100)
              : stage.progress

            return (
              <div key={stage.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800">{stage.name}</p>
                      <StatusBadge status={stage.status} map={STAGE_STATUS} />
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={stageProgress} h="h-1.5" />
                      <span className="text-xs text-slate-500 shrink-0">{stageProgress}%</span>
                    </div>
                    {(stage.startDate || stage.dueDate) && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(stage.startDate)} → {formatDate(stage.dueDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={stage.status}
                      onChange={async e => {
                        await fetch(`/api/projects/${id}/stages/${stage.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: e.target.value }),
                        })
                        load()
                      }}
                      className={cn(
                        "text-xs border rounded-full px-2 py-0.5 font-medium cursor-pointer focus:outline-none",
                        STAGE_STATUS[stage.status]?.color ?? "bg-slate-100 text-slate-600 border-slate-200",
                      )}
                      onClick={e => e.stopPropagation()}
                    >
                      {Object.entries(STAGE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <button
                      onClick={() => setExpandedStages(prev => ({ ...prev, [stage.id]: !isExpanded }))}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {stageTasks.length > 0
                      ? <div className="divide-y divide-slate-50 px-1 py-1">
                          {stageTasks.map(task => (
                            <TaskRow key={task.id} task={task} onUpdate={load} />
                          ))}
                        </div>
                      : <p className="text-xs text-slate-400 px-4 py-3">Nenhuma tarefa nesta etapa.</p>
                    }
                    <AddTaskInline stageId={stage.id} projectId={id} onSaved={load} />
                  </div>
                )}
              </div>
            )
          })}

          {showStageForm ? (
            <AddStageForm
              projectId={id}
              stageCount={project.stages.length}
              onSaved={() => { setShowStageForm(false); load() }}
              onCancel={() => setShowStageForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowStageForm(true)}
              className="w-full flex items-center justify-center gap-2 text-sm text-indigo-600 border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl py-3 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar etapa
            </button>
          )}
        </div>
      )}

      {/* ── TAREFAS ── */}
      {tab === "tarefas" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{project.doneTasks} de {project.totalTasks} tarefas concluídas</p>
          {project.tasks.length === 0
            ? <p className="text-sm text-slate-400 py-8 text-center">Nenhuma tarefa cadastrada. Adicione tarefas nas etapas.</p>
            : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 px-1 py-1">
                {project.tasks.map(task => (
                  <TaskRow key={task.id} task={task} onUpdate={load} />
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── CRONOGRAMA ── */}
      {tab === "cronograma" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 mb-3">Visualização das etapas no tempo</p>
          {project.stages.length === 0
            ? <p className="text-sm text-slate-400 py-8 text-center">Nenhuma etapa para exibir.</p>
            : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {project.stages.map((stage, idx) => {
                  const sTotal = stage.tasks.length
                  const sDone  = stage.tasks.filter(t => t.status === "CONCLUIDA").length
                  const sProg  = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : stage.progress
                  const isLate = stage.dueDate
                    && new Date(stage.dueDate) < new Date()
                    && stage.status !== "CONCLUIDA"
                    && stage.status !== "CANCELADA"

                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 border-b border-slate-50 last:border-b-0",
                        idx % 2 === 1 && "bg-slate-50/50",
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{stage.name}</p>
                        <p className="text-xs text-slate-400">
                          {formatDate(stage.startDate) !== "-" ? formatDate(stage.startDate) : "—"}
                          {" → "}
                          {formatDate(stage.dueDate) !== "-" ? formatDate(stage.dueDate) : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {isLate && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" aria-label="Atrasada" />}
                        <StatusBadge status={stage.status} map={STAGE_STATUS} />
                        <div className="w-24">
                          <span className="text-[10px] text-slate-400">{sProg}%</span>
                          <ProgressBar value={sProg} h="h-1.5" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      )}

      {/* ── ENTREGAS ── (antigo Marcos) */}
      {tab === "entregas" && (
        <div className="space-y-3">
          {project.milestones.length === 0 && !showEntregaForm && (
            <div className="text-center py-12 text-slate-400">
              <Flag className="w-10 h-10 mx-auto mb-2 opacity-25" />
              <p className="text-sm">Nenhuma entrega cadastrada.</p>
            </div>
          )}

          {project.milestones.map(m => {
            const isLate = m.dueDate && new Date(m.dueDate) < new Date() && m.status === "PENDENTE"
            const mCfg   = ENTREGA_STATUS[m.status] ?? { label: m.status, color: "bg-slate-100 text-slate-600 border-slate-200" }

            return (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                    m.status === "CONCLUIDA" ? "bg-green-50 text-green-600" : "bg-indigo-50 text-indigo-600",
                  )}>
                    <Flag className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{m.title}</p>
                      <span className={cn("text-xs border rounded-full px-2 py-0.5 font-medium", mCfg.color)}>
                        {mCfg.label}
                      </span>
                      {isLate && (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 font-medium">
                          <AlertTriangle className="w-2.5 h-2.5" /> Atrasada
                        </span>
                      )}
                    </div>

                    {/* Dates row */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-1">
                      {m.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-400">Prevista:</span> {formatDate(m.dueDate)}
                        </span>
                      )}
                      {m.completedAt && (
                        <span className="flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Realizada:</span> {formatDate(m.completedAt)}
                        </span>
                      )}
                    </div>

                    {m.description && (
                      <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded px-2 py-1 border border-slate-100">
                        <span className="font-medium text-slate-400">Obs.: </span>{m.description}
                      </p>
                    )}
                  </div>

                  <select
                    value={m.status}
                    onChange={async e => {
                      const newStatus = e.target.value
                      await fetch(`/api/projects/milestones/${m.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          status: newStatus,
                          completedAt: newStatus === "CONCLUIDA" && !m.completedAt
                            ? new Date().toISOString()
                            : undefined,
                        }),
                      })
                      load()
                    }}
                    className={cn(
                      "text-xs border rounded-full px-2 py-0.5 font-medium cursor-pointer focus:outline-none shrink-0",
                      mCfg.color,
                    )}
                  >
                    {Object.entries(ENTREGA_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}

          {showEntregaForm ? (
            <AddEntregaForm
              projectId={id}
              onSaved={() => { setShowEntregaForm(false); load() }}
              onCancel={() => setShowEntregaForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowEntregaForm(true)}
              className="w-full flex items-center justify-center gap-2 text-sm text-indigo-600 border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl py-3 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar entrega
            </button>
          )}
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab === "historico" && (
        <div className="space-y-2">
          {project.history.length === 0
            ? <p className="text-sm text-slate-400 py-8 text-center">Nenhum evento registrado.</p>
            : (
              <div className="space-y-2">
                {project.history.map(h => (
                  <div key={h.id} className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                      {HISTORY_ICONS[h.type] ?? <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{h.title}</p>
                      {h.description && <p className="text-xs text-slate-400">{h.description}</p>}
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">{formatDate(h.createdAt)}</p>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <NovoProjetoModal
          editId={id}
          initial={{
            name:        project.name,
            description: project.description ?? "",
            objective:   project.objective   ?? "",
            responsible: project.responsible ?? "",
            startDate:   project.startDate   ? project.startDate.slice(0, 10)  : "",
            dueDate:     project.dueDate     ? project.dueDate.slice(0, 10)    : "",
            priority:    project.priority,
            status:      project.status,
            notes:       project.notes       ?? "",
          }}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load() }}
        />
      )}

      {showIAModal && (
        <ProjetoIAModal
          projectId={id}
          projectName={project.name}
          onClose={() => { setShowIAModal(false); load() }}
        />
      )}
    </div>
  )
}

// ─── Inline forms ─────────────────────────────────────────────────────────────

function AddStageForm({ projectId, stageCount, onSaved, onCancel }: {
  projectId: string; stageCount: number; onSaved: () => void; onCancel: () => void
}) {
  const [form, setForm] = useState({ name: "", startDate: "", dueDate: "", status: "NAO_INICIADA" })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await fetch(`/api/projects/${projectId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        order:     stageCount,
        startDate: form.startDate || null,
        dueDate:   form.dueDate   || null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <form onSubmit={submit} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-indigo-700">Nova etapa</p>
      <input
        autoFocus
        type="text"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Nome da etapa"
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none" />
        <input type="date" value={form.dueDate}   onChange={e => setForm(f => ({ ...f, dueDate:   e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50">
          {saving ? "Salvando…" : "Adicionar"}
        </button>
      </div>
    </form>
  )
}

function AddTaskInline({ stageId, projectId, onSaved }: {
  stageId: string; projectId: string; onSaved: () => void
}) {
  const [open,   setOpen]   = useState(false)
  const [title,  setTitle]  = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await fetch(`/api/projects/${projectId}/stages/${stageId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    setTitle("")
    setSaving(false)
    setOpen(false)
    onSaved()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50/50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Adicionar tarefa
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-3 py-2 bg-indigo-50/50 border-t border-indigo-100">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título da tarefa…"
        className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      <button type="submit" disabled={saving} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
        {saving ? "…" : "Adicionar"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
        <XCircle className="w-4 h-4" />
      </button>
    </form>
  )
}

function AddEntregaForm({ projectId, onSaved, onCancel }: {
  projectId: string; onSaved: () => void; onCancel: () => void
}) {
  const [form, setForm] = useState({
    title:       "",
    description: "",
    dueDate:     "",
    completedAt: "",
    status:      "PENDENTE",
  })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dueDate:     form.dueDate     || null,
        completedAt: form.completedAt || null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <form onSubmit={submit} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-indigo-700">Nova entrega</p>

      <input
        autoFocus
        type="text"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="Título da entrega"
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-500 mb-1">Data prevista</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-1">Data realizada</label>
          <input
            type="date"
            value={form.completedAt}
            onChange={e => setForm(f => ({ ...f, completedAt: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-slate-500 mb-1">Status</label>
        <select
          value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none"
        >
          {Object.entries(ENTREGA_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <textarea
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Observação (opcional)"
        rows={2}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none resize-none"
      />

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50">
          {saving ? "Salvando…" : "Adicionar"}
        </button>
      </div>
    </form>
  )
}
