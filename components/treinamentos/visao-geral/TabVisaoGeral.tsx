"use client"

import { BookOpen, Monitor, Users, GitBranch, CheckCircle, Clock, Plus, ChevronRight } from 'lucide-react'

interface Props {
  summary: Record<string, unknown> | null
  loading: boolean
  onNovo:    () => void
  onNovaAmb: () => void
}

export default function TabVisaoGeral({ summary, loading, onNovo, onNovaAmb }: Props) {
  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Carregando...</div>
  if (!summary) return <div className="py-12 text-center text-sm text-slate-400">Sem dados</div>

  const counts  = (summary as { counts?: Record<string, number> }).counts  ?? {}
  const recentes = (summary as { recentes?: Record<string, unknown>[] }).recentes ?? []

  return (
    <div className="space-y-6">
      {/* Diferença conceitual */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <BookOpen size={18} />
            <span className="font-semibold">Treinamento</span>
          </div>
          <p className="mt-2 text-sm text-blue-600">"Aprender a executar o processo"</p>
          <ul className="mt-2 space-y-1 text-xs text-blue-600">
            <li>• Módulos, aulas, passo a passo</li>
            <li>• Exercícios, avaliação, nota</li>
            <li>• Prática acompanhada</li>
            <li>• Aprovação</li>
          </ul>
          <button onClick={onNovo} className="mt-3 flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
            <Plus size={12}/> Novo Treinamento
          </button>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
          <div className="flex items-center gap-2 text-purple-700">
            <Monitor size={18} />
            <span className="font-semibold">Ambientação</span>
          </div>
          <p className="mt-2 text-sm text-purple-600">"Conhecer como a área funciona"</p>
          <ul className="mt-2 space-y-1 text-xs text-purple-600">
            <li>• O QUE, QUANDO, QUEM, SISTEMA</li>
            <li>• Prazos, entradas, saídas</li>
            <li>• Apresentação rápida (30-60 min)</li>
            <li>• Ciência do colaborador</li>
          </ul>
          <button onClick={onNovaAmb} className="mt-3 flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700">
            <Plus size={12}/> Nova Ambientação
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">{counts.totalParticipacoes ?? 0}</div>
          <div className="mt-1 text-sm text-slate-500">Participações registradas</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle size={12} className="text-green-500" /> {counts.concluidos ?? 0} concluídas
            <Clock size={12} className="text-amber-500 ml-2" /> {counts.emAndamento ?? 0} em andamento
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">{counts.total ?? 0}</div>
          <div className="mt-1 text-sm text-slate-500">Total de capacitações</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <BookOpen size={12} className="text-blue-500" /> {counts.totalTreinamentos ?? 0} treinamentos
            <Monitor size={12} className="text-purple-500 ml-2" /> {counts.totalAmbientacoes ?? 0} ambientações
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">{counts.totalTrilhas ?? 0}</div>
          <div className="mt-1 text-sm text-slate-500">Trilhas de capacitação</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <GitBranch size={12} className="text-indigo-500" /> {counts.obrigatorios ?? 0} obrigatórios
          </div>
        </div>
      </div>

      {/* Recentes */}
      {recentes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Atualizados recentemente</h3>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
            {recentes.map((t: Record<string, unknown>) => (
              <div key={t.id as string} className="flex items-center gap-3 px-4 py-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.tipo === 'AMBIENTACAO' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {t.tipo === 'AMBIENTACAO' ? <Monitor size={13}/> : <BookOpen size={13}/>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{t.titulo as string}</div>
                  <div className="text-xs text-slate-400">{t.tipo === 'AMBIENTACAO' ? 'Ambientação' : 'Treinamento'} · {Number(t.participantes ?? 0)} participante(s)</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.status === 'ATIVO'    ? 'bg-green-100 text-green-700' :
                  t.status === 'RASCUNHO' ? 'bg-slate-100 text-slate-500' :
                  'bg-slate-100 text-slate-400'
                }`}>{t.status as string}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Níveis de conhecimento */}
      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Três níveis de conhecimento</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { nivel: '1', titulo: 'Ambientação', desc: '"Conheço como a área funciona."', color: 'bg-purple-50 border-purple-100 text-purple-700' },
            { nivel: '2', titulo: 'Treinamento', desc: '"Aprendi como executar."', color: 'bg-blue-50 border-blue-100 text-blue-700' },
            { nivel: '3', titulo: 'Prática / Validação', desc: '"Demonstrei que consigo executar."', color: 'bg-green-50 border-green-100 text-green-700' },
          ].map(n => (
            <div key={n.nivel} className={`rounded-lg border px-3 py-3 ${n.color}`}>
              <div className="text-xs font-bold uppercase tracking-wide opacity-60">Nível {n.nivel}</div>
              <div className="mt-1 text-sm font-semibold">{n.titulo}</div>
              <div className="mt-1 text-xs italic opacity-80">{n.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
