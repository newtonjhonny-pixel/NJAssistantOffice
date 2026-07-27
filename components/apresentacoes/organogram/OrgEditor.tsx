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

import { OrgNode, OrgNodeData, OrgNodeModel, OrgNodeType } from "./OrgNode"
import { OrgToolbar } from "./OrgToolbar"
import { OrgNodeEditPanel } from "./OrgNodeEditPanel"

// ─── Node types registry ──────────────────────────────────────────────────────

const NODE_TYPES = { orgNode: OrgNode } as NodeTypes

// ─── Default edge style ───────────────────────────────────────────────────────

const EDGE_STYLE = {
  type:            "smoothstep" as const,
  markerEnd:       { type: MarkerType.ArrowClosed, color: "#94a3b8" },
  style:           { stroke: "#94a3b8", strokeWidth: 2 },
  animated:        false,
}

// ─── Auto-layout (simple top-down BFS) ───────────────────────────────────────

function autoLayout(nodes: OrgNodeModel[], edges: Edge[]): OrgNodeModel[] {
  if (nodes.length === 0) return nodes

  // find root(s): nodes with no incoming edges
  const hasParent = new Set(edges.map(e => e.target))
  const roots = nodes.filter(n => !hasParent.has(n.id))

  const positioned = new Map<string, { x: number; y: number }>()
  const NODE_W = 220
  const NODE_H = 100
  const GAP_X  = 40
  const GAP_Y  = 80

  function assignPositions(ids: string[], depth: number, startX: number): number {
    let cursor = startX
    for (const id of ids) {
      const children = edges.filter(e => e.source === id).map(e => e.target)
      const subtreeWidth = children.length > 0
        ? assignPositions(children, depth + 1, cursor) - cursor
        : NODE_W + GAP_X
      const cx = cursor + (subtreeWidth - NODE_W) / 2
      positioned.set(id, { x: cx, y: depth * (NODE_H + GAP_Y) })
      cursor += subtreeWidth
    }
    return cursor
  }

  assignPositions(roots.map(n => n.id), 0, 0)

  // any nodes not placed (disconnected) get stacked at the bottom
  let orphanX = 0
  const maxDepth = roots.length > 0 ? (Math.max(...nodes.map(n => {
    const pos = positioned.get(n.id)
    return pos ? pos.y : 0
  }))) + NODE_H + GAP_Y * 2 : 0

  return nodes.map(n => {
    const pos = positioned.get(n.id)
    if (pos) return { ...n, position: pos }
    const p = { x: orphanX, y: maxDepth }
    orphanX += NODE_W + GAP_X
    return { ...n, position: p }
  })
}

// ─── Inner editor (needs ReactFlowProvider context) ───────────────────────────

interface InnerProps {
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
  editorRef?:     React.RefObject<HTMLDivElement | null>
}

function OrgEditorInner({ initialContent, onSave, editorRef }: InnerProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  // Parse saved content or seed with a root node
  const [parsed] = useState(() => {
    if (initialContent) {
      try { return JSON.parse(initialContent) } catch { /* ignore */ }
    }
    return {
      nodes: [{
        id:       "root-1",
        type:     "orgNode",
        position: { x: 0, y: 0 },
        data:     { label: "Empresa", role: "Organização", nodeType: "root" } as OrgNodeData,
      }],
      edges: [],
    }
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<OrgNodeModel>(parsed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges)
  const [selected, setSelected] = useState<OrgNodeModel | null>(null)
  const [saving,   setSaving]   = useState(false)
  const idRef = useRef(Date.now())

  // ── Connections ────────────────────────────────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, ...EDGE_STYLE }, eds))
  }, [setEdges])

  // ── Selection ──────────────────────────────────────────────────────────────
  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelected(sel.length === 1 ? (sel[0] as OrgNodeModel) : null)
  }, [])

  // ── Add node ───────────────────────────────────────────────────────────────
  const addNode = useCallback((type: OrgNodeType) => {
    const id = `node-${++idRef.current}`
    const newNode: OrgNodeModel = {
      id,
      type: "orgNode",
      position: { x: Math.random() * 200 + 50, y: Math.random() * 100 + 200 },
      data: {
        label:    type === "department" ? "Departamento" : type === "manager" ? "Gestor" : "Colaborador",
        role:     type === "manager" ? "Gerente" : type === "employee" ? "Analista" : undefined,
        nodeType: type,
      },
    }
    setNodes(ns => [...ns, newNode])
    // auto-connect to selected if any
    if (selected) {
      setEdges(es => addEdge({
        id:     `e-${selected.id}-${id}`,
        source: selected.id,
        target: id,
        ...EDGE_STYLE,
      }, es))
    }
  }, [selected, setNodes, setEdges])

  // ── Delete selected ────────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    if (!selected) return
    setNodes(ns => ns.filter(n => n.id !== selected.id))
    setEdges(es => es.filter(e => e.source !== selected.id && e.target !== selected.id))
    setSelected(null)
  }, [selected, setNodes, setEdges])

  // ── Update node data ───────────────────────────────────────────────────────
  const updateNodeData = useCallback((id: string, patch: Partial<OrgNodeData>) => {
    setNodes(ns => ns.map(n =>
      n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
    ))
    if (selected?.id === id) {
      setSelected(s => s ? { ...s, data: { ...s.data, ...patch } } : s)
    }
  }, [setNodes, selected])

  // ── Auto-layout ────────────────────────────────────────────────────────────
  const handleAutoLayout = useCallback(() => {
    setNodes(ns => autoLayout(ns, edges))
    setTimeout(() => fitView({ padding: 0.2 }), 50)
  }, [edges, setNodes, fitView])

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await onSave(JSON.stringify({ nodes, edges }))
    } finally {
      setSaving(false)
    }
  }, [nodes, edges, onSave])

  return (
    <div ref={editorRef as React.RefObject<HTMLDivElement>} className="flex flex-col rounded-xl border border-slate-200 overflow-hidden" style={{ height: 560 }}>
      <OrgToolbar
        canDelete={!!selected && selected.data.nodeType !== "root"}
        saving={saving}
        onAddNode={addNode}
        onDelete={deleteSelected}
        onSave={handleSave}
        onFitView={() => fitView({ padding: 0.2 })}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onAutoLayout={handleAutoLayout}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
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
                const d = n.data as OrgNodeData
                if (d.nodeType === "root")       return "#2563eb"
                if (d.nodeType === "manager")    return "#818cf8"
                if (d.nodeType === "department") return "#94a3b8"
                return "#cbd5e1"
              }}
              className="!rounded-xl !border !border-slate-200 !shadow-md"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>

        {/* Edit panel */}
        {selected && (
          <OrgNodeEditPanel
            node={selected}
            onChange={patch => updateNodeData(selected.id, patch)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Public export (wraps with provider) ──────────────────────────────────────

interface OrgEditorProps {
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
  editorRef?:     React.RefObject<HTMLDivElement | null>
}

export function OrgEditor({ initialContent, onSave, editorRef }: OrgEditorProps) {
  return (
    <ReactFlowProvider>
      <OrgEditorInner initialContent={initialContent} onSave={onSave} editorRef={editorRef} />
    </ReactFlowProvider>
  )
}
