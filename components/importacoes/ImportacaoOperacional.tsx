"use client"

import { useState, useRef } from "react"
import {
  BarChart2, Upload, CheckCircle, XCircle,
  Loader2, FileText, RefreshCw, Info
} from "lucide-react"

/**
 * Importação de Dados Operacionais (Headcount + Movimentações)
 *
 * Aceita:
 *  - Arquivo resumido: Empresa | Competência | Ativos CLT | Aprendizes | Estagiários | Afastados
 *  - Arquivo detalhado (lista de pessoas): calcula totais automaticamente
 *
 * Também reconhece movimentações: admissões, entradas, rescisões, saídas, afastamentos, retornos.
 *
 * Destino: Empresa → Dados Operacionais → Competência
 */

interface HeadcountLinha {
  empresa: string
  competencia: string
  ativosClt: number
  aprendizes: number
  estagiarios: number
  afastados: number
  admissoes: number
  rescisoes: number
  entradas: number
  saidas: number
  afastamentosNovos: number
  retornos: number
  _action: 'criar' | 'atualizar' | 'erro'
  _erros: string[]
}

export default function ImportacaoOperacional() {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ linhas: HeadcountLinha[]; criar: number; atualizar: number; erros: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (fileList: FileList | File[]) => {
    const valid = Array.from(fileList).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name))
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...valid.filter(f => !names.has(f.name))]
    })
  }

  const handleAnalyze = async () => {
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      const r = await fetch('/api/gestao-equipe/importacoes/operacional', { method: 'POST', body: fd })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Erro ao analisar arquivos.'); return }
      setPreview(data.preview)
      setStep('preview')
    } catch {
      setError('Não foi possível processar os arquivos.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/gestao-equipe/importacoes/operacional/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linhas: preview.linhas.filter(l => l._action !== 'erro') }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Erro ao importar.'); return }
      setResult(data)
      setStep('done')
    } catch {
      setError('Erro ao confirmar importação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-indigo-500" />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Importação de Dados Operacionais</h3>
          <p className="text-sm text-gray-500">Headcount e movimentações por empresa e competência.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 dark:border-gray-700'
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">Arraste arquivos ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-1">XLSX, XLS, CSV — resumido ou detalhado</p>
            <input ref={inputRef} type="file" className="hidden" multiple accept=".xlsx,.xls,.csv"
              onChange={e => e.target.files && addFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{f.name}</span>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Formatos aceitos:</p>
              <p><strong>Resumido:</strong> empresa, competência, ativos CLT, aprendizes, estagiários, afastados</p>
              <p className="mt-1"><strong>Movimentações:</strong> admissões, entradas, rescisões, saídas, afastamentos (novos), retornos</p>
              <p className="mt-1">Se o arquivo for uma lista detalhada de pessoas, os totais são calculados automaticamente.</p>
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={!files.length || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {loading ? 'Analisando...' : 'Analisar arquivos'}
          </button>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Criar', value: preview.criar, color: 'text-green-600' },
              { label: 'Atualizar', value: preview.atualizar, color: 'text-blue-600' },
              { label: 'Erros', value: preview.erros, color: 'text-red-600' },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  {['Ação','Empresa','Competência','CLT','Aprendizes','Estagiários','Afastados'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {preview.linhas.map((l, i) => (
                  <tr key={i} className={`bg-white dark:bg-gray-900 ${l._action === 'erro' ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        l._action === 'criar' ? 'bg-green-100 text-green-700' :
                        l._action === 'atualizar' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>{l._action}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-100">{l.empresa}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono">{l.competencia}</td>
                    <td className="px-3 py-2 text-gray-600">{l.ativosClt}</td>
                    <td className="px-3 py-2 text-gray-600">{l.aprendizes}</td>
                    <td className="px-3 py-2 text-gray-600">{l.estagiarios}</td>
                    <td className="px-3 py-2 text-gray-600">{l.afastados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep('upload'); setPreview(null) }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
              Voltar
            </button>
            <button onClick={handleConfirm} disabled={loading || (preview.criar + preview.atualizar) === 0}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {loading ? 'Importando...' : `Importar ${preview.criar + preview.atualizar} linha(s)`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="max-w-md">
          <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="font-semibold text-green-800 dark:text-green-200 text-lg">Importação concluída!</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Criados</p><p className="font-bold text-green-600">{result.criados ?? 0}</p></div>
              <div><p className="text-xs text-gray-500">Atualizados</p><p className="font-bold text-blue-600">{result.atualizados ?? 0}</p></div>
            </div>
          </div>
          <button onClick={() => { setStep('upload'); setFiles([]); setPreview(null); setResult(null) }}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Nova importação
          </button>
        </div>
      )}
    </div>
  )
}
