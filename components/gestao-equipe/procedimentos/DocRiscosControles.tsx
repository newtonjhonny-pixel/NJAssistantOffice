"use client"

import { useState } from "react"
import { Save, Plus, Trash2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Probabilidade = "MUITO_BAIXA" | "BAIXA" | "MEDIA" | "ALTA" | "MUITO_ALTA"
type Impacto       = "MUITO_BAIXO" | "BAIXO" | "MEDIO" | "ALTO" | "MUITO_ALTO"
type Severidade    = "BAIXO" | "MEDIO" | "ALTO" | "CRITICO"
type TipoControle  = "PREVENTIVO" | "DETECTIVO" | "CORRETIVO" | "DIRETIVO"
type Eficacia      = "ALTA" | "MEDIA" | "BAIXA" | "NAO_AVALIADA"

interface Risco {
  id: string
  descricao: string
  categoria: string
  causa: string
  consequencia: string
  probabilidade: Probabilidade
  impacto: Impacto
  severidade: Severidade
}

interface Controle {
  id: string
  riscosRelacionados: string[]   // ids de riscos
  tipo: TipoControle
  descricao: string
  responsavel: string
  periodicidade: string
  eficacia: Eficacia
}

interface RiscosContent {
  __tipo: "RISCOS_CONTROLES"
  riscos: Risco[]
  controles: Controle[]
  notasGerais: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROB_LABELS: Record<Probabilidade, string> = {
  MUITO_BAIXA: "Muito Baixa", BAIXA: "Baixa", MEDIA: "Média",
  ALTA: "Alta", MUITO_ALTA: "Muito Alta",
}
const IMPACTO_LABELS: Record<Impacto, string> = {
  MUITO_BAIXO: "Muito Baixo", BAIXO: "Baixo", MEDIO: "Médio",
  ALTO: "Alto", MUITO_ALTO: "Muito Alto",
}
const PROB_SCORE: Record<Probabilidade, number> = {
  MUITO_BAIXA: 1, BAIXA: 2, MEDIA: 3, ALTA: 4, MUITO_ALTA: 5,
}
const IMP_SCORE: Record<Impacto, number> = {
  MUITO_BAIXO: 1, BAIXO: 2, MEDIO: 3, ALTO: 4, MUITO_ALTO: 5,
}

function calcSeveridade(p: Probabilidade, i: Impacto): Severidade {
  const score = PROB_SCORE[p] * IMP_SCORE[i]
  if (score >= 16) return "CRITICO"
  if (score >= 9)  return "ALTO"
  if (score >= 4)  return "MEDIO"
  return "BAIXO"
}

const SEV_COLORS: Record<Severidade, string> = {
  BAIXO:   "bg-green-100 text-green-700 border-green-200",
  MEDIO:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  ALTO:    "bg-orange-100 text-orange-700 border-orange-200",
  CRITICO: "bg-red-100 text-red-700 border-red-200",
}

const EFICACIA_COLORS: Record<Eficacia, string> = {
  ALTA:         "bg-green-100 text-green-700",
  MEDIA:        "bg-yellow-100 text-yellow-700",
  BAIXA:        "bg-red-100 text-red-700",
  NAO_AVALIADA: "bg-slate-100 text-slate-500",
}

const TIPO_CONTROLE_COLORS: Record<TipoControle, string> = {
  PREVENTIVO: "bg-blue-100 text-blue-700",
  DETECTIVO:  "bg-purple-100 text-purple-700",
  CORRETIVO:  "bg-orange-100 text-orange-700",
  DIRETIVO:   "bg-teal-100 text-teal-700",
}

const CATEGORIAS = [
  "Operacional", "Financeiro", "Tecnologia", "Compliance / Legal",
  "Recursos Humanos", "Segurança da Informação", "Saúde e Segurança",
  "Reputacional", "Estratégico", "Ambiental", "Outro",
]

const EMPTY: Omit<RiscosContent, "__tipo"> = {
  riscos: [], controles: [], notasGerais: "",
}

function parse(raw?: string | null): Omit<RiscosContent, "__tipo"> {
  if (!raw) return { ...EMPTY }
  try {
    const p = JSON.parse(raw)
    if (p.__tipo === "RISCOS_CONTROLES") return { ...EMPTY, ...p }
  } catch { /* ignore */ }
  // plain text legado → coloca em notasGerais
  return { ...EMPTY, notasGerais: raw }
}

function uid() { return Math.random().toString(36).slice(2) }

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label, value, onChange, rows = 1, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const El = rows > 1 ? "textarea" : "input"
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <El value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={rows > 1 ? rows : undefined}
        className={cn(
          "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800",
          "focus:outline-none focus:ring-2 focus:ring-rose-500",
          rows > 1 && "resize-y min-h-[70px]",
        )} />
    </div>
  )
}

