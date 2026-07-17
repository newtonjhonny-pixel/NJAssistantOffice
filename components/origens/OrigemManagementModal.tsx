"use client"

import { useState, useEffect } from "react"
import { X, Pencil, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Check } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface TaskOrigin {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  active: boolean
  order: number
  _count: { tasks: number }
}

interface Props {
  onClose: () => void
  onRefresh: () => Promise<void>
  currentValue: string | null
  onSelect: (id: string | null, name: string | null) => void
}

type DeleteState =
  | { phase: "idle" }
  | { phase: "confirm"; origin: TaskOrigin }
  | { phase: "options"; origin: TaskOrigin }           // tem tarefas: desativar ou substituir
  | { phase: "substitute"; origin: TaskOrigin; newId: string }

export function OrigemManagementModal({ onClose, onRefresh, currentValue, onSelect }: Props) {
  const [origens, setOrigens]     = useState<TaskOrigin[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<TaskOrigin | null>(null)
  const [editForm, setEditForm]   = useState({ name: "", description: "", color: "", icon: "", order: 0 })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>({ phase: "idle" })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError]   = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch("/api/origens")
    setOrigens(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openEdit(o: TaskOrigin) {
    setEditing(o)
    setEditForm({ name: o.name, description: o.description ?? "", color: o.color, icon: o.icon, order: o.order })
    setEditError(null)
  }

  async function saveEdit() {
    if (!editing) return
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/origens/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      setEditing(null)
      await load()
      await onRefresh()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setEditSaving(false)
    }
  }

  async function toggleActive(o: TaskOrigin) {
    await fetch(`/api/origens/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !o.active }),
    })
    await load()
    await onRefresh()
  }

  function handleDeleteClick(o: TaskOrigin) {
    setActionError(null)
    if (o._count.tasks === 0) {
      setDeleteState({ phase: "confirm", origin: o })
    } else {
      setDeleteState({ phase: "options", origin: o })
    }
  }

  async function confirmDelete(o: TaskOrigin) {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/origens/${o.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao excluir")
      // Se a origem excluída estava selecionada, limpa a seleção
      if (currentValue === o.id) onSelect(null, null)
      setDeleteState({ phase: "idle" })
      await load()
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao excluir")
    } finally {
      setActionLoading(false)
    }
  }

  async function deactivate(o: TaskOrigin) {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/origens/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      })
      if (!res.ok) throw new Error("Erro ao desativar")
      setDeleteState({ phase: "idle" })
      await load()
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao desativar")
    } finally {
      setActionLoading(false)
    }
  }

  async function substituirEExcluir(oldId: string, newId: string) {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/origens/${oldId}/substituir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOriginId: newId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao substituir")
      // Se a origem substituída estava selecionada, atualiza para a nova
      if (currentValue === oldId) {
        const nova = origens.find(o => o.id === newId)
        if (nova) onSelect(nova.id, nova.name)
      }
      setDeleteState({ phase: "idle" })
      await load()
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao substituir")
    } finally {
      setActionLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-800">Gerenciar Origens</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="pb-2 text-xs font-semibold text-slate-500 uppercase">Origem</th>
                  <th className="pb-2 text-center text-xs font-semibold text-slate-500 uppercase">Tarefas</th>
                  <th className="pb-2 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {origens.map(o => (
                  <tr key={o.id} className={`hover:bg-slate-50 transition-colors ${!o.active ? "opacity-50" : ""}`}>
                    <td className="py-2.5 pr-4">
                      {editing?.id === o.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              value={editForm.icon}
                              onChange={e => setEditForm(p => ({ ...p, icon: e.target.value }))}
                              className={`${inputClass} w-16`}
                              placeholder="📌"
                            />
                            <input
                              autoFocus
                              value={editForm.name}
                              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                              className={`${inputClass} flex-1`}
                              placeholder="Nome"
                            />
                            <input
                              type="color"
                              value={editForm.color}
                              onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))}
                              className="h-9 w-10 cursor-pointer rounded border border-slate-200 p-0.5 shrink-0"
                            />
                          </div>
                          <input
                            value={editForm.description}
                            onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                            className={inputClass}
                            placeholder="Descrição (opcional)"
                          />
                          {editError && <p className="text-xs text-red-600">❌ {editError}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={editSaving}
                              className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" />
                              {editSaving ? "Salvando..." : "Salvar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="px-3 py-1 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{o.icon}</span>
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                          <span className="font-medium text-slate-800">{o.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${o._count.tasks > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                        {o._count.tasks}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <button type="button" onClick={() => toggleActive(o)} title={o.active ? "Desativar" : "Ativar"}>
                        {o.active
                          ? <ToggleRight className="w-5 h-5 text-green-500 mx-auto" />
                          : <ToggleLeft  className="w-5 h-5 text-slate-300 mx-auto" />
                        }
                      </button>
                    </td>
                    <td className="py-2.5 text-right">
                      {editing?.id !== o.id && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(o)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(o)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Dialogs de exclusão */}
        {deleteState.phase !== "idle" && (
          <div className="border-t border-slate-100 bg-slate-50 rounded-b-2xl p-4 shrink-0">
            {actionError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                ❌ {actionError}
              </p>
            )}

            {/* Confirmação simples (0 tarefas) */}
            {deleteState.phase === "confirm" && (
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-sm text-slate-700 flex-1">
                  Excluir a origem <strong>"{deleteState.origin.name}"</strong>? Esta ação não pode ser desfeita.
                </p>
                <button
                  type="button"
                  onClick={() => confirmDelete(deleteState.origin)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? "Excluindo..." : "Excluir"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteState({ phase: "idle" })}
                  className="px-4 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Opções quando tem tarefas vinculadas */}
            {deleteState.phase === "options" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">
                    A origem <strong>"{deleteState.origin.name}"</strong> está vinculada a{" "}
                    <strong>{deleteState.origin._count.tasks} tarefa(s)</strong>. Escolha uma ação:
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => deactivate(deleteState.origin)}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50 border border-amber-200"
                  >
                    Desativar (mantém tarefas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteState({ phase: "substitute", origin: deleteState.origin, newId: "" })}
                    className="px-4 py-2 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 border border-red-200"
                  >
                    Substituir e excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteState({ phase: "idle" })}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Seleção da nova origem para substituição */}
            {deleteState.phase === "substitute" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  Selecione a nova origem para as <strong>{deleteState.origin._count.tasks} tarefa(s)</strong>{" "}
                  que estão em <strong>"{deleteState.origin.name}"</strong>:
                </p>
                <select
                  value={deleteState.newId}
                  onChange={e => setDeleteState(s => s.phase === "substitute" ? { ...s, newId: e.target.value } : s)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                >
                  <option value="">-- Selecione a origem substituta --</option>
                  {origens
                    .filter(o => o.id !== deleteState.origin.id && o.active)
                    .map(o => (
                      <option key={o.id} value={o.id}>
                        {o.icon} {o.name}
                      </option>
                    ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!deleteState.newId || actionLoading}
                    onClick={() => substituirEExcluir(deleteState.origin.id, deleteState.newId)}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Substituindo..." : "Confirmar substituição e excluir"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteState({ phase: "idle" })}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
