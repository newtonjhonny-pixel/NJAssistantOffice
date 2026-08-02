"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, GraduationCap, Loader2, CheckCircle, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Modalidade = "PRESENCIAL" | "EAD" | "HIBRIDO" | "ON_THE_JOB" | "WORKSHOP"
type StatusTrein = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO"

interface Treinamento {
  id: string
  titulo: string
  modalidade: Modalidade
  participante: string
  cargo: string
  data: string
  cargaHoraria: string
  instrutor: string
  status: StatusTrein
  observacoes: string
}

interface AttRow {
  id: string
  fileName: string
  fileType: string
  filePath: string
}

function rowToTreinamento(r: AttRow): Treinamento {
  const modalidade = r.fileType.replace("__treinamento__", "") as Modalidade
  let extra: Partial<Treinamento> = {}
  try { extra = JSON.parse(r.filePath) } catch { /* ignore */ }
  return {
    id: r.id, titulo: r.fileName, modalidade,
    participante:  extra.participante  ?? "",
    cargo:         extra.cargo         ?? "",
    data:          extra.data          ?? "",
    cargaHoraria:  extra.cargaHoraria  ?? "",
    instrutor:     extra.instrutor     ?? "",
    status:        extra.status        ?? "PENDENTE",
    observacoes:   extra.observacoes   ?? "",
  }
}

const MODALIDADE_LABELS: Record<Modalidade, string> = {
  PRESENCIAL: "Presencial", EAD: "EAD / Online", HIBRIDO: "Híbrido",
  ON_THE_JOB: "On the Job", WORKSHOP: "Workshop",
}

const STATUS_CONFIG: Record<StatusTrein, { label: string; color: string; Icon: React.ElementType }> = {
  PENDENTE:    { label: "Pendente",     color: "bg-slate-100 text-slate-600",  Icon: Clock        },
  EM_ANDAMENTO:{ label: "Em Andamento", color: "bg-blue-100 text-blue-700",    Icon: Loader2      },
  CONCLUIDO:   { label: "Concluído",    color: "bg-green-100 text-green-700",  Icon: CheckCircle  },
  CANCELADO:   { label: "Cancelado",    color: "bg-red-100 text-red-600",      Icon: XCircle      },
}

const EMPTY: Omit<Treinamento, "id"> = {
  titulo: "", modalidade: "PRESENCIAL", participante: "", cargo: "",
  data: "", cargaHoraria: "", instrutor: "", status: "PENDENTE", observacoes: "",
}

