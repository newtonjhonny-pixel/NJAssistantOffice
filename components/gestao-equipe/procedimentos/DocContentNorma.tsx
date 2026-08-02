"use client"

import { useState } from "react"
import { Save, Plus, Trash2, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface RequisitosItem { id: string; codigo: string; descricao: string; criterio: string }
interface Referencia { id: string; texto: string }
interface Definicao { id: string; termo: string; definicao: string }

interface NormaContent {
  objetivo: string
  campoAplicacao: string
  referencias: Referencia[]
  definicoes: Definicao[]
  requisitos: RequisitosItem[]
  naoConformidades: string
  sancoes: string
}

const EMPTY: NormaContent = {
  objetivo: "",
  campoAplicacao: "",
  referencias: [],
  definicoes: [],
  requisitos: [],
  naoConformidades: "",
  sancoes: "",
}

function parse(raw?: string | null): NormaContent {
  if (!raw) return EMPTY
  try {
    const p = JSON.parse(raw)
    if (p.__tipo === "NORMA") return { ...EMPTY, ...p }
  } catch { /* ignore */ }
  return { ...EMPTY, objetivo: raw }
}

function uid() { return Math.random().toString(36).slice(2) }

function Field({ label, value, onChange, rows = 1, required }: {
  label: string; value: string; onChange: (v: string) => void
  rows?: number; required?: boolean
}) {
  const El = rows > 1 ? "textarea" : "input"
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <El value={value} onChange={e => onChange(e.target.value)}
        rows={rows > 1 ? rows : undefined}
        className={cn(
          "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          rows > 1 && "resize-y min-h-[80px]",
        )} />
    </div>
  )
}

export function DocContentNorma({
  docId, description, onSaved,
}: { docId: string; description?: string | null; onSaved: () => void }) {
  const [form, setForm] = useState<NormaContent>(() => parse(description))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof NormaContent>(k: K, v: NormaContent[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function addRef() { set("referencias", [...form.referencias, { id: uid(), texto: "" }]) }
  function removeRef(id: string) { set("referencias", form.referencias.filter(r => r.id !== id)) }
  function updateRef(id: string, texto: string) {
    set("referencias", form.referencias.map(r => r.id === id ? { ...r, texto } : r))
  }

  function addDef() { set("definicoes", [...form.definicoes, { id: uid(), termo: "", definicao: "" }]) }
  function removeDef(id: string) { set("definicoes", form.definicoes.filter(d => d.id !== id)) }
  function updateDef(id: string, k: "termo" | "definicao", v: string) {
    set("definicoes", form.definicoes.map(d => d.id === id ? { ...d, [k]: v } : d))
  }

  function addReq() { set("requisitos", [...form.requisitos, { id: uid(), codigo: "", descricao: "", criterio: "" }]) }
  function removeReq(id: string) { set("requisitos", form.requisitos.filter(r => r.id !== id)) }
  function updateReq(id: string, k: keyof Omit<RequisitosItem, "id">, v: string) {
    set("requisitos", form.requisitos.map(r => r.id === id ? { ...r, [k]: v } : r))
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, __tipo: "NORMA" }
      const res = await fetch(`/api/procedures/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: JSON.stringify(payload) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    } catch (err) {
      console.error("[NormaForm.save]", err)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Norma Interna</p>
          <p className="text-xs text-slate-500">Requisitos técnicos e padrões obrigatórios</p>
        </div>
      </div>

      <div className="space-y-5">
        <Field label="Objetivo" value={form.objetivo} onChange={v => set("objetivo", v)} rows={3} required />
        <Field label="Campo de Aplicação" value={form.campoAplicacao} onChange={v => set("campoAplicacao", v)} rows={2} />

        {/* Referências */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Referências Normativas</label>
            <button onClick={addRef} type="button" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
          {form.referencias.length === 0 && (
            <p className="text-xs text-slate-400 italic px-3 py-2 bg-slate-50 rounded-lg">Ex: ABNT NBR ISO 9001:2015</p>
          )}
          {form.referencias.map((r, i) => (
            <div key={r.id} className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
              <input value={r.texto} onChange={e => updateRef(r.id, e.target.value)}
                placeholder="Ex: ISO 9001:2015 · NBR 5410 · Resolução ANVISA 60/2019"
                className={inputCls} />
              <button onClick={() => removeRef(r.id)} type="button"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Definições */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Definições e Abreviações</label>
            <button onClick={addDef} type="button" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
          {form.definicoes.map((d, i) => (
            <div key={d.id} className="flex gap-2 items-start">
              <span className="mt-2.5 text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
              <input value={d.termo} onChange={e => updateDef(d.id, "termo", e.target.value)}
                placeholder="Termo / Sigla" className="w-32 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={d.definicao} onChange={e => updateDef(d.id, "definicao", e.target.value)}
                placeholder="Definição" className={inputCls} />
              <button onClick={() => removeDef(d.id)} type="button"
                className="mt-1.5 p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Requisitos */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Requisitos Técnicos</label>
            <button onClick={addReq} type="button" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus className="w-3 h-3" /> Adicionar Requisito
            </button>
          </div>
          {form.requisitos.map((r, i) => (
            <div key={r.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Requisito {i + 1}</span>
                <button onClick={() => removeReq(r.id)} type="button"
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input value={r.codigo} onChange={e => updateReq(r.id, "codigo", e.target.value)}
                  placeholder="Código (ex: REQ-01)" className={inputCls} />
                <input value={r.descricao} onChange={e => updateReq(r.id, "descricao", e.target.value)}
                  placeholder="Descrição do Requisito" className={cn(inputCls, "col-span-2")} />
              </div>
              <input value={r.criterio} onChange={e => updateReq(r.id, "criterio", e.target.value)}
                placeholder="Critério de Aceitação" className={inputCls} />
            </div>
          ))}
        </div>

        <Field label="Tratamento de Não Conformidades" value={form.naoConformidades}
          onChange={v => set("naoConformidades", v)} rows={3} />
        <Field label="Sanções e Penalidades" value={form.sancoes}
          onChange={v => set("sancoes", v)} rows={2} />
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={save} disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60",
          )}>
          <Save className="w-4 h-4" />
          {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar Norma"}
        </button>
      </div>
    </div>
  )
}
