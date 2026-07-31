"use client"

import { Handle, Position, Node, NodeProps } from "@xyflow/react"
import { cn } from "@/lib/utils"
import {
  Hand, User, Settings, ChevronDown, X, Plus,
  FileText, Mail, CheckCircle, Clock, AlignLeft,
  AlertTriangle, Zap,
} from "lucide-react"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type BpmnNodeType =
  | "bpmn-start" | "bpmn-intermediate" | "bpmn-end"
  | "bpmn-task"  | "bpmn-task-manual" | "bpmn-task-user" | "bpmn-task-system" | "bpmn-subprocess"
  | "bpmn-gateway-exclusive" | "bpmn-gateway-parallel"
  | "bpmn-document" | "bpmn-message" | "bpmn-approval" | "bpmn-wait"
  | "bpmn-annotation" | "bpmn-lane"

export interface BpmnNodeData extends Record<string, unknown> {
  nodeType:     BpmnNodeType
  label:        string
  sublabel?:    string
  responsible?: string
  department?:  string
  system?:      string
  laneId?:      string
  isGap?:       boolean
  isManual?:    boolean
  isAutomated?: boolean
  isEliminated?:boolean
  riskLevel?:   "low" | "medium" | "high"
  observation?: string
}

export type BpmnNodeModel = Node<BpmnNodeData>

// ── Handles ───────────────────────────────────────────────────────────────────

function AllHandles({ show = true }: { show?: boolean }) {
  if (!show) return null
  const cls = "!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white !z-10"
  return (
    <>
      <Handle type="target" position={Position.Top}    className={cls} />
      <Handle type="source" position={Position.Bottom} className={cls} />
      <Handle type="target" position={Position.Left}   className={cn(cls, "!opacity-0 hover:!opacity-100")} />
      <Handle type="source" position={Position.Right}  className={cn(cls, "!opacity-0 hover:!opacity-100")} />
    </>
  )
}

// ── Badges de destaque ────────────────────────────────────────────────────────

