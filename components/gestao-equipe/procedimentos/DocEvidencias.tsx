"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, FileCheck, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoEvidencia =
  | "FORMULARIO" | "REGISTRO" | "RELATORIO" | "PRINT" | "AUDITORIA"
  | "CERTIFICADO" | "CONTRATO" | "EMAIL" | "OUTRO"

interface Evidencia {
  id: string
  titulo: string
  tipo: TipoEvidencia
  descricao: string
  referencia: string
  responsavel: string
  periodicidade: string
}

// Raw row from ProcedureAttachment
interface AttRow {
  id: string
  fileName: string
  fileType: string  // "__evidencia__:TIPO"
  filePath: string  // JSON extra fields
}

function rowToEvidencia(r: AttRow): Evidencia {
  const tipo = r.fileType.replace("__evidencia__", "") as TipoEvidencia
  let extra: Partial<Evidencia> = {}
  try { extra = JSON.parse(r.filePath) } catch { /* ignore */ }
  return {
    id:           r.id,
    titulo:       r.fileName,
    tipo,
    descricao:    extra.descricao    ?? "",
    referencia:   extra.referencia   ?? "",
    responsavel:  extra.responsavel  ?? "",
    periodicidade:extra.periodicidade ?? "",
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS: { value: TipoEvidencia; label: string; color: string }[] = [
  { value: "FORMULARIO",  label: "Formulário",        color: "bg-blue-100 text-blue-700"   },
  { value: "REGISTRO",    label: "Registro",          color: "bg-teal-100 text-teal-700"   },
  { value: "RELATORIO",   label: "Relatório",         color: "bg-indigo-100 text-indigo-700" },
  { value: "PRINT",       label: "Print / Screenshot", color: "bg-slate-100 text-slate-600" },
  { value: "AUDITORIA",   label: "Registro de Auditoria", color: "bg-orange-100 text-orange-700" },
  { value: "CERTIFICADO", label: "Certificado",       color: "bg-yellow-100 text-yellow-700" },
  { value: "CONTRATO",    label: "Contrato / Termo",  color: "bg-purple-100 text-purple-700" },
  { value: "EMAIL",       label: "E-mail / Comunicado", color: "bg-green-100 text-green-700" },
  { value: "OUTRO",       label: "Outro",             color: "bg-slate-100 text-slate-500" },
]

function tipoColor(tipo: TipoEvidencia) {
  return TIPOS.find(t => t.value === tipo)?.color ?? "bg-slate-100 text-slate-500"
}
function tipoLabel(tipo: TipoEvidencia) {
  return TIPOS.find(t => t.value === tipo)?.label ?? tipo
}

const EMPTY_FORM: Omit<Evidencia, "id"> = {
  titulo: "", tipo: "FORMULARIO", descricao: "",
  referencia: "", responsavel: "", periodicidade: "",
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DocEvidencias({ docId }: { docId: string }) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([])
  const [loading,    setLoading]    = useState(true)
  const [adding,     setAdding]     = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState<Omit<Evidencia, "id">>({ ...EMPTY_FORM })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/procedures/${docId}/evidencias`)
      if (!res.ok) throw new Error()
      const rows: AttRow[] = await res.json()
      setEvidencias(rows.map(rowToEvidencia))
    } catch {
      setEvidencias([])
    } finally {
      setLoading(false)
    }
  }, [docId])

  useEffect(() => { load() }, [load])

  function setF<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function addEvidencia() {
    if (!form.titulo.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/procedures/${docId}/evidencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setForm({ ...EMPTY_FORM })
      setAdding(false)
      await load()
    } catch (err) {
      console.error("[DocEvidencias.add]", err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvidencia(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/procedures/${docId}/evidencias?evidenciaId=${id}`, { method: "DELETE" })
      setEvidencias(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error("[DocEvidencias.delete]", err)
    } finally {
      setDeletingId(null)
    }
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
            <FileCheck className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Evidências Documentais</p>
            <p className="text-xs text-slate-500">Registros, formulários e referências que comprovam a execução</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAdding(true)} type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nova Evidência
          </button>
        </div>
      </div>

      {/* Formulário de adição */}
      {adding && (
        <div className="border border-teal-200 rounded-xl p-4 space-y-3 bg-teal-50/30">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Nova Evidência</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Título *</label>
              <input value={form.titulo} onChange={e => setF("titulo", e.target.value)}
                placeholder="Ex: Formulário de Registro de Presença" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo</label>
              <select value={form.tipo} onChange={e => setF("tipo", e.target.value as TipoEvidencia)}
                className={inputCls}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Descrição</label>
            <textarea value={form.descricao} onChange={e => setF("descricao", e.target.value)}
              placeholder="Descreva o conteúdo e finalidade da evidência..."
              rows={2} className={cn(inputCls, "resize-y")} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Referência / Localização</label>
              <input value={form.referencia} onChange={e => setF("referencia", e.target.value)}
                placeholder="Código, caminho, URL..." className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Responsável pelo Registro</label>
              <input value={form.responsavel} onChange={e => setF("responsavel", e.target.value)}
                placeholder="Nome / cargo" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Periodicidade de Geração</label>
              <input value={form.periodicidade} onChange={e => setF("periodicidade", e.target.value)}
                placeholder="Ex: A cada execução · Mensal" className={inputCls} />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setAdding(false); setForm({ ...EMPTY_FORM }) }} type="button"
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={addEvidencia} disabled={saving || !form.titulo.trim()} type="button"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? "Salvando…" : "Adicionar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Carregando evidências…</span>
        </div>
      ) : evidencias.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <FileCheck className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm font-medium text-slate-500">Nenhuma evidência cadastrada</p>
          <p className="text-xs mt-1">Adicione referências a formulários, registros e documentos comprobatórios.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evidencias.map(e => (
            <div key={e.id} className="border border-slate-200 rounded-xl p-4 flex gap-4 group hover:border-slate-300 transition-colors">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", tipoColor(e.tipo))}>
                    {tipoLabel(e.tipo)}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{e.titulo}</span>
                </div>
                {e.descricao && (
                  <p className="text-xs text-slate-500 leading-relaxed">{e.descricao}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {e.referencia && (
                    <span className="text-xs text-slate-400">
                      <span className="font-medium text-slate-500">Ref:</span> {e.referencia}
                    </span>
                  )}
                  {e.responsavel && (
                    <span className="text-xs text-slate-400">
                      <span className="font-medium text-slate-500">Resp:</span> {e.responsavel}
                    </span>
                  )}
                  {e.periodicidade && (
                    <span className="text-xs text-slate-400">
                      <span className="font-medium text-slate-500">Period.:</span> {e.periodicidade}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteEvidencia(e.id)}
                disabled={deletingId === e.id}
                type="button"
                className="self-start p-1.5 text-slate-300 group-hover:text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                {deletingId === e.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
