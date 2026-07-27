"use client"

import { Handle, Position, Node, NodeProps } from "@xyflow/react"
import { User, Briefcase, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type OrgNodeType = "root" | "manager" | "employee" | "department"

export interface OrgNodeData {
  label:      string
  role?:      string
  email?:     string
  department?: string
  nodeType:   OrgNodeType
  color?:     string
  [key: string]: unknown
}

export type OrgNodeModel = Node<OrgNodeData, "orgNode">

const NODE_STYLES: Record<OrgNodeType, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  root:       { bg: "bg-blue-600",   border: "border-blue-700",  icon: Building2, iconColor: "text-white" },
  manager:    { bg: "bg-indigo-50",  border: "border-indigo-300",icon: Briefcase, iconColor: "text-indigo-600" },
  employee:   { bg: "bg-white",      border: "border-slate-200", icon: User,      iconColor: "text-slate-500" },
  department: { bg: "bg-slate-50",   border: "border-slate-300", icon: Building2, iconColor: "text-slate-600" },
}

export function OrgNode({ data, selected }: NodeProps<OrgNodeModel>) {
  const cfg  = NODE_STYLES[data.nodeType] ?? NODE_STYLES.employee
  const Icon = cfg.icon
  const isRoot = data.nodeType === "root"

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 shadow-sm min-w-[160px] max-w-[220px] transition-all",
        cfg.bg, cfg.border,
        selected && "ring-2 ring-blue-400 ring-offset-1",
        isRoot && "text-white shadow-md",
      )}
    >
      {/* Top handle */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
        />
      )}

      <div className="p-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
            isRoot ? "bg-white/20" : "bg-slate-100",
          )}>
            <Icon className={cn("w-4 h-4", isRoot ? "text-white" : cfg.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn(
              "text-sm font-semibold leading-tight truncate",
              isRoot ? "text-white" : "text-slate-800",
            )}>
              {data.label}
            </p>
            {data.role && (
              <p className={cn(
                "text-[11px] leading-tight truncate mt-0.5",
                isRoot ? "text-blue-100" : "text-slate-500",
              )}>
                {data.role}
              </p>
            )}
          </div>
        </div>

        {data.department && !isRoot && (
          <p className="text-[10px] text-slate-400 mt-1.5 truncate border-t border-slate-100 pt-1.5">
            {data.department}
          </p>
        )}
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  )
}
