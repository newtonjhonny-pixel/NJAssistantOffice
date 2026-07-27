"use client"

import { Plus, BookOpen, Save, Loader2, Download, Eye } from "lucide-react"

interface Props {
  title:         string
  saving:        boolean
  exporting:     boolean
  onTitleChange: (v: string) => void
  onAddSegment:  () => void
  onOpenLibrary: () => void
  onExport:      () => void
  onPreview:     () => void
  onSave:        () => void
}

export function TeamOrgToolbar({
  title, saving, exporting,
  onTitleChange, onAddSegment, onOpenLibrary, onExport, onPreview, onSave,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 rounded-t-xl min-h-[48px] flex-wrap">
      {/* Title */}
      <input
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Título do organograma"
        className="flex-1 min-w-[200px] text-sm font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none px-1 uppercase tracking-wide"
      />

      <div className="flex items-center gap-1.5 ml-auto flex-wrap">
        {/* Add segment */}
        <button
          onClick={onAddSegment}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Segmento
        </button>

        {/* Library */}
        <button
          onClick={onOpenLibrary}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
        >
          <BookOpen className="w-3 h-3" />
          Biblioteca
        </button>

        {/* Preview */}
        <button
          onClick={onPreview}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
        >
          <Eye className="w-3 h-3" />
          Visualizar
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          disabled={exporting}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 border border-slate-200 transition-colors"
        >
          {exporting
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Download className="w-3 h-3" />}
          {exporting ? "Exportando…" : "Exportar"}
        </button>

        {/* Save */}
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  )
}
