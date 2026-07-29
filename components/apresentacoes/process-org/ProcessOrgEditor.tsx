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

import { ProcessOrgNode, ProcessOrgNodeData, ProcessOrgNodeModel, ProcessOrgNodeType } from "./ProcessOrgNode"
import { ProcessOrgNodeEditPanel } from "./ProcessOrgNodeEditPanel"
import { ProcessOrgToolbar } from "./ProcessOrgToolbar"
import { ProcessOrgImportModal } from "./ProcessOrgImportModal"
import {
  exportDiagramToPdf,
  exportDiagramToPng,
  exportDiagramToJpeg,
  printDiagram,
} from "@/lib/diagramExport"

const NODE_TYPES = { processOrgNode: ProcessOrgNode } as NodeTypes

const EDGE_STYLE = {
  type:      "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
  style:     { stroke: "#94a3b8", strokeWidth: 1.5 },
}

// ─── Auto-layout (top-down BFS) ───────────────────────────────────────────────

function autoLayout(nodes: ProcessOrgNodeModel[], edges: Edge[]): ProcessOrgNodeModel[] {
  if (nodes.length === 0) return nodes

  const hasParent  = new Set(edges.map(e => e.target))
  const roots      = nodes.filter(n => !hasParent.has(n.id))
  const positioned = new Map<string, { x: number; y: number }>()
  const NW = 200, NH = 70, GX = 40, GY = 60

  function place(ids: string[], depth: number, startX: number): number {
    let cursor = startX
    for (const id of ids) {
      const children   = edges.filter(e => e.source === id).map(e => e.target)
      const subtreeW   = children.length > 0 ? place(children, depth + 1, cursor) - cursor : NW + GX
      positioned.set(id, { x: cursor + (subtreeW - NW) / 2, y: depth * (NH + GY) })
      cursor += subtreeW
    }
    return cursor
  }

  place(roots.map(n => n.id), 0, 0)

  let orphanX = 0
  const maxY  = Math.max(...Array.from(positioned.values()).map(p => p.y), 0) + NH + GY * 2

  return nodes.map(n => {
    const pos = positioned.get(n.id)
    if (pos) return { ...n, position: pos }
    const p = { x: orphanX, y: maxY }
    orphanX += NW + GX
    return { ...n, position: p }
  })
}

// ─── Nó semente inicial ───────────────────────────────────────────────────────

const SEED_NODES: ProcessOrgNodeModel[] = [
  { id: "u1", type: "processOrgNode", position: { x: 180, y:   0 }, data: { nodeType: "unit",         label: "Empresa / Unidade"   } },
  { id: "d1", type: "processOrgNode", position: { x: 180, y: 130 }, data: { nodeType: "department",   label: "Departamento"         } },
  { id: "c1", type: "processOrgNode", position: { x: 180, y: 260 }, data: { nodeType: "collaborator", label: "Colaborador"          } },
  { id: "r1", type: "processOrgNode", position: { x: 180, y: 390 }, data: { nodeType: "role",         label: "Função / Cargo"       } },
  { id: "a1", type: "processOrgNode", position: { x: 180, y: 520 }, data: { nodeType: "activity",     label: "Atividade"            } },
]
const SEED_EDGES: Edge[] = [
  { id: "eu-d", source: "u1", target: "d1", ...EDGE_STYLE },
  { id: "ed-c", source: "d1", target: "c1", ...EDGE_STYLE },
  { id: "ec-r", source: "c1", target: "r1", ...EDGE_STYLE },
  { id: "er-a", source: "r1", target: "a1", ...EDGE_STYLE },
]

// ─── Inner editor ─────────────────────────────────────────────────────────────

interface InnerProps {
  initialContent: string | null
  title:          string
  onSave:         (content: string) => Promise<void>
  editorRef?:     React.RefObject<HTMLDivElement | null>
}

