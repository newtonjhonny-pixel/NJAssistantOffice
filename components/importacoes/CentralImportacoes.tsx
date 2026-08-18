"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import {
  Upload, History, AlertTriangle, BookMarked,
  FileText, CheckCircle, XCircle, Clock, Loader2,
  ChevronRight, ChevronLeft, RotateCcw,
  Sparkles, Eye, Play, RefreshCw, Trash2, Plus, Info,
  Users, Building2, BarChart2,
} from "lucide-react"
import {
  ImportSession, ImportRecord, ImportConflict, ImportSourceProfile, FieldMapping,
  ModuleId, RecordStatus, MODULE_LABELS, STATUS_LABELS, STATUS_COLORS, RECORD_STATUS_COLORS,
  CONFIDENCE_COLOR, CONFIDENCE_LABEL, fmtFileSize, fmtDate,
} from "./types"
import ImportacaoPonto from "./ImportacaoPonto"
import ImportacaoColaboradores from "./ImportacaoColaboradores"
import ImportacaoEmpresas from "./ImportacaoEmpresas"
import ImportacaoOperacional from "./ImportacaoOperacional"

// ─── ABAS PRINCIPAIS ─────────────────────────────────────────────────────────

type MainTab = 'visao-geral' | 'nova' | 'ponto' | 'colaboradores' | 'empresas' | 'operacional' | 'historico' | 'conflitos' | 'perfis'