function NodeBadges({ data }: { data: BpmnNodeData }) {
  if (!data.isGap && !data.isManual && !data.isAutomated && !data.isEliminated && !data.riskLevel) return null
  return (
    <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
      {data.isGap        && <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center" title="Gargalo"><AlertTriangle className="w-2 h-2 text-white" /></span>}
      {data.isManual     && <span className="w-3.5 h-3.5 rounded-full bg-orange-400 flex items-center justify-center" title="Manual"><Hand className="w-2 h-2 text-white" /></span>}
      {data.isAutomated  && <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center" title="Automatizado"><Zap className="w-2 h-2 text-white" /></span>}
      {data.isEliminated && <span className="w-3.5 h-3.5 rounded-full bg-slate-400 flex items-center justify-center" title="Eliminado"><X className="w-2 h-2 text-white" /></span>}
    </div>
  )
}

// ── Evento (círculo) ──────────────────────────────────────────────────────────

function EventNode({ data, selected, variant }: { data: BpmnNodeData; selected: boolean; variant: "start" | "intermediate" | "end" }) {
  const colors = {
    start:        { outer: "border-green-600 bg-green-50",  text: "text-green-800" },
    intermediate: { outer: "border-yellow-500 bg-yellow-50", text: "text-yellow-800" },
    end:          { outer: "border-red-600 bg-red-100",     text: "text-red-800" },
  }
  const c = colors[variant]
  return (
    <div className="flex flex-col items-center">
      <div className={cn(
        "relative w-10 h-10 rounded-full border-[3px] flex items-center justify-center shadow-sm transition-all",
        c.outer,
        variant === "intermediate" && "border-double border-4",
        variant === "end"          && "border-[4px]",
        selected && "ring-2 ring-blue-400 ring-offset-1",
      )}>
        <AllHandles />
        <NodeBadges data={data} />
      </div>
      <p className={cn("text-[10px] font-medium mt-1 text-center leading-tight max-w-[80px]", c.text)}>
        {data.label}
      </p>
    </div>
  )
}

// ── Tarefa genérica ───────────────────────────────────────────────────────────

function TaskNode({ data, selected, icon: Icon, borderColor, bgColor, textColor }: {
  data: BpmnNodeData; selected: boolean
  icon?: React.ElementType; borderColor: string; bgColor: string; textColor: string
}) {
  const riskBorder = data.riskLevel === "high" ? "border-red-400" : data.riskLevel === "medium" ? "border-orange-300" : undefined
  return (
    <div className={cn(
      "relative rounded-lg border-2 min-w-[130px] max-w-[190px] shadow-sm transition-all",
      bgColor, riskBorder ?? borderColor,
      selected && "ring-2 ring-blue-400 ring-offset-1",
    )}>
      <AllHandles />
      <NodeBadges data={data} />
      {Icon && (
        <div className="absolute top-1.5 left-1.5">
          <Icon className={cn("w-3 h-3 opacity-60", textColor)} />
        </div>
      )}
      <div className={cn("px-3 py-2.5 text-center", Icon && "pt-2")}>
        <p className={cn("text-[11px] font-medium leading-snug", textColor)}>{data.label}</p>
        {data.sublabel && <p className={cn("text-[9px] mt-0.5 opacity-70", textColor)}>{data.sublabel}</p>}
        {data.responsible && <p className="text-[9px] mt-1 opacity-50 italic">{data.responsible}</p>}
      </div>
    </div>
  )
}

// ── Subprocesso ───────────────────────────────────────────────────────────────

function SubprocessNode({ data, selected }: { data: BpmnNodeData; selected: boolean }) {
  return (
    <div className={cn(
      "relative rounded-lg border-2 border-purple-400 bg-purple-50 min-w-[130px] max-w-[190px] shadow-sm transition-all",
      selected && "ring-2 ring-blue-400 ring-offset-1",
    )}>
      <AllHandles />
      <NodeBadges data={data} />
      <div className="px-3 py-2.5 text-center">
        <p className="text-[11px] font-medium text-purple-900 leading-snug">{data.label}</p>
        {data.sublabel && <p className="text-[9px] text-purple-600 mt-0.5">{data.sublabel}</p>}
      </div>
      {/* Expand marker */}
      <div className="flex justify-center pb-1.5">
        <div className="w-4 h-4 rounded border border-purple-400 flex items-center justify-center">
          <Plus className="w-2.5 h-2.5 text-purple-600" />
        </div>
      </div>
    </div>
  )
}

// ── Gateway (losango) ─────────────────────────────────────────────────────────

function GatewayNode({ data, selected, type }: { data: BpmnNodeData; selected: boolean; type: "exclusive" | "parallel" }) {
  const isExclusive = type === "exclusive"
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn("relative flex items-center justify-center transition-all", selected && "drop-shadow-[0_0_0_3px_#60a5fa]")}
        style={{ width: 52, height: 52 }}
      >
        <AllHandles />
        <NodeBadges data={data} />
        <svg viewBox="0 0 52 52" className="absolute inset-0 w-full h-full overflow-visible">
          <polygon
            points="26,3 49,26 26,49 3,26"
            fill={isExclusive ? "#fef9c3" : "#ccfbf1"}
            stroke={isExclusive ? "#ca8a04" : "#0d9488"}
            strokeWidth="2"
          />
        </svg>
        <div className="relative z-10">
          {isExclusive
            ? <X className="w-4 h-4 text-yellow-800" strokeWidth={3} />
            : <Plus className="w-4 h-4 text-teal-800" strokeWidth={3} />
          }
        </div>
      </div>
      <p className={cn("text-[10px] font-medium mt-0.5 text-center leading-tight max-w-[80px]",
        isExclusive ? "text-yellow-800" : "text-teal-800")}>
        {data.label}
      </p>
    </div>
  )
}

// ── Documento (forma de documento) ────────────────────────────────────────────

function DocumentNode({ data, selected }: { data: BpmnNodeData; selected: boolean }) {
  return (
    <div
      className={cn("relative flex flex-col items-center justify-center transition-all", selected && "drop-shadow-[0_0_0_3px_#60a5fa]")}
      style={{ width: 110, height: 70 }}
    >
      <AllHandles />
      <NodeBadges data={data} />
      <svg viewBox="0 0 110 70" className="absolute inset-0 w-full h-full overflow-visible">
        <path d="M4,4 L106,4 L106,56 Q83,68 55,56 Q28,44 4,56 Z" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />
      </svg>
      <div className="relative z-10 text-center px-4 pb-3">
        <FileText className="w-3 h-3 text-green-700 mx-auto mb-0.5" />
        <p className="text-[10px] font-medium text-green-900 leading-tight">{data.label}</p>
      </div>
    </div>
  )
}

// ── Mensagem (envelope) ───────────────────────────────────────────────────────

function MessageNode({ data, selected }: { data: BpmnNodeData; selected: boolean }) {
  return (
    <div className={cn(
      "relative w-24 h-16 flex flex-col items-center justify-center border-2 border-blue-400 bg-blue-50 rounded shadow-sm transition-all",
      selected && "ring-2 ring-blue-400 ring-offset-1",
    )}>
      <AllHandles />
      <NodeBadges data={data} />
      {/* Envelope shape */}
      <svg viewBox="0 0 40 28" className="w-8 h-5 mb-0.5">
        <rect x="1" y="1" width="38" height="26" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5"/>
        <path d="M1,1 L20,16 L39,1" fill="none" stroke="#3b82f6" strokeWidth="1.5"/>
      </svg>
      <p className="text-[9px] font-medium text-blue-900 text-center leading-tight px-1">{data.label}</p>
    </div>
  )
}

