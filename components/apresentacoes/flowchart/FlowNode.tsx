"use client"

import { Handle, Position, Node, NodeProps } from "@xyflow/react"
import { cn } from "@/lib/utils"

export type FlowNodeType =
  | "start"
  | "end"
  | "process"
  | "decision"
  | "document"
  | "connector"
  | "lane"

export interface FlowNodeData {
  label:    string
  nodeType: FlowNodeType
  sublabel?: string
  color?:   string
  [key: string]: unknown
}

export type FlowNodeModel = Node<FlowNodeData, "flowNode">

// ─── Shared handle set ────────────────────────────────────────────────────────

function Handles({ type }: { type: FlowNodeType }) {
  const showTop    = type !== "start"
  const showBottom = type !== "end"
  const cls = "!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
  return (
    <>
      {showTop    && <Handle type="target" position={Position.Top}    className={cls} />}
      {showBottom && <Handle type="source" position={Position.Bottom} className={cls} />}
      <Handle type="target" position={Position.Left}  id="left-in"   className={cn(cls, "!opacity-0 hover:!opacity-100")} />
      <Handle type="source" position={Position.Right} id="right-out" className={cn(cls, "!opacity-0 hover:!opacity-100")} />
    </>
  )
}

// ─── Node renderers ───────────────────────────────────────────────────────────

function StartEnd({ data, selected, isEnd }: { data: FlowNodeData; selected: boolean; isEnd: boolean }) {
  return (
    <div className={cn(
      "relative px-6 py-2 rounded-full border-2 min-w-[120px] text-center shadow-sm transition-all",
      isEnd
        ? "bg-red-600 border-red-700 text-white"
        : "bg-green-600 border-green-700 text-white",
      selected && "ring-2 ring-blue-400 ring-offset-1",
    )}>
      <Handles type={data.nodeType} />
      <p className="text-sm font-semibold">{data.label}</p>
      {data.sublabel && <p className="text-[10px] opacity-75 mt-0.5">{data.sublabel}</p>}
    </div>
  )
}

function Process({ data, selected }: { data: FlowNodeData; selected: boolean }) {
  return (
    <div className={cn(
      "relative px-4 py-3 rounded-lg border-2 border-blue-300 bg-blue-50 min-w-[140px] text-center shadow-sm transition-all",
      selected && "ring-2 ring-blue-400 ring-offset-1 border-blue-500",
    )}>
      <Handles type="process" />
      <p className="text-sm font-medium text-blue-900">{data.label}</p>
      {data.sublabel && <p className="text-[10px] text-blue-600 mt-0.5">{data.sublabel}</p>}
    </div>
  )
}

function Decision({ data, selected }: { data: FlowNodeData; selected: boolean }) {
  return (
    <div className={cn(
      "relative flex items-center justify-center transition-all",
      selected && "drop-shadow-[0_0_0_3px_#60a5fa]",
    )}
      style={{ width: 160, height: 80 }}
    >
      <Handles type="decision" />
      {/* SVG diamond */}
      <svg viewBox="0 0 160 80" className="absolute inset-0 w-full h-full overflow-visible">
        <polygon
          points="80,4 156,40 80,76 4,40"
          fill="#fef9c3"
          stroke="#ca8a04"
          strokeWidth="2"
        />
      </svg>
      <div className="relative z-10 text-center px-6">
        <p className="text-xs font-semibold text-yellow-900 leading-tight">{data.label}</p>
        {data.sublabel && <p className="text-[9px] text-yellow-700 mt-0.5">{data.sublabel}</p>}
      </div>
    </div>
  )
}

function Document({ data, selected }: { data: FlowNodeData; selected: boolean }) {
  return (
    <div className={cn(
      "relative flex items-center justify-center transition-all",
      selected && "drop-shadow-[0_0_0_3px_#60a5fa]",
    )}
      style={{ width: 150, height: 70 }}
    >
      <Handles type="document" />
      <svg viewBox="0 0 150 70" className="absolute inset-0 w-full h-full overflow-visible">
        <path
          d="M4,4 L146,4 L146,58 Q112,72 75,58 Q38,44 4,58 Z"
          fill="#f0fdf4"
          stroke="#16a34a"
          strokeWidth="2"
        />
      </svg>
      <div className="relative z-10 text-center px-4 pb-2">
        <p className="text-xs font-medium text-green-900 leading-tight">{data.label}</p>
        {data.sublabel && <p className="text-[9px] text-green-700 mt-0.5">{data.sublabel}</p>}
      </div>
    </div>
  )
}

function Connector({ data, selected }: { data: FlowNodeData; selected: boolean }) {
  return (
    <div className={cn(
      "relative w-12 h-12 rounded-full border-2 border-slate-400 bg-slate-100 flex items-center justify-center shadow-sm transition-all",
      selected && "ring-2 ring-blue-400 ring-offset-1",
    )}>
      <Handles type="connector" />
      <p className="text-[10px] font-bold text-slate-600 leading-none">{data.label}</p>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function FlowNode({ data, selected }: NodeProps<FlowNodeModel>) {
  switch (data.nodeType) {
    case "start":     return <StartEnd data={data} selected={!!selected} isEnd={false} />
    case "end":       return <StartEnd data={data} selected={!!selected} isEnd={true}  />
    case "process":   return <Process  data={data} selected={!!selected} />
    case "decision":  return <Decision data={data} selected={!!selected} />
    case "document":  return <Document data={data} selected={!!selected} />
    case "connector": return <Connector data={data} selected={!!selected} />
    default:          return <Process  data={data} selected={!!selected} />
  }
}
