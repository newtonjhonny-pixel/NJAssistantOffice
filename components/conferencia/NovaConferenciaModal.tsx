"use client"

import { useState } from "react"
import { X, ShieldCheck } from "lucide-react"
import { PROCESS_TYPE_LABELS, STATUS_LABELS } from "./ConferenciaClient"
import { PRIORITY_LABELS } from "@/lib/utils"

interface Props {
  onClose: () => void
  onSaved: () => void
  editId?: string
  initial?: Partial<FormState>
}

interface FormState {
  title: string; processType: string; competence: string; companyUnit: string
  analystName: string; coordinatorName: string; conferenceDate: string
  correctionDueDate: string; status: string; priority: string
  description: string; notes: string
}

const EMPTY: FormState = {
  title: "", processType: "FOLHA", competence: "", companyUnit: "",
  analystName: "", coordinatorName: "", conferenceDate: "", correctionDueDate: "",
  status: "PENDENTE", priority: "MEDIA", description: "", notes: "",
}

export function NovaConferenciaModal({ onClose, onSaved, editId, initial }: Props) {
  const [form, setForm] = useState<FormState>({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError("Título obrigatório."); return }
    setSaving(true); setError("")
    const res = await fetch(editId ? `/api/conferencia/${editId}` : "/api/conferencia", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setError("Erro ao salvar. Tente novamente."); return }
    onSaved()
  }

  const fieldClass = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-white"
  const labelClass = "block text-xs font-medium text-slate-600 mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-4 shrink-0 sm:px-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-white" />
            <h2 className="text-sm font-bold text-white">{editId ? "Editar Conferência" : "Nova Conferência"}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {/* Título */}
            <div>
              <label className={labelClass}>Título da conferência *</label>
              <input value={form.title} onChange={set("title")} required
                placeholder="Ex: Conferência Folha Junho/2026 — Empresa X"
                className={fieldClass} />
            </div>

            {/* Tipo + Competência */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Tipo de processo *</label>
                <select value={form.processType} onChange={set("processType")} className={fieldClass}>
                  {Object.entries(PROCESS_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Competência</label>
                <input value={form.competence} onChange={set("competence")}
                  placeholder="Ex: 06/2026" className={fieldClass} />
              </div>
            </div>

            {/* Empresa */}
            <div>
              <label className={labelClass}>Empresa / Unidade</label>
              <input value={form.companyUnit} onChange={set("companyUnit")}
                placeholder="Nome da empresa ou unidade" className={fieldClass} />
            </div>

            {/* Analista + Coordenador */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Analista responsável</label>
                <input value={form.analystName} onChange={set("analystName")}
                  placeholder="Nome do analista" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Coordenador conferente</label>
                <input value={form.coordinatorName} onChange={set("coordinatorName")}
                  placeholder="Nome do coordenador" className={fieldClass} />
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Data da conferência</label>
                <input type="date" value={form.conferenceDate} onChange={set("conferenceDate")} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Prazo para correção</label>
                <input type="date" value={form.correctionDueDate} onChange={set("correctionDueDate")} className={fieldClass} />
              </div>
            </div>

            {/* Status + Prioridade */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={set("status")} className={fieldClass}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Prioridade</label>
                <select value={form.priority} onChange={set("priority")} className={fieldClass}>
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className={labelClass}>Descrição do processo</label>
              <textarea value={form.description} onChange={set("description")} rows={3}
                placeholder="Descreva o contexto e detalhes do processo a conferir..."
                className={fieldClass + " resize-none"} />
            </div>

            {/* Observações */}
            <div>
              <label className={labelClass}>Observações</label>
              <textarea value={form.notes} onChange={set("notes")} rows={2}
                placeholder="Observações adicionais..."
                className={fieldClass + " resize-none"} />
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
            <button type="button" onClick={onClose}
              className="text-sm text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg px-4 py-2 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-5 py-2 transition-colors disabled:opacity-50 font-medium">
              {saving ? "Salvando..." : editId ? "Salvar alterações" : "Criar conferência"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
