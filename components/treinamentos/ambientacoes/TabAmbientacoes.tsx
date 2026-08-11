"use client"

import { useState, useEffect } from 'react'
import { Monitor, Search, Users, Cpu, Trash2, Pencil, Presentation, Loader2, X } from 'lucide-react'
import ModalGerarAmbientacao from './ModalGerarAmbientacao'
import { useRouter } from 'next/navigation'

interface Amb {
  id: string; titulo: string; objetivo?: string; responsavel?: string
  departamento?: string; status: string; duracaoMin?: number
  presentationId?: string | null
  totalParticipantes: number; conteudo?: { blocos?: unknown[] } | null
  updatedAt: string
}

interface EditForm { titulo: string; status: string; responsavel: string; departamento: string }

export default function TabAmbientacoes({ onRefresh }: { onRefresh: () => void }) {
  const [items, setItems]         = useState<Amb[]>([])
  const [loading, setLoading]     = useState(true)
  const [q, setQ]                 = useState('')
  const [showGerar, setShowGerar] = useState(false)
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [editing, setEditing]           = useState<Amb | null>(null)
  const [editForm, setEditForm]         = useState<EditForm>({ titulo: '', status: '', responsavel: '', departamento: '' })
  const [saving, setSaving]             = useState(false)
  const [creatingApres, setCreatingApres] = useState<string | null>(null)
  const router = useRouter()

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ tipo: 'AMBIENTACAO' })
    if (q) params.set('q', q)
    fetch(`/api/treinamentos?${params}`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [q])

  async function handleDelete(id: string, titulo: string) {
    if (!confirm(`Excluir "${titulo}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(id)
    await fetch(`/api/treinamentos/${id}`, { method: 'DELETE' })
    load(); onRefresh()
    setDeleting(null)
  }

  function openEdit(a: Amb) {
    setEditing(a)
    setEditForm({ titulo: a.titulo, status: a.status, responsavel: a.responsavel ?? '', departamento: a.departamento ?? '' })
  }

  async function handleAbrirApresentacao(a: Amb) {
    // Se já tem apresentação vinculada, navega direto
    if (a.presentationId) {
      router.push(`/apresentacoes/${a.presentationId}`)
      return
    }
    // Cria apresentação com os dados da ambientação e vincula
    setCreatingApres(a.id)
    try {
      // Monta descrição a partir dos blocos de processo
      const blocos = a.conteudo?.blocos as Array<Record<string,unknown>> | undefined
      const descricao = blocos?.length
        ? `Ambientação com ${blocos.length} processo(s): ${blocos.map((b: Record<string,unknown>) => b.titulo ?? b.processId).join(', ')}`
        : a.objetivo ?? ''

      const res = await fetch('/api/apresentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       a.titulo,
          description: descricao,
          type:        'slides',
          objective:   a.objetivo ?? `Apresentar o funcionamento operacional — ${a.titulo}`,
          audience:    'Novos colaboradores',
        }),
      })
      if (!res.ok) { alert('Erro ao criar apresentação'); return }
      const apres = await res.json()

      // Vincula a apresentação ao treinamento
      await fetch(`/api/treinamentos/${a.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentationId: apres.id }),
      })

      load() // recarrega para atualizar presentationId no estado local
      router.push(`/apresentacoes/${apres.id}`)
    } finally {
      setCreatingApres(null)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    await fetch(`/api/treinamentos/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    setEditing(null)
    load(); onRefresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ambientação..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-indigo-400"
          />
        </div>
        <button
          onClick={() => setShowGerar(true)}
          className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100"
        >
          <Cpu size={14}/> Gerar dos Processos
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-purple-100 py-14 text-center">
          <Monitor size={32} className="mx-auto mb-2 text-purple-200" />
          <p className="text-sm text-slate-500 font-medium">Nenhuma ambientação cadastrada.</p>
          <p className="text-xs text-slate-400 mt-1">Crie para apresentar rapidamente como a área funciona.</p>
          <button
            onClick={() => setShowGerar(true)}
            className="mt-3 flex items-center gap-1.5 mx-auto rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Cpu size={13}/> Gerar dos Processos Existentes
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
          {items.map(a => (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <Monitor size={15}/>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-800">{a.titulo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>{a.status}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  {a.departamento && <span>🏢 {a.departamento}</span>}
                  {a.responsavel  && <span>👤 {a.responsavel}</span>}
                  {a.conteudo?.blocos && (
                    <span>📋 {a.conteudo.blocos.length} processo(s)</span>
                  )}
                  <span className="flex items-center gap-1"><Users size={11}/> {a.totalParticipantes} participante(s)</span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex shrink-0 items-center gap-1 self-center">
                {/* Apresentação — cria e vincula se não existir */}
                <button
                  onClick={() => handleAbrirApresentacao(a)}
                  disabled={creatingApres === a.id}
                  title={a.presentationId ? 'Abrir Apresentação' : 'Criar e Abrir Apresentação'}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    a.presentationId
                      ? 'text-purple-600 hover:bg-purple-100'
                      : 'text-slate-400 hover:bg-purple-100 hover:text-purple-600'
                  } disabled:opacity-40`}
                >
                  {creatingApres === a.id
                    ? <Loader2 size={13} className="animate-spin"/>
                    : <Presentation size={14}/>}
                </button>
                {/* Editar */}
                <button
                  onClick={() => openEdit(a)}
                  title="Editar"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                >
                  <Pencil size={14}/>
                </button>
                {/* Excluir */}
                <button
                  onClick={() => handleDelete(a.id, a.titulo)}
                  disabled={deleting === a.id}
                  title="Excluir"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-40"
                >
                  {deleting === a.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={14}/>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showGerar && (
        <ModalGerarAmbientacao
          onClose={() => setShowGerar(false)}
          onSaved={() => { setShowGerar(false); load(); onRefresh() }}
        />
      )}

      {/* Modal Editar */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Monitor size={17}/> Editar Ambientação</h3>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1 hover:bg-slate-100"><X size={15}/></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
              <input value={editForm.titulo} onChange={e => setEditForm(f => ({ ...f, titulo: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="ARQUIVADO">Arquivado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
                <input value={editForm.responsavel} onChange={e => setEditForm(f => ({ ...f, responsavel: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
              <input value={editForm.departamento} onChange={e => setEditForm(f => ({ ...f, departamento: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={saving || !editForm.titulo}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin"/>} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
