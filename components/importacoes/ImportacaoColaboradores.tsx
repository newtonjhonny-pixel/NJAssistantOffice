"use client"

import { useState, useRef } from "react"
import {
  Users, Upload, CheckCircle, XCircle, AlertTriangle,
  Loader2, FileText, RefreshCw, Info
} from "lucide-react"

/**
 * Importação de Colaboradores
 *
 * Campos reconhecidos: nome, matrícula, CPF, e-mail, cargo,
 * departamento, empresa, unidade, admissão, jornada, status.
 *
 * Fluxo: Upload → Leitura → Preview com detecção de duplicidade → Importar
 */

interface ColaboradorPreview {
  nome: string
  matricula: string
  cpf: string
  email: string
  cargo: string
  departamento: string
  empresa: string
  unidade: string
  admissao: string
  jornada: string
  status: string
  _action: 'criar' | 'atualizar' | 'duplicado' | 'erro'
  _erros: string[]
}

interface PreviewResult {
  total: number
  criar: number
  atualizar: number
  duplicado: number
  erros: number
  colaboradores: ColaboradorPreview[]
}

export default function ImportacaoColaboradores() {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (fileList: FileList | File[]) => {
    const valid = Array.from(fileList).filter(f =>
      /\.(xlsx|xls|csv)$/i.test(f.name)
    )
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
      const r = await fetch('/api/gestao-equipe/importacoes/colaboradores', {
        method: 'POST', body: fd,
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Erro ao analisar arquivos.'); return }
      setPreview(data.preview)
      setStep('preview')
    } catch (e: any) {
      setError('Não foi possível processar os arquivos. Verifique o formato e tente novamente.')
      console.error('[ImportacaoColaboradores]', e)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/gestao-equipe/importacoes/colaboradores/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colaboradores: preview.colaboradores.filter(c => c._action !== 'erro') }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Erro ao importar.'); return }
      setResult(data)
      setStep('done')
    } catch (e: any) {
      setError('Erro ao confirmar importação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-indigo-500" />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Importação de Colaboradores</h3>
          <p className="text-sm text-gray-500">Importe cadastro de colaboradores via XLSX, XLS ou CSV.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Step: upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-indigo-700'
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">Arraste arquivos ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-1">XLSX, XLS, CSV — múltiplos arquivos aceitos</p>
            <input
              ref={inputRef} type="file" className="hidden" multiple
              accept=".xlsx,.xls,.csv"
              onChange={e => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{f.name}</span>
                    <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Colunas reconhecidas automaticamente: <strong>nome, matrícula, CPF, e-mail, cargo, departamento, empresa, unidade, admissão, jornada, status</strong>.
              Duplicidade detectada por CPF ou matrícula.
            </span>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!files.length || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {loading ? 'Analisando...' : 'Analisar arquivos'}
          </button>
        </div>
      )}

      {/* ── Step: preview ── */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Criar', value: preview.criar, color: 'text-green-600' },
              { label: 'Atualizar', value: preview.atualizar, color: 'text-blue-600' },
              { label: 'Duplicados', value: preview.duplicado, color: 'text-amber-600' },
              { label: 'Com erro', value: preview.erros, color: 'text-red-600' },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  {['Ação','Nome','Matrícula','CPF','Cargo','Empresa','Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {preview.colaboradores.map((c, i) => (
                  <tr key={i} className={`bg-white dark:bg-gray-900 ${c._action === 'erro' ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        c._action === 'criar' ? 'bg-green-100 text-green-700' :
                        c._action === 'atualizar' ? 'bg-blue-100 text-blue-700' :
                        c._action === 'duplicado' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{c._action}</span>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{c.nome}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono">{c.matricula || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono">{c.cpf || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{c.cargo || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{c.empresa || '—'}</td>
                    <td className="px-3 py-2">
                      {c._erros.length > 0 && (
                        <span className="text-red-500" title={c._erros.join('; ')}>⚠ {c._erros[0]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep('upload'); setPreview(null) }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              Voltar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || (preview.criar + preview.atualizar) === 0}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {loading ? 'Importando...' : `Importar ${preview.criar + preview.atualizar} colaborador(es)`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: done ── */}
      {step === 'done' && result && (
        <div className="max-w-md">
          <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="font-semibold text-green-800 dark:text-green-200 text-lg">Importação concluída!</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Criados</p><p className="font-bold text-green-600">{result.criados ?? 0}</p></div>
              <div><p className="text-xs text-gray-500">Atualizados</p><p className="font-bold text-blue-600">{result.atualizados ?? 0}</p></div>
            </div>
          </div>
          <button
            onClick={() => { setStep('upload'); setFiles([]); setPreview(null); setResult(null) }}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" /> Nova importação
          </button>
        </div>
      )}
    </div>
  )
}
