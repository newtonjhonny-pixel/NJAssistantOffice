"use client"

import { useState, useEffect } from 'react'
import { X, Cpu, CheckSquare, Square, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Process { id: string; name: string; code?: string; department?: string; status: string }

export default function ModalGerarAmbientacao({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const router = useRouter()
  const [processos, setProcessos]     = useState<Process[]>([])
  const [selected, setSelected]       = useState<string[]>([])
  const [titulo, setTitulo]           = useState('Ambientação Operacional')
  const [departamento, setDepartamento] = useState('')
  const [publicoAlvo, setPublicoAlvo] = useState('Novos colaboradores')
  const [responsavel, setResponsavel] = useState('')
  const [loading, setLoading]         = useState(false)
  const [loadingProc, setLoadingProc] = useState(true)

  useEffect(() => {
    fetch('/api/processes')
      .then(r => r.json())
      .then(d => { setProcessos(Array.isArray(d) ? d : []); setLoadingProc(false) })
      .catch(() => setLoadingProc(false))
  }, [])

  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function handleGerar() {
    if (!titulo || !selected.length) return
    setLoading(true)
    const res = await fetch('/api/treinamentos/ambientacao/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, processIds: selected, departamento, publicoAlvo, responsavel }),
    })
    if (res.ok) {
      const data = await res.json()
      onSaved() // atualiza contadores/lista
      // Navega direto para o editor de slides gerado
      if (data.presentationId) {
        router.push(`/apresentacoes/${data.presentationId}`)
      }
    } else {
      const text = await res.text()
      let msg = 'Erro ao gerar ambientação'
      try { msg = JSON.parse(text).error ?? msg } catch {}
      alert(msg)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2 text-purple-700 font-semibold">
            <Cpu size={18}/> Gerar Ambientação dos Processos
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X size={16}/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Título da Ambientação *</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
              placeholder="Ex: Ambientação – Departamento Pessoal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
              <input value={departamento} onChange={e => setDepartamento(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
                placeholder="Ex: Departamento Pessoal" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Público-Alvo</label>
              <input value={publicoAlvo} onChange={e => setPublicoAlvo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
                placeholder="Novos colaboradores" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
            <input value={responsavel} onChange={e => setResponsavel(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
              placeholder="Nome do instrutor/responsável" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Selecione os processos ({selected.length} selecionado{selected.length !== 1 ? 's' : ''})
            </label>
            {loadingProc ? (
              <div className="py-4 text-center text-sm text-slate-400">Carregando processos...</div>
            ) : processos.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-400">Nenhum processo cadastrado.</div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                {processos.map(p => (
                  <button key={p.id} onClick={() => toggle(p.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                    {selected.includes(p.id)
                      ? <CheckSquare size={15} className="text-purple-600 shrink-0"/>
                      : <Square      size={15} className="text-slate-300 shrink-0"/>}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-700">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.code ?? ''} {p.department ? `· ${p.department}` : ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
            ⚠️ Os dados serão buscados dos processos existentes. Campos não preenchidos aparecerão como "Não informado" — a IA não inventa dados.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
          <button
            onClick={handleGerar}
            disabled={loading || !titulo || !selected.length}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Cpu size={14}/>}
            {loading ? 'Gerando...' : 'Gerar Ambientação'}
          </button>
        </div>
      </div>
    </div>
  )
}
