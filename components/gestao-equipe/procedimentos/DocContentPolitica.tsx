"use client"

import { useState } from "react"
import { Save, Plus, Trash2, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface Diretriz { id: string; texto: string }
interface Referencia { id: string; texto: string }

interface PoliticaContent {
  declaracao: string
  ambito: string
  diretrizes: Diretriz[]
  responsabilidades: string
  penalidades: string
  referencias: Referencia[]
  vigencia: string
}

const EMPTY: PoliticaContent = {
  declaracao: "",
  ambito: "",
  diretrizes: [],
  responsabilidades: "",
  penalidades: "",
  referencias: [],
  vigencia: "",
}

function parse(raw?: string | null): PoliticaContent {
  if (!raw) return EMPTY
  try {
    const p = JSON.parse(raw)
    if (p.__tipo === "POLITICA") return { ...EMPTY, ...p }
  } catch { /* ignore */ }
  return { ...EMPTY, declaracao: raw }
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
      <El
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows > 1 ? rows : undefined}
        className={cn(
          "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          rows > 1 && "resize-y min-h-[80px]",
        )}
      />
    </div>
  )
}

function ListEditor({ label, items, onChange, placeholder }: {
  label: string
  items: { id: string; texto: string }[]
  onChange: (items: { id: string; texto: string }[]) => void
  placeholder?: string
}) {
  function add() { onChange([...items, { id: uid(), texto: "" }]) }
  function remove(id: string) { onChange(items.filter(i => i.id !== id)) }
  function update(id: string, texto: string) {
    onChange(items.map(i => i.id === id ? { ...i, texto } : i))
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
        <button onClick={add} type="button"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-slate-400 italic px-3 py-2 bg-slate-50 rounded-lg">
          Nenhum item. Clique em Adicionar.
        </p>
      )}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="flex gap-2 items-start">
            <span className="mt-2 text-xs text-slate-400 w-5 shrink-0 text-right">{idx + 1}.</span>
            <input
              value={item.texto}
              onChange={e => update(item.id, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => remove(item.id)} type="button"
              className="mt-1.5 p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DocContentPolitica({
  docId, description, onSaved,
}: { docId: string; description?: string | null; onSaved: () => void }) {
  const [form, setForm] = useState<PoliticaContent>(() => parse(description))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof PoliticaContent>(k: K, v: PoliticaContent[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, __tipo: "POLITICA" }
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
      console.error("[PoliticaForm.save]", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Política Interna</p>
          <p className="text-xs text-slate-500">Diretrizes, princípios e regras corporativas</p>
        </div>
      </div>

      <div className="space-y-5">
        <Field label="Declaração de Política" value={form.declaracao}
          onChange={v => set("declaracao", v)} rows={4} required
          />

        <Field label="Âmbito e Aplicação" value={form.ambito}
          onChange={v => set("ambito", v)} rows={3}
          />

        <ListEditor label="Diretrizes Principais"
          items={form.diretrizes}
          onChange={v => set("diretrizes", v)}
          placeholder="Ex: Todos os colaboradores devem seguir..."
          />

        <Field label="Responsabilidades" value={form.responsabilidades}
          onChange={v => set("responsabilidades", v)} rows={3}
          />

        <Field label="Penalidades por Descumprimento" value={form.penalidades}
          onChange={v => set("penalidades", v)} rows={2}
          />

        <ListEditor label="Referências Normativas / Legislação"
          items={form.referencias}
          onChange={v => set("referencias", v)}
          placeholder="Ex: CLT Art. 482 · ISO 9001:2015 · Lei 13.709/2018"
          />

        <Field label="Prazo de Vigência / Data de Entrada em Vigor"
          value={form.vigencia} onChange={v => set("vigencia", v)}
          />
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={save} disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            saved
              ? "bg-emerald-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60",
          )}>
          <Save className="w-4 h-4" />
          {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar Política"}
        </button>
      </div>
    </div>
  )
}