// ── Aprovação ────────────────────────────────────────────────────────────────

function ApprovalNode({ data, selected }: { data: BpmnNodeData; selected: boolean }) {
  return (
    <div className={cn(
      "relative rounded-xl border-2 border-orange-400 bg-orange-50 min-w-[120px] max-w-[180px] shadow-sm transition-all",
      selected && "ring-2 ring-blue-400 ring-offset-1",
    )}>
      <AllHandles />
      <NodeBadges data={data} />
      <div className="px-3 py-2.5 text-center">
        <CheckCircle className="w-4 h-4 text-orange-600 mx-auto mb-1" />
        <p className="text-[11px] font-medium text-orange-900 leading-snug">{data.label}</p>
        {data.responsible && <p className="text-[9px] mt-0.5 text-orange-600 opacity-70">{data.responsible}</p>}
      </div>
    </div>
  )
}

// ── Espera ────────────────────────────────────────────────────────────────────

function WaitNode({ data, selected }: { data: BpmnNodeData; selected: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={cn(
        "relative w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center shadow-sm transition-all",
        selected && "ring-2 ring-blue-400 ring-offset-1",
      )}>
        <AllHandles />
        <NodeBadges data={data} />
        <Clock className="w-5 h-5 text-amber-600" />
      </div>
      <p className="text-[10px] font-medium mt-1 text-center text-amber-800 max-w-[80px]">{data.label}</p>
    </div>
  )
}

// ── Anotação ──────────────────────────────────────────────────────────────────

function AnnotationNode({ data, selected }: { data: BpmnNodeData; selected: boolean }) {
  return (
    <div className={cn(
      "relative max-w-[180px] transition-all",
      selected && "drop-shadow-[0_0_0_2px_#60a5fa]",
    )}>
      <AllHandles show={false} />
      {/* Open bracket */}
      <div className="flex gap-1">
        <div className="w-1.5 border-l-2 border-t-2 border-b-2 border-slate-400 rounded-l-sm shrink-0" />
        <div className="bg-slate-50 border border-slate-200 rounded-r-lg px-2 py-1.5">
          <AlignLeft className="w-3 h-3 text-slate-400 mb-0.5" />
          <p className="text-[10px] text-slate-600 leading-snug">{data.label}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function BpmnNode({ data, selected }: NodeProps<BpmnNodeModel>) {
  const sel = !!selected
  switch (data.nodeType) {
    case "bpmn-start":        return <EventNode data={data} selected={sel} variant="start" />
    case "bpmn-intermediate":  return <EventNode data={data} selected={sel} variant="intermediate" />
    case "bpmn-end":           return <EventNode data={data} selected={sel} variant="end" />
    case "bpmn-task":          return <TaskNode  data={data} selected={sel} borderColor="border-blue-300"   bgColor="bg-blue-50"   textColor="text-blue-900"   />
    case "bpmn-task-manual":   return <TaskNode  data={data} selected={sel} borderColor="border-cyan-400"   bgColor="bg-cyan-50"   textColor="text-cyan-900"   icon={Hand}     />
    case "bpmn-task-user":     return <TaskNode  data={data} selected={sel} borderColor="border-indigo-400" bgColor="bg-indigo-50" textColor="text-indigo-900" icon={User}     />
    case "bpmn-task-system":   return <TaskNode  data={data} selected={sel} borderColor="border-slate-400"  bgColor="bg-slate-50"  textColor="text-slate-900"  icon={Settings} />
    case "bpmn-subprocess":    return <SubprocessNode data={data} selected={sel} />
    case "bpmn-gateway-exclusive": return <GatewayNode data={data} selected={sel} type="exclusive" />
    case "bpmn-gateway-parallel":  return <GatewayNode data={data} selected={sel} type="parallel"  />
    case "bpmn-document":      return <DocumentNode data={data} selected={sel} />
    case "bpmn-message":       return <MessageNode  data={data} selected={sel} />
    case "bpmn-approval":      return <ApprovalNode data={data} selected={sel} />
    case "bpmn-wait":          return <WaitNode     data={data} selected={sel} />
    case "bpmn-annotation":    return <AnnotationNode data={data} selected={sel} />
    default:                   return <TaskNode data={data} selected={sel} borderColor="border-blue-300" bgColor="bg-blue-50" textColor="text-blue-900" />
  }
}
