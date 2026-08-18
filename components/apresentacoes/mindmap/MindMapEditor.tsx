"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Save, Plus, Trash2, ChevronRight, ChevronDown, Loader2, Sparkles, Palette, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

/* ── types ────────────────────────────────────────────────── */
export interface MindNode {
  id:       string
  text:     string
  color:    string
  note:     string
  expanded: boolean
  children: MindNode[]
}

interface MindMapData {
  central: string
  nodes:   MindNode[]
}

interface Props {
  editorRef:      React.RefObject<HTMLDivElement>
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
}

/* ── helpers ──────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9)

const BRANCH_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#ec4899","#84cc16","#f97316","#6366f1",
]

function defaultMap(): MindMapData {
  return {
    central: "Tópico Central",
    nodes: [
      { id: uid(), text: "Ramo 1", color: BRANCH_COLORS[0], note: "", expanded: true, children: [
        { id: uid(), text: "Subtópico 1.1", color: BRANCH_COLORS[0], note: "", expanded: true, children: [] },
        { id: uid(), text: "Subtópico 1.2", color: BRANCH_COLORS[0], note: "", expanded: true, children: [] },
      ]},
      { id: uid(), text: "Ramo 2", color: BRANCH_COLORS[1], note: "", expanded: true, children: [
        { id: uid(), text: "Subtópico 2.1", color: BRANCH_COLORS[1], note: "", expanded: true, children: [] },
      ]},
      { id: uid(), text: "Ramo 3", color: BRANCH_COLORS[2], note: "", expanded: true, children: [] },
    ],
  }
}

function parse(raw: string | null): MindMapData {
  if (!raw) return defaultMap()
  try {
    const d = JSON.parse(raw)
    if (d.central !== undefined && Array.isArray(d.nodes)) return d
    return defaultMap()
  } catch { return defaultMap() }
}

/* ── deep clone / mutate helpers ─────────────────────────── */
function cloneNode(n: MindNode): MindNode {
  return { ...n, children: n.children.map(cloneNode) }
}

function findAndUpdate(
  nodes: MindNode[],
  id: string,
  fn: (n: MindNode) => MindNode
): MindNode[] {
  return nodes.map(n => {
    if (n.id === id) return fn(cloneNode(n))
    return { ...n, children: findAndUpdate(n.children, id, fn) }
  })
}

function removeNode(nodes: MindNode[], id: string): MindNode[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => ({ ...n, children: removeNode(n.children, id) }))
}

