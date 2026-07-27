"use client"

import { useState } from "react"
import { X, ChevronDown, ChevronUp, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  TeamOrgSegment, TeamOrgCollaborator, TeamOrgResponsibility,
  ORG_COLORS,
} from "./teamOrgTypes"
import { OrgIcon } from "./OrgIcon"

// ─── Segment form ──────────────────────────────────────────────────────────────

function SegmentForm({
  seg,
  onChange,
}: {
  seg: TeamOrgSegment
  onChange: (patch: Partial<TeamOrgSegment>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Nome do segmento</label>
        <input
          value={seg.name}
          onChange={e => onChange({ name: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Descrição</label>
        <input
          value={seg.description ?? ""}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Opcional"
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Cor</label>
        <div className="flex flex-wrap gap-1.5">
          {ORG_COLORS.map(c => (
            <button
              key={c.value}
              title={c.label}
              onClick={() => onChange({ color: c.value })}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all",
                seg.color === c.value ? "border-slate-700 scale-110 shadow" : "border-transparent hover:scale-110",
              )}
              style={{ background: c.value }}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div
        className="h-8 rounded-lg flex items-center justify-center"
        style={{ background: seg.color }}
      >
        <span className="text-xs font-bold text-white uppercase tracking-wide">{seg.name || "Segmento"}</span>
      </div>
    </div>
  )
}

// ─── Collaborator form ─────────────────────────────────────────────────────────

function CollabForm({
  collab,
  segments,
  library,
  allCollabs,
  onChange,
}: {
  collab:     TeamOrgCollaborator
  segments:   TeamOrgSegment[]
  library:    TeamOrgResponsibility[]
  allCollabs: TeamOrgCollaborator[]
  onChange:   (patch: Partial<TeamOrgCollaborator>) => void
}) {
  const [showAllLibrary, setShowAllLibrary] = useState(false)
  const categories = Array.from(new Set(library.filter(r => r.active).map(r => r.category))).sort()

  function toggleResp(id: string) {
    const cur = collab.responsibilityIds
    onChange({
      responsibilityIds: cur.includes(id) ? cur.filter(r => r !== id) : [...cur, id],
    })
  }

  function copyFrom(sourceId: string) {
    const source = allCollabs.find(c => c.id === sourceId)
    if (source) onChange({ responsibilityIds: [...source.responsibilityIds] })
  }

  return (
    <div className="space-y-3">
      {/* Basic info */}
      {(["name","role","unit","state"] as const).map(field => (
        <div key={field}>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            {field === "name" ? "Nome" : field === "role" ? "Cargo" : field === "unit" ? "Unidade" : "Estado"}
          </label>
          <input
            value={(collab[field] as string) ?? ""}
            onChange={e => onChange({ [field]: e.target.value })}
            placeholder={field === "state" ? "Ex: PA, MT…" : undefined}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      ))}

      <div>
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Empresas atendidas</label>
        <input
          type="number" min={1} max={99}
          value={collab.companiesCount}
          onChange={e => onChange({ companiesCount: parseInt(e.target.value) || 1 })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Segment */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Segmento</label>
        <select
          value={collab.segmentId}
          onChange={e => onChange({ segmentId: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {segments.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Copy from */}
      {allCollabs.length > 1 && (
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Copiar responsabilidades de</label>
          <select
            defaultValue=""
            onChange={e => { if (e.target.value) copyFrom(e.target.value) }}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">— selecionar —</option>
            {allCollabs.filter(c => c.id !== collab.id).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Responsibilities */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Responsabilidades ({collab.responsibilityIds.length})
        </label>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {categories.map(cat => {
            const items = library.filter(r => r.active && r.category === cat)
            return (
              <div key={cat}>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{cat}</p>
                <div className="space-y-0.5">
                  {items.map(r => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer group py-0.5">
                      <input
                        type="checkbox"
                        checked={collab.responsibilityIds.includes(r.id)}
                        onChange={() => toggleResp(r.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-400 w-3 h-3"
                      />
                      <OrgIcon name={r.icon} className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-600 group-hover:text-slate-800">{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  selectedSegmentId:  string | null
  selectedCollabId:   string | null
  segments:           TeamOrgSegment[]
  collaborators:      TeamOrgCollaborator[]
  library:            TeamOrgResponsibility[]
  onUpdateSegment:    (id: string, patch: Partial<TeamOrgSegment>) => void
  onUpdateCollab:     (id: string, patch: Partial<TeamOrgCollaborator>) => void
  onDeselect:         () => void
}

export function TeamOrgEditPanel({
  selectedSegmentId, selectedCollabId, segments, collaborators, library,
  onUpdateSegment, onUpdateCollab, onDeselect,
}: Props) {
  const seg   = segments.find(s => s.id === selectedSegmentId)
  const col   = collaborators.find(c => c.id === selectedCollabId)
  const label = seg ? "Editar segmento" : col ? "Editar colaborador" : ""

  if (!seg && !col) return null

  return (
    <div className="w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <button onClick={onDeselect} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-4">
        {seg && (
          <SegmentForm
            seg={seg}
            onChange={patch => onUpdateSegment(seg.id, patch)}
          />
        )}
        {col && (
          <CollabForm
            collab={col}
            segments={segments}
            library={library}
            allCollabs={collaborators}
            onChange={patch => onUpdateCollab(col.id, patch)}
          />
        )}
      </div>
    </div>
  )
}
