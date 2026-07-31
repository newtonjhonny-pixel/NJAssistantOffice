"use client"

import { NodeProps, Node, NodeResizer } from "@xyflow/react"
import { cn } from "@/lib/utils"

export interface BpmnLaneData extends Record<string, unknown> {
  nodeType: "bpmn-lane"
  label:    string
  color?:   string
}

export type BpmnLaneModel = Node<BpmnLaneData>

const LANE_COLORS = [
  { label: "Azul",     value: "blue"   },
  { label: "Verde",    value: "green"  },
  { label: "Roxo",     value: "purple" },
  { label: "Laranja",  value: "orange" },
  { label: "Cinza",    value: "slate"  },
  { label: "Rosa",     value: "pink"   },
]

const STRIPE: Record<string, { bg: string; border: string; header: string; text: string }> = {
  blue:   { bg: "bg-blue-50/60",   border: "border-blue-300",   header: "bg-blue-200",   text: "text-blue-900"   },
  green:  { bg: "bg-green-50/60",  border: "border-green-300",  header: "bg-green-200",  text: "text-green-900"  },
  purple: { bg: "bg-purple-50/60", border: "border-purple-300", header: "bg-purple-200", text: "text-purple-900" },
  orange: { bg: "bg-orange-50/60", border: "border-orange-300", header: "bg-orange-200", text: "text-orange-900" },
  slate:  { bg: "bg-slate-50/60",  border: "border-slate-300",  header: "bg-slate-200",  text: "text-slate-900"  },
  pink:   { bg: "bg-pink-50/60",   border: "border-pink-300",   header: "bg-pink-200",   text: "text-pink-900"   },
}

export function BpmnLane({ data, selected }: NodeProps<BpmnLaneModel>) {
  const c = STRIPE[data.color ?? "slate"]
  return (
    <div className={cn(
      "relative w-full h-full rounded-lg border-2 overflow-hidden",
      c.bg, c.border,
      selected && "ring-2 ring-blue-400 ring-offset-1",
    )}>
      <NodeResizer minWidth={240} minHeight={80} isVisible={!!selected} />
      {/* Vertical label on the left */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center", c.header)}>
        <span className={cn("text-[11px] font-semibold whitespace-nowrap", c.text)}
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          {data.label}
        </span>
      </div>
    </div>
  )
}

export { LANE_COLORS }
