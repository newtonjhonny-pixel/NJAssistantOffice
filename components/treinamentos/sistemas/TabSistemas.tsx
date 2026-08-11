"use client"

import { useState, useEffect } from 'react'
import { Layers, Plus, X, Loader2 } from 'lucide-react'

interface Sistema {
  id: string; nome: string; finalidade?: string; responsavel?: string
  url?: string; nivelAcesso?: string; observacoes?: string
  processosIds: string[]; ativo: boolean
}

export default function TabSistemas({ onRefresh }: { onRefresh: () => void }) {
  const [items, setItems]     = useState<Sistema[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm]       = useState({ nome: '', finalidade: '', responsavel: '', url: '', nivelAcesso: '', observacoes: '' })
  const [saving, setSaving]   = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/treinamentos/sistemas')
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!form.nome) return
    setSaving(true)
    const res = await fetch('/api/treinamentos/sistemas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { load(); onRefresh(); setShowNew(false); setForm({ nome: '', finalidade: '', responsavel: '', url: '', nivelAcesso: '', observacoes: '' }) }
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={14}/> Novo Sistema
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center">
          <Layers size={32} className="mx-auto mb-2 text-slate-300"/>
          <p className="text-sm text-slate-400">Nenhum sistema cadastrado para ambientação.</p>
          <p className="text-xs text-slate-400 mt-1">Ex: Metadados, Holmes, Sismonaco...</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(s => (
            <div key={s.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 font-bold text-sm">
                  {s.nome.slice(0,2).toUpperCase()}
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">Acessar →</a>
                )}
              </div>
              <h4 className="mt-2 font-semibold text-slate-800">{s.nome}</h4>
              {s.finalidade && <p className="mt-1 text-xs text-slate-500">{s.finalidade}</p>}
              {s.responsavel && <p className="mt-1 text-xs text-slate-400">👤 {s.responsavel}</p>}
              {s.nivelAcesso && <p className="mt-0.5 text-xs text-slate-400">🔑 {s.nivelAcesso}</p>}
              {s.processosIds.length > 0 && (
                <p className="mt-1 text-xs text-indigo-500">{s.processosIds.length} processo(s) vinculado(s)</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Layers size={17}/> Novo Sistema</h3>
              <button onClick={() => setShowNew(false)} className="rounded-lg p-1 hover:bg-slate-100"><X size={15}/></button>
            </div>
            {(['nome','finalidade','responsavel','url','nivelAcesso','observacoes'] as const).map(field => (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">
                  {field === 'nome' ? 'Nome *' : field === 'nivelAcesso' ? 'Nível de Acesso' : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                {field === 'observacoes' ? (
                  <textarea value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"/>
                ) : (
                  <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={field === 'url' ? 'https://...' : ''}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.nome} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin"/>} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
