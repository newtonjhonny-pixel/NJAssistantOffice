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

import { FlowNode, FlowNodeData, FlowNodeModel, FlowNodeType } from "./FlowNode"
import { FlowToolbar } from "./FlowToolbar"
import { FlowNodeEditPanel } from "./FlowNodeEditPanel"
import {
  exportDiagramToPdf,
  exportDiagramToPng,
  exportDiagramToJpeg,
  printDiagram,
} from "@/lib/diagramExport"

const NODE_TYPES = { flowNode: FlowNode } as NodeTypes

const EDGE_STYLE = {
  type:      "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
  style:     { stroke: "#64748b", strokeWidth: 2 },
}

// ─── Auto-layout (top-down sequential) ───────────────────────────────────────

function autoLayout(nodes: FlowNodeModel[], edges: Edge[]): FlowNodeModel[] {
  if (nodes.length === 0) return nodes

  const hasParent = new Set(edges.map(e => e.target))
  const roots     = nodes.filter(n => !hasParent.has(n.id))

  const positioned = new Map<string, { x: number; y: number }>()
  const NODE_W = 180
  const NODE_H = 90
  const GAP_X  = 50
  const GAP_Y  = 70

  function place(ids: string[], depth: number, startX: number): number {
    let cursor = startX
    for (const id of ids) {
      const children = edges.filter(e => e.source === id).map(e => e.target)
      const subtree  = children.length > 0 ? place(children, depth + 1, cursor) - cursor : NODE_W + GAP_X
      positioned.set(id, { x: cursor + (subtree - NODE_W) / 2, y: depth * (NODE_H + GAP_Y) })
      cursor += subtree
    }
    return cursor
  }

  place(roots.map(n => n.id), 0, 0)

  let orphanX = 0
  const maxY  = Math.max(...Array.from(positioned.values()).map(p => p.y), 0) + NODE_H + GAP_Y * 2

  return nodes.map(n => {
    const pos = positioned.get(n.id)
    if (pos) return { ...n, position: pos }
    const p = { x: orphanX, y: maxY }
    orphanX += NODE_W + GAP_X
    return { ...n, position: p }
  })
}

// ─── Default seed ─────────────────────────────────────────────────────────────

function defaultNodes(isProcess: boolean): FlowNodeModel[] {
  if (isProcess) {
    return [
      { id: "n1", type: "flowNode", position: { x: 100, y: 0   }, data: { label: "Solicitação",  nodeType: "start"    } },
      { id: "n2", type: "flowNode", position: { x: 100, y: 160 }, data: { label: "Análise",       nodeType: "process"  } },
      { id: "n3", type: "flowNode", position: { x: 100, y: 320 }, data: { label: "Aprovado?",     nodeType: "decision" } },
      { id: "n4", type: "flowNode", position: { x: 250, y: 480 }, data: { label: "Retrabalho",    nodeType: "process"  } },
      { id: "n5", type: "flowNode", position: { x: -50, y: 480 }, data: { label: "Encerramento", nodeType: "end"      } },
    ]
  }
  return [
    { id: "n1", type: "flowNode", position: { x: 100, y: 0   }, data: { label: "Início",     nodeType: "start"   } },
    { id: "n2", type: "flowNode", position: { x: 100, y: 160 }, data: { label: "Processo 1", nodeType: "process" } },
    { id: "n3", type: "flowNode", position: { x: 100, y: 320 }, data: { label: "Fim",        nodeType: "end"     } },
  ]
}

function defaultEdges(isProcess: boolean): Edge[] {
  if (isProcess) {
    return [
      { id: "e1-2", source: "n1", target: "n2", ...EDGE_STYLE },
      { id: "e2-3", source: "n2", target: "n3", ...EDGE_STYLE },
      { id: "e3-5", source: "n3", target: "n5", ...EDGE_STYLE, label: "Sim" },
      { id: "e3-4", source: "n3", target: "n4", ...EDGE_STYLE, label: "Não" },
      { id: "e4-2", source: "n4", target: "n2", ...EDGE_STYLE },
    ]
  }
  return [
    { id: "e1-2", source: "n1", target: "n2", ...EDGE_STYLE },
    { id: "e2-3", source: "n2", target: "n3", ...EDGE_STYLE },
  ]
}

// ─── Inner editor ─────────────────────────────────────────────────────────────

interface InnerProps {
  initialContent: string | null
  isProcess:      boolean
  title:          string
  onSave:         (content: string) => Promise<void>
  editorRef?:     React.RefObject<HTMLDivElement | null>
}

