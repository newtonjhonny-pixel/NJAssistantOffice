"use client"

import {
  Trash2, ZoomIn, ZoomOut, Maximize2, Save, LayoutGrid,
  Play, Square, Diamond, FileText, Circle, GitBranch,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FlowNodeType } from "./FlowNode"

interface Props {
  canDelete:    boolean
  saving:       boolean
  onAddNode:    (type: FlowNodeType) => void
  onDelete:     () => void
  onSave:       () => void
  onFitView:    () => void
  onZoomIn:     () => void
  onZoomOut:    () => void
  onAutoLayout: () => void
}

const ADD_TYPES: { type: FlowNodeType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { type: "start",     label: "Início",    icon: Play,     color: "text-green-700", bg: "bg-green-50 border-green-200 hover:bg-green-100" },
  { type: "process",   label: "Processo",  icon: Square,   color: "text-blue-700",  bg: "bg-blue-50 border-blue-200 hover:bg-blue-100"   },
  { type: "decision",  label: "Decisão",   icon: Diamond,  color: "text-yellow-700",bg: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100" },
  { type: "document",  label: "Documento", icon: FileText, color: "text-green-700", bg: "bg-green-50 border-green-200 hover:bg-green-100" },
  { type: "connector", label: "Conector",  icon: Circle,   color: "text-slate-600", bg: "bg-slate-50 border-slate-200 hover:bg-slate-100" },
  { type: "end",       label: "Fim",       icon: Square,   color: "text-red-700",   bg: "bg-red-50 border-red-200 hover:bg-red-100"       },
]

export function FlowToolbar({ canDelete, saving, onAddNode, onDelete, onSave, onFitView, onZoomIn, onZoomOut, onAutoLayout }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap p-2 bg-white border-b border-slate-200 rounded-t-xl">
      <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1 flex-wrap">
        <span className="text-[10px] text-slate-400 font-medium mr-1">Adicionar:</span>
        {ADD_TYPES.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.type}
              onClick={() => onAddNode(t.type)}
              title={`Adicionar ${t.label}`}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                t.bg, t.color,
              )}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          )
        })}
      </div>

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

      <button
        onClick={onAutoLayout}
        title="Organizar automaticamente"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Organizar
      </button>

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
