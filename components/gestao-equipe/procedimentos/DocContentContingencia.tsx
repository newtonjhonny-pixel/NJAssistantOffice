"use client"

import { useState } from "react"
import { Save, Plus, Trash2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Risco { id: string; descricao: string; probabilidade: string; impacto: string; acionamento: string }
interface MembroEquipe { id: string; nome: string; funcao: string; contato: string }
interface PassoContingencia { id: string; ordem: number; acao: string; responsavel: string; prazo: string }
interface Canal { id: string; stakeholder: string; canal: string; mensagem: string }

interface ContingenciaContent {
  objetivo: string
  escopo: string
  rto: string
  rpo: string
  riscos: Risco[]
  equipe: MembroEquipe[]
  passos: PassoContingencia[]
  canais: Canal[]
  testePeriodico: string
  licoesAprendidas: string
}

const EMPTY: ContingenciaContent = {
  objetivo: "", escopo: "", rto: "", rpo: "",
  riscos: [], equipe: [], passos: [], canais: [],
  testePeriodico: "", licoesAprendidas: "",
}

function parse(raw?: string | null): ContingenciaContent {
  if (!raw) return EMPTY
  try {
    const p = JSON.parse(raw)
    if (p.__tipo === "CONTINGENCIA") return { ...EMPTY, ...p }
  } catch { /* ignore */ }
  return { ...EMPTY, objetivo: raw }
}

function uid() { return Math.random().toString(36).slice(2) }

const inputCls = "flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
const selectCls = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"

function Field({ label, value, onChange, rows = 1 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number
}) {
  const El = rows > 1 ? "textarea" : "input"
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <El value={value} onChange={e => onChange(e.target.value)}
        rows={rows > 1 ? rows : undefined}
        className={cn(
          "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800",
          "focus:outline-none focus:ring-2 focus:ring-orange-500",
          rows > 1 && "resize-y min-h-[80px]",
        )} />
    </div>
  )
}

