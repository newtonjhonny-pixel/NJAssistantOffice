"use client"

import { useState, useCallback } from "react"
import {
  Upload, CheckCircle, XCircle, AlertTriangle, Loader2, X,
  ChevronDown, ChevronUp, RotateCcw, Clock, Users, FileText,
  Calendar, Hash, Building2
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ParsedDay {
  date: string; dayOfWeek: number; dayLabel: string
  entry1: string|null; exit1: string|null; entry2: string|null; exit2: string|null
  entry3: string|null; exit3: string|null; entry4: string|null; exit4: string|null
  isBancoH: boolean; bSaldo: string|null; punchCount: number
}

interface ParsedColaborador {
  empresa: string; cnpj: string; nome: string; matricula: string; cpf: string
  funcao: string; departamento: string; periodo: string; competence: string
  schedule: Array<{ dayOfWeek:number; isWorked:boolean; entry1:string|null; exit1:string|null; entry2:string|null; exit2:string|null; dailyMinutes:number }>
  days: ParsedDay[]
  bancoHCount: number; bSaldoFinal: string; totalPunches: number
  memberId: string|null; memberName: string|null
  status: 'pronto'|'nao_encontrado'|'conflito'
  fileName: string; fileHash: string
}

interface Summary {
  totalFiles: number; totalCollaboradores: number; totalDias: number
  totalBatidas: number; totalConflitos: number; totalNaoEncontrados: number
}

interface PontoLote {
  id: string; code: string; status: string
  totalFiles: number; totalCollaboradores: number; totalDias: number
  totalBatidas: number; totalConflitos: number; totalRejeitados: number
  importedAt: string|null; importedBy: string|null
  createdAt: string
}

const DOW = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// ─── STATUS badge ─────────────────────────────────────────────────────────────

function LoteBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    PROCESSANDO:            'bg-blue-100 text-blue-700 border-blue-200',
    'AGUARDANDO_REVISAO':   'bg-amber-100 text-amber-700 border-amber-200',
    IMPORTADO:              'bg-green-100 text-green-700 border-green-200',
    'IMPORTADO_CONFLITOS':  'bg-orange-100 text-orange-700 border-orange-200',
    REVERTIDO:              'bg-slate-200 text-slate-600 border-slate-300',
    FALHOU:                 'bg-red-100 text-red-700 border-red-200',
  }
  const labels: Record<string, string> = {
    PROCESSANDO:'Processando', AGUARDANDO_REVISAO:'Ag. Revisão',
    IMPORTADO:'Importado', IMPORTADO_CONFLITOS:'Com Conflitos',
    REVERTIDO:'Revertido', FALHOU:'Falhou',
  }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded border font-medium', cfg[status] ?? 'bg-slate-100 text-slate-500')}>
      {labels[status] ?? status}
    </span>
  )
}

function ColStatusBadge({ status }: { status: string }) {
  if (status === 'pronto') return <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={11}/>Pronto</span>
  if (status === 'conflito') return <span className="text-xs text-orange-600 font-medium flex items-center gap-1"><AlertTriangle size={11}/>Conflito</span>
  return <span className="text-xs text-red-500 font-medium flex items-center gap-1"><XCircle size={11}/>Não encontrado</span>
}

// ─── DRAG & DROP + seleção múltipla ──────────────────────────────────────────

function DropZone({ files, onFiles }: { files: File[]; onFiles: (f: File[]) => void }) {
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    const valid = Array.from(incoming).filter(f =>
      /\.(pdf|xlsx|xls|csv)$/i.test(f.name)
    )
    onFiles([...files, ...valid])
  }, [files, onFiles])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
        dragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
      )}
    >
      <label className="cursor-pointer block">
        <input
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv"
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <Upload size={36} className="mx-auto text-slate-400 mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Arraste arquivos ou clique para selecionar
        </p>
        <p className="text-xs text-slate-400 mt-1">PDF, XLSX, XLS, CSV — múltiplos arquivos aceitos</p>
        <p className="text-xs text-slate-400">Um PDF pode conter vários colaboradores</p>
      </label>
    </div>
  )
}

