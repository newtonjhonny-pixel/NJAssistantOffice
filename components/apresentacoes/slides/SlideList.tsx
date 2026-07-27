"use client"

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slide, SlideElement, fontSizePx } from "./slideTypes"

// ─── Mini slide preview ───────────────────────────────────────────────────────

function MiniPreview({ slide }: { slide: Slide }) {
  return (
    <div
      className="w-full rounded overflow-hidden"
      style={{ aspectRatio: "16/9", background: slide.bg, position: "relative" }}
    >
      {slide.elements.map(el => {
        if (el.type === "shape") {
          return (
            <div
              key={el.id}
              style={{
                position:     "absolute",
                left:         `${el.x}%`,
                top:          `${el.y}%`,
                width:        `${el.w}%`,
                height:       `${el.h}%`,
                background:   el.bg ?? "#3b82f6",
                borderRadius: el.shape === "circle" ? "50%" : 4,
                opacity:      el.opacity ?? 1,
              }}
            />
          )
        }
        const fs = fontSizePx(el.fontSize) * 0.2
        return (
          <p
            key={el.id}
            style={{
              position:   "absolute",
              left:       `${el.x}%`,
              top:        `${el.y}%`,
              width:      `${el.w}%`,
              fontSize:   fs,
              color:      el.color ?? "#ffffff",
              fontWeight: el.bold   ? "bold" : "normal",
              textAlign:  el.align  ?? "left",
              lineHeight: 1.2,
              overflow:   "hidden",
              whiteSpace: "pre-wrap",
            }}
          >
            {el.content}
          </p>
        )
      })}
    </div>
  )
}

// ─── Sortable slide item ──────────────────────────────────────────────────────

function SortableSlide({
  slide,
  index,
  active,
  onSelect,
  onDelete,
  canDelete,
}: {
  slide:    Slide
  index:    number
  active:   boolean
  onSelect: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        "group relative rounded-lg border-2 overflow-visible cursor-pointer transition-all",
        active ? "border-blue-500 shadow-md" : "border-slate-200 hover:border-blue-300",
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      {/* Slide number */}
      <div className={cn(
        "absolute -top-2 -left-1 z-10 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shadow",
        active ? "bg-blue-600 text-white" : "bg-slate-600 text-white",
      )}>
        {index + 1}
      </div>

      {/* Delete button */}
      {canDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute -top-2 -right-1 z-10 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}

      <MiniPreview slide={slide} />
    </div>
  )
}

// ─── Slide list ───────────────────────────────────────────────────────────────

interface Props {
  slides:        Slide[]
  activeIndex:   number
  onSelect:      (i: number) => void
  onAdd:         () => void
  onDelete:      (i: number) => void
  onReorder:     (slides: Slide[]) => void
}

export function SlideList({ slides, activeIndex, onSelect, onAdd, onDelete, onReorder }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = slides.findIndex(s => s.id === active.id)
    const to   = slides.findIndex(s => s.id === over.id)
    onReorder(arrayMove(slides, from, to))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-600">Slides ({slides.length})</span>
        <button
          onClick={onAdd}
          title="Adicionar slide"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <Plus className="w-3 h-3" />
          Novo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {slides.map((slide, i) => (
              <SortableSlide
                key={slide.id}
                slide={slide}
                index={i}
                active={activeIndex === i}
                canDelete={slides.length > 1}
                onSelect={() => onSelect(i)}
                onDelete={() => onDelete(i)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
