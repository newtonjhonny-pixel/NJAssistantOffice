"use client"

import { useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Slide, SlideElement, fontSizePx } from "./slideTypes"

// ─── Element renderer ─────────────────────────────────────────────────────────

function ElementView({
  el,
  selected,
  zoom,
  onSelect,
  onUpdate,
}: {
  el:       SlideElement
  selected: boolean
  zoom:     number
  onSelect: () => void
  onUpdate: (patch: Partial<SlideElement>) => void
}) {
  const [editing, setEditing]   = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ mx: number; my: number; x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // ── Drag to move ────────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    if (editing) return
    e.stopPropagation()
    onSelect()
    dragStart.current = { mx: e.clientX, my: e.clientY, x: el.x, y: el.y }

    function onMove(ev: MouseEvent) {
      if (!dragStart.current || !ref.current) return
      const parent = ref.current.parentElement!
      const rect   = parent.getBoundingClientRect()
      const dx = (ev.clientX - dragStart.current.mx) / (rect.width  * zoom) * 100
      const dy = (ev.clientY - dragStart.current.my) / (rect.height * zoom) * 100
      const nx = Math.max(0, Math.min(100 - el.w, dragStart.current.x + dx))
      const ny = Math.max(0, Math.min(100 - el.h, dragStart.current.y + dy))
      onUpdate({ x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 })
      setDragging(true)
    }
    function onUp() {
      dragStart.current = null
      setDragging(false)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup",   onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
  }

  const isText = el.type === "title" || el.type === "text" || el.type === "subtitle"
  const fs     = fontSizePx(el.fontSize)

  const style: React.CSSProperties = {
    left:     `${el.x}%`,
    top:      `${el.y}%`,
    width:    `${el.w}%`,
    height:   `${el.h}%`,
    position: "absolute",
    cursor:   dragging ? "grabbing" : "grab",
    zIndex:   selected ? 10 : 1,
  }

  if (el.type === "shape") {
    const isCircle = el.shape === "circle"
    return (
      <div
        ref={ref}
        style={style}
        onMouseDown={onMouseDown}
        onClick={e => { e.stopPropagation(); onSelect() }}
        className={cn("transition-shadow", selected && "ring-2 ring-blue-400 ring-offset-1")}
      >
        <div
          className="w-full h-full"
          style={{
            background:   el.bg ?? "#3b82f6",
            opacity:      el.opacity ?? 1,
            borderRadius: isCircle ? "50%" : 8,
          }}
        />
      </div>
    )
  }

  if (el.type === "image") {
    return (
      <div
        ref={ref}
        style={style}
        onMouseDown={onMouseDown}
        onClick={e => { e.stopPropagation(); onSelect() }}
        className={cn(
          "flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100/30 text-slate-400 text-xs",
          selected && "ring-2 ring-blue-400 ring-offset-1 border-blue-300",
        )}
      >
        📷 Imagem
      </div>
    )
  }

  // Text elements
  return (
    <div
      ref={ref}
      style={style}
      onMouseDown={onMouseDown}
      onClick={e => { e.stopPropagation(); onSelect() }}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
      className={cn(
        "transition-shadow overflow-hidden",
        selected && "ring-2 ring-blue-400 ring-offset-1 rounded",
        !editing && "select-none",
      )}
    >
      {editing ? (
        <textarea
          autoFocus
          value={el.content ?? ""}
          onChange={e => onUpdate({ content: e.target.value })}
          onBlur={() => setEditing(false)}
          onClick={e => e.stopPropagation()}
          className="w-full h-full resize-none bg-transparent focus:outline-none leading-tight"
          style={{
            fontSize:   fs,
            fontWeight: el.bold   ? "bold" : "normal",
            fontStyle:  el.italic ? "italic" : "normal",
            textAlign:  el.align  ?? "left",
            color:      el.color  ?? "#ffffff",
          }}
        />
      ) : (
        <p
          style={{
            fontSize:   fs,
            fontWeight: el.bold   ? "bold" : "normal",
            fontStyle:  el.italic ? "italic" : "normal",
            textAlign:  el.align  ?? "left",
            color:      el.color  ?? "#ffffff",
            lineHeight: 1.3,
            whiteSpace: "pre-wrap",
            wordBreak:  "break-word",
          }}
        >
          {el.content || (selected ? "Clique duplo para editar" : "")}
        </p>
      )}
    </div>
  )
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

interface Props {
  slide:          Slide
  selectedId:     string | null
  zoom:           number
  onSelectElement:(id: string | null) => void
  onUpdateElement:(id: string, patch: Partial<SlideElement>) => void
}

export function SlideCanvas({ slide, selectedId, zoom, onSelectElement, onUpdateElement }: Props) {
  return (
    // 16:9 aspect ratio wrapper
    <div className="flex items-center justify-center w-full h-full bg-slate-200 overflow-hidden">
      <div
        style={{
          width:     `${56 * zoom}vw`,
          aspectRatio: "16 / 9",
          background:  slide.bg,
          position:  "relative",
          boxShadow: "0 4px 32px rgba(0,0,0,0.3)",
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
          maxWidth:  "none",
        }}
        onClick={() => onSelectElement(null)}
      >
        {slide.elements.map(el => (
          <ElementView
            key={el.id}
            el={el}
            selected={selectedId === el.id}
            zoom={zoom}
            onSelect={() => onSelectElement(el.id)}
            onUpdate={patch => onUpdateElement(el.id, patch)}
          />
        ))}
      </div>
    </div>
  )
}