// ─── PAINEL DE COLABORADOR (detalhe) ─────────────────────────────────────────

function ColaboradorDetail({ col, onClose }: { col: ParsedColaborador; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">{col.nome || '—'}</div>
            <div className="text-xs text-slate-400">{col.empresa} · Mat. {col.matricula} · {col.competence}</div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} className="text-slate-400"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Escala */}
          {col.schedule.some(s => s.isWorked) && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2">Escala detectada</div>
              <div className="flex flex-wrap gap-1.5">
                {col.schedule.map(sd => (
                  <div key={sd.dayOfWeek} className={cn(
                    'text-xs px-2 py-1 rounded',
                    sd.isWorked ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20' : 'bg-slate-100 text-slate-400'
                  )}>
                    <span className="font-medium">{DOW[sd.dayOfWeek]}</span>
                    {sd.isWorked && sd.entry1 ? ` ${sd.entry1}–${sd.exit1}${sd.entry2?`/${sd.entry2}–${sd.exit2}`:''}` : ' Folga'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="flex gap-3 text-sm">
            {[
              { l:'Dias', v: col.days.length, c:'text-slate-700' },
              { l:'Batidas', v: col.totalPunches, c:'text-emerald-600' },
              { l:'Banco H', v: col.bancoHCount, c:'text-blue-600' },
              { l:'BSaldo (ref)', v: col.bSaldoFinal, c: col.bSaldoFinal.startsWith('-') ? 'text-red-600' : 'text-green-600' },
            ].map(it => (
              <div key={it.l} className="flex-1 flex flex-col items-center p-2 bg-slate-50 dark:bg-slate-800/40 rounded">
                <span className="text-xs text-slate-400">{it.l}</span>
                <span className={cn('font-mono font-semibold', it.c)}>{it.v}</span>
              </div>
            ))}
          </div>

          {/* Tabela de dias */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 grid grid-cols-[72px_32px_1fr_56px]">
              <span>Data</span><span>Dia</span><span>Batidas</span><span className="text-right">BSaldo</span>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {col.days.map(d => (
                <div key={d.date} className={cn('px-3 py-1.5 text-xs grid grid-cols-[72px_32px_1fr_56px] items-center', d.isBancoH && 'bg-blue-50/50 dark:bg-blue-900/10')}>
                  <span className="font-mono text-slate-600 dark:text-slate-400">{d.date.split('-').reverse().join('/')}</span>
                  <span className="text-slate-400">{DOW[d.dayOfWeek]}</span>
                  <span className={d.isBancoH ? 'text-blue-600 font-medium' : 'font-mono text-slate-700 dark:text-slate-300'}>
                    {d.isBancoH ? 'BANCO H' : [d.entry1,d.exit1,d.entry2,d.exit2,d.entry3,d.exit3].filter(Boolean).join(' · ') || '—'}
                  </span>
                  <span className={cn('text-right font-mono', !d.bSaldo?'text-slate-300':d.bSaldo.startsWith('-')?'text-red-500':'text-green-600')}>
                    {d.bSaldo ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HISTÓRICO DE LOTES ───────────────────────────────────────────────────────

function LoteHistorico({ lote, onRefresh }: { lote: PontoLote; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [revertError, setRevertError] = useState<string|null>(null)
  const [requiresForce, setRequiresForce] = useState(false)
  const [detail, setDetail] = useState<any|null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  async function loadDetail() {
    setLoadingDetail(true)
    try {
      const r = await fetch(`/api/gestao-equipe/importacoes-ponto/${lote.id}`)
      if (r.ok) setDetail(await r.json())
    } finally { setLoadingDetail(false) }
  }

  async function handleRevert(force = false) {
    if (!confirm(force
      ? 'Forçar reversão mesmo para registros editados manualmente?'
      : `Reverter lote ${lote.code}? As batidas importadas serão removidas.`)) return
    setReverting(true); setRevertError(null); setRequiresForce(false)
    try {
      const r = await fetch(`/api/gestao-equipe/importacoes-ponto/${lote.id}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await r.json()
      if (!r.ok) {
        if (data.requiresForce) { setRequiresForce(true); setRevertError(data.error) }
        else throw new Error(data.error)
      } else { onRefresh() }
    } catch (e: any) { setRevertError(e.message) }
    finally { setReverting(false) }
  }

  const canRevert = lote.status === 'IMPORTADO' || lote.status === 'IMPORTADO_CONFLITOS'

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
        onClick={() => { setExpanded(e => !e); if (!expanded && !detail) loadDetail() }}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">{lote.code}</span>
          <LoteBadge status={lote.status} />
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Users size={11}/>{lote.totalCollaboradores}</span>
          <span className="flex items-center gap-1"><Calendar size={11}/>{lote.totalDias} dias</span>
          <span className="flex items-center gap-1"><Clock size={11}/>{lote.totalBatidas} batidas</span>
          <span>{lote.importedAt ? new Date(lote.importedAt).toLocaleDateString('pt-BR') : '—'}</span>
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
          {loadingDetail && <div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/>Carregando...</div>}

          {detail && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {detail.batches.map((b: any) => (
                <div key={b.id} className="py-2 text-xs grid grid-cols-[1fr_80px_60px_60px_60px] gap-2 items-center">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{b.memberName ?? b.memberId ?? '—'}</span>
                  <span className="text-slate-400 truncate">{b.competence}</span>
                  <span className="text-slate-500">{b.daysProcessed} dias</span>
                  <span className="text-slate-500">{b.punchesImported} bat.</span>
                  <span className={b.memberNotFound ? 'text-red-500' : 'text-green-600'}>{b.memberNotFound ? 'N/enc.' : 'OK'}</span>
                </div>
              ))}
            </div>
          )}

          {revertError && (
            <div className="flex flex-col gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded text-sm text-red-700">
              <div className="flex items-center gap-2"><AlertTriangle size={14}/>{revertError}</div>
              {requiresForce && (
                <button onClick={() => handleRevert(true)} className="self-start text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700">
                  Forçar reversão
                </button>
              )}
            </div>
          )}

          {canRevert && (
            <button
              onClick={() => handleRevert(false)} disabled={reverting}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
            >
              {reverting ? <Loader2 size={12} className="animate-spin"/> : <RotateCcw size={12}/>}
              Reverter importação
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function ImportacaoPonto() {
  // ─ Etapa ─
  const [step, setStep] = useState<'upload'|'preview'|'done'>('upload')

  // ─ Upload ─
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [processError, setProcessError] = useState<string|null>(null)
  const [progress, setProgress] = useState('')

  // ─ Preview ─
  const [colaboradores, setColaboradores] = useState<ParsedColaborador[]>([])
  const [summary, setSummary] = useState<Summary|null>(null)
  const [selectedCol, setSelectedCol] = useState<ParsedColaborador|null>(null)

  // ─ Confirmar ─
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string|null>(null)
  const [loteResult, setLoteResult] = useState<any|null>(null)

  // ─ Histórico ─
  const [showHistorico, setShowHistorico] = useState(false)
  const [lotes, setLotes] = useState<PontoLote[]>([])
  const [loadingLotes, setLoadingLotes] = useState(false)
  const [histKey, setHistKey] = useState(0)

  async function loadLotes() {
    setLoadingLotes(true)
    try {
      const r = await fetch('/api/gestao-equipe/importacoes-ponto')
      if (r.ok) setLotes(await r.json())
    } finally { setLoadingLotes(false) }
  }

  function handleShowHistorico() {
    setShowHistorico(true)
    loadLotes()
  }

  async function handleProcessar() {
    if (!files.length) return
    setProcessing(true); setProcessError(null)
    try {
      setProgress('Enviando arquivos...')
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      setProgress(`Processando ${files.length} arquivo(s)...`)
      const r = await fetch('/api/gestao-equipe/importacoes-ponto', { method: 'POST', body: fd })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? 'Erro ao processar arquivos')
      setProgress('Identificando colaboradores...')
      setColaboradores(data.colaboradores)
      setSummary(data.summary)
      setStep('preview')
    } catch (e: any) {
      setProcessError(e.message)
    } finally {
      setProcessing(false)
      setProgress('')
    }
  }

  async function handleConfirmar() {
    const prontos = colaboradores.filter(c => c.status !== 'nao_encontrado')
    if (!prontos.length) return
    setConfirming(true); setConfirmError(null)
    try {
      const r = await fetch('/api/gestao-equipe/importacoes-ponto/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colaboradores: prontos }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? 'Erro ao confirmar importação')
      setLoteResult(data)
      setStep('done')
    } catch (e: any) {
      setConfirmError(e.message)
    } finally {
      setConfirming(false)
    }
  }

  function resetar() {
    setFiles([]); setColaboradores([]); setSummary(null)
    setLoteResult(null); setConfirmError(null); setProcessError(null)
    setStep('upload')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock size={16} className="text-blue-500"/>
            Importação de Ponto em Lote
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Importe cartões de ponto de vários colaboradores de uma só vez
          </p>
        </div>
        <button
          onClick={handleShowHistorico}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
        >
          <FileText size={12}/> Histórico de Lotes
        </button>
      </div>

      {/* ─── ETAPA 1: UPLOAD ─────────────────────────────────────────────── */}
      {step === 'upload' && !showHistorico && (
        <div className="space-y-4">
          <DropZone files={files} onFiles={setFiles} />

          {files.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 flex justify-between">
                <span>{files.length} arquivo(s) selecionado(s)</span>
                <button onClick={() => setFiles([])} className="text-slate-400 hover:text-red-500">limpar</button>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {files.map((f, i) => (
                  <div key={i} className="px-3 py-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{f.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-400">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setFiles(ff => ff.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><X size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {processError && (
            <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded text-sm text-red-700 dark:text-red-300">
              <AlertTriangle size={14} className="shrink-0 mt-0.5"/>{processError}
            </div>
          )}

          {processing && (
            <div className="flex items-center gap-2 text-sm text-blue-600 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <Loader2 size={14} className="animate-spin"/>{progress || 'Processando...'}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleProcessar}
              disabled={!files.length || processing}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {processing ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
              Analisar {files.length > 0 ? `${files.length} arquivo(s)` : 'arquivos'}
            </button>
          </div>
        </div>
      )}

      {/* ─── ETAPA 2: PREVIEW ───────────────────────────────────────────── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Resumo */}
          {summary && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { l:'Arquivos',        v: summary.totalFiles,          c:'text-slate-700' },
                { l:'Colaboradores',   v: summary.totalCollaboradores, c:'text-slate-700' },
                { l:'Dias',            v: summary.totalDias,           c:'text-slate-700' },
                { l:'Batidas',         v: summary.totalBatidas,        c:'text-emerald-600' },
                { l:'Conflitos',       v: summary.totalConflitos,      c: summary.totalConflitos>0?'text-orange-600':'text-slate-400' },
                { l:'Não encontrados', v: summary.totalNaoEncontrados, c: summary.totalNaoEncontrados>0?'text-red-600':'text-slate-400' },
              ].map(it => (
                <div key={it.l} className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <span className="text-xs text-slate-400">{it.l}</span>
                  <span className={cn('text-xl font-bold font-mono', it.c)}>{it.v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tabela de colaboradores */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 grid grid-cols-[1fr_90px_120px_60px_60px_80px_80px]">
              <span>Colaborador</span>
              <span>Matrícula</span>
              <span>Empresa</span>
              <span className="text-right">Competência</span>
              <span className="text-right">Dias</span>
              <span className="text-right">Batidas</span>
              <span className="text-center">Status</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {colaboradores.map((col, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCol(col)}
                  className="w-full px-4 py-2.5 text-xs grid grid-cols-[1fr_90px_120px_60px_60px_80px_80px] items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{col.nome || col.memberName || '—'}</span>
                  <span className="text-slate-500 font-mono">{col.matricula || '—'}</span>
                  <span className="text-slate-400 truncate">{col.empresa || '—'}</span>
                  <span className="text-right text-slate-500 font-mono">{col.competence}</span>
                  <span className="text-right text-slate-500">{col.days.length}</span>
                  <span className="text-right text-slate-500">{col.totalPunches}</span>
                  <span className="flex justify-center"><ColStatusBadge status={col.status}/></span>
                </button>
              ))}
            </div>
          </div>

          {colaboradores.filter(c => c.status === 'nao_encontrado').length > 0 && (
            <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded text-xs text-amber-700">
              <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
              {colaboradores.filter(c => c.status === 'nao_encontrado').length} colaborador(es) não encontrado(s) no sistema.
              Serão ignorados na importação. Clique em cada linha para ver os dados e vincular manualmente.
            </div>
          )}

          {confirmError && (
            <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded text-sm text-red-700">
              <AlertTriangle size={14} className="shrink-0 mt-0.5"/>{confirmError}
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={resetar} className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              ← Voltar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={confirming || colaboradores.filter(c => c.status !== 'nao_encontrado').length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {confirming ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
              Importar Lote ({colaboradores.filter(c => c.status !== 'nao_encontrado').length} colaboradores)
            </button>
          </div>
        </div>
      )}

      {/* ─── ETAPA 3: CONCLUÍDO ─────────────────────────────────────────── */}
      {step === 'done' && loteResult && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle size={32} className="text-green-600"/>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Lote importado com sucesso!</p>
            <p className="text-sm text-slate-500 mt-1 font-mono">{loteResult.code}</p>
          </div>
          <div className="flex gap-4 text-sm">
            {[
              { l:'Importados', v: loteResult.totalImportados },
              { l:'Dias',       v: loteResult.totalDias },
              { l:'Batidas',    v: loteResult.totalBatidas },
              { l:'Rejeitados', v: loteResult.totalRejeitados },
            ].map(it => (
              <div key={it.l} className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg min-w-[80px]">
                <span className="text-xs text-slate-400">{it.l}</span>
                <span className="text-xl font-bold font-mono text-slate-700 dark:text-slate-300">{it.v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={resetar} className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded text-slate-600 hover:bg-slate-50">
              Nova Importação
            </button>
            <button onClick={() => { resetar(); handleShowHistorico() }} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded">
              Ver Histórico
            </button>
          </div>
        </div>
      )}

      {/* ─── HISTÓRICO ──────────────────────────────────────────────────── */}
      {showHistorico && step === 'upload' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Histórico de Lotes de Ponto</h4>
            <button onClick={() => setShowHistorico(false)} className="text-xs text-blue-600 hover:underline">
              ← Nova Importação
            </button>
          </div>
          {loadingLotes ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 p-4"><Loader2 size={14} className="animate-spin"/>Carregando...</div>
          ) : lotes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum lote importado ainda.</p>
          ) : (
            <div className="space-y-2">
              {lotes.map(l => (
                <LoteHistorico key={`${l.id}-${histKey}`} lote={l} onRefresh={() => { setHistKey(k=>k+1); loadLotes() }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detalhe do colaborador */}
      {selectedCol && (
        <ColaboradorDetail col={selectedCol} onClose={() => setSelectedCol(null)} />
      )}
    </div>
  )
}
