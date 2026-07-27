"use client"

import {
  Type, Square, Circle, Image, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Save, Plus, Trash2, ZoomIn, ZoomOut, Maximize2,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ElementType, FontSize, TextAlign, FONT_SIZES, BG_PRESETS } from "./slideTypes"

interface Props {
  selectedType?:    ElementType
  selectedFontSize?: FontSize
  selectedBold?:    boolean
  selectedItalic?:  boolean
  selectedAlign?:   TextAlign
  selectedColor?:   string
  slideBg?:         string
  saving:           boolean
  canDelete:        boolean
  onAddElement:     (type: ElementType) => void
  onDeleteElement:  () => void
  onFontSize:       (v: FontSize) => void
  onBold:           () => void
  onItalic:         () => void
  onAlign:          (v: TextAlign) => void
  onColor:          (v: string) => void
  onSlideBg:        (v: string) => void
  onZoomIn:         () => void
  onZoomOut:        () => void
  onFitView:        () => void
  onSave:           () => void
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5" />
}

const TEXT_COLORS = ["#ffffff", "#f8fafc", "#1e293b", "#334155", "#2563eb", "#16a34a", "#dc2626", "#ca8a04", "#7c3aed", "#db2777"]

export function SlideToolbar({
  selectedType, selectedFontSize, selectedBold, selectedItalic, selectedAlign, selectedColor,
  slideBg, saving, canDelete,
  onAddElement, onDeleteElement, onFontSize, onBold, onItalic, onAlign, onColor, onSlideBg,
  onZoomIn, onZoomOut, onFitView, onSave,
}: Props) {
  const isText = selectedType === "title" || selectedType === "text" || selectedType === "subtitle"

  return (
    <div className="flex items-center gap-1 flex-wrap p-2 bg-white border-b border-slate-200 rounded-t-xl min-h-[44px]">

      {/* Add elements */}
      <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-0.5">
        <span className="text-[10px] text-slate-400 font-medium">Inserir:</span>
        {([
          { type: "title"    as ElementType, icon: Type,   label: "Título",  color: "text-blue-600"  },
          { type: "text"     as ElementType, icon: Type,   label: "Texto",   color: "text-slate-600" },
          { type: "shape"    as ElementType, icon: Square, label: "Forma",   color: "text-purple-600"},
          { type: "image"    as ElementType, icon: Image,  label: "Imagem",  color: "text-green-600" },
        ]).map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => onAddElement(type)}
            title={`Inserir ${label}`}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
          >
            <Icon className={cn("w-3 h-3", color)} />
            {label}
          </button>
        ))}
      </div>

      {/* Text formatting — only when text element selected */}
      {isText && (
        <>
          {/* Font size */}
          <select
            value={selectedFontSize ?? "xl"}
            onChange={e => onFontSize(e.target.value as FontSize)}
            className="rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-400"
          >
            {FONT_SIZES.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* Bold / Italic */}
          <button
            onClick={onBold}
            className={cn("p-1.5 rounded border transition-colors", selectedBold ? "bg-blue-100 border-blue-300 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onItalic}
            className={cn("p-1.5 rounded border transition-colors", selectedItalic ? "bg-blue-100 border-blue-300 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <Divider />

          {/* Alignment */}
          {(["left", "center", "right"] as TextAlign[]).map((a, i) => {
            const Icon = [AlignLeft, AlignCenter, AlignRight][i]
            return (
              <button
                key={a}
                onClick={() => onAlign(a)}
                className={cn("p-1.5 rounded border transition-colors", selectedAlign === a ? "bg-blue-100 border-blue-300 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            )
          })}

          <Divider />

          {/* Text color */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] text-slate-400">Cor:</span>
            {TEXT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onColor(c)}
                title={c}
                className={cn(
                  "w-4 h-4 rounded-full border transition-all",
                  selectedColor === c ? "ring-2 ring-blue-400 ring-offset-1 scale-110" : "border-slate-300 hover:scale-110",
                )}
                style={{ background: c }}
              />
            ))}
          </div>

          <Divider />
        </>
      )}

      {/* Slide background */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-400">Fundo:</span>
        <div className="flex gap-0.5 flex-wrap max-w-[160px]">
          {BG_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => onSlideBg(p.value)}
              title={p.label}
              className={cn(
                "w-4 h-4 rounded border transition-all shrink-0",
                slideBg === p.value ? "ring-2 ring-blue-400 ring-offset-1 scale-110" : "border-slate-300 hover:scale-110",
              )}
              style={{ background: p.value }}
            />
          ))}
        </div>
      </div>

      <Divider />

      {/* Delete element */}
      <button
        onClick={onDeleteElement}
        disabled={!canDelete}
        title="Excluir elemento"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-red-600 border-red-200 hover:bg-red-50"
      >
        <Trash2 className="w-3 h-3" />
        Excluir
      </button>

      <div className="flex-1" />

      {/* Zoom */}
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
        <button onClick={onZoomOut} className="p-1.5 hover:bg-slate-50 transition-colors border-r border-slate-200">
          <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
        </button>
        <button onClick={onFitView} className="p-1.5 hover:bg-slate-50 transition-colors border-r border-slate-200">
          <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
        </button>
        <button onClick={onZoomIn} className="p-1.5 hover:bg-slate-50 transition-colors">
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
