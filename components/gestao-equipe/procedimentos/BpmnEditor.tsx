"use client"

import React, { useCallback, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Connection,
  Edge,
  Node,
  MarkerType,
  NodeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { BpmnNode, BpmnNodeData, BpmnNodeModel, BpmnNodeType } from "./BpmnNode"
import { BpmnLane, BpmnLaneData, BpmnLaneModel } from "./BpmnLane"
import { BpmnEditorToolbar } from "./BpmnEditorToolbar"
import { BpmnNodeEditPanel } from "./BpmnNodeEditPanel"
import { exportDiagramToPdf, exportDiagramToPng, printDiagram } from "@/lib/diagramExport"

const NODE_TYPES: NodeTypes = {
  bpmnNode: BpmnNode,
  bpmnLane: BpmnLane,
}

const EDGE_STYLE = {
  type:      "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
  style:     { stroke: "#64748b", strokeWidth: 1.5 },
}

// ── Auto-layout BFS (top-down) ────────────────────────────────────────────────

function autoLayout(nodes: (BpmnNodeModel | BpmnLaneModel)[], edges: Edge[]) {
  const regular = nodes.filter(n => n.type !== "bpmnLane") as BpmnNodeModel[]
  const lanes   = nodes.filter(n => n.type === "bpmnLane") as BpmnLaneModel[]
  if (regular.length === 0) return nodes

  const hasParent = new Set(edges.map(e => e.target))
  const roots     = regular.filter(n => !hasParent.has(n.id))
  const positioned = new Map<string, { x: number; y: number }>()
  const NW = 180, NH = 80, GX = 40, GY = 60

  function place(ids: string[], depth: number, startX: number): number {
    let cursor = startX
    for (const id of ids) {
      const children = edges.filter(e => e.source === id).map(e => e.target)
      const subtree  = children.length > 0 ? place(children, depth + 1, cursor) - cursor : NW + GX
      positioned.set(id, { x: cursor + (subtree - NW) / 2, y: depth * (NH + GY) })
      cursor += subtree
    }
    return cursor
  }
  place(roots.map(n => n.id), 0, 60)

  let orphanX = 0
  const maxY = Math.max(...Array.from(positioned.values()).map(p => p.y), 0) + NH + GY * 2

  const layoutedRegular = regular.map(n => {
    const pos = positioned.get(n.id)
    if (pos) return { ...n, position: pos }
    const p = { x: orphanX, y: maxY }
    orphanX += NW + GX
    return { ...n, position: p }
  })
  return [...lanes, ...layoutedRegular]
}

// ── Handoff detection ─────────────────────────────────────────────────────────

export interface Handoff {
  edgeId: string
  fromLabel: string
  toLabel:   string
  fromLane:  string
  toLane:    string
}

function detectHandoffs(nodes: (BpmnNodeModel | BpmnLaneModel)[], edges: Edge[]): Handoff[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const handoffs: Handoff[] = []
  for (const e of edges) {
    const src = nodeMap.get(e.source)
    const tgt = nodeMap.get(e.target)
    if (!src || !tgt) continue
    const srcLane = (src.data as BpmnNodeData).laneId
    const tgtLane = (tgt.data as BpmnNodeData).laneId
    if (srcLane && tgtLane && srcLane !== tgtLane) {
      handoffs.push({
        edgeId:   e.id,
        fromLabel: (src.data as BpmnNodeData).label ?? src.id,
        toLabel:   (tgt.data as BpmnNodeData).label ?? tgt.id,
        fromLane:  srcLane,
        toLane:    tgtLane,
      })
    }
  }
  return handoffs
}

// ── Default seed ──────────────────────────────────────────────────────────────

function makeSeed(mode: "asis" | "tobe"): { nodes: BpmnNodeModel[]; edges: Edge[] } {
  const nodes: BpmnNodeModel[] = [
    { id: "b1", type: "bpmnNode", position: { x: 200, y: 40  }, data: { nodeType: "bpmn-start",   label: "Início"          } },
    { id: "b2", type: "bpmnNode", position: { x: 200, y: 160 }, data: { nodeType: "bpmn-task",    label: "Primeira Etapa"  } },
    { id: "b3", type: "bpmnNode", position: { x: 200, y: 280 }, data: { nodeType: "bpmn-gateway-exclusive", label: "Condição?" } },
    { id: "b4", type: "bpmnNode", position: { x: 100, y: 400 }, data: { nodeType: mode === "asis" ? "bpmn-task" : "bpmn-task-system", label: mode === "asis" ? "Retrabalho" : "Automatizado" } },
    { id: "b5", type: "bpmnNode", position: { x: 300, y: 400 }, data: { nodeType: "bpmn-approval", label: "Aprovação"       } },
    { id: "b6", type: "bpmnNode", position: { x: 200, y: 520 }, data: { nodeType: "bpmn-end",      label: "Fim"             } },
  ]
  const edges: Edge[] = [
    { id: "eb1-b2", source: "b1", target: "b2", ...EDGE_STYLE },
    { id: "eb2-b3", source: "b2", target: "b3", ...EDGE_STYLE },
    { id: "eb3-b4", source: "b3", target: "b4", ...EDGE_STYLE, label: "Não" },
    { id: "eb3-b5", source: "b3", target: "b5", ...EDGE_STYLE, label: "Sim" },
    { id: "eb4-b2", source: "b4", target: "b2", ...EDGE_STYLE },
    { id: "eb5-b6", source: "b5", target: "b6", ...EDGE_STYLE },
  ]
  return { nodes, edges }
}

// ── Inner editor ──────────────────────────────────────────────────────────────

export interface BpmnEditorProps {
  mode:           "asis" | "tobe"
  initialContent: string | null
  title:          string
  onSave:         (content: string) => Promise<void>
  procedureSteps?: Array<{ title: string; responsible?: string }>
  containerRef?:  React.RefObject<HTMLDivElement | null>
  onHandoffsChange?: (h: Handoff[]) => void
}

function BpmnEditorInner({
  mode, initialContent, title, onSave, procedureSteps, containerRef, onHandoffsChange,
}: BpmnEditorProps) {
  const { fitView, zoomIn, zoomOut, getNodesBounds } = useReactFlow()
  const [exporting, setExporting] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const idRef = useRef(Date.now())

  const [parsed] = useState(() => {
    if (initialContent) {
      try { return JSON.parse(initialContent) } catch { /* ignore */ }
    }
    return makeSeed(mode)
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<BpmnNodeModel | BpmnLaneModel>(parsed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges)
  const [selected, setSelected] = useState<(BpmnNodeModel | BpmnLaneModel) | null>(null)

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, ...EDGE_STYLE }, eds))
  }, [setEdges])

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelected(sel.length === 1 ? (sel[0] as BpmnNodeModel | BpmnLaneModel) : null)
  }, [])

  const addNode = useCallback((type: BpmnNodeType | "bpmn-lane") => {
    const id = `bn-${++idRef.current}`
    if (type === "bpmn-lane") {
      const lane: BpmnLaneModel = {
        id,
        type: "bpmnLane",
        position: { x: 40, y: (nodes.length * 40) % 400 + 40 },
        style: { width: 700, height: 120, zIndex: -1 },
        data: { nodeType: "bpmn-lane", label: "Nova Raia", color: "blue" },
      }
      setNodes(ns => [lane, ...ns])
      return
    }
    const labels: Partial<Record<BpmnNodeType, string>> = {
      "bpmn-start":             "Início",
      "bpmn-intermediate":      "Evento Intermediário",
      "bpmn-end":               "Fim",
      "bpmn-task":              "Tarefa",
      "bpmn-task-manual":       "Tarefa Manual",
      "bpmn-task-user":         "Tarefa de Usuário",
      "bpmn-task-system":       "Tarefa de Sistema",
      "bpmn-subprocess":        "Subprocesso",
      "bpmn-gateway-exclusive": "Decisão?",
      "bpmn-gateway-parallel":  "Paralelo",
      "bpmn-document":          "Documento",
      "bpmn-message":           "Mensagem",
      "bpmn-approval":          "Aprovação",
      "bpmn-wait":              "Espera",
      "bpmn-annotation":        "Anotação",
    }
    const node: BpmnNodeModel = {
      id,
      type: "bpmnNode",
      position: { x: Math.random() * 200 + 80, y: (nodes.length * 90) % 500 + 80 },
      data: { nodeType: type, label: labels[type] ?? "Nó" },
    }
    setNodes(ns => [...ns, node])
    if (selected && selected.type === "bpmnNode") {
      setEdges(es => addEdge({ id: `e-${selected.id}-${id}`, source: selected.id, target: id, ...EDGE_STYLE }, es))
    }
  }, [nodes.length, selected, setNodes, setEdges])

  const deleteSelected = useCallback(() => {
    if (!selected) return
    setNodes(ns => ns.filter(n => n.id !== selected.id))
    setEdges(es => es.filter(e => e.source !== selected.id && e.target !== selected.id))
    setSelected(null)
  }, [selected, setNodes, setEdges])

  const updateNodeData = useCallback((id: string, patch: Partial<BpmnNodeData> | Partial<BpmnLaneData>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    setSelected(s => s && s.id === id ? { ...s, data: { ...s.data, ...patch } } : s)
    // re-check handoffs after lane assignment change
    setEdges(es => {
      const updated = nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)
      onHandoffsChange?.(detectHandoffs(updated, es))
      return es
    })
  }, [setNodes, setEdges, nodes, onHandoffsChange])

  const handleAutoLayout = useCallback(() => {
    setNodes(ns => autoLayout(ns, edges) as (BpmnNodeModel | BpmnLaneModel)[])
    setTimeout(() => fitView({ padding: 0.2 }), 60)
  }, [edges, setNodes, fitView])

  const handleGenerateFromSteps = useCallback(() => {
    if (!procedureSteps?.length) return
    const newNodes: BpmnNodeModel[] = [
      { id: "gs-start", type: "bpmnNode", position: { x: 300, y: 0 },
        data: { nodeType: "bpmn-start", label: "Início" } },
      ...procedureSteps.map((step, i) => ({
        id:       `gs-${i}`,
        type:     "bpmnNode" as const,
        position: { x: 300, y: (i + 1) * 110 },
        data:     { nodeType: "bpmn-task" as BpmnNodeType, label: step.title, responsible: step.responsible },
      })),
      { id: "gs-end", type: "bpmnNode",
        position: { x: 300, y: (procedureSteps.length + 1) * 110 },
        data: { nodeType: "bpmn-end", label: "Fim" } },
    ]
    const newEdges: Edge[] = [
      { id: "gse-start-0", source: "gs-start", target: "gs-0", ...EDGE_STYLE },
      ...procedureSteps.slice(0, -1).map((_, i) => ({
        id: `gse-${i}-${i + 1}`, source: `gs-${i}`, target: `gs-${i + 1}`, ...EDGE_STYLE,
      })),
      { id: `gse-last-end`, source: `gs-${procedureSteps.length - 1}`, target: "gs-end", ...EDGE_STYLE },
    ]
    setNodes(newNodes)
    setEdges(newEdges)
    setTimeout(() => fitView({ padding: 0.2 }), 60)
  }, [procedureSteps, setNodes, setEdges, fitView])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try { await onSave(JSON.stringify({ nodes, edges })) }
    finally { setSaving(false) }
  }, [nodes, edges, onSave])

  const getContainer = () => containerRef?.current ?? null

  const handleExportPdf = useCallback(async () => {
    const el = getContainer(); if (!el) return
    setExporting(true)
    try { await exportDiagramToPdf(el, getNodesBounds(nodes), title, "a4-landscape") }
    finally { setExporting(false) }
  }, [nodes, title, containerRef, getNodesBounds])

  const handleExportPng = useCallback(async () => {
    const el = getContainer(); if (!el) return
    setExporting(true)
    try { await exportDiagramToPng(el, getNodesBounds(nodes), title) }
    finally { setExporting(false) }
  }, [nodes, title, containerRef, getNodesBounds])

  const handlePrint = useCallback(async () => {
    const el = getContainer(); if (!el) return
    setExporting(true)
    try { await printDiagram(el, getNodesBounds(nodes), title) }
    finally { setExporting(false) }
  }, [nodes, title, containerRef, getNodesBounds])

  const selectedIsLane = selected?.type === "bpmnLane"

  return (
    <>
      <BpmnEditorToolbar
        canDelete={!!selected}
        saving={saving}
        exporting={exporting}
        onAddNode={addNode}
        onDelete={deleteSelected}
        onSave={handleSave}
        onFitView={() => fitView({ padding: 0.2 })}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onAutoLayout={handleAutoLayout}
        onGenerateFromSteps={procedureSteps?.length ? handleGenerateFromSteps : undefined}
        onExportPdf={handleExportPdf}
        onExportPng={handleExportPng}
        onPrint={handlePrint}
      />

      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef as React.RefObject<HTMLDivElement>} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Lines} gap={24} size={1} color="#f1f5f9" />
            <Controls showInteractive={false} className="!shadow-md !border !border-slate-200 !rounded-xl !overflow-hidden" />
            <MiniMap
              nodeColor={n => {
                const t = (n.data as BpmnNodeData).nodeType
                if (t === "bpmn-start")             return "#16a34a"
                if (t === "bpmn-end")               return "#dc2626"
                if (t?.startsWith("bpmn-gateway"))  return "#ca8a04"
                if (t === "bpmn-task-system")       return "#64748b"
                if (t === "bpmn-lane")              return "#c4b5fd"
                return "#3b82f6"
              }}
              className="!rounded-xl !border !border-slate-200 !shadow-md"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>

        {selected && (
          <BpmnNodeEditPanel
            node={selected as BpmnNodeModel}
            isLane={selectedIsLane}
            onChange={patch => updateNodeData(selected.id, patch)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </>
  )
}

// ── Public wrapper ─────────────────────────────────────────────────────────────

export function BpmnEditor(props: BpmnEditorProps) {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col rounded-xl border border-slate-200 overflow-hidden" style={{ height: 560 }}>
        <BpmnEditorInner {...props} />
      </div>
    </ReactFlowProvider>
  )
}
