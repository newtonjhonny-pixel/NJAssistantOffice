"use client"

import React, { useState, useCallback } from "react"
import { SlideToolbar } from "./SlideToolbar"
import { SlideList }    from "./SlideList"
import { SlideCanvas }  from "./SlideCanvas"
import {
  Slide, SlideElement, SlideContent,
  ElementType, FontSize, TextAlign,
  defaultContent, makeSlide, makeId,
} from "./slideTypes"

// ─── Parse or seed ────────────────────────────────────────────────────────────

function parse(raw: string | null): SlideContent {
  if (raw) {
    try {
      const p = JSON.parse(raw)
      if (p?.slides?.length) return p
    } catch { /* ignore */ }
  }
  return defaultContent()
}

// ─── Main editor ──────────────────────────────────────────────────────────────

interface Props {
  initialContent: string | null
  onSave:         (content: string) => Promise<void>
  editorRef?:     React.RefObject<HTMLDivElement | null>
}

export function SlideEditor({ initialContent, onSave, editorRef }: Props) {
  const [content,     setContent]     = useState<SlideContent>(() => parse(initialContent))
  const [activeIdx,   setActiveIdx]   = useState(0)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [zoom,        setZoom]        = useState(1)
  const [saving,      setSaving]      = useState(false)

  const slide    = content.slides[activeIdx] ?? content.slides[0]
  const selected = slide?.elements.find(e => e.id === selectedId) ?? null

  // ── Slide operations ────────────────────────────────────────────────────────

  const updateSlide = useCallback((idx: number, patch: Partial<Slide>) => {
    setContent(c => ({
      slides: c.slides.map((s, i) => i === idx ? { ...s, ...patch } : s),
    }))
  }, [])

  const addSlide = useCallback(() => {
    const bg    = slide?.bg ?? "#1e3a5f"
    const newSl = makeSlide(bg)
    setContent(c => ({ slides: [...c.slides, newSl] }))
    setActiveIdx(content.slides.length)
    setSelectedId(null)
  }, [slide?.bg, content.slides.length])

  const deleteSlide = useCallback((idx: number) => {
    if (content.slides.length <= 1) return
    setContent(c => ({ slides: c.slides.filter((_, i) => i !== idx) }))
    setActiveIdx(i => Math.min(i, content.slides.length - 2))
    setSelectedId(null)
  }, [content.slides.length])

  const reorderSlides = useCallback((slides: Slide[]) => {
    setContent({ slides })
  }, [])

  const updateSlideBg = useCallback((bg: string) => {
    updateSlide(activeIdx, { bg })
  }, [activeIdx, updateSlide])

  // ── Element operations ──────────────────────────────────────────────────────

  const updateElements = useCallback((elements: SlideElement[]) => {
    updateSlide(activeIdx, { elements })
  }, [activeIdx, updateSlide])

  const addElement = useCallback((type: ElementType) => {
    const defaults: Record<ElementType, Partial<SlideElement>> = {
      title:    { x: 10, y: 10, w: 80, h: 15, content: "Título",    fontSize: "3xl", bold: true,  align: "center", color: slide?.bg?.startsWith("#1") ? "#ffffff" : "#1e293b" },
      subtitle: { x: 15, y: 28, w: 70, h: 10, content: "Subtítulo", fontSize: "xl",  bold: false, align: "center", color: slide?.bg?.startsWith("#1") ? "#93c5fd" : "#64748b" },
      text:     { x: 8,  y: 30, w: 84, h: 40, content: "Texto",     fontSize: "lg",  bold: false, align: "left",   color: slide?.bg?.startsWith("#1") ? "#e2e8f0" : "#334155" },
      shape:    { x: 30, y: 30, w: 40, h: 30, shape: "rect", bg: "#3b82f6", opacity: 0.9 },
      image:    { x: 20, y: 20, w: 60, h: 50 },
    }
    const el: SlideElement = { id: makeId(), type, ...defaults[type] } as SlideElement
    updateElements([...(slide?.elements ?? []), el])
    setSelectedId(el.id)
  }, [slide?.bg, slide?.elements, updateElements])

  const updateElement = useCallback((id: string, patch: Partial<SlideElement>) => {
    updateElements((slide?.elements ?? []).map(e => e.id === id ? { ...e, ...patch } : e))
  }, [slide?.elements, updateElements])

  const deleteElement = useCallback(() => {
    if (!selectedId) return
    updateElements((slide?.elements ?? []).filter(e => e.id !== selectedId))
    setSelectedId(null)
  }, [selectedId, slide?.elements, updateElements])

  // ── Format helpers ──────────────────────────────────────────────────────────

  function fmt<K extends keyof SlideElement>(key: K, value: SlideElement[K]) {
    if (!selectedId) return
    updateElement(selectedId, { [key]: value })
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await onSave(JSON.stringify(content))
    } finally {
      setSaving(false)
    }
  }, [content, onSave])

  return (
    <div ref={editorRef as React.RefObject<HTMLDivElement>} className="flex flex-col rounded-xl border border-slate-200 overflow-hidden" style={{ height: 600 }}>
      <SlideToolbar
        selectedType={selected?.type}
        selectedFontSize={selected?.fontSize}
        selectedBold={selected?.bold}
        selectedItalic={selected?.italic}
        selectedAlign={selected?.align}
        selectedColor={selected?.color}
        slideBg={slide?.bg}
        saving={saving}
        canDelete={!!selectedId}
        onAddElement={addElement}
        onDeleteElement={deleteElement}
        onFontSize={v  => fmt("fontSize", v)}
        onBold={()     => fmt("bold",     !selected?.bold)}
        onItalic={()   => fmt("italic",   !selected?.italic)}
        onAlign={v     => fmt("align",    v)}
        onColor={v     => fmt("color",    v)}
        onSlideBg={updateSlideBg}
        onZoomIn={()   => setZoom(z => Math.min(z + 0.1, 1.5))}
        onZoomOut={()  => setZoom(z => Math.max(z - 0.1, 0.4))}
        onFitView={()  => setZoom(1)}
        onSave={handleSave}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Slide list (left panel) */}
        <div className="w-44 shrink-0 border-r border-slate-200 bg-slate-50 overflow-hidden">
          <SlideList
            slides={content.slides}
            activeIndex={activeIdx}
            onSelect={i => { setActiveIdx(i); setSelectedId(null) }}
            onAdd={addSlide}
            onDelete={deleteSlide}
            onReorder={reorderSlides}
          />
        </div>

        {/* Canvas (center) */}
        <div className="flex-1 overflow-hidden bg-slate-300">
          {slide && (
            <SlideCanvas
              slide={slide}
              selectedId={selectedId}
              zoom={zoom}
              onSelectElement={setSelectedId}
              onUpdateElement={updateElement}
            />
          )}
        </div>
      </div>
    </div>
  )
}