function FlowEditorInner({ initialContent, isProcess, title, onSave, editorRef }: InnerProps) {
  const { fitView, zoomIn, zoomOut, getNodesBounds } = useReactFlow()
  const [exporting, setExporting] = useState(false)

  const [parsed] = useState(() => {
    if (initialContent) {
      try { return JSON.parse(initialContent) } catch { /* ignore */ }
    }
    return { nodes: defaultNodes(isProcess), edges: defaultEdges(isProcess) }
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeModel>(parsed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges)
  const [selected, setSelected] = useState<FlowNodeModel | null>(null)
  const [saving,   setSaving]   = useState(false)
  const idRef = useRef(Date.now())

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, ...EDGE_STYLE }, eds))
  }, [setEdges])

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelected(sel.length === 1 ? (sel[0] as FlowNodeModel) : null)
  }, [])

  const addNode = useCallback((type: FlowNodeType) => {
    const id = `node-${++idRef.current}`
    const labels: Record<FlowNodeType, string> = {
      start:     "Início",
      end:       "Fim",
      process:   "Processo",
      decision:  "Decisão?",
      document:  "Documento",
      connector: "A",
      lane:      "Raia",
    }
    const newNode: FlowNodeModel = {
      id,
      type: "flowNode",
      position: { x: Math.random() * 150 + 50, y: (nodes.length * 80) % 400 + 50 },
      data: { label: labels[type], nodeType: type },
    }
    setNodes(ns => [...ns, newNode])
    if (selected) {
      setEdges(es => addEdge({
        id: `e-${selected.id}-${id}`,
        source: selected.id,
        target: id,
        ...EDGE_STYLE,
      }, es))
    }
  }, [nodes.length, selected, setNodes, setEdges])

  const deleteSelected = useCallback(() => {
    if (!selected) return
    setNodes(ns => ns.filter(n => n.id !== selected.id))
    setEdges(es => es.filter(e => e.source !== selected.id && e.target !== selected.id))
    setSelected(null)
  }, [selected, setNodes, setEdges])

  const updateNodeData = useCallback((id: string, patch: Partial<FlowNodeData>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    setSelected(s => s && s.id === id ? { ...s, data: { ...s.data, ...patch } } : s)
  }, [setNodes])

  const handleAutoLayout = useCallback(() => {
    setNodes(ns => autoLayout(ns, edges))
    setTimeout(() => fitView({ padding: 0.2 }), 50)
  }, [edges, setNodes, fitView])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await onSave(JSON.stringify({ nodes, edges }))
    } finally {
      setSaving(false)
    }
  }, [nodes, edges, onSave])

  function getContainer(): HTMLElement | null {
    return editorRef?.current ?? null
  }

  const handleExportPdf = useCallback(async () => {
    const el = getContainer(); if (!el) return
    setExporting(true)
    try { await exportDiagramToPdf(el, getNodesBounds(nodes), title, "a4-landscape") }
    finally { setExporting(false) }
  }, [nodes, title, editorRef, getNodesBounds])

  const handleExportPng = useCallback(async () => {
    const el = getContainer(); if (!el) return
    setExporting(true)
    try { await exportDiagramToPng(el, getNodesBounds(nodes), title) }
    finally { setExporting(false) }
  }, [nodes, title, editorRef, getNodesBounds])

  const handleExportJpeg = useCallback(async () => {
    const el = getContainer(); if (!el) return
    setExporting(true)
    try { await exportDiagramToJpeg(el, getNodesBounds(nodes), title) }
    finally { setExporting(false) }
  }, [nodes, title, editorRef, getNodesBounds])

  const handlePrint = useCallback(async () => {
    const el = getContainer(); if (!el) return
    setExporting(true)
    try { await printDiagram(el, getNodesBounds(nodes), title) }
    finally { setExporting(false) }
  }, [nodes, title, editorRef, getNodesBounds])

  const canDelete = !!selected && selected.data.nodeType !== "start"

  return (
    <div ref={editorRef as React.RefObject<HTMLDivElement>} className="flex flex-col rounded-xl border border-slate-200 overflow-hidden" style={{ height: 560 }}>
      <FlowToolbar
        canDelete={canDelete}
        saving={saving}
        exporting={exporting}
        onAddNode={addNode}
        onDelete={deleteSelected}
        onSave={handleSave}
        onFitView={() => fitView({ padding: 0.2 })}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onAutoLayout={handleAutoLayout}
        onExportPdf={handleExportPdf}
        onExportPng={handleExportPng}
        onExportJpeg={handleExportJpeg}
        onPrint={handlePrint}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
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
                const d = n.data as FlowNodeData
                if (d.nodeType === "start")    return "#16a34a"
                if (d.nodeType === "end")      return "#dc2626"
                if (d.nodeType === "decision") return "#ca8a04"
                if (d.nodeType === "document") return "#15803d"
                return "#3b82f6"
              }}
              className="!rounded-xl !border !border-slate-200 !shadow-md"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>

        {selected && (
          <FlowNodeEditPanel
            node={selected}
            onChange={patch => updateNodeData(selected.id, patch)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

interface FlowEditorProps {
  initialContent: string | null
  isProcess?:     boolean
  title?:         string
  onSave:         (content: string) => Promise<void>
  editorRef?:     React.RefObject<HTMLDivElement | null>
}

export function FlowEditor({ initialContent, isProcess = false, title = "Fluxograma", onSave, editorRef }: FlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner
        initialContent={initialContent}
        isProcess={isProcess}
        title={title}
        onSave={onSave}
        editorRef={editorRef}
      />
    </ReactFlowProvider>
  )
}
