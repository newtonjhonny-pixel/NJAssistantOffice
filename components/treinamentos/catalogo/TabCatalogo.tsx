"use client"

import { useState, useEffect } from 'react'
import { BookOpen, Search, Users, Layers, Trash2, Pencil, Presentation, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Training {
  id: string; titulo: string; objetivo?: string; responsavel?: string
  departamento?: string; status: string; duracaoMin?: number
  presentationId?: string | null
  totalParticipantes: number; totalModulos: number; obrigatorio: boolean
  updatedAt: string; tags?: string
}

interface EditForm { titulo: string; status: string; responsavel: string; departamento: string; duracaoMin: string }

export default function TabCatalogo({ onRefresh }: { onRefresh: () => void }) {
  const [items, setItems]       = useState<Training[]>([])
  const [loading, setLoading]   = useState(true)
  const [q, setQ]               = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [editing, setEditing]           = useState<Training | null>(null)
  const [editForm, setEditForm]         = useState<EditForm>({ titulo: '', status: '', responsavel: '', departamento: '', duracaoMin: '' })
  const [saving, setSaving]             = useState(false)
  const [creatingApres, setCreatingApres] = useState<string | null>(null)
  const router = useRouter()

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ tipo: 'TREINAMENTO' })
    if (q)            params.set('q', q)
    if (filterStatus) params.set('status', filterStatus)
    fetch(`/api/treinamentos?${params}`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [q, filterStatus])

  async function handleDelete(id: string, titulo: string) {
    if (!confirm(`Excluir "${titulo}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(id)
    await fetch(`/api/treinamentos/${id}`, { method: 'DELETE' })
    load(); onRefresh()
    setDeleting(null)
  }

  async function handleAbrirApresentacao(t: Training) {
    if (t.presentationId) {
      router.push(`/apresentacoes/${t.presentationId}`)
      return
    }
    setCreatingApres(t.id)
    try {
      const res = await fetch('/api/apresentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       t.titulo,
          description: t.objetivo ?? '',
          type:        'slides',
          objective:   t.objetivo ?? `Material de treinamento — ${t.titulo}`,
          audience:    t.departamento ?? '',
        }),
      })
      if (!res.ok) { alert('Erro ao criar apresentação'); return }
      const apres = await res.json()

      await fetch(`/api/treinamentos/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentationId: apres.id }),
      })

      load()
      router.push(`/apresentacoes/${apres.id}`)
    } finally {
      setCreatingApres(null)
    }
  }

  function openEdit(t: Training) {
    setEditing(t)
    setEditForm({
      titulo: t.titulo, status: t.status,
      responsavel: t.responsavel ?? '', departamento: t.departamento ?? '',
      duracaoMin: t.duracaoMin ? String(t.duracaoMin) : '',
    })
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(true)
    await fetch(`/api/treinamentos/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, duracaoMin: editForm.duracaoMin ? Number(editForm.duracaoMin) : null }),
    })
    setSaving(false)
    setEditing(null)
    load(); onRefresh()
  }

  const statusColors: Record<string, string> = {
    RASCUNHO:  'bg-slate-100 text-slate-500',
    ATIVO:     'bg-green-100 text-green-700',
    ARQUIVADO: 'bg-slate-200 text-slate-400',
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar treinamento..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-indigo-400"
          />
        </div>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="ATIVO">Ativo</option>
          <option value="ARQUIVADO">Arquivado</option>
        </select>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center">
          <BookOpen size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum treinamento cadastrado.</p>
          <p className="text-xs text-slate-400 mt-1">Use o botão "Novo Treinamento" para criar.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
          {items.map(t => (
            <div key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <BookOpen size={15}/>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="truncate font-medium text-slate-800">{t.titulo}</span>
                  {t.obrigatorio && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">Obrigatório</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[t.status] ?? 'bg-slate-100 text-slate-500'}`}>{t.status}</span>
                </div>
                {t.objetivo && <p className="mt-0.5 truncate text-xs text-slate-500">{t.objetivo}</p>}
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  {t.responsavel  && <span>👤 {t.responsavel}</span>}
                  {t.departamento && <span>🏢 {t.departamento}</span>}
                  {t.duracaoMin   && <span>⏱ {t.duracaoMin} min</span>}
                  <span className="flex items-center gap-1"><Layers size={11}/> {t.totalModulos} módulo(s)</span>
                  <span className="flex items-center gap-1"><Users  size={11}/> {t.totalParticipantes} participante(s)</span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex shrink-0 items-center gap-1 self-center">
                {/* Apresentação — cria e vincula se não existir */}
                <button
                  onClick={() => handleAbrirApresentacao(t)}
                  disabled={creatingApres === t.id}
                  title={t.presentationId ? 'Abrir Apresentação' : 'Criar e Abrir Apresentação'}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    t.presentationId
                      ? 'text-blue-600 hover:bg-blue-100'
                      : 'text-slate-400 hover:bg-blue-100 hover:text-blue-600'
                  } disabled:opacity-40`}
                >
                  {creatingApres === t.id
                    ? <Loader2 size={13} className="animate-spin"/>
                    : <Presentation size={14}/>}
                </button>
                {/* Editar */}
                <button
                  onClick={() => openEdit(t)}
                  title="Editar"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                >
                  <Pencil size={14}/>
                </button>
                {/* Excluir */}
                <button
                  onClick={() => handleDelete(t.id, t.titulo)}
                  disabled={deleting === t.id}
                  title="Excluir"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-40"
                >
                  {deleting === t.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={14}/>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Editar */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><BookOpen size={17}/> Editar Treinamento</h3>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Duração (min)</label>
                <input type="number" value={editForm.duracaoMin} onChange={e => setEditForm(f => ({ ...f, duracaoMin: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
                <input value={editForm.responsavel} onChange={e => setEditForm(f => ({ ...f, responsavel: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
                <input value={editForm.departamento} onChange={e => setEditForm(f => ({ ...f, departamento: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={saving || !editForm.titulo}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin"/>} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
