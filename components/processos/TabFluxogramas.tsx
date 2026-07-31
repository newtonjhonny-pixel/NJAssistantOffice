"use client"

import { useCallback, useEffect, useState } from "react"
import {
  GitBranch, ArrowLeft, FileText, CheckSquare, ClipboardList,
  Shield, BookOpen, BookMarked, AlertTriangle, ScrollText,
  ArrowLeftRight, ChevronRight, Loader2, Link2, LayoutPanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FluxoProcessoTab } from "@/components/gestao-equipe/procedimentos/FluxoProcessoTab"
import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { BpmnNode } from "@/components/gestao-equipe/procedimentos/BpmnNode"
import { BpmnLane } from "@/components/gestao-equipe/procedimentos/BpmnLane"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ProcessRecord {
  id: string
  code: string | null
  name: string
  department: string | null
  category: string | null
}

interface LinkedDoc {
  id: string
  type: string
  title: string
  process: string | null
  department: string | null
  flowCount: number | string
  updatedAt: string
}

interface FlowData {
  id: string
  type: "AS_IS" | "TO_BE"
  content: string
  updatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ElementType> = {
  POP: ClipboardList, IT: FileText, CHECKLIST: CheckSquare,
  POLITICA: Shield, NORMA: BookOpen, MANUAL: BookMarked,
  CONTINGENCIA: AlertTriangle, TERMO: ScrollText,
}
const TYPE_COLORS: Record<string, string> = {
  POP: "bg-blue-100 text-blue-700", IT: "bg-violet-100 text-violet-700",
  CHECKLIST: "bg-emerald-100 text-emerald-700", POLITICA: "bg-red-100 text-red-700",
  NORMA: "bg-amber-100 text-amber-700", MANUAL: "bg-cyan-100 text-cyan-700",
  CONTINGENCIA: "bg-orange-100 text-orange-700", TERMO: "bg-slate-100 text-slate-700",
}
const TYPE_LABELS: Record<string, string> = {
  POP: "POP", IT: "IT", CHECKLIST: "Checklist",
  POLITICA: "Política", NORMA: "Norma", MANUAL: "Manual",
  CONTINGENCIA: "Contingência", TERMO: "Termo",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ─── Comparação Side-by-Side ──────────────────────────────────────────────────

function CompareView({ docId, docTitle }: { docId: string; docTitle: string }) {
  const [asIs, setAsIs] = useState<FlowData | null>(null)
  const [toBe, setToBe] = useState<FlowData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/procedures/${docId}/flow?type=AS_IS`).then(r => r.ok ? r.json() : null),
      fetch(`/api/procedures/${docId}/flow?type=TO_BE`).then(r => r.ok ? r.json() : null),
    ]).then(([a, t]) => { setAsIs(a); setToBe(t) }).finally(() => setLoading(false))
  }, [docId])

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>

  const hasAsIs = asIs && asIs.content && asIs.content !== '{"nodes":[],"edges":[]}'
  const hasToBe = toBe && toBe.content && toBe.content !== '{"nodes":[],"edges":[]}'

  if (!hasAsIs && !hasToBe) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <GitBranch className="w-10 h-10 mb-3 opacity-30" />
        <p className="font-medium text-slate-600">Nenhum fluxo registrado</p>
        <p className="text-sm mt-1">Acesse a aba de edição para criar os diagramas AS-IS e TO-BE.</p>
      </div>
    )
  }

  const NODE_TYPES = { bpmnNode: BpmnNode, bpmnLane: BpmnLane }

  const parseFlow = (f: FlowData | null) => {
    if (!f?.content) return { nodes: [], edges: [] }
    try { return JSON.parse(f.content) } catch { return { nodes: [], edges: [] } }
  }

  const asIsFlow = parseFlow(asIs)
  const toBeFlow = parseFlow(toBe)

  const FlowPanel = ({ flow, label, accent, empty }: {
    flow: { nodes: unknown[]; edges: unknown[] }
    label: string
    accent: string
    empty: boolean
  }) => (
    <div className={cn("rounded-xl border overflow-hidden", accent === "amber" ? "border-slate-200" : "border-blue-200")}>
      <div className={cn("px-4 py-2 flex items-center gap-2 border-b", accent === "amber" ? "bg-slate-50 border-slate-200" : "bg-blue-50 border-blue-200")}>
        <span className={cn("w-2 h-2 rounded-full", accent === "amber" ? "bg-amber-400" : "bg-blue-500")} />
        <span className={cn("text-xs font-semibold", accent === "amber" ? "text-slate-600" : "text-blue-700")}>{label}</span>
        {empty && <span className={cn("ml-auto text-xs", accent === "amber" ? "text-slate-400" : "text-blue-400")}>Não registrado</span>}
      </div>
      {!empty ? (
        <div style={{ height: 380 }}>
          <ReactFlow
            nodes={flow.nodes as never[]}
            edges={flow.edges as never[]}
            nodeTypes={NODE_TYPES}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={3} zoomable pannable style={{ height: 80 }} />
          </ReactFlow>
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-slate-200">
          <GitBranch className="w-8 h-8" />
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Comparação AS-IS × TO-BE — {docTitle}
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FlowPanel flow={asIsFlow} label="AS-IS — Processo Atual"   accent="amber" empty={!hasAsIs} />
        <FlowPanel flow={toBeFlow} label="TO-BE — Processo Futuro"  accent="blue"  empty={!hasToBe} />
      </div>
    </div>
  )
}

// ─── DocView ─────────────────────────────────────────────────────────────────

type DocViewTab = "editor" | "comparar"

function DocView({ doc, onBack }: { doc: LinkedDoc; onBack: () => void }) {
  const [tab, setTab] = useState<DocViewTab>("editor")

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          {(() => { const Icon = TYPE_ICONS[doc.type] ?? FileText; return <Icon className="w-4 h-4 text-blue-600" /> })()}
          <span className="font-semibold text-slate-800">{doc.title}</span>
          <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium", TYPE_COLORS[doc.type] ?? "bg-slate-100 text-slate-600")}>
            {TYPE_LABELS[doc.type] ?? doc.type}
          </span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        {([
          { id: "editor"  as DocViewTab, label: "Editor BPMN",  icon: GitBranch },
          { id: "comparar" as DocViewTab, label: "Comparar AS-IS × TO-BE", icon: LayoutPanelLeft },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === "editor"  && <FluxoProcessoTab docId={doc.id} procedureTitle={doc.title} />}
      {tab === "comparar" && <CompareView docId={doc.id} docTitle={doc.title} />}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TabFluxogramas() {
  const [processes, setProcesses] = useState<ProcessRecord[]>([])
  const [selected,  setSelected]  = useState<string>("")
  const [docs,      setDocs]      = useState<LinkedDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [openDoc,   setOpenDoc]   = useState<LinkedDoc | null>(null)
  const [loadingProc, setLoadingProc] = useState(true)

  useEffect(() => {
    fetch("/api/processes")
      .then(r => r.json())
      .then(setProcesses)
      .catch(() => {})
      .finally(() => setLoadingProc(false))
  }, [])

  const loadDocs = useCallback(async (pid: string) => {
    if (!pid) { setDocs([]); return }
    setLoadingDocs(true)
    try {
      const rows = await fetch(`/api/processes/${pid}/documents`).then(r => r.json())
      setDocs(Array.isArray(rows) ? rows : [])
    } catch { setDocs([]) }
    finally { setLoadingDocs(false) }
  }, [])

  function handleSelect(pid: string) {
    setSelected(pid)
    setOpenDoc(null)
    loadDocs(pid)
  }

  const selectedProcess = processes.find(p => p.id === selected)

  if (openDoc) return <DocView doc={openDoc} onBack={() => setOpenDoc(null)} />

  return (
    <div className="space-y-5">
      {/* Seletor de processo */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 shrink-0">
          <GitBranch className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Processo:</span>
        </div>
        {loadingProc ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : processes.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum processo cadastrado. Crie em <strong>Cadastro de Processos</strong>.</p>
        ) : (
          <select
            value={selected}
            onChange={e => handleSelect(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
          >
            <option value="">Selecione um processo...</option>
            {processes.map(p => (
              <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ''}{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Documentos vinculados */}
      {selected && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Documentos vinculados a <span className="text-slate-700">{selectedProcess?.name}</span>
            </p>
            <p className="text-xs text-slate-400">
              Para vincular: abra um documento em Procedimentos → selecione este processo
            </p>
          </div>

          {loadingDocs ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <Link2 className="w-8 h-8 mb-2 opacity-30" />
              <p className="font-medium text-slate-500">Nenhum documento vinculado</p>
              <p className="text-sm mt-1">
                Abra um procedimento → seção "Processo Vinculado" → selecione <strong>{selectedProcess?.name}</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => {
                const Icon = TYPE_ICONS[doc.type] ?? FileText
                const hasFlows = Number(doc.flowCount) > 0
                return (
                  <button
                    key={doc.id}
                    onClick={() => setOpenDoc(doc)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-3 hover:shadow-md hover:border-blue-200 transition-all group text-left"
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", TYPE_COLORS[doc.type]?.split(' ')[0] ?? "bg-slate-100")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{doc.title}</span>
                        <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium shrink-0", TYPE_COLORS[doc.type] ?? "bg-slate-100 text-slate-600")}>
                          {TYPE_LABELS[doc.type] ?? doc.type}
                        </span>
                        {hasFlows ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium shrink-0">
                            {doc.flowCount} fluxo{Number(doc.flowCount) !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-400 rounded-full px-2 py-0.5 shrink-0">sem fluxo</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Atualizado {formatDate(doc.updatedAt)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Métricas de handoffs */}
          {docs.length > 0 && (
            <HandoffMetrics processId={selected} docs={docs} />
          )}
        </>
      )}
    </div>
  )
}

// ─── Métricas de Handoffs ─────────────────────────────────────────────────────

function HandoffMetrics({ processId, docs }: { processId: string; docs: LinkedDoc[] }) {
  const [metrics, setMetrics] = useState<{ docId: string; title: string; handoffs: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all(
      docs.map(async doc => {
        if (Number(doc.flowCount) === 0) return { docId: doc.id, title: doc.title, handoffs: 0 }
        try {
          const flow = await fetch(`/api/procedures/${doc.id}/flow?type=AS_IS`).then(r => r.ok ? r.json() : null)
          if (!flow?.content) return { docId: doc.id, title: doc.title, handoffs: 0 }
          const { nodes, edges } = JSON.parse(flow.content)
          // Conta edges entre nós de raias diferentes
          const laneOf: Record<string, string> = {}
          for (const n of nodes ?? []) {
            if (n.data?.laneId) laneOf[n.id] = n.data.laneId
          }
          let count = 0
          for (const e of edges ?? []) {
            if (laneOf[e.source] && laneOf[e.target] && laneOf[e.source] !== laneOf[e.target]) count++
          }
          return { docId: doc.id, title: doc.title, handoffs: count }
        } catch { return { docId: doc.id, title: doc.title, handoffs: 0 } }
      })
    ).then(results => {
      setMetrics(results.filter(r => r.handoffs > 0).sort((a, b) => b.handoffs - a.handoffs))
    }).finally(() => setLoading(false))
  }, [processId, docs])

  const total = metrics.reduce((s, m) => s + m.handoffs, 0)
  if (loading) return null
  if (total === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800">
          Métricas de Handoffs — {total} transferência{total !== 1 ? 's' : ''} no processo
        </p>
      </div>
      <div className="space-y-1.5">
        {metrics.map(m => (
          <div key={m.docId} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-800 truncate">{m.title}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-1.5 rounded-full bg-amber-200 w-24 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, (m.handoffs / Math.max(...metrics.map(x => x.handoffs))) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-amber-700 w-4 text-right">{m.handoffs}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
