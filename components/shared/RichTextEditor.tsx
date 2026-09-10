"use client"

import React, { useEffect, useRef } from "react"
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Quote, Code, Minus, Link as LinkIcon, CheckSquare as CheckSquareIcon,
  Table as TableIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Editor de texto rico compartilhado.
 *
 * Extraído de NotesClient para ser reutilizado por Anotações e por Pautas de
 * Reuniões. O markup, as classes e os comandos são EXATAMENTE os originais —
 * a extração é comportamentalmente neutra para Anotações.
 */

// ─── Comando de formatação ───────────────────────────────────────────────────

export function execFmt(cmd: string, value?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(document as any).execCommand(cmd, false, value ?? null)
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

export interface EditorToolbarProps {
  editorRef?: React.RefObject<HTMLDivElement | null>
  onLink?: () => void
  onChecklist?: () => void
  onTable?: () => void
}

export function EditorToolbar({ onLink, onChecklist, onTable }: EditorToolbarProps) {
  const btn = (icon: React.ReactNode, title: string, action: () => void, active?: boolean) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); action() }}
      className={cn(
        "p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900",
        active && "bg-slate-200 text-slate-900"
      )}
    >
      {icon}
    </button>
  )

  const sep = <div className="w-px h-5 bg-slate-200 mx-0.5" />

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex-wrap">
      {btn(<Bold className="w-3.5 h-3.5" />, "Negrito (Ctrl+B)", () => execFmt("bold"))}
      {btn(<Italic className="w-3.5 h-3.5" />, "Itálico (Ctrl+I)", () => execFmt("italic"))}
      {btn(<UnderlineIcon className="w-3.5 h-3.5" />, "Sublinhado (Ctrl+U)", () => execFmt("underline"))}
      {sep}
      {btn(<span className="text-xs font-bold">H1</span>, "Título 1", () => execFmt("formatBlock", "h1"))}
      {btn(<span className="text-xs font-bold">H2</span>, "Título 2", () => execFmt("formatBlock", "h2"))}
      {btn(<span className="text-xs font-bold">H3</span>, "Título 3", () => execFmt("formatBlock", "h3"))}
      {sep}
      {btn(<List className="w-3.5 h-3.5" />, "Lista com marcadores", () => execFmt("insertUnorderedList"))}
      {btn(<ListOrdered className="w-3.5 h-3.5" />, "Lista numerada", () => execFmt("insertOrderedList"))}
      {onChecklist && btn(<CheckSquareIcon className="w-3.5 h-3.5" />, "Checklist", onChecklist)}
      {sep}
      {btn(<Quote className="w-3.5 h-3.5" />, "Citação", () => execFmt("formatBlock", "blockquote"))}
      {btn(<Code className="w-3.5 h-3.5" />, "Bloco de código", () => execFmt("formatBlock", "pre"))}
      {sep}
      {btn(<span className="text-[10px] font-bold px-0.5" style={{ background: "#fef08a", color: "#713f12", borderRadius: 2 }}>A</span>, "Destacar texto", () => execFmt("hiliteColor", "#fef08a"))}
      {onLink  && btn(<LinkIcon className="w-3.5 h-3.5" />, "Inserir link", onLink)}
      {onTable && btn(<TableIcon className="w-3.5 h-3.5" />, "Inserir tabela", onTable)}
      {btn(<Minus className="w-3.5 h-3.5" />, "Separador", () => execFmt("insertHorizontalRule"))}
      {sep}
      {btn(<span className="text-[10px]">✕</span>, "Remover formatação", () => execFmt("removeFormat"))}
    </div>
  )
}

// ─── Classes de conteúdo (idênticas às originais de Anotações) ───────────────

export const EDITOR_CONTENT_CLASS = `text-sm text-slate-800 leading-relaxed outline-none
  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mb-2 [&_h1]:mt-4
  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-800 [&_h2]:mb-1.5 [&_h2]:mt-3
  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-700 [&_h3]:mb-1 [&_h3]:mt-2
  [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:pl-5 [&_ol]:space-y-1
  [&_li]:text-slate-700
  [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2
  [&_pre]:bg-slate-50 [&_pre]:border [&_pre]:border-slate-200 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-2 [&_pre]:whitespace-pre-wrap
  [&_hr]:border-slate-200 [&_hr]:my-4
  [&_a]:text-blue-600 [&_a]:underline
  [&_table]:border-collapse [&_table]:w-full [&_table]:my-2
  [&_th]:border [&_th]:border-slate-200 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-slate-50 [&_th]:text-left [&_th]:font-semibold [&_th]:text-xs
  [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
  [&_img]:max-w-full [&_img]:rounded-lg [&_img]:cursor-pointer`

// ─── Área editável ───────────────────────────────────────────────────────────

export interface EditableAreaProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  onInput?: React.FormEventHandler<HTMLDivElement>
  onPaste?: React.ClipboardEventHandler<HTMLDivElement>
  onClick?: React.MouseEventHandler<HTMLDivElement>
  readOnly?: boolean
  className?: string
}

/** Div contentEditable com as mesmas classes/estilo do editor de Anotações. */
export function EditableArea({
  editorRef, onInput, onPaste, onClick, readOnly, className,
}: EditableAreaProps) {
  return (
    <div
      ref={editorRef as React.RefObject<HTMLDivElement>}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onInput={onInput}
      onPaste={onPaste}
      onKeyDown={e => {
        if (e.key === "Tab") { e.preventDefault(); execFmt("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;") }
      }}
      className={cn(EDITOR_CONTENT_CLASS, className)}
      style={{ caretColor: "#3b82f6" }}
      onClick={onClick}
    />
  )
}

// ─── Editor completo (modo simples, usado por Pautas de Reuniões) ───────────

export interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  readOnly?: boolean
  placeholder?: string
  toolbar?: boolean
  className?: string
  minHeight?: number
}

/**
 * Wrapper autocontido: mantém o HTML sincronizado sem recriar o DOM a cada
 * tecla (o que quebraria o cursor). O `value` só é escrito no DOM quando vem
 * de fora — ex.: ao trocar de assunto ou ao aceitar uma sugestão da IA.
 */
export function RichTextEditor({
  value = "", onChange, readOnly, placeholder,
  toolbar = true, className, minHeight = 160,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastExternal = useRef<string>("")

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value !== lastExternal.current && value !== el.innerHTML) {
      el.innerHTML = value || ""
      lastExternal.current = value || ""
    }
  }, [value])

  const isEmpty = !value || value === "<br>" || value.replace(/<[^>]*>/g, "").trim() === ""

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white overflow-hidden", className)}>
      {toolbar && !readOnly && <EditorToolbar />}
      <div className="relative">
        {isEmpty && placeholder && (
          <span className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400 select-none">
            {placeholder}
          </span>
        )}
        <EditableArea
          editorRef={ref}
          readOnly={readOnly}
          className="px-4 py-3 overflow-y-auto"
          onInput={() => {
            const html = ref.current?.innerHTML ?? ""
            lastExternal.current = html
            onChange?.(html)
          }}
        />
      </div>
      <style jsx>{`div > :global(div[contenteditable]) { min-height: ${minHeight}px; }`}</style>
    </div>
  )
}
