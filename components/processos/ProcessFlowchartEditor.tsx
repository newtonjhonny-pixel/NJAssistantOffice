"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, ArrowLeft, ArrowLeftRight, Copy, GitBranch } from "lucide-react"
import { BpmnEditor, Handoff } from "@/components/gestao-equipe/procedimentos/BpmnEditor"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProcessFlowchartRecord {
  id: string
  processId: string
  type: string
  name: string
  description: string | null
  version: string | null
  status: string
  content: string | null
  updatedAt: string
  createdAt: string
}

interface Props {
  flowchartId: string
  processId: string
  onBack: () => void
  onDuplicated?: (newFlowchart: ProcessFlowchartRecord) => void
}

// Mapeia type → mode do BpmnEditor
function typeToMode(type: string): "asis" | "tobe" {
  return type === "TO_BE" ? "tobe" : "asis"
}

const TYPE_LABELS: Record<string, string> = {
  OPERACIONAL: "Operacional",
  BPMN: "BPMN",
  AS_IS: "AS-IS",
  TO_BE: "TO-BE",
  SIMPLIFICADO: "Simplificado",
}
const TYPE_COLORS: Record<string, string> = {
  OPERACIONAL: "bg-blue-100 text-blue-700",
  BPMN: "bg-violet-100 text-violet-700",
  AS_IS: "bg-amber-100 text-amber-700",
  TO_BE: "bg-emerald-100 text-emerald-700",
  SIMPLIFICADO: "bg-slate-100 text-slate-600",
}
const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_REVISAO: "Em revisão",
  APROVADO: "Aprovado",
  ARQUIVADO: "Arquivado",
}
const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: "bg-slate-100 text-slate-500",
  EM_REVISAO: "bg-amber-100 text-amber-700",
  APROVADO: "bg-emerald-100 text-emerald-700",
  ARQUIVADO: "bg-red-100 text-red-600",
}

// ─── Painel de handoffs ───────────────────────────────────────────────────────

function HandoffsPanel({ handoffs }: { handoffs: Handoff[] }) {
  if (handoffs.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <ArrowLeftRight className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">Nenhuma transferência detectada.</p>
        <p className="text-xs mt-1">Atribua nós a raias diferentes para detectar handoffs.</p>
      </div>
    )
  return (
    <div className="p-4 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Transferências de responsabilidade ({handoffs.length})
      </p>
      {handoffs.map((h, i) => (
        <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <div className="text-[11px]">
            <span className="font-medium text-slate-800">{h.fromLabel}</span>
            <span className="text-slate-500"> ({h.fromLane}) → </span>
            <span className="font-medium text-slate-800">{h.toLabel}</span>
            <span className="text-slate-500"> ({h.toLane})</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Editor principal ─────────────────────────────────────────────────────────

type EditorTab = "diagrama" | "handoffs"

export function ProcessFlowchartEditor({ flowchartId, processId, onBack, onDuplicated }: Props) {
  const [flowchart, setFlowchart] = useState<ProcessFlowchartRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<EditorTab>("diagrama")
  const [handoffs, setHandoffs] = useState<Handoff[]>([])
  const [duplicating, setDuplicating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/processes/${processId}/flowcharts/${flowchartId}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setFlowchart)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [processId, flowchartId])

  const saveContent = useCallback(async (content: string) => {
    const r = await fetch(`/api/processes/${processId}/flowcharts/${flowchartId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (!r.ok) throw new Error(`Erro ao salvar: HTTP ${r.status}`)
    const saved = await r.json()
    setFlowchart(saved)
  }, [processId, flowchartId])

  const handleDuplicate = useCallback(async () => {
    if (!flowchart) return
    const isAsIs = flowchart.type === "AS_IS"
    const confirm = window.confirm(
      isAsIs
        ? `Duplicar "${flowchart.name}" como TO-BE?\n\nUma cópia será criada com o mesmo conteúdo e tipo TO-BE.`
        : `Criar uma cópia de "${flowchart.name}"?`
    )
    if (!confirm) return
    setDuplicating(true)
    try {
      const r = await fetch(`/api/processes/${processId}/flowcharts/${flowchartId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const novo = await r.json()
      onDuplicated?.(novo)
    } catch (e: any) {
      alert(`Erro ao duplicar: ${e.message}`)
    } finally {
      setDuplicating(false)
    }
  }, [flowchart, flowchartId, processId, onDuplicated])

  if (loading)
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm animate-pulse">
        Carregando fluxograma…
      </div>
    )

  if (error || !flowchart)
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-lg text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error ?? "Fluxograma não encontrado."}
      </div>
    )

  const tabs: { id: EditorTab; label: string }[] = [
    { id: "diagrama", label: "Editor BPMN" },
    { id: "handoffs", label: `Transferências${handoffs.length ? ` (${handoffs.length})` : ""}` },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <GitBranch className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-slate-800">{flowchart.name}</span>
        <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium", TYPE_COLORS[flowchart.type] ?? "bg-slate-100 text-slate-600")}>
          {TYPE_LABELS[flowchart.type] ?? flowchart.type}
        </span>
        <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[flowchart.status] ?? "bg-slate-100 text-slate-500")}>
          {STATUS_LABELS[flowchart.status] ?? flowchart.status}
        </span>
        {flowchart.version && (
          <span className="text-xs text-slate-400">v{flowchart.version}</span>
        )}
      </div>

      {/* Tab strip */}
      <div className="flex items-center border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
        {/* Duplicar AS-IS → TO-BE */}
        <div className="ml-auto pb-1 pr-1">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-40 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {duplicating
              ? "Duplicando…"
              : flowchart.type === "AS_IS"
                ? "Duplicar AS-IS → TO-BE"
                : "Duplicar"}
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {tab === "diagrama" && (
        <BpmnEditor
          mode={typeToMode(flowchart.type)}
          initialContent={flowchart.content}
          title={`${TYPE_LABELS[flowchart.type] ?? flowchart.type} — ${flowchart.name}`}
          onSave={saveContent}
          containerRef={containerRef}
          onHandoffsChange={setHandoffs}
        />
      )}
      {tab === "handoffs" && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <HandoffsPanel handoffs={handoffs} />
        </div>
      )}
    </div>
  )
}
