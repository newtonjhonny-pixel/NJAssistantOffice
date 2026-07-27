"use client"

import { Node } from "@xyflow/react"
import { X } from "lucide-react"
import { FlowNodeData, FlowNodeType } from "./FlowNode"

interface Props {
  node:     Node<FlowNodeData>
  onChange: (patch: Partial<FlowNodeData>) => void
  onClose:  () => void
}

const TYPE_LABELS: Record<FlowNodeType, string> = {
  start:     "Início",
  end:       "Fim",
  process:   "Processo",
  decision:  "Decisão",
  document:  "Documento",
  connector: "Conector",
  lane:      "Raia",
}

const EDITABLE_TYPES: FlowNodeType[] = ["process", "decision", "document"]

export function FlowNodeEditPanel({ node, onChange, onClose }: Props) {
  const d = node.data

  return (
    <div className="w-56 shrink-0 border-l border-slate-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-700">Editar elemento</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
          <div className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 bg-slate-50">
            {TYPE_LABELS[d.nodeType] ?? d.nodeType}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Texto principal</label>
          <input
            type="text"
            value={d.label}
            onChange={e => onChange({ label: e.target.value })}
            placeholder="Descreva o elemento..."
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Subtexto</label>
          <input
            type="text"
            value={d.sublabel ?? ""}
            onChange={e => onChange({ sublabel: e.target.value || undefined })}
            placeholder="Detalhe opcional..."
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {EDITABLE_TYPES.includes(d.nodeType) && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Alterar tipo</label>
            <select
              value={d.nodeType}
              onChange={e => onChange({ nodeType: e.target.value as FlowNodeType })}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none bg-white"
            >
              {EDITABLE_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center">
          Arraste os elementos para reposicionar.<br />
          Conecte arrastando de ⚫ para ⚫.
        </p>
      </div>
    </div>
  )
}
