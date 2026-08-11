"use client"

import { useState, useEffect } from 'react'
import { X, BookOpen, Monitor, Loader2 } from 'lucide-react'

interface Props {
  tipo: 'TREINAMENTO' | 'AMBIENTACAO'
  onClose: () => void
  onSaved: () => void
}

export default function ModalNovoTreinamento({ tipo, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    titulo: '', objetivo: '', responsavel: '', departamento: '',
    publicoAlvo: tipo === 'AMBIENTACAO' ? 'Novos colaboradores' : '',
    duracaoMin: '', modalidade: tipo === 'AMBIENTACAO' ? 'SIMPLIFICADO' : 'COMPLETO',
    obrigatorio: false,
  })
  const [saving, setSaving] = useState(false)
  const [processos, setProcessos] = useState<{ id: string; name: string }[]>([])
  const [processId, setProcessId] = useState('')

  useEffect(() => {
    fetch('/api/processes').then(r => r.json()).then(d => setProcessos(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function handleSave() {
    if (!form.titulo) return
    setSaving(true)
    const res = await fetch('/api/treinamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo,
        ...form,
        duracaoMin: form.duracaoMin ? Number(form.duracaoMin) : null,
        processId: processId || null,
      }),
    })
    if (res.ok) { onSaved() }
    else {
      const e = await res.json()
      alert(e.error ?? 'Erro ao salvar')
    }
    setSaving(false)
  }

  const isAmb = tipo === 'AMBIENTACAO'
  const Icon  = isAmb ? Monitor : BookOpen
  const color = isAmb ? 'purple' : 'blue'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className={`flex items-center justify-between border-b border-slate-100 px-5 py-4`}>
          <div className={`flex items-center gap-2 font-semibold text-${color}-700`}>
            <Icon size={18}/> {isAmb ? 'Nova Ambientação' : 'Novo Treinamento'}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X size={16}/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder={isAmb ? 'Ex: Ambientação – Departamento Pessoal' : 'Ex: Treinamento de Folha de Pagamento'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Objetivo</label>
            <textarea value={form.objetivo} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
              rows={2} placeholder="Objetivo desta capacitação..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Responsável / Instrutor</label>
              <input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                placeholder="Nome do instrutor"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
              <input value={form.departamento} onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))}
                placeholder="Ex: Departamento Pessoal"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Público-Alvo</label>
              <input value={form.publicoAlvo} onChange={e => setForm(f => ({ ...f, publicoAlvo: e.target.value }))}
                placeholder="Ex: Novos colaboradores"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Duração Estimada (min)</label>
              <input value={form.duracaoMin} onChange={e => setForm(f => ({ ...f, duracaoMin: e.target.value }))}
                type="number" min="1" placeholder="Ex: 60"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Processo Vinculado (opcional)</label>
            <select value={processId} onChange={e => setProcessId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
              <option value="">Nenhum</option>
              {processos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-400">Vinculando, os dados reais do processo serão reutilizados.</p>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="obrig" checked={form.obrigatorio} onChange={e => setForm(f => ({ ...f, obrigatorio: e.target.checked }))}
              className="rounded"/>
            <label htmlFor="obrig" className="text-sm text-slate-600">Obrigatório (inclui no cálculo de prontidão)</label>
          </div>

          {isAmb && (
            <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-xs text-purple-700">
              💡 Ambientação criada. Você poderá vincular processos e gerar a estrutura de apresentação após salvar.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.titulo}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${isAmb ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {saving && <Loader2 size={13} className="animate-spin"/>}
            {saving ? 'Salvando...' : isAmb ? 'Criar Ambientação' : 'Criar Treinamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
