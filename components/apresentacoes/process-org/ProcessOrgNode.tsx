"use client"

import { Handle, Position, NodeProps, Node } from "@xyflow/react"
import { cn } from "@/lib/utils"
import {
  User, Briefcase, Building2, FolderOpen,
  ClipboardList, CheckSquare, AlignLeft, Globe,
} from "lucide-react"

export type ProcessOrgNodeType =
  | "collaborator" | "role" | "department" | "category"
  | "activity"     | "item" | "description" | "unit"

export interface ProcessOrgNodeData extends Record<string, unknown> {
  nodeType:   ProcessOrgNodeType
  label:      string
  sublabel?:  string
  color?:     string
  sourceId?:  string
}

export type ProcessOrgNodeModel = Node<ProcessOrgNodeData>

const TYPE_CFG: Record<ProcessOrgNodeType, {
  bg:     string
  text:   string
  border: string
  Icon:   React.ElementType
}> = {
  collaborator: { bg: "bg-blue-600",    text: "text-white",     border: "border-blue-700",   Icon: User },
  role:         { bg: "bg-violet-600",  text: "text-white",     border: "border-violet-700", Icon: Briefcase },
  department:   { bg: "bg-slate-800",   text: "text-white",     border: "border-slate-900",  Icon: Building2 },
  category:     { bg: "bg-orange-500",  text: "text-white",     border: "border-orange-600", Icon: FolderOpen },
  activity:     { bg: "bg-emerald-600", text: "text-white",     border: "border-emerald-700",Icon: ClipboardList },
  item:         { bg: "bg-slate-500",   text: "text-white",     border: "border-slate-600",  Icon: CheckSquare },
  description:  { bg: "bg-white",       text: "text-slate-700", border: "border-slate-300",  Icon: AlignLeft },
  unit:         { bg: "bg-red-600",     text: "text-white",     border: "border-red-700",    Icon: Globe },
}

export function ProcessOrgNode({ data, selected }: NodeProps<ProcessOrgNodeModel>) {
  const cfg  = TYPE_CFG[data.nodeType] ?? TYPE_CFG.activity
  const Icon = cfg.Icon

  const style = data.color && (data.nodeType === "unit" || data.nodeType === "department")
    ? { backgroundColor: data.color, borderColor: data.color }
    : undefined

  return (
    <div
      className={cn(
        "rounded-xl border-2 shadow-md min-w-[140px] max-w-[210px] transition-all",
        cfg.bg, cfg.border,
        selected && "ring-2 ring-offset-1 ring-blue-400",
      )}
      style={style}
    >
      <Handle type="target" position={Position.Top}    className="!bg-white/80 !border-white/50 !w-2 !h-2" />
      <Handle type="target" position={Position.Left}   className="!bg-white/80 !border-white/50 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-white/80 !border-white/50 !w-2 !h-2" />
      <Handle type="source" position={Position.Right}  className="!bg-white/80 !border-white/50 !w-2 !h-2" />

      <div className="flex items-start gap-2 px-3 py-2.5">
        <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5 opacity-80", cfg.text)} />
        <div className="min-w-0 overflow-hidden">
          <p className={cn("text-[11px] font-semibold leading-snug break-words", cfg.text)}>{data.label}</p>
          {data.sublabel && (
            <p className={cn("text-[10px] mt-0.5 opacity-70 leading-tight break-words", cfg.text)}>
              {data.sublabel}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
