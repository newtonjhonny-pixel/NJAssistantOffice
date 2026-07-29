"use client"

import {
  Trash2, ZoomIn, ZoomOut, Maximize2, Save, LayoutGrid,
  FileDown, Image, Printer, Download, Users,
  User, Briefcase, Building2, FolderOpen, ClipboardList,
  CheckSquare, AlignLeft, Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProcessOrgNodeType } from "./ProcessOrgNode"

interface Props {
  canDelete:     boolean
  saving:        boolean
  exporting?:    boolean
  onAddNode:     (type: ProcessOrgNodeType) => void
  onDelete:      () => void
  onSave:        () => void
  onFitView:     () => void
  onZoomIn:      () => void
  onZoomOut:     () => void
  onAutoLayout:  () => void
  onImport?:     () => void
  onExportPdf?:  () => void
  onExportPng?:  () => void
  onExportJpeg?: () => void
  onPrint?:      () => void
}

const ADD_TYPES: { type: ProcessOrgNodeType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { type: "collaborator", label: "Colaborador",    icon: User,          color: "text-blue-700",   bg: "bg-blue-50 border-blue-200 hover:bg-blue-100" },
  { type: "role",         label: "Função",         icon: Briefcase,     color: "text-violet-700", bg: "bg-violet-50 border-violet-200 hover:bg-violet-100" },
  { type: "department",   label: "Departamento",   icon: Building2,     color: "text-slate-700",  bg: "bg-slate-100 border-slate-300 hover:bg-slate-200" },
  { type: "category",     label: "Categoria",      icon: FolderOpen,    color: "text-orange-700", bg: "bg-orange-50 border-orange-200 hover:bg-orange-100" },
  { type: "activity",     label: "Atividade",      icon: ClipboardList, color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  { type: "item",         label: "Item",           icon: CheckSquare,   color: "text-slate-600",  bg: "bg-slate-50 border-slate-200 hover:bg-slate-100" },
  { type: "description",  label: "Descrição",      icon: AlignLeft,     color: "text-slate-600",  bg: "bg-white border-slate-200 hover:bg-slate-50" },
  { type: "unit",         label: "Empresa/Unidade",icon: Globe,         color: "text-red-700",    bg: "bg-red-50 border-red-200 hover:bg-red-100" },
]

export function ProcessOrgToolbar({
  canDelete, saving, exporting,
  onAddNode, onDelete, onSave,
  onFitView, onZoomIn, onZoomOut, onAutoLayout,
  onImport,
  onExportPdf, onExportPng, onExportJpeg, onPrint,
}: Props) {
  return (
    <div className="flex flex-col bg-white border-b border-slate-200 rounded-t-xl">
      {/* Linha 1: adicionar nós */}
      <div className="flex items-center gap-1 flex-wrap px-2 pt-2 pb-1">
        <span className="text-[10px] text-slate-400 font-medium mr-1 shrink-0">Adicionar:</span>
        {ADD_TYPES.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.type}
              onClick={() => onAddNode(t.type)}
              title={`Adicionar ${t.label}`}
              className={cn(
                "flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium border transition-colors",
                t.bg, t.color,
              )}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Linha 2: ações */}
      <div className="flex items-center gap-1.5 flex-wrap px-2 pb-2">
        {onImport && (
          <button
            onClick={onImport}
            title="Gerar a partir da Gestão de Equipe"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Gerar da Equipe
          </button>
        )}

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

        {/* Exportar */}
        <span className="text-[10px] text-slate-400 font-medium">Exportar:</span>
        {onExportPdf && (
          <button
            onClick={onExportPdf}
            disabled={exporting}
            title="Exportar PDF (A4 paisagem)"
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium border border-slate-200 bg-slate-50 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-slate-600 transition-colors disabled:opacity-40"
          >
            <FileDown className="w-3 h-3" />
            PDF
          </button>
        )}
        {onExportPng && (
          <button
            onClick={onExportPng}
            disabled={exporting}
            title="Exportar PNG"
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-slate-600 transition-colors disabled:opacity-40"
          >
            <Image className="w-3 h-3" />
            PNG
          </button>
        )}
        {onExportJpeg && (
          <button
            onClick={onExportJpeg}
            disabled={exporting}
            title="Exportar JPEG"
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 text-slate-600 transition-colors disabled:opacity-40"
          >
            <Image className="w-3 h-3" />
            JPEG
          </button>
        )}
        {onPrint && (
          <button
            onClick={onPrint}
            disabled={exporting}
            title="Imprimir"
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-600 transition-colors disabled:opacity-40"
          >
            <Printer className="w-3 h-3" />
            Imprimir
          </button>
        )}

        {exporting && <span className="text-[10px] text-slate-400 animate-pulse ml-1">Gerando…</span>}

        <div className="w-px h-4 bg-slate-200 mx-1" />

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
    </div>
  )
}
