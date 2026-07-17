"use client"

import { useState } from "react"
import { X, FolderKanban } from "lucide-react"

interface Props {
  onClose: () => void
  onSaved: () => void
  initial?: {
    name?: string; description?: string; objective?: string
    responsible?: string; startDate?: string; dueDate?: string
    priority?: string; status?: string; notes?: string
  }
  editId?: string
}

export function NovoProjetoModal({ onClose, onSaved, initial, editId }: Props) {
  const [form, setForm] = useState({
    name:        initial?.name        ?? "",
    description: initial?.description ?? "",
    objective:   initial?.objective   ?? "",
    responsible: initial?.responsible ?? "",
    startDate:   initial?.startDate   ?? "",
    dueDate:     initial?.dueDate     ?? "",
    priority:    initial?.priority    ?? "MEDIA",
    status:      initial?.status      ?? "PLANEJADO",
    notes:       initial?.notes       ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Nome é obrigatório"); return }
    setSaving(true)
    setError("")
    try {
      const url    = editId ? `/api/projects/${editId}` : "/api/projects"
      const method = editId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startDate: form.startDate || null,
          dueDate:   form.dueDate   || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Erro ao salvar"); return }
      onSaved()
    } catch {
      setError("Erro de conexão")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[94vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-w-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FolderKanban className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">
              {editId ? "Editar Projeto" : "Novo Projeto"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome do projeto *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="Ex: Criação do Sistema de DP"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={2}
              placeholder="Breve descrição do projeto"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Objetivo</label>
            <textarea
              value={form.objective}
              onChange={e => set("objective", e.target.value)}
              rows={2}
              placeholder="Qual o objetivo principal deste projeto?"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
            <input
              type="text"
              value={form.responsible}
              onChange={e => set("responsible", e.target.value)}
              placeholder="Nome do responsável"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data de início</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set("startDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data final prevista</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => set("dueDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
              <select
                value={form.priority}
                onChange={e => set("priority", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => set("status", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="PLANEJADO">Planejado</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="PAUSADO">Pausado</option>
                <option value="ATRASADO">Atrasado</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={2}
              placeholder="Informações adicionais"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando…" : editId ? "Salvar alterações" : "Criar projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
