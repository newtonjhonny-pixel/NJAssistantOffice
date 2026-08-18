"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Lock, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  ChevronLeft, ChevronRight, Info, X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentComp() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function prevComp(c: string) {
  const [y, m] = c.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}
function nextComp(c: string) {
  const [y, m] = c.split('-').map(Number)
  if (m === 12) return `${y + 1}-01`
  return `${y}-${String(m + 1).padStart(2, '0')}`
}
function compLabel(c: string) {
  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const [y, m] = c.split('-').map(Number)
  return `${MONTHS[m - 1]}/${String(y).slice(2)}`
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MemberRow {
  memberId: string; memberName: string; role: string; sector?: string
  status: 'ABERTA' | 'FECHADA' | 'REABERTA'
  ready: boolean; hasIssues: boolean
  plannedHHMM: string; workedHHMM: string
  bankCreditHHMM: string; bankDebitHHMM: string; overtimeHHMM: string
  pendingCount: number; incompletePunches: number; pendingClassCount: number
  totalDays: number
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    FECHADA:  'bg-slate-200 text-slate-600 border-slate-300',
    REABERTA: 'bg-orange-100 text-orange-700 border-orange-200',
    ABERTA:   'bg-green-100 text-green-700 border-green-200',
  }
  const label: Record<string, string> = { FECHADA: 'Fechada', REABERTA: 'Reaberta', ABERTA: 'Aberta' }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', cfg[status] ?? cfg.ABERTA)}>
      {label[status] ?? status}
    </span>
  )
}

// ─── Resultado do fechamento geral ────────────────────────────────────────────

interface BulkResult {
  total: number; successCount: number; failCount: number; skippedCount: number
  results: Array<{ memberId: string; memberName: string; success: boolean; skipped: boolean; reason?: string }>
}

