"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  GraduationCap, BookOpen, Users, GitBranch, Calendar,
  BarChart3, Settings, Plus, RefreshCw, Search,
  CheckCircle, Clock, Archive, AlertCircle, Layers,
  Monitor, ChevronRight, Filter,
} from 'lucide-react'
import TabVisaoGeral      from './visao-geral/TabVisaoGeral'
import TabCatalogo        from './catalogo/TabCatalogo'
import TabAmbientacoes    from './ambientacoes/TabAmbientacoes'
import TabTrilhas         from './trilhas/TabTrilhas'
import TabParticipantes   from './participantes/TabParticipantes'
import TabSistemas        from './sistemas/TabSistemas'
import ModalNovoTreinamento from './detalhe/ModalNovoTreinamento'

type Tab = 'visao-geral' | 'catalogo' | 'ambientacoes' | 'trilhas' | 'participantes' | 'sistemas'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'visao-geral',    label: 'Visão Geral',    icon: <BarChart3  size={15} /> },
  { id: 'catalogo',       label: 'Catálogo',        icon: <BookOpen   size={15} /> },
  { id: 'ambientacoes',   label: 'Ambientações',    icon: <Monitor    size={15} /> },
  { id: 'trilhas',        label: 'Trilhas',          icon: <GitBranch  size={15} /> },
  { id: 'participantes',  label: 'Participantes',   icon: <Users      size={15} /> },
  { id: 'sistemas',       label: 'Sistemas',         icon: <Layers     size={15} /> },
]

export default function TreinamentosClient() {
  const [activeTab, setActiveTab]   = useState<Tab>('visao-geral')
  const [summary, setSummary]       = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading]       = useState(true)
  const [showNovo, setShowNovo]     = useState(false)
  const [novoTipo, setNovoTipo]     = useState<'TREINAMENTO' | 'AMBIENTACAO'>('TREINAMENTO')
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    setLoading(true)
    fetch('/api/treinamentos/summary')
      .then(r => r.json())
      .then(d => { setSummary(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refreshKey])

  const counts = (summary as { counts?: Record<string, number> })?.counts ?? {}

  function handleNovoTreinamento() { setNovoTipo('TREINAMENTO'); setShowNovo(true) }
  function handleNovaAmbientacao() { setNovoTipo('AMBIENTACAO');  setShowNovo(true) }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <GraduationCap size={22} className="text-indigo-600" />
            Treinamentos
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Treinamentos completos e ambientações operacionais
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
          <button
            onClick={handleNovaAmbientacao}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Monitor size={14} /> Nova Ambientação
          </button>
          <button
            onClick={handleNovoTreinamento}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={14} /> Novo Treinamento
          </button>
        </div>
      </div>

      {/* Cards de métricas rápidas */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: 'Treinamentos',  value: counts.totalTreinamentos  ?? 0, color: 'text-blue-700 bg-blue-50',    icon: <BookOpen size={14}/> },
            { label: 'Ambientações',  value: counts.totalAmbientacoes  ?? 0, color: 'text-purple-700 bg-purple-50',icon: <Monitor  size={14}/> },
            { label: 'Ativos',         value: counts.ativos             ?? 0, color: 'text-green-700 bg-green-50',  icon: <CheckCircle size={14}/> },
            { label: 'Em Andamento',  value: counts.emAndamento        ?? 0, color: 'text-amber-700 bg-amber-50',  icon: <Clock    size={14}/> },
            { label: 'Trilhas',        value: counts.totalTrilhas       ?? 0, color: 'text-indigo-700 bg-indigo-50',icon: <GitBranch size={14}/> },
            { label: 'Sistemas',       value: counts.totalSistemas      ?? 0, color: 'text-slate-700 bg-slate-100', icon: <Layers   size={14}/> },
          ].map(c => (
            <div key={c.label} className={`flex items-center gap-2 rounded-xl border border-white/60 px-3 py-2.5 ${c.color} shadow-sm`}>
              {c.icon}
              <div>
                <div className="text-lg font-bold leading-none">{c.value}</div>
                <div className="mt-0.5 text-xs opacity-80">{c.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navegação por abas */}
      <div className="flex overflow-x-auto border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div>
        {activeTab === 'visao-geral'   && <TabVisaoGeral   summary={summary} loading={loading} onNovo={handleNovoTreinamento} onNovaAmb={handleNovaAmbientacao} />}
        {activeTab === 'catalogo'      && <TabCatalogo      key={refreshKey} onRefresh={refresh} />}
        {activeTab === 'ambientacoes'  && <TabAmbientacoes  key={refreshKey} onRefresh={refresh} />}
        {activeTab === 'trilhas'       && <TabTrilhas        key={refreshKey} onRefresh={refresh} />}
        {activeTab === 'participantes' && <TabParticipantes  key={refreshKey} />}
        {activeTab === 'sistemas'      && <TabSistemas       key={refreshKey} onRefresh={refresh} />}
      </div>

      {/* Modal novo */}
      {showNovo && (
        <ModalNovoTreinamento
          tipo={novoTipo}
          onClose={() => setShowNovo(false)}
          onSaved={() => { setShowNovo(false); refresh(); setActiveTab(novoTipo === 'AMBIENTACAO' ? 'ambientacoes' : 'catalogo') }}
        />
      )}
    </div>
  )
}
