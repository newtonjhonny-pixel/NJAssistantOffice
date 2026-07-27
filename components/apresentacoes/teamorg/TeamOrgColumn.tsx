"use client"

import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamOrgSegment, TeamOrgCollaborator, TeamOrgResponsibility } from "./teamOrgTypes"
import { TeamOrgCard } from "./TeamOrgCard"

interface Props {
  segment:             TeamOrgSegment
  collaborators:       TeamOrgCollaborator[]
  library:             TeamOrgResponsibility[]
  selectedCollabId:    string | null
  selectedSegmentId:   string | null
  exportMode?:         boolean
  onSelectSegment:     () => void
  onSelectCollab:      (id: string) => void
  onAddCollab:         (segmentId: string) => void
  onDeleteCollab:      (id: string) => void
  onDuplicateCollab:   (id: string) => void
  onReorder:           (segId: string, cols: TeamOrgCollaborator[]) => void
  onDeleteSegment:     () => void
}

export function TeamOrgColumn({
  segment, collaborators, library,
  selectedCollabId, selectedSegmentId, exportMode = false,
  onSelectSegment, onSelectCollab, onAddCollab,
  onDeleteCollab, onDuplicateCollab, onReorder, onDeleteSegment,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = collaborators.findIndex(c => c.id === active.id)
    const to   = collaborators.findIndex(c => c.id === over.id)
    if (from === -1 || to === -1) return
    const reordered = arrayMove(collaborators, from, to).map((c, i) => ({ ...c, order: i }))
    onReorder(segment.id, reordered)
  }

  const isSegSelected = !exportMode && selectedSegmentId === segment.id

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div
        className={cn(
          "group relative flex items-center justify-center px-3 py-3 rounded-t-xl transition-all",
          !exportMode && "cursor-pointer hover:brightness-110",
          isSegSelected && "ring-2 ring-white/60 ring-offset-1",
        )}
        style={{ background: segment.color }}
        onClick={exportMode ? undefined : onSelectSegment}
      >
        <span className="text-sm font-bold text-white tracking-wide text-center uppercase">
          {segment.name}
        </span>

        {/* Segment actions — hidden in export */}
        {!exportMode && (
          <div
            data-export-hide
            className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              onClick={e => { e.stopPropagation(); onSelectSegment() }}
              title="Editar segmento"
              className="w-5 h-5 rounded flex items-center justify-center bg-white/20 hover:bg-white/40 text-white transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDeleteSegment() }}
              title="Excluir segmento"
              className="w-5 h-5 rounded flex items-center justify-center bg-white/20 hover:bg-red-400/60 text-white transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Connector visual */}
      <div className="h-3 w-px mx-auto" style={{ background: segment.color }} />

      {/* Cards container — data-col-scroll for DOM export cleanup */}
      <div
        data-col-scroll
        className={cn(
          "flex-1 rounded-b-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3",
          !exportMode && "overflow-y-auto",
        )}
        style={!exportMode ? { maxHeight: 540 } : undefined}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={collaborators.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {collaborators.map(col => (
              <TeamOrgCard
                key={col.id}
                collab={col}
                segment={segment}
                library={library}
                selected={!exportMode && selectedCollabId === col.id}
                canDelete={true}
                exportMode={exportMode}
                onSelect={() => onSelectCollab(col.id)}
                onDelete={() => onDeleteCollab(col.id)}
                onDuplicate={() => onDuplicateCollab(col.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {collaborators.length === 0 && !exportMode && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <p className="text-xs">Nenhum colaborador</p>
          </div>
        )}

        {/* Add collaborator — hidden in export via data-export-hide */}
        {!exportMode && (
          <button
            data-export-hide
            onClick={() => onAddCollab(segment.id)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <Plus className="w-3 h-3" />
            Adicionar colaborador
          </button>
        )}
      </div>
    </div>
  )
}