export default function CentralImportacoes() {
  const [tab, setTab] = useState<MainTab>('visao-geral')
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey(k => k + 1)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" />
            Central de Importações
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Importe dados de diferentes sistemas com identificação automática, validação e revisão antes da gravação.
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 flex-wrap">
        {([
          { id: 'visao-geral',   label: 'Visão Geral',          icon: FileText },
          { id: 'ponto',         label: 'Importação de Ponto',  icon: Clock },
          { id: 'colaboradores', label: 'Colaboradores',        icon: Users },
          { id: 'empresas',      label: 'Empresas',             icon: Building2 },
          { id: 'operacional',   label: 'Dados Operacionais',   icon: BarChart2 },
          { id: 'historico',     label: 'Histórico',            icon: History },
          { id: 'conflitos',     label: 'Conflitos',            icon: AlertTriangle },
          { id: 'perfis',        label: 'Perfis de Fonte',      icon: BookMarked },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'visao-geral'   && <VisaoGeral onSelectTab={setTab} key={`vg-${refreshKey}`} />}
      {tab === 'nova'          && <NovaImportacao key={`nova-${refreshKey}`} onConcluido={refresh} />}
      {tab === 'ponto'         && <ImportacaoPonto key={`ponto-${refreshKey}`} />}
      {tab === 'colaboradores' && <ImportacaoColaboradores key={`col-${refreshKey}`} />}
      {tab === 'empresas'      && <ImportacaoEmpresas key={`emp-${refreshKey}`} />}
      {tab === 'operacional'   && <ImportacaoOperacional key={`op-${refreshKey}`} />}
      {tab === 'historico'     && <HistoricoImportacoes key={refreshKey} />}
      {tab === 'conflitos'     && <ConflitosImportacoes key={refreshKey} />}
      {tab === 'perfis'        && <PerfisImportacoes key={refreshKey} />}
    </div>
  )
}

// ─── VISÃO GERAL — cards por tipo ────────────────────────────────────────────

const IMPORT_CARDS: {
  id: MainTab
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  color: string
}[] = [
  {
    id: 'ponto',
    icon: Clock,
    title: 'Ponto',
    description: 'Importar cartões de ponto e batidas. Importação determinística, sem uso de IA.',
    color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  },
  {
    id: 'colaboradores',
    icon: Users,
    title: 'Colaboradores',
    description: 'Importar cadastro de colaboradores — nome, matrícula, CPF, cargo, departamento, empresa e mais.',
    color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  },
  {
    id: 'empresas',
    icon: Building2,
    title: 'Empresas',
    description: 'Importar empresas e unidades. CNPJ não é duplicado.',
    color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
  },
  {
    id: 'operacional',
    icon: BarChart2,
    title: 'Dados Operacionais',
    description: 'Importar headcount por competência. Aceita arquivo resumido ou lista detalhada com cálculo automático.',
    color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
  },
  {
    id: 'nova',
    icon: Sparkles,
    title: 'Movimentações / Férias / Banco de Horas',
    description: 'Admissões, entradas, rescisões, afastamentos, férias e saldos de banco de horas via importação assistida.',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800',
  },
]

function VisaoGeral({ onSelectTab }: { onSelectTab: (tab: MainTab) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Selecione o tipo de importação ou use o fluxo de importação geral com mapeamento de campos.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {IMPORT_CARDS.map(card => (
          <button
            key={card.id}
            onClick={() => onSelectTab(card.id)}
            className={`text-left p-5 rounded-xl border transition-all hover:shadow-md ${card.color}`}
          >
            <div className="flex items-start gap-3">
              <card.icon className="w-6 h-6 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{card.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── WIZARD: NOVA IMPORTAÇÃO (6 steps) ───────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6

const STEPS = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Estrutura' },
  { n: 3, label: 'Mapeamento' },
  { n: 4, label: 'Campos' },
  { n: 5, label: 'Preview' },
  { n: 6, label: 'Importar' },
]

function NovaImportacao({ onConcluido }: { onConcluido: () => void }) {
  const [step, setStep] = useState<WizardStep>(1)
  const [session, setSession] = useState<ImportSession | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([])
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [structure, setStructure] = useState<any>(null)
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [systemFields, setSystemFields] = useState<{ key: string; label: string; required?: boolean }[]>([])
  const [aiResult, setAiResult] = useState<any>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Step 1 → upload do arquivo
  const handleUpload = useCallback(async (file: File, module: ModuleId) => {
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('module', module)
    const r = await fetch('/api/importacoes/sessions', { method: 'POST', body: fd })
    const data = await r.json()
    if (!r.ok) { setError(data.error ?? 'Erro ao enviar arquivo'); return }
    setSession(data.session)
    setHeaders(data.headers ?? [])
    setSampleRows(data.sampleRows ?? [])
    setMetadata(data.metadata ?? {})
    setStructure(data.structure ?? null)
    setStep(2)
  }, [])

  // Step 3 → análise IA
  const handleAnalyze = useCallback(async () => {
    if (!session) return
    setError(null)
    const r = await fetch(`/api/importacoes/sessions/${session.id}/analyze`, { method: 'POST' })
    const data = await r.json()
    if (!r.ok) { setError(data.error ?? 'Erro na análise'); return }
    setAiResult(data)
    setMappings(data.fieldMappings ?? [])
    setSystemFields(data.systemFields ?? [])
    setHeaders(data.headers ?? headers)
    setSampleRows(data.sampleRows ?? sampleRows)
    if (data.metadata) setMetadata(data.metadata)
    if (data.structure) setStructure(data.structure)
    setStep(4)
  }, [session, headers, sampleRows])

  // Step 3 → salva mapeamento e vai para preview
  const handleSaveMapping = useCallback(async () => {
    if (!session) return
    setError(null)
    const r = await fetch(`/api/importacoes/sessions/${session.id}/mapping`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings }),
    })
    if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Erro ao salvar mapeamento'); return }
    // Vai para preview
    const pr = await fetch(`/api/importacoes/sessions/${session.id}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 20 }),
    })
    const pd = await pr.json()
    if (!pr.ok) { setError(pd.error ?? 'Erro ao gerar preview'); return }
    setPreviewData(pd)
    setStep(5)
  }, [session, mappings])

  // Step 6 → importação
  const handleImport = useCallback(async () => {
    if (!session) return
    setImporting(true)
    setError(null)
    const r = await fetch(`/api/importacoes/sessions/${session.id}/import`, { method: 'POST' })
    const data = await r.json()
    setImporting(false)
    if (!r.ok) { setError(data.error ?? 'Erro durante importação'); return }
    setImportResult(data)
    onConcluido()
  }, [session, onConcluido])

  return (
    <div>
      {/* Stepper */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              step === s.n
                ? 'bg-indigo-600 text-white'
                : step > s.n
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
            }`}>
              {step > s.n ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{s.n}</span>}
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {step === 1 && <StepUpload onSubmit={handleUpload} />}
      {step === 2 && (
        <StepEstrutura
          session={session!}
          headers={headers}
          sampleRows={sampleRows}
          metadata={metadata}
          structure={structure}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && <StepAnalise session={session!} onAnalyze={handleAnalyze} headers={headers} sampleRows={sampleRows} metadata={metadata} structure={structure} />}
      {step === 4 && (
        <StepMapeamento
          mappings={mappings}
          setMappings={setMappings}
          systemFields={systemFields}
          headers={headers}
          sampleRows={sampleRows}
          aiResult={aiResult}
          onSave={handleSaveMapping}
          onBack={() => setStep(3)}
        />
      )}
      {step === 5 && (
        <StepPreview
          previewData={previewData}
          onContinue={() => setStep(6)}
          onBack={() => setStep(4)}
        />
      )}
      {step === 6 && (
        <StepProgresso
          session={session}
          importing={importing}
          importResult={importResult}
          onImport={handleImport}
          onBack={() => setStep(5)}
          onReset={() => { setStep(1); setSession(null); setImportResult(null) }}
        />
      )}
    </div>
  )
}

// ─── STEP 1 — UPLOAD ─────────────────────────────────────────────────────────

const MODULES_LIST: { id: ModuleId; label: string }[] = [
  { id: 'PONTO_DIARIO',  label: 'Ponto Diário' },
  { id: 'COLABORADORES', label: 'Colaboradores' },
  { id: 'FERIAS',        label: 'Férias' },
  { id: 'BANCO_HORAS',   label: 'Banco de Horas' },
  { id: 'TREINAMENTOS',  label: 'Treinamentos' },
  { id: 'OPERACIONAL',   label: 'Dados Operacionais' },
  { id: 'EMPRESAS',      label: 'Empresas' },
]

/** Detecta módulo pelo nome do arquivo */
function detectModuleFromFilename(name: string): ModuleId {
  const n = name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/banco.?hora|bh[_\-]|hour.?bank/.test(n))     return 'BANCO_HORAS'
  if (/ferias|vacation|vacances/.test(n))             return 'FERIAS'
  if (/colaborad|employee|funcionario|worker/.test(n)) return 'COLABORADORES'
  if (/empresa|company|cnpj|client/.test(n))           return 'EMPRESAS'
  if (/operacional|headcount|quadro|moviment/.test(n)) return 'OPERACIONAL'
  if (/treinamento|training|capacitacao/.test(n))      return 'TREINAMENTOS'
  return 'PONTO_DIARIO'
}

function StepUpload({ onSubmit }: { onSubmit: (f: File, m: ModuleId) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [module, setModule] = useState<ModuleId>('PONTO_DIARIO')
  const [autoDetected, setAutoDetected] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    const detected = detectModuleFromFilename(f.name)
    setModule(detected)
    setAutoDetected(detected !== 'PONTO_DIARIO')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    await onSubmit(file, module)
    setLoading(false)
  }

  const ext = file ? '.' + file.name.split('.').pop()?.toLowerCase() : ''
  const extOk = !file || ['.xlsx','.xls','.csv','.pdf','.docx'].includes(ext)

  return (
    <div className="max-w-xl space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
        {file ? (
          <div>
            <p className="font-medium text-gray-800">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{fmtFileSize(file.size)}</p>
            {!extOk && <p className="text-xs text-red-500 mt-1">Formato não suportado</p>}
          </div>
        ) : (
          <div>
            <p className="text-gray-600 font-medium">Arraste ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-1">XLSX, XLS, CSV, PDF, DOCX — máx. 30 MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv,.pdf,.docx"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Módulo de destino
          </label>
          {autoDetected && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
              detectado automaticamente
            </span>
          )}
        </div>
        <select
          value={module}
          onChange={e => { setModule(e.target.value as ModuleId); setAutoDetected(false) }}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
        >
          {MODULES_LIST.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!file || !extOk || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {loading ? 'Enviando...' : 'Enviar arquivo'}
      </button>
    </div>
  )
}

// ─── STEP 2 — ESTRUTURA DETECTADA ────────────────────────────────────────────

const META_LABELS: Record<string, string> = {
  empresa: 'Empresa', cnpj: 'CNPJ', nome: 'Colaborador', matricula: 'Matrícula',
  funcao: 'Função', departamento: 'Departamento', admissao: 'Admissão',
  periodoInicio: 'Período início', periodoFim: 'Período fim',
  inscricao: 'Inscrição', folha: 'Nº Folha', ctps: 'CTPS',
}

function StepEstrutura({
  session, headers, sampleRows, metadata, structure, onNext, onBack
}: {
  session: ImportSession
  headers: string[]
  sampleRows: Record<string, string>[]
  metadata: Record<string, string>
  structure: any
  onNext: () => void
  onBack: () => void
}) {
  const metaEntries = Object.entries(metadata).filter(([k]) => k !== 'horario')
  const reportType = structure?.reportType ?? 'TABULAR'
  const headerRow = structure?.headerRowIndex >= 0 ? structure.headerRowIndex + 1 : '?'
  const confidence = structure?.confidence ? Math.round(structure.confidence * 100) : 0
  const regions: any[] = structure?.regions ?? []

  return (
    <div className="max-w-2xl space-y-5">
      {/* Card de resumo */}
      <div className={`p-4 rounded-xl border ${confidence >= 70 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${confidence >= 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {confidence}%
          </div>
          <div>
            <p className={`font-semibold ${confidence >= 70 ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
              {confidence >= 70 ? 'Estrutura detectada com alta confiança' : 'Estrutura detectada com baixa confiança — revise'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {session.fileName} · Planilha: <strong>{structure?.sheetName ?? 'Sheet1'}</strong> ·
              Tipo: <strong>{reportType === 'FORMATTED_REPORT' ? 'Relatório formatado' : 'Tabular'}</strong> ·
              Cabeçalho na linha <strong>{headerRow}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Metadados extraídos */}
      {metaEntries.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Metadados extraídos do relatório</p>
          <div className="grid grid-cols-2 gap-2">
            {metaEntries.map(([k, v]) => (
              <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{META_LABELS[k] ?? k}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5 break-words">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regiões */}
      {regions.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Regiões detectadas na planilha</p>
          <div className="space-y-1.5">
            {regions.map((r: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold flex-shrink-0 ${
                  r.type === 'CABECALHO_TABELA' ? 'bg-blue-100 text-blue-700' :
                  r.type === 'DADOS' ? 'bg-green-100 text-green-700' :
                  r.type === 'METADADOS' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{r.rows}</span>
                <span className="text-gray-700 dark:text-gray-300">{r.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Colunas detectadas */}
      {headers.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {headers.length} coluna{headers.length !== 1 ? 's' : ''} detectada{headers.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {headers.map(h => (
              <span key={h} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded text-xs text-blue-700 dark:text-blue-300 font-mono">
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Aviso se nenhuma coluna */}
      {headers.length === 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          Nenhuma coluna detectada. O arquivo pode estar em formato não tabular ou a tabela não foi localizada.
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={onNext}
          disabled={headers.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors"
        >
          Continuar para Mapeamento <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── STEP 3 — MAPEAMENTO AUTOMÁTICO (auto-run) ───────────────────────────────

function StepAnalise({
  session, onAnalyze, headers, sampleRows
}: {
  session: ImportSession
  onAnalyze: () => Promise<void>
  headers: string[]
  sampleRows: Record<string, string>[]
  metadata?: Record<string, string>
  structure?: any
}) {
  const [done, setDone] = useState(false)

  // Executa automaticamente ao montar — sem clique do usuário
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await onAnalyze()
      if (!cancelled) setDone(true)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-xl flex flex-col items-center justify-center py-12 gap-4 text-center">
      {done ? (
        <>
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="font-medium text-gray-800 dark:text-gray-100">Mapeamento detectado</p>
        </>
      ) : (
        <>
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-100">Detectando mapeamento de campos…</p>
            <p className="text-sm text-gray-500 mt-1">
              {session.fileName} · {headers.length} coluna{headers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── STEP 3 — MAPEAMENTO ─────────────────────────────────────────────────────

function StepMapeamento({
  mappings, setMappings, systemFields, headers, sampleRows, aiResult, onSave, onBack
}: {
  mappings: FieldMapping[]
  setMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>
  systemFields: { key: string; label: string; required?: boolean }[]
  headers: string[]
  sampleRows: Record<string, string>[]
  aiResult: any
  onSave: () => Promise<void>
  onBack: () => void
}) {
  const [loading, setLoading] = useState(false)

  const updateMapping = (idx: number, system: string | null) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, system } : m))
  }

  const run = async () => {
    setLoading(true)
    await onSave()
    setLoading(false)
  }

  const avgConf = mappings.length
    ? mappings.reduce((a, m) => a + m.confidence, 0) / mappings.length
    : 0

  return (
    <div className="space-y-4">
      {/* Resumo IA */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500">Confiança geral</p>
          <p className={`text-lg font-bold ${CONFIDENCE_COLOR(avgConf)}`}>
            {Math.round(avgConf * 100)}% <span className="text-sm font-normal">({CONFIDENCE_LABEL(avgConf)})</span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500">Colunas mapeadas</p>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {mappings.filter(m => m.system).length} / {mappings.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500">Layout detectado</p>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
            {aiResult?.detectedLayout ?? '—'}
          </p>
        </div>
      </div>

      {aiResult?.suggestions && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {aiResult.suggestions}
        </div>
      )}

      {/* Tabela de mapeamento */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400 w-8">#</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Coluna no arquivo</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Amostra</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Campo do sistema</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400 w-20">Conf.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {mappings.map((m, idx) => (
              <tr key={m.source} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-2 text-gray-400 text-xs">{idx + 1}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{m.source}</td>
                <td className="px-4 py-2 text-xs text-gray-500 max-w-[100px]">
                  <div className="truncate">{sampleRows[0]?.[m.source] ?? '—'}</div>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={m.system ?? ''}
                    onChange={e => updateMapping(idx, e.target.value || null)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  >
                    <option value="">— Ignorar —</option>
                    {systemFields.map(f => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-medium ${CONFIDENCE_COLOR(m.confidence)}`}>
                    {Math.round(m.confidence * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">* Campo obrigatório</p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          {loading ? 'Gerando preview...' : 'Preview dos dados'}
        </button>
      </div>
    </div>
  )
}

// ─── STEP 4 — PREVIEW ────────────────────────────────────────────────────────

function StepPreview({
  previewData, onContinue, onBack
}: {
  previewData: any
  onContinue: () => void
  onBack: () => void
}) {
  const rows: any[] = previewData?.previewRows ?? []
  const { valid = 0, invalid = 0, total = 0 } = previewData ?? {}

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500">Total de linhas</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-xs text-gray-500">Válidas</p>
          <p className="text-xl font-bold text-green-600">{valid}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-xs text-gray-500">Com erro (amostra)</p>
          <p className="text-xl font-bold text-red-600">{invalid}</p>
        </div>
      </div>

      {invalid > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Existem linhas inválidas na amostra. Registros inválidos serão ignorados durante a importação — os válidos serão importados.
        </div>
      )}

      {/* Tabela de preview */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500">Linha</th>
              <th className="px-3 py-2 text-left text-gray-500">Status</th>
              <th className="px-3 py-2 text-left text-gray-500">Dados mapeados</th>
              <th className="px-3 py-2 text-left text-gray-500">Erros</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.map((row: any) => (
              <tr key={row.rowIndex} className={`bg-white dark:bg-gray-900 ${row.status === 'INVALIDO' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                <td className="px-3 py-2 text-gray-400">{row.rowIndex}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${RECORD_STATUS_COLORS[row.status as RecordStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 max-w-sm">
                    {Object.entries(row.mappedValues ?? {}).slice(0, 5).map(([k, v]) => (
                      <span key={k}><span className="text-gray-400">{k}:</span> {String(v)}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-red-600">
                  {(row.errors ?? []).join('; ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > rows.length && (
        <p className="text-xs text-gray-400 text-center">Mostrando {rows.length} de {total} linhas</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="w-4 h-4" /> Ajustar mapeamento
        </button>
        <button
          onClick={onContinue}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ChevronRight className="w-4 h-4" /> Confirmar e importar
        </button>
      </div>
    </div>
  )
}

// ─── STEP 5 — PROGRESSO ──────────────────────────────────────────────────────

function StepProgresso({
  session, importing, importResult, onImport, onBack, onReset
}: {
  session: ImportSession | null
  importing: boolean
  importResult: any
  onImport: () => Promise<void>
  onBack: () => void
  onReset: () => void
}) {
  if (importResult) {
    const { total, importedRows, errorRows, conflictRows } = importResult
    return (
      <div className="max-w-md space-y-4">
        <div className="p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-green-800 dark:text-green-200">Importação concluída!</p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Total</p><p className="font-bold text-gray-800 dark:text-gray-100">{total}</p></div>
            <div><p className="text-xs text-gray-500">Importados</p><p className="font-bold text-green-600">{importedRows}</p></div>
            <div><p className="text-xs text-gray-500">Conflitos</p><p className="font-bold text-amber-600">{conflictRows}</p></div>
          </div>
          {errorRows > 0 && (
            <p className="mt-2 text-xs text-red-600">{errorRows} linha(s) com erro foram ignoradas.</p>
          )}
          {conflictRows > 0 && (
            <p className="mt-1 text-xs text-amber-600">Resolva os conflitos na aba "Conflitos".</p>
          )}
        </div>
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> Nova importação
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
        <p className="font-medium text-indigo-800 dark:text-indigo-200 mb-2">Pronto para importar</p>
        <p className="text-sm text-indigo-600 dark:text-indigo-400">
          Arquivo: <strong>{session?.fileName}</strong>
        </p>
        <p className="text-sm text-indigo-600 dark:text-indigo-400">
          Módulo: <strong>{session ? MODULE_LABELS[session.module] : '—'}</strong>
        </p>
      </div>

      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        Esta ação importará os dados para o sistema. Registros existentes podem ser atualizados.
        A operação pode ser revertida após a conclusão.
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={importing}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={onImport}
          disabled={importing}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {importing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
            : <><Play className="w-4 h-4" /> Confirmar importação</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── ABA: HISTÓRICO UNIFICADO ─────────────────────────────────────────────────

interface HistoricoEntry {
  id: string
  fonte: 'session' | 'ponto'
  arquivo: string
  tipo: string
  tipoId: string
  status: string
  statusLabel: string
  statusColor: string
  encontrados: number
  importados: number
  conflitos: number
  erros: number
  fileSize: number
  data: string
  podeExcluir: boolean
  podeReverter: boolean
}

const TIPO_FILTER_OPTIONS = [
  { id: '',              label: 'Todos os tipos' },
  { id: 'PONTO',         label: 'Importação de Ponto' },
  { id: 'COLABORADORES', label: 'Colaboradores' },
  { id: 'FERIAS',        label: 'Férias' },
  { id: 'BANCO_HORAS',   label: 'Banco de Horas' },
  { id: 'OPERACIONAL',   label: 'Dados Operacionais' },
  { id: 'EMPRESAS',      label: 'Empresas' },
  { id: 'TREINAMENTOS',  label: 'Treinamentos' },
]

// Modal de confirmação inline (substitui window.confirm que é bloqueado em alguns browsers)
interface ConfirmState {
  entry: HistoricoEntry
  action: 'excluir' | 'reverter'
  title: string
  message: string
}

function HistoricoImportacoes() {
  const [entries, setEntries]   = useState<HistoricoEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [tipoFilter, setTipoFilter] = useState('')
  const [acting, setActing]     = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const q = tipoFilter ? `?tipo=${tipoFilter}` : ''
    try {
      const r = await fetch(`/api/importacoes/historico${q}`)
      if (r.ok) { const d = await r.json(); setEntries(d.entries ?? []) }
      else setError('Erro ao carregar histórico.')
    } catch { setError('Erro de rede.') }
    setLoading(false)
  }, [tipoFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = (entry: HistoricoEntry) => {
    setActionError(null)
    setConfirmState({
      entry,
      action: 'excluir',
      title: 'Excluir importação',
      message: `Excluir "${entry.arquivo}"? Esta ação remove o lote permanentemente e não pode ser desfeita.`,
    })
  }

  const handleRevert = (entry: HistoricoEntry) => {
    setActionError(null)
    setConfirmState({
      entry,
      action: 'reverter',
      title: 'Reverter importação',
      message: `Reverter "${entry.arquivo}"? Os registros importados por este lote serão removidos do sistema.`,
    })
  }

  const executeConfirmed = async () => {
    if (!confirmState) return
    const { entry, action } = confirmState
    setConfirmState(null)
    setActing(entry.id)
    setActionError(null)

    try {
      if (action === 'excluir') {
        const r = await fetch(`/api/importacoes/historico?id=${entry.id}&fonte=${entry.fonte}`, { method: 'DELETE' })
        if (r.ok) { load() }
        else { const d = await r.json(); setActionError(d.error ?? 'Erro ao excluir.') }
      } else {
        const url = entry.fonte === 'ponto'
          ? `/api/gestao-equipe/importacoes-ponto/${entry.id}/revert`
          : `/api/importacoes/sessions/${entry.id}/revert`
        const r = await fetch(url, { method: 'POST' })
        if (r.ok) { load() }
        else { const d = await r.json(); setActionError(d.error ?? 'Erro ao reverter.') }
      }
    } catch { setActionError('Erro de rede.') }
    setActing(null)
  }

  return (
    <div className="space-y-3">
      {/* Modal de confirmação inline */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
              {confirmState.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeConfirmed}
                className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${
                  confirmState.action === 'excluir'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {confirmState.action === 'excluir' ? 'Excluir' : 'Reverter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <select
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800"
        >
          {TIPO_FILTER_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1.5 rounded" title="Atualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-3 text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhuma importação encontrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs">Arquivo / Lote</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs">Tipo</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs">Status</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-500 text-xs">Encontrados</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-500 text-xs">Importados</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-500 text-xs">Conflitos</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-500 text-xs">Erros</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs">Data</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {entries.map(entry => (
                <tr key={`${entry.fonte}-${entry.id}`} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <p className="font-medium text-gray-800 dark:text-gray-100 text-xs truncate max-w-[180px]" title={entry.arquivo}>
                        {entry.arquivo}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{entry.tipo}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.statusColor}`}>
                      {entry.statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-center text-gray-700 dark:text-gray-300">{entry.encontrados}</td>
                  <td className="px-3 py-2.5 text-xs text-center font-medium text-green-600">{entry.importados}</td>
                  <td className="px-3 py-2.5 text-xs text-center font-medium text-amber-600">{entry.conflitos || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-center font-medium text-red-500">{entry.erros || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(entry.data)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {entry.podeExcluir && (
                        <button
                          onClick={() => handleDelete(entry)}
                          disabled={acting === entry.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 transition-colors"
                          title="Excluir lote (não importado)"
                        >
                          {acting === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Excluir
                        </button>
                      )}
                      {entry.podeReverter && (
                        <button
                          onClick={() => handleRevert(entry)}
                          disabled={acting === entry.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded disabled:opacity-50 transition-colors"
                          title="Reverter importação"
                        >
                          {acting === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Reverter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── ABA: CONFLITOS ───────────────────────────────────────────────────────────

function ConflitosImportacoes() {
  const [sessions, setSessions] = useState<ImportSession[]>([])
  const [selected, setSelected] = useState<ImportSession | null>(null)
  const [conflicts, setConflicts] = useState<ImportConflict[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/importacoes/sessions?status=CONCLUIDO')
    if (r.ok) {
      const d = await r.json()
      const withConflicts = (d.sessions ?? []).filter((s: ImportSession) => s.conflictRows > 0)
      setSessions(withConflicts)
      if (withConflicts.length && !selected) setSelected(withConflicts[0])
    }
    setLoading(false)
  }, [selected])

  const loadConflicts = useCallback(async (sessionId: string) => {
    const r = await fetch(`/api/importacoes/sessions/${sessionId}/conflicts`)
    if (r.ok) { const d = await r.json(); setConflicts(d.conflicts ?? []) }
  }, [])

  const handleSelect = (s: ImportSession) => {
    setSelected(s); loadConflicts(s.id)
  }

  const handleResolve = async (cid: string, resolution: string) => {
    if (!selected) return
    setResolving(cid)
    await fetch(`/api/importacoes/sessions/${selected.id}/conflicts/${cid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, resolvedBy: 'usuário' }),
    })
    setResolving(null)
    loadConflicts(selected.id)
  }

  useEffect(() => { loadSessions() }, [])

  const pending = conflicts.filter(c => !c.resolution || c.resolution === 'PENDENTE')

  return (
    <div className="grid grid-cols-3 gap-4 min-h-[400px]">
      {/* Lista de sessões com conflitos */}
      <div className="border-r border-gray-200 dark:border-gray-700 pr-4 space-y-1">
        <p className="text-xs font-medium text-gray-500 mb-2">Importações com conflitos</p>
        {loading ? (
          <div className="text-center py-4 text-gray-400"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum conflito pendente</p>
        ) : (
          sessions.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                selected?.id === s.id
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <p className="font-medium text-gray-800 dark:text-gray-100 truncate text-xs">{s.fileName}</p>
              <p className="text-xs text-amber-600">{s.conflictRows} conflito(s)</p>
            </button>
          ))
        )}
      </div>

      {/* Detalhes dos conflitos */}
      <div className="col-span-2 space-y-3">
        {!selected ? (
          <div className="text-center py-12 text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Selecione uma importação</p>
          </div>
        ) : conflicts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p>Todos os conflitos foram resolvidos</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {pending.length} conflito(s) pendente(s) de {conflicts.length}
              </p>
            </div>
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {conflicts.map(c => {
                const resolved = c.resolution && c.resolution !== 'PENDENTE'
                return (
                  <div key={c.id} className={`border rounded-lg p-3 text-sm ${
                    resolved
                      ? 'border-gray-100 dark:border-gray-800 opacity-60'
                      : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">
                          Linha {c.rowIndex} — {c.conflictType}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                        <div className="flex gap-4 mt-1 text-xs">
                          <span className="text-gray-500">Existente: <span className="text-gray-700 dark:text-gray-300">{c.existingValue}</span></span>
                          <span className="text-gray-500">Importado: <span className="text-gray-700 dark:text-gray-300">{c.incomingValue}</span></span>
                        </div>
                      </div>
                      {resolved ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">{c.resolution}</span>
                      ) : (
                        <div className="flex gap-1.5 flex-shrink-0">
                          {['MANTER', 'SOBRESCREVER', 'IGNORAR'].map(res => (
                            <button
                              key={res}
                              onClick={() => handleResolve(c.id, res)}
                              disabled={resolving === c.id}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                res === 'SOBRESCREVER'
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : res === 'MANTER'
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                              } disabled:opacity-50`}
                            >
                              {resolving === c.id ? '…' : res === 'SOBRESCREVER' ? 'Sobrescrever' : res === 'MANTER' ? 'Manter' : 'Ignorar'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── ABA: PERFIS DE FONTE ─────────────────────────────────────────────────────

function PerfisImportacoes() {
  const [profiles, setProfiles] = useState<ImportSourceProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', module: 'PONTO_DIARIO' as ModuleId, fileType: '.xlsx' })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/importacoes/profiles')
    if (r.ok) { const d = await r.json(); setProfiles(d.profiles ?? []) }
    setLoading(false)
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este perfil?')) return
    await fetch(`/api/importacoes/profiles/${id}`, { method: 'DELETE' })
    load()
  }

  const handleCreate = async () => {
    if (!form.name) return
    setCreating(true)
    await fetch('/api/importacoes/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setCreating(false)
    setForm({ name: '', module: 'PONTO_DIARIO', fileType: '.xlsx' })
    load()
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      {/* Formulário de criação */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Novo perfil de fonte</p>
        <div className="grid grid-cols-3 gap-3">
          <input
            placeholder="Nome do perfil (ex: Secullum — Espelho)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 col-span-1"
          />
          <select
            value={form.module}
            onChange={e => setForm(f => ({ ...f, module: e.target.value as ModuleId }))}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
          >
            {MODULES_LIST.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <select
            value={form.fileType}
            onChange={e => setForm(f => ({ ...f, fileType: e.target.value }))}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
          >
            {['.xlsx', '.xls', '.csv', '.pdf', '.docx'].map(ext => (
              <option key={ext} value={ext}>{ext}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={!form.name || creating}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Criar perfil
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BookMarked className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum perfil salvo. Perfis são criados automaticamente ao concluir importações.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {profiles.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {MODULE_LABELS[p.module]} · {p.fileType} · {p.usageCount} uso(s)
                  </p>
                  <p className={`text-xs font-medium mt-1 ${CONFIDENCE_COLOR(p.confidence)}`}>
                    Confiança: {Math.round(p.confidence * 100)}%
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
