"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/utils"

interface TaskFormProps {
  task?: {
    id: string
    title: string
    description: string | null
    origin: string | null
    priority: string
    status: string
    person: string | null
    observations: string | null
    dueDate: string | null
  }
}

export function TaskForm({ task }: TaskFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    origin: task?.origin || "",
    priority: task?.priority || "MEDIA",
    status: task?.status || "PENDENTE",
    person: task?.person || "",
    observations: task?.observations || "",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = task ? `/api/tasks/${task.id}` : "/api/tasks"
      const method = task ? "PATCH" : "POST"
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dueDate: form.dueDate || null,
        }),
      })
      router.push("/tasks")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="Descreva brevemente a tarefa..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrição</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Detalhes sobre a tarefa..."
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prioridade</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputClass}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={inputClass}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pessoa envolvida</label>
              <input
                type="text"
                value={form.person}
                onChange={e => set("person", e.target.value)}
                placeholder="Nome ou departamento..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prazo</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => set("dueDate", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Origem</label>
            <input
              type="text"
              value={form.origin}
              onChange={e => set("origin", e.target.value)}
              placeholder="E-mail, reunião, demanda interna..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações</label>
            <textarea
              value={form.observations}
              onChange={e => set("observations", e.target.value)}
              placeholder="Informações adicionais..."
              rows={2}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : task ? "Salvar alterações" : "Criar tarefa"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