function Select<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocRiscosControles({
  docId, risks: rawRisks, onSaved,
}: { docId: string; risks?: string | null; onSaved: () => void }) {
  const [form, setForm] = useState(() => parse(rawRisks))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  function set<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  // ── Riscos CRUD ──
  function addRisco() {
    const novo: Risco = {
      id: uid(), descricao: "", categoria: "Operacional", causa: "", consequencia: "",
      probabilidade: "MEDIA", impacto: "MEDIO", severidade: "MEDIO",
    }
    set("riscos", [...form.riscos, novo])
  }
  function removeRisco(id: string) {
    set("riscos", form.riscos.filter(r => r.id !== id))
    set("controles", form.controles.map(c => ({
      ...c, riscosRelacionados: c.riscosRelacionados.filter(rid => rid !== id),
    })))
  }
  function updateRisco(id: string, patch: Partial<Omit<Risco, "id">>) {
    set("riscos", form.riscos.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, ...patch }
      updated.severidade = calcSeveridade(updated.probabilidade, updated.impacto)
      return updated
    }))
  }

  // ── Controles CRUD ──
  function addControle() {
    const novo: Controle = {
      id: uid(), riscosRelacionados: [], tipo: "PREVENTIVO",
      descricao: "", responsavel: "", periodicidade: "", eficacia: "NAO_AVALIADA",
    }
    set("controles", [...form.controles, novo])
  }
  function removeControle(id: string) {
    set("controles", form.controles.filter(c => c.id !== id))
  }
  function updateControle(id: string, patch: Partial<Omit<Controle, "id">>) {
    set("controles", form.controles.map(c => c.id === id ? { ...c, ...patch } : c))
  }
  function toggleRiscoLink(controleId: string, riscoId: string) {
    set("controles", form.controles.map(c => {
      if (c.id !== controleId) return c
      const linked = c.riscosRelacionados.includes(riscoId)
        ? c.riscosRelacionados.filter(id => id !== riscoId)
        : [...c.riscosRelacionados, riscoId]
      return { ...c, riscosRelacionados: linked }
    }))
  }

  async function save() {
    setSaving(true)
    try {
      const payload: RiscosContent = { __tipo: "RISCOS_CONTROLES", ...form }
      const res = await fetch(`/api/procedures/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risks: JSON.stringify(payload) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    } catch (err) {
      console.error("[RiscosControles.save]", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Riscos e Controles</p>
          <p className="text-xs text-slate-500">Identificação de riscos, avaliação e controles mitigadores</p>
        </div>
      </div>

      {/* ── Riscos ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Riscos Identificados</h3>
          <button onClick={addRisco} type="button"
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold">
            <Plus className="w-3 h-3" /> Adicionar Risco
          </button>
        </div>

        {form.riscos.length === 0 && (
          <p className="text-xs text-slate-400 italic px-4 py-3 bg-slate-50 rounded-xl">
            Nenhum risco cadastrado. Clique em "Adicionar Risco" para começar.
          </p>
        )}

        {form.riscos.map((r, i) => (
          <div key={r.id} className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Cabeçalho do risco */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase shrink-0">R{String(i + 1).padStart(2, "0")}</span>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0", SEV_COLORS[r.severidade])}>
                {r.severidade}
              </span>
              <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                {r.descricao || "Risco sem descrição"}
              </span>
              <button onClick={() => removeRisco(r.id)} type="button"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Corpo do risco */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Descrição do Risco" value={r.descricao}
                  onChange={v => updateRisco(r.id, { descricao: v })}
                  placeholder="O quê pode acontecer?" />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Categoria</label>
                  <select value={r.categoria} onChange={e => updateRisco(r.id, { categoria: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Causa" value={r.causa}
                  onChange={v => updateRisco(r.id, { causa: v })}
                  placeholder="Por que pode ocorrer?" />
                <Field label="Consequência" value={r.consequencia}
                  onChange={v => updateRisco(r.id, { consequencia: v })}
                  placeholder="Qual o impacto gerado?" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Select<Probabilidade>
                  label="Probabilidade"
                  value={r.probabilidade}
                  onChange={v => updateRisco(r.id, { probabilidade: v })}
                  options={(["MUITO_BAIXA","BAIXA","MEDIA","ALTA","MUITO_ALTA"] as Probabilidade[]).map(v => ({
                    value: v, label: PROB_LABELS[v],
                  }))} />
                <Select<Impacto>
                  label="Impacto"
                  value={r.impacto}
                  onChange={v => updateRisco(r.id, { impacto: v })}
                  options={(["MUITO_BAIXO","BAIXO","MEDIO","ALTO","MUITO_ALTO"] as Impacto[]).map(v => ({
                    value: v, label: IMPACTO_LABELS[v],
                  }))} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Severidade (auto)</label>
                  <div className={cn("px-3 py-2 rounded-lg border text-sm font-semibold text-center", SEV_COLORS[r.severidade])}>
                    {r.severidade}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Controles ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Controles Mitigadores</h3>
          <button onClick={addControle} type="button"
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold">
            <Plus className="w-3 h-3" /> Adicionar Controle
          </button>
        </div>

        {form.controles.length === 0 && (
          <p className="text-xs text-slate-400 italic px-4 py-3 bg-slate-50 rounded-xl">
            Nenhum controle cadastrado.
          </p>
        )}

        {form.controles.map((c, i) => (
          <div key={c.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase shrink-0">C{String(i + 1).padStart(2, "0")}</span>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", TIPO_CONTROLE_COLORS[c.tipo])}>
                {c.tipo}
              </span>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", EFICACIA_COLORS[c.eficacia])}>
                Eficácia: {c.eficacia.replace("_", " ")}
              </span>
              <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                {c.descricao || "Controle sem descrição"}
              </span>
              <button onClick={() => removeControle(c.id)} type="button"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Select<TipoControle>
                  label="Tipo de Controle"
                  value={c.tipo}
                  onChange={v => updateControle(c.id, { tipo: v })}
                  options={[
                    { value: "PREVENTIVO", label: "Preventivo — evita o risco" },
                    { value: "DETECTIVO",  label: "Detectivo — identifica ocorrências" },
                    { value: "CORRETIVO",  label: "Corretivo — trata após ocorrência" },
                    { value: "DIRETIVO",   label: "Diretivo — orienta comportamento" },
                  ]} />
                <Select<Eficacia>
                  label="Eficácia"
                  value={c.eficacia}
                  onChange={v => updateControle(c.id, { eficacia: v })}
                  options={[
                    { value: "ALTA",         label: "Alta" },
                    { value: "MEDIA",        label: "Média" },
                    { value: "BAIXA",        label: "Baixa" },
                    { value: "NAO_AVALIADA", label: "Não Avaliada" },
                  ]} />
              </div>

              <Field label="Descrição do Controle" value={c.descricao}
                onChange={v => updateControle(c.id, { descricao: v })} rows={2}
                placeholder="Descreva o controle e como ele funciona..." />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Responsável" value={c.responsavel}
                  onChange={v => updateControle(c.id, { responsavel: v })}
                  placeholder="Quem executa?" />
                <Field label="Periodicidade" value={c.periodicidade}
                  onChange={v => updateControle(c.id, { periodicidade: v })}
                  placeholder="Ex: Diário · Mensal · A cada evento" />
              </div>

              {/* Vinculação a riscos */}
              {form.riscos.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Riscos Mitigados</label>
                  <div className="flex flex-wrap gap-2">
                    {form.riscos.map((r, ri) => {
                      const linked = c.riscosRelacionados.includes(r.id)
                      return (
                        <button key={r.id} type="button"
                          onClick={() => toggleRiscoLink(c.id, r.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors",
                            linked
                              ? "bg-rose-100 border-rose-300 text-rose-700"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300",
                          )}>
                          <span className="font-bold">R{String(ri + 1).padStart(2, "0")}</span>
                          <span className="max-w-[120px] truncate">{r.descricao || "Risco"}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ── Notas Gerais ── */}
      <Field label="Notas Gerais / Observações sobre Riscos" value={form.notasGerais}
        onChange={v => set("notasGerais", v)} rows={3}
        placeholder="Contexto adicional, premissas, observações gerais..." />

      {/* ── Salvar ── */}
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={save} disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            saved ? "bg-emerald-600 text-white" : "bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60",
          )}>
          <Save className="w-4 h-4" />
          {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar Riscos e Controles"}
        </button>
      </div>
    </div>
  )
}
