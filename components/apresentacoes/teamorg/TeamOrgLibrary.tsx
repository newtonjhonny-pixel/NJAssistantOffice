"use client"

import { useState } from "react"
import { X, Plus, Pencil, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { TeamOrgResponsibility, makeOrgId } from "./teamOrgTypes"
import { OrgIcon, getIconNames } from "./OrgIcon"

const CATEGORIES = ["Pessoal", "Financeiro", "Operacional", "Benefícios", "Sistema", "Outro"]

interface Props {
  library:   TeamOrgResponsibility[]
  onChange:  (lib: TeamOrgResponsibility[]) => void
  onClose:   () => void
}

interface EditRow {
  id:          string
  name:        string
  icon:        string
  category:    string
  observation: string
}

function emptyRow(order: number): EditRow {
  return { id: makeOrgId(), name: "", icon: "circle", category: "Operacional", observation: "" }
}

export function TeamOrgLibrary({ library, onChange, onClose }: Props) {
  const [editId,    setEditId]    = useState<string | null>(null)
  const [editRow,   setEditRow]   = useState<EditRow | null>(null)
  const [filterCat, setFilterCat] = useState("Todas")
  const [newRow,    setNewRow]    = useState<EditRow | null>(null)
  const iconNames = getIconNames()

  const visible = library.filter(r => filterCat === "Todas" || r.category === filterCat)

  function startEdit(r: TeamOrgResponsibility) {
    setEditId(r.id)
    setEditRow({ id: r.id, name: r.name, icon: r.icon, category: r.category, observation: r.observation ?? "" })
  }

  function commitEdit() {
    if (!editRow) return
    onChange(library.map(r => r.id === editRow.id
      ? { ...r, name: editRow.name, icon: editRow.icon, category: editRow.category, observation: editRow.observation }
      : r
    ))
    setEditId(null)
    setEditRow(null)
  }

  function toggleActive(id: string) {
    onChange(library.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  function saveNew() {
    if (!newRow || !newRow.name.trim()) return
    const item: TeamOrgResponsibility = {
      id: newRow.id, name: newRow.name, icon: newRow.icon,
      category: newRow.category, order: library.length + 1,
      active: true, observation: newRow.observation || undefined,
    }
    onChange([...library, item])
    setNewRow(null)
  }

  function deleteItem(id: string) {
    onChange(library.filter(r => r.id !== id))
  }

  const EditableRow = ({ row, onRow }: { row: EditRow; onRow: (p: Partial<EditRow>) => void }) => (
    <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-start">
      <input
        value={row.name}
        onChange={e => onRow({ name: e.target.value })}
        placeholder="Nome da atividade"
        className="rounded border border-blue-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <select
        value={row.category}
        onChange={e => onRow({ category: e.target.value })}
        className="rounded border border-slate-200 px-1 py-1 text-xs focus:outline-none"
      >
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <select
        value={row.icon}
        onChange={e => onRow({ icon: e.target.value })}
        className="rounded border border-slate-200 px-1 py-1 text-xs focus:outline-none"
      >
        {iconNames.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-800">Biblioteca de Atividades</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters + add */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          <div className="flex gap-1 flex-wrap">
            {["Todas", ...CATEGORIES].map(c => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium transition-all",
                  filterCat === c ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={() => setNewRow(emptyRow(library.length))}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus className="w-3 h-3" />Nova atividade
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
          {/* New row */}
          {newRow && (
            <div className="rounded-lg border border-blue-300 bg-blue-50 p-2 space-y-2">
              <EditableRow row={newRow} onRow={p => setNewRow(r => r ? { ...r, ...p } : r)} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setNewRow(null)} className="px-2 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                <button onClick={saveNew} disabled={!newRow.name.trim()} className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors">Salvar</button>
              </div>
            </div>
          )}

          {visible.map(r => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border group transition-all",
                !r.active ? "opacity-50 bg-slate-50 border-slate-100" : "bg-white border-slate-200 hover:border-slate-300",
              )}
            >
              {editId === r.id && editRow ? (
                <div className="flex-1 space-y-1">
                  <EditableRow row={editRow} onRow={p => setEditRow(e => e ? { ...e, ...p } : e)} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setEditId(null); setEditRow(null) }} className="px-2 py-0.5 rounded text-xs text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button onClick={commitEdit} className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors">Salvar</button>
                  </div>
                </div>
              ) : (
                <>
                  <OrgIcon name={r.icon} className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700">{r.name}</p>
                    <p className="text-[10px] text-slate-400">{r.category}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(r)} title="Editar" className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => toggleActive(r.id)} title={r.active ? "Desativar" : "Ativar"} className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                      <AlertCircle className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteItem(r.id)} title="Excluir" className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {visible.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-8">Nenhuma atividade nesta categoria</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