function BulkResultPanel({ result, onClose }: { result: BulkResult; onClose: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resultado do Fechamento</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
      </div>
      <div className="px-4 py-3 flex gap-6 border-b border-slate-100 dark:border-slate-800">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">{result.successCount}</div>
          <div className="text-xs text-slate-500">Fechados</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{result.failCount}</div>
          <div className="text-xs text-slate-500">Com erro</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-400">{result.skippedCount}</div>
          <div className="text-xs text-slate-500">Ignorados</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-600">{result.total}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
        {result.results.map(r => (
          <div key={r.memberId} className="flex items-start gap-3 px-4 py-2.5 text-sm">
            {r.success
              ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              : r.skipped
                ? <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                : <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
            }
            <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">{r.memberName}</span>
            {!r.success && r.reason && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{r.reason}</span>
            )}
            {r.success && <span className="text-xs text-emerald-600">Fechado com sucesso</span>}
            {r.skipped && <span className="text-xs text-slate-400">Já estava fechado</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TabFechamentoPonto() {
  const [comp, setComp] = useState(currentComp())
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [closing, setClosing] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)

  const loadOverview = useCallback(async () => {
    setLoading(true); setError(null); setBulkResult(null)
    setSelected(new Set())
    try {
      const r = await fetch(`/api/gestao-equipe/timesheet/overview?competence=${comp}`)
      if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
      const data = await r.json()
      setMembers(data.members ?? [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [comp])

  useEffect(() => { loadOverview() }, [loadOverview])

  const readyMembers    = members.filter(m => m.ready)
  const closedMembers   = members.filter(m => m.status === 'FECHADA')
  const issueMembers    = members.filter(m => m.hasIssues && m.status !== 'FECHADA')
  const selectableMembers = members.filter(m => m.status !== 'FECHADA')

  function toggleAll() {
    if (selected.size === selectableMembers.length && selectableMembers.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableMembers.map(m => m.memberId)))
    }
  }

  function toggleMember(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBulkClose(memberIds: string[]) {
    if (memberIds.length === 0) return
    setClosing(true); setError(null)
    try {
      const r = await fetch('/api/gestao-equipe/timesheet/bulk-close', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competence: comp, memberIds }),
      })
      if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
      const data = await r.json()
      setBulkResult(data)
      await loadOverview()
    } catch (e: any) { setError(e.message) }
    finally { setClosing(false) }
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Fechamento de Ponto
        </h2>
        {/* Seletor de competência */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setComp(prevComp(comp))}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          ><ChevronLeft size={16} /></button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[80px] text-center">
            {compLabel(comp)}
          </span>
          <button
            onClick={() => setComp(nextComp(comp))}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          ><ChevronRight size={16} /></button>
          <button
            onClick={loadOverview} disabled={loading}
            className="ml-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-60"
            title="Atualizar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Colaboradores', val: members.length, color: 'text-slate-700' },
          { label: 'Prontos para fechar', val: readyMembers.length, color: 'text-emerald-600' },
          { label: 'Com pendências', val: issueMembers.length, color: 'text-amber-600' },
          { label: 'Já fechados', val: closedMembers.length, color: 'text-slate-400' },
        ].map(item => (
          <div key={item.label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
            <div className={cn('text-2xl font-bold', item.color)}>{item.val}</div>
            <div className="text-xs text-slate-500">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={14} />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Resultado bulk */}
      {bulkResult && <BulkResultPanel result={bulkResult} onClose={() => setBulkResult(null)} />}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        {selected.size > 0 && (
          <button
            onClick={() => handleBulkClose(Array.from(selected))} disabled={closing}
            className="flex items-center gap-1.5 text-sm px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium disabled:opacity-60"
          >
            {closing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Fechar selecionados ({selected.size})
          </button>
        )}
        <button
          onClick={() => handleBulkClose(readyMembers.map(m => m.memberId))}
          disabled={closing || readyMembers.length === 0}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-60"
        >
          {closing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Fechar todos os aptos ({readyMembers.length})
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" /> Carregando...
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhum colaborador ativo encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <th className="w-8 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.size === selectableMembers.length && selectableMembers.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Colaborador</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Previsto</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Trabalhado</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Banco +</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Banco −</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">H.Extra</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Pendências</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Fechamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {members.map(m => {
                  const isReady   = m.ready
                  const isClosed  = m.status === 'FECHADA'
                  const isChecked = selected.has(m.memberId)
                  const totalIssues = m.pendingCount + m.incompletePunches + m.pendingClassCount

                  return (
                    <tr
                      key={m.memberId}
                      className={cn(
                        'transition-colors',
                        isClosed   ? 'opacity-60' : '',
                        isChecked  ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                      )}
                    >
                      <td className="px-3 py-2.5 text-center">
                        {!isClosed && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMember(m.memberId)}
                            className="rounded"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{m.memberName}</div>
                        <div className="text-xs text-slate-400">{m.role}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">{m.plannedHHMM}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{m.workedHHMM}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-blue-600">{m.bankCreditHHMM}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-red-600">{m.bankDebitHHMM}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-purple-600">{m.overtimeHHMM}</td>
                      <td className="px-3 py-2.5 text-center">
                        {totalIssues > 0 ? (
                          <span className="text-xs text-amber-600 font-medium">{totalIssues}</span>
                        ) : m.totalDays === 0 ? (
                          <span className="text-xs text-slate-400">sem dias</span>
                        ) : (
                          <span className="text-xs text-emerald-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isClosed ? (
                          <span className="text-xs text-slate-400">Fechado</span>
                        ) : isReady ? (
                          <span className="text-xs text-emerald-600 font-medium">Pronto</span>
                        ) : (
                          <span className="text-xs text-amber-600">Pendências</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Apenas colaboradores sem batidas incompletas e sem classificações pendentes são marcados como "Aptos".
        O Banco de Horas é atualizado automaticamente no fechamento.
      </p>
    </div>
  )
}
