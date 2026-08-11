"use client"

import { useState, useEffect } from 'react'
import { Users, Search, CheckCircle, Clock, XCircle } from 'lucide-react'

interface Participant {
  id: string; memberName: string; memberRole: string; trainingId: string
  status: string; progresso: number; nota?: number; cienciaConfirmada: boolean
  dataConclusao?: string; instrutorNome?: string
  // joined from Training
  trainingTitulo?: string; trainingTipo?: string
}

export default function TabParticipantes() {
  const [items, setItems]     = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')
  const [members, setMembers] = useState<{ id: string; name: string; role: string }[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [readiness, setReadiness] = useState<Record<string, number>>({})

  useEffect(() => {
    // Carrega membros para o filtro
    fetch('/api/gestao-equipe/members')
      .then(r => r.json())
      .then(d => setMembers(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    if (!selectedMember) { setItems([]); setLoading(false); return }
    setLoading(true)
    Promise.all([
      fetch(`/api/treinamentos?tipo=`).then(r => r.json()),
      fetch(`/api/treinamentos/readiness/${selectedMember}`).then(r => r.json()),
    ]).then(([trainings, rdns]) => {
      const allTrainings = Array.isArray(trainings) ? trainings : []
      const participacoes = rdns?.participacoes ?? []
      const enriched = participacoes.map((p: Record<string, unknown>) => {
        const t = allTrainings.find((tr: Record<string, unknown>) => tr.id === p.trainingId) ?? {}
        return { ...p, trainingTitulo: (t as Record<string, unknown>).titulo, trainingTipo: (t as Record<string, unknown>).tipo }
      })
      setItems(enriched)
      setReadiness({ prontidao: rdns?.prontidao ?? 0, ...rdns?.scores })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedMember])

  const statusIcon = (s: string) => {
    if (s === 'CONCLUIDO')    return <CheckCircle size={14} className="text-green-500"/>
    if (s === 'EM_ANDAMENTO') return <Clock       size={14} className="text-amber-500"/>
    if (s === 'CANCELADO')    return <XCircle     size={14} className="text-red-400"/>
    return <Clock size={14} className="text-slate-300"/>
  }

  const prontidao = (readiness as { prontidao?: number }).prontidao ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm min-w-[220px]">
          <option value="">— Selecione um colaborador —</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
        </select>
      </div>

      {selectedMember && (
        <>
          {/* Prontidão */}
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Prontidão para a Função</span>
              <span className={`text-2xl font-bold ${prontidao >= 80 ? 'text-green-600' : prontidao >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {prontidao}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${prontidao}%` }}/>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
              {Object.entries(readiness).filter(([k]) => k !== 'prontidao').map(([k, v]) => (
                <span key={k}>{k}: <strong>{v as number}%</strong></span>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">Pesos configuráveis em Configurações → Prontidão</p>
          </div>

          {/* Lista de participações */}
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Nenhuma participação registrada para este colaborador.</div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
              {items.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  {statusIcon(p.status)}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800">{p.trainingTitulo ?? 'Treinamento'}</div>
                    <div className="text-xs text-slate-400">
                      {p.trainingTipo === 'AMBIENTACAO' ? '🟣 Ambientação' : '🔵 Treinamento'}
                      {p.instrutorNome && ` · Instrutor: ${p.instrutorNome}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                      p.status === 'CONCLUIDO'    ? 'bg-green-100 text-green-700' :
                      p.status === 'EM_ANDAMENTO' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>{p.status}</div>
                    <div className="mt-1 text-xs text-slate-400">{p.progresso}%</div>
                    {p.cienciaConfirmada && <div className="text-xs text-green-500">✓ Ciência</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedMember && (
        <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center">
          <Users size={32} className="mx-auto mb-2 text-slate-300"/>
          <p className="text-sm text-slate-400">Selecione um colaborador para ver suas participações e prontidão.</p>
        </div>
      )}
    </div>
  )
}
