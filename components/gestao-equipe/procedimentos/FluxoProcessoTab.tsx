"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Copy, AlertCircle, ArrowLeftRight } from "lucide-react"
import { BpmnEditor, Handoff } from "./BpmnEditor"
import { cn } from "@/lib/utils"

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ProcedureFlow {
  id:        string
  type:      "AS_IS" | "TO_BE"
  content:   string
  updatedAt: string
}

interface ProcedureStep {
  title:       string
  responsible?: string
}

interface Props {
  docId:          string
  procedureTitle: string
  steps?:         ProcedureStep[]
}

type ActiveTab = "asis" | "tobe" | "handoffs"

// ── HandoffsPanel ──────────────────────────────────────────────────────────────

function HandoffsPanel({ handoffs }: { handoffs: Handoff[] }) {
  if (handoffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <ArrowLeftRight className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">Nenhuma transferência detectada.</p>
        <p className="text-xs mt-1">Atribua nós a raias diferentes para detectar handoffs.</p>
      </div>
    )
  }
  return (
    <div className="p-4 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Transferências de responsabilidade detectadas ({handoffs.length})
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

// ── Main component ─────────────────────────────────────────────────────────────

export function FluxoProcessoTab({ docId, procedureTitle, steps }: Props) {
  const [activeTab,     setActiveTab]     = useState<ActiveTab>("asis")
  const [asisContent,   setAsisContent]   = useState<string | null>(null)
  const [tobeContent,   setTobeContent]   = useState<string | null>(null)
  const [asisId,        setAsisId]        = useState<string | null>(null)
  const [tobeId,        setTobeId]        = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [handoffs,      setHandoffs]      = useState<Handoff[]>([])
  const [duplicating,   setDuplicating]   = useState(false)

  const asisRef = useRef<HTMLDivElement>(null)
  const tobeRef = useRef<HTMLDivElement>(null)

  // ── Load flows ─────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/procedures/${docId}/flow`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((flows: ProcedureFlow[]) => {
        const asis = flows.find(f => f.type === "AS_IS")
        const tobe = flows.find(f => f.type === "TO_BE")
        setAsisContent(asis?.content ?? null)
        setTobeContent(tobe?.content ?? null)
        setAsisId(asis?.id ?? null)
        setTobeId(tobe?.id ?? null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [docId])

  // ── Save ───────────────────────────────────────────────────────────────────

  const saveFlow = useCallback(async (type: "AS_IS" | "TO_BE", content: string) => {
    const r = await fetch(`/api/procedures/${docId}/flow`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type, content }),
    })
    if (!r.ok) throw new Error(`Erro ao salvar: HTTP ${r.status}`)
    const saved: ProcedureFlow = await r.json()
    if (type === "AS_IS") { setAsisId(saved.id); setAsisContent(content) }
    else                   { setTobeId(saved.id); setTobeContent(content) }
  }, [docId])

  // ── Duplicate AS-IS → TO-BE ────────────────────────────────────────────────

  const duplicateAsIs = useCallback(async () => {
    if (!asisContent) return
    setDuplicating(true)
    try { await saveFlow("TO_BE", asisContent) }
    finally { setDuplicating(false) }
  }, [asisContent, saveFlow])

  // ── UI ─────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Carregando fluxos…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-lg text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    )
  }

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "asis",     label: "AS-IS (Atual)"    },
    { id: "tobe",     label: "TO-BE (Futuro)"   },
    { id: "handoffs", label: `Transferências${handoffs.length ? ` (${handoffs.length})` : ""}` },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Tab strip + actions */}
      <div className="flex items-center justify-between">
        <div className="flex border-b border-slate-200 w-full">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === t.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center pb-1 pr-1">
            <button
              onClick={duplicateAsIs}
              disabled={!asisContent || duplicating}
              title="Duplicar AS-IS para TO-BE"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-40 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {duplicating ? "Copiando…" : "Duplicar AS-IS → TO-BE"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === "asis" && (
        <BpmnEditor
          mode="asis"
          initialContent={asisContent}
          title={`AS-IS — ${procedureTitle}`}
          onSave={c => saveFlow("AS_IS", c)}
          procedureSteps={steps}
          containerRef={asisRef}
          onHandoffsChange={setHandoffs}
        />
      )}

      {activeTab === "tobe" && (
        <BpmnEditor
          mode="tobe"
          initialContent={tobeContent}
          title={`TO-BE — ${procedureTitle}`}
          onSave={c => saveFlow("TO_BE", c)}
          procedureSteps={steps}
          containerRef={tobeRef}
          onHandoffsChange={setHandoffs}
        />
      )}

      {activeTab === "handoffs" && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <HandoffsPanel handoffs={handoffs} />
        </div>
      )}
    </div>
  )
}
