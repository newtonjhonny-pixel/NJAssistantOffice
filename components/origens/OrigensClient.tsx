"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, Tag, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"

interface TaskOrigin {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  active: boolean
  order: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
  _count: { tasks: number }
}

const BLANK: Omit<TaskOrigin, "id" | "createdAt" | "updatedAt" | "createdBy" | "_count"> = {
  name: "", description: "", color: "#6B7280", icon: "📌", active: true, order: 0,
}

type DeleteState =
  | { phase: "idle" }
  | { phase: "confirm"; origin: TaskOrigin }
  | { phase: "options"; origin: TaskOrigin }
  | { phase: "substitute"; origin: TaskOrigin; newId: string }

export function OrigensClient() {
  const [origens, setOrigens]       = useState<TaskOrigin[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<TaskOrigin | null>(null)
  const [form, setForm]             = useState({ ...BLANK })
  const [saving, setSaving]         = useState(false)
  const [saveErr, setSaveErr]       = useState<string | null>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>({ phase: "idle" })
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteErr, setDeleteErr]   = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch("/api/origens")
    const d = await r.json()
    setOrigens(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK, order: origens.length })
    setSaveErr(null)
    setShowModal(true)
  }

  function openEdit(o: TaskOrigin) {
    setEditing(o)
    setForm({ name: o.name, description: o.description ?? "", color: o.color, icon: o.icon, active: o.active, order: o.order })
    setSaveErr(null)
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveErr(null)
    try {
      const url    = editing ? `/api/origens/${editing.id}` : "/api/origens"
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      await load()
      setShowModal(false)
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteClick(o: TaskOrigin) {
    setDeleteErr(null)
    if (o._count.tasks === 0) {
      setDeleteState({ phase: "confirm", origin: o })
    } else {
      setDeleteState({ phase: "options", origin: o })
    }
  }

  async function confirmDelete(o: TaskOrigin) {
    setDeleteLoading(true)
    setDeleteErr(null)
    try {
      const res = await fetch(`/api/origens/${o.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao excluir")
      setDeleteState({ phase: "idle" })
      await load()
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Erro ao excluir")
    } finally {
      setDeleteLoading(false)
    }
  }

  async function deactivate(o: TaskOrigin) {
    setDeleteLoading(true)
    setDeleteErr(null)
    try {
      await fetch(`/api/origens/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      })
      setDeleteState({ phase: "idle" })
      await load()
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Erro ao desativar")
    } finally {
      setDeleteLoading(false)
    }
  }

  async function substituirEExcluir(oldId: string, newId: string) {
    setDeleteLoading(true)
    setDeleteErr(null)
    try {
      const res = await fetch(`/api/origens/${oldId}/substituir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOriginId: newId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao substituir")
      setDeleteState({ phase: "idle" })
      await load()
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Erro ao substituir")
    } finally {
      setDeleteLoading(false)
    }
  }

  async function toggleActive(o: TaskOrigin) {
    await fetch(`/api/origens/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !o.active }),
    })
    await load()
  }

  const inputClass = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            Origens das Tarefas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cadastre e gerencie as origens de demandas. {origens.length} registro(s).
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Origem
        </Button>
      </div>

      {/* Painel de exclusão/substituição */}
      {deleteState.phase !== "idle" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          {deleteErr && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ❌ {deleteErr}
            </p>
          )}

          {deleteState.phase === "confirm" && (
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-slate-700 flex-1">
                Excluir a origem <strong>"{deleteState.origin.name}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <button
                type="button"
                onClick={() => confirmDelete(deleteState.origin)}
                disabled={deleteLoading}
                className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? "Excluindo..." : "Excluir"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteState({ phase: "idle" })}
                className="px-4 py-1.5 text-sm border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          )}

          {deleteState.phase === "options" && (
            <div className="space-y-2">
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
                  disabled={deleteLoading}
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
                  className="px-4 py-2 text-sm border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {deleteState.phase === "substitute" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Selecione a nova origem para as <strong>{deleteState.origin._count.tasks} tarefa(s)</strong>{" "}
                vinculadas a <strong>"{deleteState.origin.name}"</strong>:
              </p>
              <select
                value={deleteState.newId}
                onChange={e => setDeleteState(s => s.phase === "substitute" ? { ...s, newId: e.target.value } : s)}
                className={inputClass}
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
                  disabled={!deleteState.newId || deleteLoading}
                  onClick={() => substituirEExcluir(deleteState.origin.id, deleteState.newId)}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? "Substituindo..." : "Confirmar substituição e excluir"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteState({ phase: "idle" })}
                  className="px-4 py-2 text-sm border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700">
            Lista de Origens
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : origens.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma origem cadastrada.</p>
              <button onClick={openCreate} className="mt-3 text-sm text-blue-600 underline">
                Criar primeira origem
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Origem</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Descrição</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarefas</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ordem</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {origens.map(o => (
                    <tr key={o.id} className={`hover:bg-slate-50 transition-colors ${!o.active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base leading-none">{o.icon}</span>
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                          <span className="font-medium text-slate-800">{o.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-slate-500 text-xs">{o.description || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${o._count.tasks > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                          {o._count.tasks}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">{o.order}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleActive(o)}
                          title={o.active ? "Desativar" : "Ativar"}
                          className="inline-flex items-center gap-1 text-xs"
                        >
                          {o.active
                            ? <ToggleRight className="w-5 h-5 text-green-500" />
                            : <ToggleLeft  className="w-5 h-5 text-slate-400" />
                          }
                          <span className={o.active ? "text-green-600" : "text-slate-400"}>
                            {o.active ? "Ativa" : "Inativa"}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
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
                            className={`p-1.5 rounded-lg transition-colors ${
                              o._count.tasks > 0
                                ? "text-amber-400 hover:text-amber-600 hover:bg-amber-50"
                                : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                            }`}
                            title={o._count.tasks > 0 ? `${o._count.tasks} tarefa(s) — desativar ou substituir` : "Excluir"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <strong>Regra:</strong> origens com tarefas vinculadas podem ser desativadas ou ter suas tarefas migradas para outra origem antes de excluir.
        Origens inativas não aparecem no select de tarefas.
      </div>

      {/* Modal criar/editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                {editing ? "Editar Origem" : "Nova Origem"}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: E-mail, Reunião, WhatsApp..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Descrição</label>
                <input
                  value={form.description ?? ""}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detalhe opcional..."
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Ícone (emoji)</label>
                  <input
                    value={form.icon}
                    onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                    placeholder="📌"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Cor</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                      className="h-10 w-14 cursor-pointer rounded border border-slate-200 p-0.5"
                    />
                    <span className="text-xs text-slate-500 font-mono">{form.color}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Ordem de exibição</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
                  <select
                    value={form.active ? "1" : "0"}
                    onChange={e => setForm(p => ({ ...p, active: e.target.value === "1" }))}
                    className={inputClass}
                  >
                    <option value="1">Ativa</option>
                    <option value="0">Inativa</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs text-slate-400 mb-2">Preview</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{form.icon || "📌"}</span>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: form.color }} />
                  <span className="text-sm font-medium text-slate-700">{form.name || "Nome da origem"}</span>
                </div>
              </div>

              {saveErr && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  ❌ {saveErr}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar origem"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
