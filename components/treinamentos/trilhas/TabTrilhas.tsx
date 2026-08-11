"use client"

import { useState, useEffect } from 'react'
import { GitBranch, Plus, Search, Layers } from 'lucide-react'

interface Trail { id: string; titulo: string; descricao?: string; cargo?: string; status: string; totalItens: number }

export default function TabTrilhas({ onRefresh }: { onRefresh: () => void }) {
  const [items, setItems]     = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm]       = useState({ titulo: '', descricao: '', cargo: '' })
  const [saving, setSaving]   = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/treinamentos/trilhas')
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!form.titulo) return
    setSaving(true)
    const res = await fetch('/api/treinamentos/trilhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { load(); onRefresh(); setShowNew(false); setForm({ titulo: '', descricao: '', cargo: '' }) }
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={14}/> Nova Trilha
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center">
          <GitBranch size={32} className="mx-auto mb-2 text-slate-300"/>
          <p className="text-sm text-slate-400">Nenhuma trilha cadastrada.</p>
          <p className="text-xs text-slate-400 mt-1">Ex: Integração — Novo Colaborador DP</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
          {items.map(t => (
            <div key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <GitBranch size={15}/>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{t.titulo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${t.status === 'ATIVA' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>{t.status}</span>
                </div>
                {t.descricao && <p className="text-xs text-slate-500 mt-0.5">{t.descricao}</p>}
                <div className="mt-1 flex gap-3 text-xs text-slate-400">
                  {t.cargo && <span>👤 {t.cargo}</span>}
                  <span className="flex items-center gap-1"><Layers size={11}/> {t.totalItens} item(ns)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><GitBranch size={17}/> Nova Trilha</h3>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Título da trilha *" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            <input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
              placeholder="Cargo recomendado (ex: Assistente DP)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Descrição (opcional)" rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"/>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.titulo} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
