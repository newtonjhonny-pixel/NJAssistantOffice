"use client"

import { Node } from "@xyflow/react"
import { X } from "lucide-react"
import { OrgNodeData, OrgNodeType } from "./OrgNode"

interface Props {
  node:     Node<OrgNodeData>
  onChange: (patch: Partial<OrgNodeData>) => void
  onClose:  () => void
}

const TYPE_LABELS: Record<OrgNodeType, string> = {
  root:       "Raiz (empresa)",
  manager:    "Gestor",
  employee:   "Colaborador",
  department: "Departamento",
}

export function OrgNodeEditPanel({ node, onChange, onClose }: Props) {
  const d = node.data

  function field(label: string, key: keyof OrgNodeData, placeholder: string, disabled = false) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <input
          type="text"
          value={(d[key] as string) ?? ""}
          disabled={disabled}
          placeholder={placeholder}
          onChange={e => onChange({ [key]: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>
    )
  }

  return (
    <div className="w-60 shrink-0 border-l border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-700">Editar nó</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Type (read-only) */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
          <div className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 bg-slate-50">
            {TYPE_LABELS[d.nodeType]}
          </div>
        </div>

        {field("Nome / Título", "label", "Ex: João Silva")}
        {d.nodeType !== "department" && field("Cargo / Função", "role", "Ex: Analista de RH")}
        {d.nodeType !== "root" && field("Departamento", "department", "Ex: Recursos Humanos")}
        {d.nodeType !== "department" && field("E-mail", "email", "Ex: joao@empresa.com")}

        {/* Node type change */}
        {d.nodeType !== "root" && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Alterar tipo</label>
            <select
              value={d.nodeType}
              onChange={e => onChange({ nodeType: e.target.value as OrgNodeType })}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none bg-white"
            >
              <option value="manager">Gestor</option>
              <option value="employee">Colaborador</option>
              <option value="department">Departamento</option>
            </select>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center">
          Arraste os nós para reposicionar.<br />
          Conecte arrastando de ⚫ para ⚫.
        </p>
      </div>
    </div>
  )
}
