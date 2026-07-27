"use client"

import {
  Plus, Trash2, ZoomIn, ZoomOut, Maximize2,
  Save, Undo2, LayoutGrid, User, Briefcase, Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OrgNodeType } from "./OrgNode"

interface Props {
  canDelete:    boolean
  saving:       boolean
  onAddNode:    (type: OrgNodeType) => void
  onDelete:     () => void
  onSave:       () => void
  onFitView:    () => void
  onZoomIn:     () => void
  onZoomOut:    () => void
  onAutoLayout: () => void
}

const ADD_TYPES: { type: OrgNodeType; label: string; icon: React.ElementType; color: string }[] = [
  { type: "manager",    label: "Gestor",      icon: Briefcase, color: "text-indigo-600" },
  { type: "employee",   label: "Colaborador", icon: User,      color: "text-slate-600" },
  { type: "department", label: "Depto",       icon: Building2, color: "text-slate-600" },
]

export function OrgToolbar({ canDelete, saving, onAddNode, onDelete, onSave, onFitView, onZoomIn, onZoomOut, onAutoLayout }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap p-2 bg-white border-b border-slate-200 rounded-t-xl">
      {/* Add nodes */}
      <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
        <span className="text-[10px] text-slate-400 font-medium mr-1">Adicionar:</span>
        {ADD_TYPES.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.type}
              onClick={() => onAddNode(t.type)}
              title={`Adicionar ${t.label}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
            >
              <Icon className={cn("w-3.5 h-3.5", t.color)} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        disabled={!canDelete}
        title="Excluir selecionado"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-red-600 border-red-200 hover:bg-red-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Excluir
      </button>

      <div className="flex-1" />

      {/* Auto layout */}
      <button
        onClick={onAutoLayout}
        title="Organizar automaticamente"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Organizar
      </button>

      {/* Zoom controls */}
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
        <button onClick={onZoomOut} title="Diminuir zoom" className="p-1.5 hover:bg-slate-50 transition-colors border-r border-slate-200">
          <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
        </button>
        <button onClick={onFitView} title="Ajustar à tela" className="p-1.5 hover:bg-slate-50 transition-colors border-r border-slate-200">
          <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
        </button>
        <button onClick={onZoomIn} title="Aumentar zoom" className="p-1.5 hover:bg-slate-50 transition-colors">
          <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
        </button>
      </div>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </div>
  )
}
