"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { PRIORITY_LABELS } from "@/lib/utils"
import { ImageUploadZone, PendingImage } from "@/components/tasks/ImageUploadZone"
import { X, ZoomIn } from "lucide-react"

interface TaskFormProps {
  task?: {
    id: string
    title: string
    description: string | null
    origin: string | null
    priority: string
    status: string
    person: string | null
    responsible: string | null
    observations: string | null
    dueDate: string | null
    receivedAt: string | null
  }
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface ExistingAttachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  createdAt: string
}

// Lightbox simples para preview de imagem
function ImageLightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1 text-sm"
        >
          <X className="w-4 h-4" /> Fechar (Esc)
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl"
        />
        <p className="text-center text-white/60 text-xs mt-2">{name}</p>
      </div>
    </div>
  )
}

export function TaskForm({ task }: TaskFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingImages,   setPendingImages]   = useState<PendingImage[]>([])
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>([])
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null)
  const [form, setForm] = useState({
    title:        task?.title        || "",
    description:  task?.description  || "",
    origin:       task?.origin       || "",
    priority:     task?.priority     || "MEDIA",
    person:       task?.person       || "",
    responsible:  task?.responsible  || "",
    observations: task?.observations || "",
    dueDate:      task?.dueDate    ? new Date(task.dueDate).toISOString().split("T")[0] : "",
    receivedAt:   toDatetimeLocal(task?.receivedAt),
  })

  // Carregar anexos existentes no modo edição
  useEffect(() => {
    if (!task?.id) return
    fetch(`/api/tasks/${task.id}/attachments`)
      .then(r => r.json())
      .then(setExistingAttachments)
      .catch(() => {})
  }, [task?.id])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function uploadPendingImages(taskId: string) {
    const valid = pendingImages.filter(img => !img.error && img.preview)
    for (const img of valid) {
      const fd = new FormData()
      fd.append("file", img.file)
      try {
        await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: fd })
      } catch {
        // continua; imagem não bloqueará a tarefa
      }
    }
  }

  async function handleDeleteExisting(attachId: string) {
    if (!task?.id) return
    if (!confirm("Remover esta imagem?")) return
    await fetch(`/api/tasks/${task.id}/attachments/${attachId}`, { method: "DELETE" })
    setExistingAttachments(prev => prev.filter(a => a.id !== attachId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const url    = task ? `/api/tasks/${task.id}` : "/api/tasks"
      const method = task ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:        form.title,
          description:  form.description,
          origin:       form.origin,
          priority:     form.priority,
          person:       form.person,
          responsible:  form.responsible,
          observations: form.observations,
          dueDate:      form.dueDate    || null,
          receivedAt:   form.receivedAt || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erro ${res.status}`)
      }
      const saved = await res.json()
      const taskId = task?.id ?? saved.id
      if (taskId && pendingImages.length > 0) {
        await uploadPendingImages(taskId)
      }
      router.push("/tasks")
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar a tarefa. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"

  return (
    <>
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Título */}
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

          {/* Descrição */}
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

          {/* Prioridade | Recebida em | Prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prioridade</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputClass}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Recebida em
              </label>
              <input
                type="datetime-local"
                value={form.receivedAt}
                onChange={e => set("receivedAt", e.target.value)}
                className={inputClass}
                title="Quando esta demanda chegou até você"
              />
              <p className="text-xs text-slate-400 mt-1">Data e hora do recebimento</p>
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prazo</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => set("dueDate", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Pessoa + Responsável */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pessoa / Solicitante</label>
              <input
                type="text"
                value={form.person}
                onChange={e => set("person", e.target.value)}
                placeholder="Nome ou departamento..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Responsável pela Tarefa</label>
              <input
                type="text"
                value={form.responsible}
                onChange={e => set("responsible", e.target.value)}
                placeholder="Quem vai executar..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Origem */}
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

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações iniciais</label>
            <textarea
              value={form.observations}
              onChange={e => set("observations", e.target.value)}
              placeholder="Informações adicionais..."
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Evidências / Imagens */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Evidências / Imagens</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Cole prints, capturas de tela ou imagens relacionadas à demanda.
              </p>
            </div>

            {/* Anexos já salvos (modo edição) */}
            {existingAttachments.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">Imagens salvas:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {existingAttachments.map(att => (
                    <div key={att.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={att.filePath} alt={att.fileName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setLightbox({ src: att.filePath, name: att.fileName })}
                          className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-slate-700 hover:bg-white"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExisting(att.id)}
                          className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload de novas imagens */}
            <ImageUploadZone
              images={pendingImages}
              onChange={setPendingImages}
              existingCount={existingAttachments.length}
              onPreview={(src, name) => setLightbox({ src, name })}
            />
          </div>

          {task && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Para alterar o status da tarefa use o botão <strong>"Alterar Status"</strong> na tela de detalhes.
            </p>
          )}

          {saveError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ❌ {saveError}
            </p>
          )}

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

    {lightbox && (
      <ImageLightbox
        src={lightbox.src}
        name={lightbox.name}
        onClose={() => setLightbox(null)}
      />
    )}
  </>
  )
}