function ProcessOrgEditorInner({ initialContent, title, onSave, editorRef }: InnerProps) {
  const { fitView, zoomIn, zoomOut, getNodesBounds } = useReactFlow()
  const [exporting,    setExporting]    = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [selected,     setSelected]     = useState<ProcessOrgNodeModel | null>(null)
  const idRef = useRef(Date.now())

  const [parsed] = useState(() => {
    if (initialContent) {
      try { return JSON.parse(initialContent) } catch { /* ignore */ }
    }
    return { nodes: SEED_NODES, edges: SEED_EDGES }
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<ProcessOrgNodeModel>(parsed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges)

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, ...EDGE_STYLE }, eds))
  }, [setEdges])

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelected(sel.length === 1 ? (sel[0] as ProcessOrgNodeModel) : null)
  }, [])

  const addNode = useCallback((type: ProcessOrgNodeType) => {
    const labels: Record<ProcessOrgNodeType, string> = {
      collaborator: "Colaborador",
      role:         "Função / Cargo",
      department:   "Departamento",
      category:     "Categoria",
      activity:     "Atividade",
      item:         "Item / Etapa",
      description:  "Descrição",
      unit:         "Empresa / Unidade",
    }
    const newNode: ProcessOrgNodeModel = {
      id:       `poc-${++idRef.current}`,
      type:     "processOrgNode",
      position: { x: Math.random() * 200 + 80, y: (nodes.length * 90) % 500 + 60 },
      data:     { nodeType: type, label: labels[type] },
    }
    setNodes(ns => [...ns, newNode])
    if (selected) {
      setEdges(es => addEdge({
        id:     `e-${selected.id}-${newNode.id}`,
        source: selected.id,
        target: newNode.id,
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

  const updateNodeData = useCallback((id: string, patch: Partial<ProcessOrgNodeData>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    setSelected(s => s && s.id === id ? { ...s, data: { ...s.data, ...patch } } : s)
  }, [setNodes])

  const handleAutoLayout = useCallback(() => {
    setNodes(ns => autoLayout(ns, edges))
    setTimeout(() => fitView({ padding: 0.2 }), 50)
  }, [edges, setNodes, fitView])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try { await onSave(JSON.stringify({ nodes, edges })) }
    finally { setSaving(false) }
  }, [nodes, edges, onSave])

  const handleImportGenerate = useCallback((importedNodes: ProcessOrgNodeModel[], importedEdges: Edge[]) => {
    setNodes(importedNodes)
    setEdges(importedEdges)
    setTimeout(() => {
      setNodes(ns => autoLayout(ns, importedEdges))
      setTimeout(() => fitView({ padding: 0.2 }), 60)
    }, 50)
  }, [setNodes, setEdges, fitView])

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

  const canDelete = !!selected && selected.data.nodeType !== "unit"

  return (
    <>
      <div
        ref={editorRef as React.RefObject<HTMLDivElement>}
        className="flex flex-col rounded-xl border border-slate-200 overflow-hidden"
        style={{ height: 600 }}
      >
        <ProcessOrgToolbar
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
          onImport={() => setShowImport(true)}
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
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
              <Controls showInteractive={false} className="!shadow-md !border !border-slate-200 !rounded-xl !overflow-hidden" />
              <MiniMap
                nodeColor={n => {
                  const t = (n.data as ProcessOrgNodeData).nodeType
                  if (t === "collaborator") return "#2563eb"
                  if (t === "role")         return "#7c3aed"
                  if (t === "department")   return "#1e293b"
                  if (t === "category")     return "#ea580c"
                  if (t === "activity")     return "#16a34a"
                  if (t === "item")         return "#64748b"
                  if (t === "unit")         return "#dc2626"
                  return "#e2e8f0"
                }}
                className="!rounded-xl !border !border-slate-200 !shadow-md"
                pannable
                zoomable
              />
            </ReactFlow>
          </div>

          {selected && (
            <ProcessOrgNodeEditPanel
              node={selected}
              onChange={patch => updateNodeData(selected.id, patch)}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>

      {showImport && (
        <ProcessOrgImportModal
          onClose={() => setShowImport(false)}
          onGenerate={handleImportGenerate}
        />
      )}
    </>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

interface ProcessOrgEditorProps {
  initialContent: string | null
  title?:         string
  onSave:         (content: string) => Promise<void>
  editorRef?:     React.RefObject<HTMLDivElement | null>
}

export function ProcessOrgEditor({ initialContent, title = "Organograma de Processos", onSave, editorRef }: ProcessOrgEditorProps) {
  return (
    <ReactFlowProvider>
      <ProcessOrgEditorInner
        initialContent={initialContent}
        title={title}
        onSave={onSave}
        editorRef={editorRef}
      />
    </ReactFlowProvider>
  )
}
