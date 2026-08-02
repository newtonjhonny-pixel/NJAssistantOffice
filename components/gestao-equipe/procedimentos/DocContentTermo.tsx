"use client"

import { useState } from "react"
import { Save, Plus, Trash2, FileSignature } from "lucide-react"
import { cn } from "@/lib/utils"

interface Parte { id: string; nome: string; documento: string; papel: string }
interface Clausula { id: string; titulo: string; texto: string }

interface TermoContent {
  tipoTermo: string
  partes: Parte[]
  objeto: string
  clausulas: Clausula[]
  prazoVigencia: string
  dataInicio: string
  dataFim: string
  foro: string
  legislacao: string
  observacoes: string
}

const TIPOS_TERMO = [
  { value: "CONFIDENCIALIDADE",  label: "Termo de Confidencialidade (NDA)" },
  { value: "CIENCIA",            label: "Termo de Ciência e Concordância" },
  { value: "RESPONSABILIDADE",   label: "Termo de Responsabilidade" },
  { value: "ACEITE",             label: "Termo de Aceite" },
  { value: "COMPROMISSO",        label: "Termo de Compromisso" },
  { value: "AUTORIZACAO",        label: "Termo de Autorização" },
  { value: "PARCERIA",           label: "Termo de Parceria / Cooperação" },
  { value: "OUTRO",              label: "Outro" },
]

const EMPTY: TermoContent = {
  tipoTermo: "CONFIDENCIALIDADE",
  partes: [],
  objeto: "",
  clausulas: [],
  prazoVigencia: "",
  dataInicio: "",
  dataFim: "",
  foro: "",
  legislacao: "",
  observacoes: "",
}

function parse(raw?: string | null): TermoContent {
  if (!raw) return EMPTY
  try {
    const p = JSON.parse(raw)
    if (p.__tipo === "TERMO") return { ...EMPTY, ...p }
  } catch { /* ignore */ }
  return { ...EMPTY, objeto: raw }
}

function uid() { return Math.random().toString(36).slice(2) }

function Field({ label, value, onChange, rows = 1, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  rows?: number; placeholder?: string
}) {
  const El = rows > 1 ? "textarea" : "input"
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <El value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows > 1 ? rows : undefined}
        className={cn(
          "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800",
          "focus:outline-none focus:ring-2 focus:ring-purple-500",
          rows > 1 && "resize-y min-h-[80px]",
        )} />
    </div>
  )
}

export function DocContentTermo({
  docId, description, onSaved,
}: { docId: string; description?: string | null; onSaved: () => void }) {
  const [form, setForm] = useState<TermoContent>(() => parse(description))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof TermoContent>(k: K, v: TermoContent[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  // Partes
  function addParte() { set("partes", [...form.partes, { id: uid(), nome: "", documento: "", papel: "PARTE_A" }]) }
  function removeParte(id: string) { set("partes", form.partes.filter(p => p.id !== id)) }
  function updateParte(id: string, k: keyof Omit<Parte, "id">, v: string) {
    set("partes", form.partes.map(p => p.id === id ? { ...p, [k]: v } : p))
  }

  // Cláusulas
  function addClausula() { set("clausulas", [...form.clausulas, { id: uid(), titulo: "", texto: "" }]) }
  function removeClausula(id: string) { set("clausulas", form.clausulas.filter(c => c.id !== id)) }
  function updateClausula(id: string, k: keyof Omit<Clausula, "id">, v: string) {
    set("clausulas", form.clausulas.map(c => c.id === id ? { ...c, [k]: v } : c))
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, __tipo: "TERMO" }
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
      console.error("[TermoForm.save]", err)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
          <FileSignature className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Termo</p>
          <p className="text-xs text-slate-500">Instrumento de ciência, aceite ou comprometimento formal</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Tipo */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo de Termo</label>
          <select value={form.tipoTermo} onChange={e => set("tipoTermo", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500">
            {TIPOS_TERMO.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Partes */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Partes Envolvidas</label>
            <button onClick={addParte} type="button" className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium">
              <Plus className="w-3 h-3" /> Adicionar Parte
            </button>
          </div>
          {form.partes.length === 0 && (
            <p className="text-xs text-slate-400 italic px-3 py-2 bg-slate-50 rounded-lg">
              Adicione as partes signatárias deste termo.
            </p>
          )}
          {form.partes.map((p, i) => (
            <div key={p.id} className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
              <select value={p.papel} onChange={e => updateParte(p.id, "papel", e.target.value)}
                className="w-28 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                {["PARTE_A", "PARTE_B", "INTERVENIENTE", "TESTEMUNHA", "SIGNATARIO"].map(v => (
                  <option key={v} value={v}>{v.replace("_", " ")}</option>
                ))}
              </select>
              <input value={p.nome} onChange={e => updateParte(p.id, "nome", e.target.value)}
                placeholder="Nome completo / Razão social" className={inputCls} />
              <input value={p.documento} onChange={e => updateParte(p.id, "documento", e.target.value)}
                placeholder="CPF / CNPJ" className={cn(inputCls, "w-36 shrink-0")} />
              <button onClick={() => removeParte(p.id)} type="button"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <Field label="Objeto do Termo" value={form.objeto} onChange={v => set("objeto", v)}
          rows={3} placeholder="Descreva o objeto, finalidade e contexto deste termo..." />

        {/* Cláusulas */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cláusulas</label>
            <button onClick={addClausula} type="button" className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium">
              <Plus className="w-3 h-3" /> Adicionar Cláusula
            </button>
          </div>
          {form.clausulas.map((c, i) => (
            <div key={c.id} className="border border-purple-100 rounded-xl p-4 space-y-3 bg-purple-50/20">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-purple-700 shrink-0">Cláusula {i + 1}</span>
                <input value={c.titulo} onChange={e => updateClausula(c.id, "titulo", e.target.value)}
                  placeholder="Título da cláusula"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button onClick={() => removeClausula(c.id)} type="button"
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea value={c.texto} onChange={e => updateClausula(c.id, "texto", e.target.value)}
                placeholder="Texto completo da cláusula..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y" />
            </div>
          ))}
        </div>

        {/* Vigência */}
        <div className="grid grid-cols-3 gap-4">
          <Field label="Prazo de Vigência" value={form.prazoVigencia} onChange={v => set("prazoVigencia", v)}
            placeholder="Ex: 12 meses · Indeterminado" />
          <Field label="Data de Início" value={form.dataInicio} onChange={v => set("dataInicio", v)} />
          <Field label="Data de Término" value={form.dataFim} onChange={v => set("dataFim", v)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Foro" value={form.foro} onChange={v => set("foro", v)}
            placeholder="Ex: Comarca de São Paulo / SP" />
          <Field label="Legislação Aplicável" value={form.legislacao} onChange={v => set("legislacao", v)}
            placeholder="Ex: Lei 13.709/2018 (LGPD) · CLT" />
        </div>

        <Field label="Observações" value={form.observacoes} onChange={v => set("observacoes", v)} rows={2} />
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={save} disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            saved ? "bg-emerald-600 text-white" : "bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60",
          )}>
          <Save className="w-4 h-4" />
          {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar Termo"}
        </button>
      </div>
    </div>
  )
}
