"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Building2, GripVertical, MapPin, Trash2, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamOrgCollaborator, TeamOrgSegment, TeamOrgResponsibility } from "./teamOrgTypes"
import { OrgIcon } from "./OrgIcon"

interface Props {
  collab:      TeamOrgCollaborator
  segment:     TeamOrgSegment
  library:     TeamOrgResponsibility[]
  selected:    boolean
  canDelete:   boolean
  exportMode?: boolean
  onSelect:    () => void
  onDelete:    () => void
  onDuplicate: () => void
}

export function TeamOrgCard({
  collab, segment, library, selected, canDelete, exportMode = false,
  onSelect, onDelete, onDuplicate,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: collab.id })

  const responsibilities = collab.responsibilityIds
    .map(id => library.find(r => r.id === id))
    .filter(Boolean) as TeamOrgResponsibility[]

  const accentColor = collab.color ?? segment.color

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        "group relative rounded-lg bg-white border transition-all select-none",
        exportMode
          ? "border-slate-200"
          : selected
            ? "border-blue-400 shadow-md ring-2 ring-blue-200 cursor-pointer"
            : "border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer",
      )}
      onClick={exportMode ? undefined : onSelect}
    >
      {/* Drag handle — hidden in export */}
      {!exportMode && (
        <div
          {...attributes}
          {...listeners}
          data-export-hide
          onClick={e => e.stopPropagation()}
          className="absolute -left-5 top-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
      )}

      {/* Color accent bar */}
      <div className="h-1 w-full rounded-t-lg" style={{ background: accentColor }} />

      <div className="flex divide-x divide-slate-100">
        {/* LEFT — Identity */}
        <div className="w-44 shrink-0 p-3 space-y-1">
          <p className="text-sm font-bold leading-tight" style={{ color: accentColor }}>
            {collab.name}
          </p>
          <p className="text-[10px] text-slate-500 leading-snug">{collab.role}</p>

          {collab.unit && (
            <div className="flex items-center gap-1 pt-1">
              <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              <span className="text-[10px] text-slate-500">{collab.unit}</span>
              {collab.state && <span className="text-[10px] text-slate-400">{collab.state}</span>}
            </div>
          )}

          <div className="flex items-center gap-1">
            <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            <span className="text-[10px] text-slate-500">
              {collab.companiesCount} {collab.companiesCount === 1 ? "empresa" : "empresas"}
            </span>
          </div>
        </div>

        {/* RIGHT — Responsibilities */}
        <div className="flex-1 p-3">
          {responsibilities.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic">Nenhuma responsabilidade</p>
          ) : (
            <ul className="space-y-0.5">
              {responsibilities.map(r => (
                <li key={r.id} className="flex items-center gap-1.5">
                  <OrgIcon
                    name={r.icon}
                    className="w-2.5 h-2.5 shrink-0"
                    // @ts-ignore
                    style={{ color: accentColor }}
                  />
                  <span className="text-[10px] text-slate-600 leading-tight">{r.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Action buttons — hover only, hidden in export */}
      {!exportMode && (
        <div
          data-export-hide
          className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            onClick={e => { e.stopPropagation(); onDuplicate() }}
            title="Duplicar"
            className="w-5 h-5 rounded flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
          {canDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              title="Excluir"
              className="w-5 h-5 rounded flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-300 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
