"use client"

import { X } from "lucide-react"
import { ProcessOrgNodeData, ProcessOrgNodeModel, ProcessOrgNodeType } from "./ProcessOrgNode"

const TYPE_LABELS: Record<ProcessOrgNodeType, string> = {
  collaborator: "Colaborador",
  role:         "Função / Cargo",
  department:   "Departamento",
  category:     "Categoria",
  activity:     "Atividade",
  item:         "Item / Etapa",
  description:  "Descrição",
  unit:         "Empresa / Unidade",
}

interface Props {
  node:     ProcessOrgNodeModel
  onChange: (patch: Partial<ProcessOrgNodeData>) => void
  onClose:  () => void
}

export function ProcessOrgNodeEditPanel({ node, onChange, onClose }: Props) {
  const d = node.data

  return (
    <div className="w-64 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-700">Editar nó</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Tipo */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Tipo</label>
          <select
            value={d.nodeType}
            onChange={e => onChange({ nodeType: e.target.value as ProcessOrgNodeType })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            {(Object.entries(TYPE_LABELS) as [ProcessOrgNodeType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Rótulo */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Rótulo</label>
          <input
            type="text"
            value={d.label ?? ""}
            onChange={e => onChange({ label: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
            placeholder="Texto principal"
          />
        </div>

        {/* Sub-rótulo */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Sub-rótulo</label>
          <input
            type="text"
            value={d.sublabel ?? ""}
            onChange={e => onChange({ sublabel: e.target.value || undefined })}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
            placeholder="Texto secundário (opcional)"
          />
        </div>

        {/* Cor personalizada — só para unit e department */}
        {(d.nodeType === "unit" || d.nodeType === "department") && (
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Cor personalizada</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={d.color ?? (d.nodeType === "unit" ? "#dc2626" : "#1e293b")}
                onChange={e => onChange({ color: e.target.value })}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
              />
              <span className="text-xs text-slate-500">{d.color ?? "padrão"}</span>
              {d.color && (
                <button
                  onClick={() => onChange({ color: undefined })}
                  className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                >
                  Resetar
                </button>
              )}
            </div>
          </div>
        )}

        {/* ID de origem (somente leitura) */}
        {d.sourceId && (
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Origem (somente leitura)
            </label>
            <p className="text-[10px] text-slate-400 font-mono bg-slate-50 rounded px-2 py-1 border border-slate-200 truncate">
              {d.sourceId}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