export function DocTreinamentos({ docId }: { docId: string }) {
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([])
  const [loading,      setLoading]      = useState(true)
  const [adding,       setAdding]       = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [form,         setForm]         = useState<Omit<Treinamento, "id">>({ ...EMPTY })
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/procedures/${docId}/treinamentos`)
      if (!res.ok) throw new Error()
      const rows: AttRow[] = await res.json()
      setTreinamentos(rows.map(rowToTreinamento))
    } catch { setTreinamentos([]) }
    finally   { setLoading(false) }
  }, [docId])

  useEffect(() => { load() }, [load])

  function setF<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function startEdit(t: Treinamento) {
    const { id: _id, ...rest } = t
    setForm(rest)
    setEditingId(t.id)
    setAdding(true)
  }

  async function submit() {
    if (!form.titulo.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await fetch(`/api/procedures/${docId}/treinamentos`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ treinamentoId: editingId, ...form }),
        })
      } else {
        await fetch(`/api/procedures/${docId}/treinamentos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      }
      setForm({ ...EMPTY })
      setAdding(false)
      setEditingId(null)
      await load()
    } catch (err) { console.error("[DocTreinamentos.submit]", err) }
    finally        { setSaving(false) }
  }

  async function deleteTreinamento(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/procedures/${docId}/treinamentos?treinamentoId=${id}`, { method: "DELETE" })
      setTreinamentos(prev => prev.filter(t => t.id !== id))
    } catch (err) { console.error("[DocTreinamentos.delete]", err) }
    finally        { setDeletingId(null) }
  }

  async function updateStatus(t: Treinamento, status: StatusTrein) {
    try {
      await fetch(`/api/procedures/${docId}/treinamentos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treinamentoId: t.id, status }),
      })
      setTreinamentos(prev => prev.map(x => x.id === t.id ? { ...x, status } : x))
    } catch (err) { console.error("[DocTreinamentos.updateStatus]", err) }
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"

  const stats = {
    total:      treinamentos.length,
    concluidos: treinamentos.filter(t => t.status === "CONCLUIDO").length,
    pendentes:  treinamentos.filter(t => t.status === "PENDENTE").length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Plano de Treinamentos</p>
            <p className="text-xs text-slate-500">Registro de capacitações vinculadas a este documento</p>
          </div>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setEditingId(null); setAdding(true) }}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors">
          <Plus className="w-3.5 h-3.5" /> Novo Treinamento
        </button>
      </div>

      {/* Counters */}
      {treinamentos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",      value: stats.total,      color: "text-slate-700" },
            { label: "Concluídos", value: stats.concluidos, color: "text-green-700" },
            { label: "Pendentes",  value: stats.pendentes,  color: "text-amber-700" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200 px-4 py-3 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulário */}
      {adding && (
        <div className="border border-violet-200 rounded-xl p-4 space-y-3 bg-violet-50/30">
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
            {editingId ? "Editar Treinamento" : "Novo Treinamento"}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Título *</label>
              <input value={form.titulo} onChange={e => setF("titulo", e.target.value)}
                placeholder="Ex: Treinamento no POP de Admissão" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Modalidade</label>
              <select value={form.modalidade} onChange={e => setF("modalidade", e.target.value as Modalidade)}
                className={inputCls}>
                {(Object.entries(MODALIDADE_LABELS) as [Modalidade, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Participante</label>
              <input value={form.participante} onChange={e => setF("participante", e.target.value)}
                placeholder="Nome do colaborador" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cargo</label>
              <input value={form.cargo} onChange={e => setF("cargo", e.target.value)}
                placeholder="Cargo / função" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data</label>
              <input type="date" value={form.data} onChange={e => setF("data", e.target.value)}
                className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Carga Horária</label>
              <input value={form.cargaHoraria} onChange={e => setF("cargaHoraria", e.target.value)}
                placeholder="Ex: 4h · 2 dias" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Instrutor</label>
              <input value={form.instrutor} onChange={e => setF("instrutor", e.target.value)}
                placeholder="Nome / área" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => setF("status", e.target.value as StatusTrein)}
                className={inputCls}>
                {(Object.entries(STATUS_CONFIG) as [StatusTrein, { label: string }][]).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Observações</label>
              <input value={form.observacoes} onChange={e => setF("observacoes", e.target.value)}
                placeholder="Notas adicionais" className={inputCls} />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setAdding(false); setEditingId(null); setForm({ ...EMPTY }) }}
              type="button" className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={submit} disabled={saving || !form.titulo.trim()} type="button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? "Salvando…" : editingId ? "Salvar Alteração" : "Adicionar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Carregando treinamentos…</span>
        </div>
      ) : treinamentos.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <GraduationCap className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm font-medium text-slate-500">Nenhum treinamento cadastrado</p>
          <p className="text-xs mt-1">Registre as capacitações necessárias para executar este documento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {treinamentos.map(t => {
            const cfg = STATUS_CONFIG[t.status]
            const StatusIcon = cfg.Icon
            return (
              <div key={t.id}
                className="border border-slate-200 rounded-xl p-4 flex gap-4 group hover:border-slate-300 transition-colors">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{t.titulo}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {MODALIDADE_LABELS[t.modalidade]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {t.participante && (
                      <span className="text-xs text-slate-500">
                        <span className="font-medium">Participante:</span> {t.participante}
                        {t.cargo && ` (${t.cargo})`}
                      </span>
                    )}
                    {t.instrutor && (
                      <span className="text-xs text-slate-500">
                        <span className="font-medium">Instrutor:</span> {t.instrutor}
                      </span>
                    )}
                    {t.data && (
                      <span className="text-xs text-slate-500">
                        <span className="font-medium">Data:</span> {t.data}
                      </span>
                    )}
                    {t.cargaHoraria && (
                      <span className="text-xs text-slate-500">
                        <span className="font-medium">CH:</span> {t.cargaHoraria}
                      </span>
                    )}
                  </div>
                  {t.observacoes && (
                    <p className="text-xs text-slate-400 italic">{t.observacoes}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Status badge + quick change */}
                  <div className="relative group/status">
                    <span className={cn("flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer", cfg.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover/status:flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                      {(Object.entries(STATUS_CONFIG) as [StatusTrein, { label: string; color: string; Icon: React.ElementType }][]).map(([v, c]) => (
                        <button key={v} type="button" onClick={() => updateStatus(t, v)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-50 text-left",
                            v === t.status ? "opacity-40 cursor-default" : "",
                          )}>
                          <c.Icon className="w-3 h-3" /> {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(t)} type="button"
                      className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteTreinamento(t.id)} disabled={deletingId === t.id}
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md">
                      {deletingId === t.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