/* ── tree render ──────────────────────────────────────────── */
function NodeRow({
  node, depth, color, selected, onSelect, onUpdate, onAddChild, onDelete, onDuplicate,
}: {
  node:        MindNode
  depth:       number
  color:       string
  selected:    string | null
  onSelect:    (id: string) => void
  onUpdate:    (id: string, patch: Partial<MindNode>) => void
  onAddChild:  (parentId: string, color: string) => void
  onDelete:    (id: string) => void
  onDuplicate: (node: MindNode, parentId: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText]       = useState(node.text)
  const isSelected            = selected === node.id

  function commit() {
    if (text.trim()) onUpdate(node.id, { text: text.trim() })
    else setText(node.text)
    setEditing(false)
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-lg px-2 py-1 cursor-pointer transition-all",
          isSelected ? "bg-slate-100 ring-1 ring-slate-300" : "hover:bg-slate-50"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* expand toggle */}
        {node.children.length > 0 ? (
          <button
            onClick={e => { e.stopPropagation(); onUpdate(node.id, { expanded: !node.expanded }) }}
            className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0"
          >
            {node.expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* color dot */}
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />

        {/* text */}
        {editing ? (
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setText(node.text); setEditing(false) } }}
            onClick={e => e.stopPropagation()}
            className="flex-1 text-sm bg-white border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none"
          />
        ) : (
          <span
            className="flex-1 text-sm text-slate-700 leading-tight"
            onDoubleClick={() => { setEditing(true); setText(node.text) }}
          >
            {node.text}
          </span>
        )}

        {/* actions (show on hover/select) */}
        <div className={cn("flex items-center gap-1 shrink-0", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          <button
            onClick={e => { e.stopPropagation(); onAddChild(node.id, color) }}
            title="Adicionar filho"
            className="p-1 rounded hover:bg-green-100 hover:text-green-700 text-slate-400"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDuplicate(node, null) }}
            title="Duplicar"
            className="p-1 rounded hover:bg-blue-100 hover:text-blue-700 text-slate-400"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(node.id) }}
            title="Remover"
            className="p-1 rounded hover:bg-red-100 hover:text-red-700 text-slate-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* note */}
      {isSelected && node.note && (
        <p className="text-xs text-slate-400 italic ml-10 mb-1">{node.note}</p>
      )}

      {/* children */}
      {node.expanded && node.children.length > 0 && (
        <div className="border-l border-dashed border-slate-200 ml-6">
          {node.children.map(child => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              color={color}
              selected={selected}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── main editor ──────────────────────────────────────────── */
export function MindMapEditor({ editorRef, initialContent, onSave }: Props) {
  const [data,     setData]     = useState<MindMapData>(() => parse(initialContent))
  const [selected, setSelected] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [dirty,    setDirty]    = useState(false)
  const [aiInput,  setAiInput]  = useState("")
  const [aiLoading,setAiLoading]= useState(false)
  const [showAi,   setShowAi]   = useState(false)
  const [editNote, setEditNote] = useState("")

  // selected node for detail panel
  const selectedNode = useRef<MindNode | null>(null)
  function findNode(nodes: MindNode[], id: string): MindNode | null {
    for (const n of nodes) {
      if (n.id === id) return n
      const f = findNode(n.children, id)
      if (f) return f
    }
    return null
  }
  const selNode = selected ? findNode(data.nodes, selected) : null

  function mut(fn: (d: MindMapData) => MindMapData) {
    setData(fn)
    setDirty(true)
  }

  function updateNode(id: string, patch: Partial<MindNode>) {
    mut(d => ({ ...d, nodes: findAndUpdate(d.nodes, id, n => ({ ...n, ...patch })) }))
  }

  function addRootBranch() {
    const color = BRANCH_COLORS[data.nodes.length % BRANCH_COLORS.length]
    mut(d => ({
      ...d,
      nodes: [...d.nodes, { id: uid(), text: "Novo Ramo", color, note: "", expanded: true, children: [] }]
    }))
  }

  function addChild(parentId: string, color: string) {
    const child: MindNode = { id: uid(), text: "Novo nó", color, note: "", expanded: true, children: [] }
    mut(d => ({
      ...d,
      nodes: findAndUpdate(d.nodes, parentId, n => ({ ...n, expanded: true, children: [...n.children, child] }))
    }))
  }

  function deleteNode(id: string) {
    mut(d => ({ ...d, nodes: removeNode(d.nodes, id) }))
    if (selected === id) setSelected(null)
  }

  function duplicateNode(node: MindNode, _parentId: string | null) {
    function deepCloneWithNewIds(n: MindNode): MindNode {
      return { ...n, id: uid(), children: n.children.map(deepCloneWithNewIds) }
    }
    const cloned = deepCloneWithNewIds(node)
    // add as sibling at root level for simplicity
    mut(d => ({ ...d, nodes: [...d.nodes, cloned] }))
  }

  async function save() {
    setSaving(true)
    await onSave(JSON.stringify(data))
    setDirty(false)
    setSaving(false)
  }

  async function generateWithAi() {
    if (!aiInput.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch("/api/apresentacoes/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:   "mindmap",
          prompt: aiInput,
          current: JSON.stringify(data),
        }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d.content) {
          const parsed = parse(d.content)
          setData(parsed)
          setDirty(true)
          setShowAi(false)
          setAiInput("")
        }
      }
    } catch {}
    setAiLoading(false)
  }

  return (
    <div ref={editorRef} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 flex-wrap">
        <span className="text-sm font-semibold text-slate-700 mr-2">🧠 Mapa Mental</span>
        <button
          onClick={addRootBranch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Ramo
        </button>
        <button
          onClick={() => setShowAi(v => !v)}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
            showAi ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" /> IA
        </button>
        <div className="flex-1" />
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {dirty ? "Salvar*" : "Salvo"}
        </button>
      </div>

      {/* AI panel */}
      {showAi && (
        <div className="px-4 py-3 border-b border-amber-100 bg-amber-50 flex gap-2">
          <input
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generateWithAi()}
            placeholder='Ex: "Mapa mental das oportunidades de automação do DP"'
            className="flex-1 text-sm rounded-lg border border-amber-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            onClick={generateWithAi}
            disabled={aiLoading || !aiInput.trim()}
            className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1.5"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Gerar
          </button>
        </div>
      )}

      <div className="flex">
        {/* Tree panel */}
        <div className="flex-1 p-4 overflow-y-auto max-h-[600px]">
          {/* Central node */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="w-3 h-3 rounded-full bg-slate-800" />
            <input
              value={data.central}
              onChange={e => { mut(d => ({ ...d, central: e.target.value })) }}
              className="text-base font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
            />
            <span className="text-xs text-slate-400 ml-auto">Tópico Central</span>
          </div>

          {/* Branches */}
          {data.nodes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Clique em "Novo Ramo" para começar</p>
          ) : (
            <div className="space-y-1">
              {data.nodes.map(node => (
                <NodeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  color={node.color}
                  selected={selected}
                  onSelect={setSelected}
                  onUpdate={updateNode}
                  onAddChild={addChild}
                  onDelete={deleteNode}
                  onDuplicate={duplicateNode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selNode && (
          <div className="w-64 border-l border-slate-100 p-4 space-y-4 bg-slate-50 shrink-0">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nó Selecionado</h3>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Texto</label>
              <input
                value={selNode.text}
                onChange={e => updateNode(selNode.id, { text: e.target.value })}
                className="w-full text-sm rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Observação</label>
              <textarea
                value={selNode.note}
                onChange={e => updateNode(selNode.id, { note: e.target.value })}
                rows={2}
                className="w-full text-sm rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">Cor</label>
              <div className="flex flex-wrap gap-1.5">
                {BRANCH_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateNode(selNode.id, { color: c })}
                    className={cn("w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                      selNode.color === c ? "border-slate-700 scale-110" : "border-transparent")}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => addChild(selNode.id, selNode.color)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
              >
                <Plus className="w-3 h-3" /> Filho
              </button>
              <button
                onClick={() => { deleteNode(selNode.id); setSelected(null) }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 border border-red-200"
              >
                <Trash2 className="w-3 h-3" /> Remover
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visual preview (simplified radial) */}
      <div className="border-t border-slate-100 p-4 bg-white">
        <p className="text-xs text-slate-400 mb-3">Prévia visual</p>
        <div className="overflow-x-auto">
          <MindMapPreview data={data} />
        </div>
      </div>
    </div>
  )
}

/* ── visual preview ───────────────────────────────────────── */
function MindMapPreview({ data }: { data: MindMapData }) {
  const W = 900, H = 400
  const cx = 120, cy = H / 2
  const branchW = 160, levelGap = 140

  function renderBranch(node: MindNode, x: number, y: number, depth: number): JSX.Element[] {
    const elems: JSX.Element[] = []
    const children = node.expanded ? node.children : []
    const childH = 28
    const totalH = Math.max(children.length * childH, 0)
    const startY = y - totalH / 2

    // line from parent
    elems.push(
      <line key={`l-${node.id}`} x1={cx + (depth - 1) * levelGap + (depth === 1 ? 80 : branchW)} y1={y} x2={x} y2={y}
        stroke={node.color} strokeWidth={depth === 1 ? 2 : 1.5} strokeOpacity={0.7} />
    )

    // node box
    elems.push(
      <g key={`g-${node.id}`}>
        <rect x={x} y={y - 11} width={branchW} height={22} rx={11}
          fill={depth === 1 ? node.color : node.color + "22"} />
        <text x={x + branchW / 2} y={y + 5} textAnchor="middle" fontSize={11}
          fill={depth === 1 ? "#fff" : node.color} fontWeight={depth === 1 ? "600" : "400"}
          style={{ fontFamily: "system-ui" }}>
          {node.text.length > 16 ? node.text.slice(0, 15) + "…" : node.text}
        </text>
      </g>
    )

    children.forEach((child, i) => {
      const childX = x + branchW + 20
      const childY = startY + i * childH + childH / 2
      elems.push(
        <line key={`lc-${child.id}`} x1={x + branchW} y1={y} x2={childX} y2={childY}
          stroke={node.color} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="3 2" />
      )
      elems.push(
        <g key={`gc-${child.id}`}>
          <rect x={childX} y={childY - 10} width={120} height={20} rx={10}
            fill={node.color + "33"} />
          <text x={childX + 60} y={childY + 5} textAnchor="middle" fontSize={9}
            fill={node.color} style={{ fontFamily: "system-ui" }}>
            {child.text.length > 14 ? child.text.slice(0, 13) + "…" : child.text}
          </text>
        </g>
      )
    })

    return elems
  }

  const branchCount = data.nodes.length
  const branchGap = branchCount > 0 ? Math.min(H / branchCount, 80) : 80

  return (
    <svg width={W} height={H} className="rounded-lg border border-slate-100">
      <rect width={W} height={H} fill="#f8fafc" />
      {/* Central */}
      <ellipse cx={cx} cy={cy} rx={70} ry={28} fill="#1e3a5f" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={12} fill="#fff" fontWeight="700"
        style={{ fontFamily: "system-ui" }}>
        {data.central.length > 14 ? data.central.slice(0, 13) + "…" : data.central}
      </text>

      {/* Branches */}
      {data.nodes.map((node, i) => {
        const y = cy + (i - (branchCount - 1) / 2) * branchGap
        const x = cx + 110
        return (
          <g key={node.id}>
            {renderBranch(node, x, y, 1)}
          </g>
        )
      })}
    </svg>
  )
}