export function DocContentContingencia({
  docId, description, onSaved,
}: { docId: string; description?: string | null; onSaved: () => void }) {
  const [form, setForm] = useState<ContingenciaContent>(() => parse(description))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof ContingenciaContent>(k: K, v: ContingenciaContent[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  // Riscos
  function addRisco() { set("riscos", [...form.riscos, { id: uid(), descricao: "", probabilidade: "MEDIA", impacto: "MEDIO", acionamento: "" }]) }
  function removeRisco(id: string) { set("riscos", form.riscos.filter(r => r.id !== id)) }
  function updateRisco(id: string, k: keyof Omit<Risco, "id">, v: string) {
    set("riscos", form.riscos.map(r => r.id === id ? { ...r, [k]: v } : r))
  }

  // Equipe
  function addMembro() { set("equipe", [...form.equipe, { id: uid(), nome: "", funcao: "", contato: "" }]) }
  function removeMembro(id: string) { set("equipe", form.equipe.filter(m => m.id !== id)) }
  function updateMembro(id: string, k: keyof Omit<MembroEquipe, "id">, v: string) {
    set("equipe", form.equipe.map(m => m.id === id ? { ...m, [k]: v } : m))
  }

  // Passos
  function addPasso() {
    set("passos", [...form.passos, { id: uid(), ordem: form.passos.length + 1, acao: "", responsavel: "", prazo: "" }])
  }
  function removePasso(id: string) { set("passos", form.passos.filter(p => p.id !== id)) }
  function updatePasso(id: string, k: keyof Omit<PassoContingencia, "id">, v: string | number) {
    set("passos", form.passos.map(p => p.id === id ? { ...p, [k]: v } : p))
  }

  // Canais
  function addCanal() { set("canais", [...form.canais, { id: uid(), stakeholder: "", canal: "", mensagem: "" }]) }
  function removeCanal(id: string) { set("canais", form.canais.filter(c => c.id !== id)) }
  function updateCanal(id: string, k: keyof Omit<Canal, "id">, v: string) {
    set("canais", form.canais.map(c => c.id === id ? { ...c, [k]: v } : c))
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, __tipo: "CONTINGENCIA" }
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
      console.error("[ContingenciaForm.save]", err)
    } finally {
      setSaving(false)
    }
  }

  const badgeImpact: Record<string, string> = {
    BAIXO: "bg-green-100 text-green-700",
    MEDIO: "bg-yellow-100 text-yellow-700",
    ALTO: "bg-orange-100 text-orange-700",
    CRITICO: "bg-red-100 text-red-700",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Plano de Contingência</p>
          <p className="text-xs text-slate-500">Resposta a falhas, crises e situações de emergência</p>
        </div>
      </div>

      <div className="space-y-5">
        <Field label="Objetivo" value={form.objetivo} onChange={v => set("objetivo", v)} rows={2} />
        <Field label="Escopo" value={form.escopo} onChange={v => set("escopo", v)} rows={2} />

        {/* RTO / RPO */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="RTO — Recovery Time Objective" value={form.rto} onChange={v => set("rto", v)} />
          <Field label="RPO — Recovery Point Objective" value={form.rpo} onChange={v => set("rpo", v)} />
        </div>

        {/* Riscos */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Riscos Cobertos</label>
            <button onClick={addRisco} type="button" className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium">
              <Plus className="w-3 h-3" /> Adicionar Risco
            </button>
          </div>
          {form.riscos.map((r, i) => (
            <div key={r.id} className="border border-orange-100 rounded-xl p-4 space-y-3 bg-orange-50/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Risco {i + 1}</span>
                <button onClick={() => removeRisco(r.id)} type="button"
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input value={r.descricao} onChange={e => updateRisco(r.id, "descricao", e.target.value)}
                placeholder="Descrição do risco / cenário de falha" className={cn(inputCls, "w-full")} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Probabilidade</label>
                  <select value={r.probabilidade} onChange={e => updateRisco(r.id, "probabilidade", e.target.value)}
                    className={cn(selectCls, "w-full")}>
                    {["BAIXA", "MEDIA", "ALTA", "MUITO_ALTA"].map(v => (
                      <option key={v} value={v}>{v.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Impacto</label>
                  <select value={r.impacto} onChange={e => updateRisco(r.id, "impacto", e.target.value)}
                    className={cn(selectCls, "w-full")}>
                    {["BAIXO", "MEDIO", "ALTO", "CRITICO"].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Critério de Acionamento</label>
                <input value={r.acionamento} onChange={e => updateRisco(r.id, "acionamento", e.target.value)}
                  placeholder="Quando este plano deve ser acionado?" className={cn(inputCls, "w-full")} />
              </div>
            </div>
          ))}
        </div>

        {/* Equipe */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Equipe de Resposta</label>
            <button onClick={addMembro} type="button" className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium">
              <Plus className="w-3 h-3" /> Adicionar Membro
            </button>
          </div>
          {form.equipe.map((m, i) => (
            <div key={m.id} className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
              <input value={m.nome} onChange={e => updateMembro(m.id, "nome", e.target.value)}
                placeholder="Nome" className={cn(inputCls, "w-40 shrink-0")} />
              <input value={m.funcao} onChange={e => updateMembro(m.id, "funcao", e.target.value)}
                placeholder="Função / Papel" className={inputCls} />
              <input value={m.contato} onChange={e => updateMembro(m.id, "contato", e.target.value)}
                placeholder="Contato (tel / e-mail)" className={inputCls} />
              <button onClick={() => removeMembro(m.id)} type="button"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Passos */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Procedimentos de Resposta</label>
            <button onClick={addPasso} type="button" className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium">
              <Plus className="w-3 h-3" /> Adicionar Passo
            </button>
          </div>
          {form.passos.map((p, i) => (
            <div key={p.id} className="flex gap-2 items-center">
              <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <input value={p.acao} onChange={e => updatePasso(p.id, "acao", e.target.value)}
                placeholder="Ação a executar" className={inputCls} />
              <input value={p.responsavel} onChange={e => updatePasso(p.id, "responsavel", e.target.value)}
                placeholder="Responsável" className={cn(inputCls, "w-36 shrink-0")} />
              <input value={p.prazo} onChange={e => updatePasso(p.id, "prazo", e.target.value)}
                placeholder="Prazo" className={cn(inputCls, "w-24 shrink-0")} />
              <button onClick={() => removePasso(p.id)} type="button"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Canais de Comunicação */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Comunicação em Crise</label>
            <button onClick={addCanal} type="button" className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium">
              <Plus className="w-3 h-3" /> Adicionar Canal
            </button>
          </div>
          {form.canais.map((c, i) => (
            <div key={c.id} className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
              <input value={c.stakeholder} onChange={e => updateCanal(c.id, "stakeholder", e.target.value)}
                placeholder="Stakeholder" className={cn(inputCls, "w-36 shrink-0")} />
              <input value={c.canal} onChange={e => updateCanal(c.id, "canal", e.target.value)}
                placeholder="Canal (e-mail, WhatsApp...)" className={cn(inputCls, "w-36 shrink-0")} />
              <input value={c.mensagem} onChange={e => updateCanal(c.id, "mensagem", e.target.value)}
                placeholder="Mensagem padrão" className={inputCls} />
              <button onClick={() => removeCanal(c.id)} type="button"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <Field label="Periodicidade de Testes / Simulados" value={form.testePeriodico} onChange={v => set("testePeriodico", v)} />
        <Field label="Lições Aprendidas / Registro de Acionamentos Anteriores"
          value={form.licoesAprendidas} onChange={v => set("licoesAprendidas", v)} rows={3} />
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={save} disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            saved ? "bg-emerald-600 text-white" : "bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60",
          )}>
          <Save className="w-4 h-4" />
          {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar Plano"}
        </button>
      </div>
    </div>
  )
}
