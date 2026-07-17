"use client"

import {
  useState, useEffect, useCallback, useRef, KeyboardEvent,
} from "react"
import {
  Inbox, Upload, ClipboardPaste, FolderOpen, Mail, Sparkles, Loader2,
  X, Check, AlertTriangle, Clock, Building2, User, Tag, Calendar,
  Search, Trash2, RefreshCw, Settings, FileText, File,
  CheckSquare, ClipboardList, Briefcase, Zap, AlertCircle,
  Plus, RotateCcw, FolderSync, Eye, Download, Archive, Edit3,
  Flag, Info, Paperclip, History, Send, Copy, MessageSquare,
  ChevronDown, ChevronUp, Bot, ZoomIn, ZoomOut, Maximize2, Printer,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn, formatDate, formatRelativeTime } from "@/lib/utils"

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Attachment   { id: string; fileName: string; fileType: string; fileSize: number; filePath: string; createdAt: string }
interface HistoryEntry { id: string; action: string; detail: string | null; createdAt: string }
interface Suggestion   { id: string; type: string; title: string; description: string | null; applied: boolean }
interface ChatMessage  { id: string; role: 'user' | 'assistant'; content: string; mode?: string | null; createdAt: string }

interface CentralItem {
  id: string; source: string; status: string; title: string
  senderName: string | null; senderEmail: string | null
  company: string | null; collaborator: string | null; subject: string | null
  pastedContent: string | null
  priority: string; dueDate: string | null; department: string | null
  responsible: string | null; category: string | null; keywords: string | null
  summary: string | null; risks: string | null; aiPowered: boolean; aiRaw: string | null
  createdAt: string; updatedAt: string
  attachments: Attachment[]
  history: HistoryEntry[]
  suggestions: Suggestion[]
  chats: ChatMessage[]
}

interface Stats    { total: number; pending: number; analyzed: number; urgente: number; actioned: number; today: number }
interface CatCount { name: string; count: number }
interface Config   {
  id: string; folderPath: string | null; folderEnabled: boolean
  folderIntervalMin: number; folderMoveProcessed: boolean
  folderProcessedPath: string | null; emailAddress: string | null; emailEnabled: boolean
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING:   'Aguardando análise',
  ANALYZING: 'Analisando…',
  ANALYZED:  'Analisado',
  ACTIONED:  'Ação criada',
  ARCHIVED:  'Arquivado',
  ERROR:     'Erro',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-slate-100  text-slate-500  border-slate-200',
  ANALYZING: 'bg-blue-100   text-blue-700   border-blue-200',
  ANALYZED:  'bg-violet-100 text-violet-700 border-violet-200',
  ACTIONED:  'bg-green-100  text-green-700  border-green-200',
  ARCHIVED:  'bg-slate-100  text-slate-400  border-slate-200',
  ERROR:     'bg-red-100    text-red-700    border-red-200',
}
const PRIO_COLOR: Record<string, string> = {
  URGENTE: 'bg-red-100    text-red-700    border-red-200',
  ALTA:    'bg-orange-100 text-orange-700 border-orange-200',
  MEDIA:   'bg-blue-100   text-blue-700   border-blue-200',
  BAIXA:   'bg-slate-100  text-slate-400  border-slate-200',
}
const SRC_ICON: Record<string, typeof Upload> = {
  UPLOAD: Upload, PASTE: ClipboardPaste, FOLDER: FolderOpen, EMAIL: Mail,
}

function fileSizeStr(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function fileEmoji(type: string) {
  if (/pdf/.test(type))                return '📄'
  if (/word|doc/.test(type))           return '📝'
  if (/sheet|xls/.test(type))          return '📊'
  if (/image|jpg|png|webp/.test(type)) return '🖼️'
  if (/eml|msg/.test(type))            return '📧'
  if (/text/.test(type))               return '📃'
  return '📎'
}
function isImage(t: string) { return /image|\.jpg|\.png|\.webp|\.jpeg/.test(t) }
function isPDF(t: string)   { return /pdf/.test(t) }
function aiField(raw: string | null, key: string) {
  if (!raw) return ''
  return raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || ''
}

const QUICK_ACTIONS = [
  { mode: 'analyze',              label: 'Analisar entrada',        icon: Sparkles,     color: 'text-violet-600 hover:bg-violet-50' },
  { mode: 'summarize',            label: 'Criar resumo',            icon: FileText,     color: 'text-blue-600   hover:bg-blue-50'   },
  { mode: 'suggest-reply',        label: 'Sugerir resposta',        icon: Mail,         color: 'text-emerald-600 hover:bg-emerald-50'},
  { mode: 'suggest-task',         label: 'Sugerir tarefa',          icon: CheckSquare,  color: 'text-blue-600   hover:bg-blue-50'   },
  { mode: 'suggest-pending',      label: 'Sugerir pendência',       icon: Clock,        color: 'text-amber-600  hover:bg-amber-50'  },
  { mode: 'suggest-conference',   label: 'Sugerir conferência',     icon: Calendar,     color: 'text-indigo-600 hover:bg-indigo-50' },
  { mode: 'identify-deadline',    label: 'Identificar prazo',       icon: Calendar,     color: 'text-orange-600 hover:bg-orange-50' },
  { mode: 'identify-responsible', label: 'Identificar responsável', icon: User,         color: 'text-teal-600   hover:bg-teal-50'   },
  { mode: 'risks',                label: 'Identificar riscos',      icon: AlertTriangle,color: 'text-red-600    hover:bg-red-50'    },
  { mode: 'analyze-attachments',  label: 'Analisar anexos',         icon: Paperclip,    color: 'text-slate-600  hover:bg-slate-50'  },
] as const

const SPECIALIST_LIST = [
  'Departamento Pessoal',
  'Recursos Humanos',
  'Jurídico Trabalhista',
  'Jurídico Cível',
  'Jurídico Empresarial',
  'Contabilidade',
  'Fiscal e Tributário',
  'Financeiro',
  'Compras e Suprimentos',
  'Gestão de Contratos',
  'Administrativo',
  'Compliance e Auditoria',
  'LGPD e Privacidade',
  'Saúde e Segurança',
  'Medicina do Trabalho',
  'Gestão de Projetos',
  'Controladoria',
  'Licitações Públicas',
  'Qualidade e ISO',
]

function detectSpecialistLocal(text: string): string {
  const t = text.toLowerCase()
  if (/cct\b|clt\b|fgts|esocial|férias|rescisão|admissão|holerite|folha.*pagamento|sindicato|convenção.*coletiva|aviso.*prévio|dissídio/i.test(t)) return 'Departamento Pessoal'
  if (/nr-\d|ppra|pcmso|cipa|epi\b|acidente.*trabalho|saúde.*ocupacional|laudo.*médico|cat\b/i.test(t)) return 'Saúde e Segurança'
  if (/processo.*trt|vara.*trabalho|reclamação.*trabalhista|audiência.*trabalhista|ação.*trabalhista/i.test(t)) return 'Jurídico Trabalhista'
  if (/nf-e|nfse|ibs\b|cbs\b|sped|icms|iss\b|pis\b|cofins|nota.*fiscal|tributário|imposto.*renda/i.test(t)) return 'Fiscal e Tributário'
  if (/contrato|aditivo.*contrato|fornecedor|prestador.*serviço|cláusula|vigência.*contrato/i.test(t)) return 'Gestão de Contratos'
  if (/balanço|demonstração.*resultado|dre\b|patrimônio.*líquido|plano.*contas|contabilidade/i.test(t)) return 'Contabilidade'
  if (/lgpd|dados.*pessoais|tratamento.*dados|consentimento|privacidade|anpd|dpo\b/i.test(t)) return 'LGPD e Privacidade'
  if (/licitação|pregão|edital.*licitação|lei.*14133|lei.*8666|dispensa.*licitação/i.test(t)) return 'Licitações Públicas'
  if (/compliance|auditoria|controle.*interno|segregação.*funções|sox\b/i.test(t)) return 'Compliance e Auditoria'
  if (/fluxo.*caixa|tesouraria|contas.*pagar|contas.*receber|projeção.*financeira/i.test(t)) return 'Financeiro'
  if (/cotação|pedido.*compra|requisição.*compra|supply.*chain|sourcing/i.test(t)) return 'Compras e Suprimentos'
  if (/recrutamento|seleção|treinamento|clima.*organizacional|avaliação.*desempenho|headcount/i.test(t)) return 'Recursos Humanos'
  if (/iso\s*\d|norma.*qualidade|certificação|não.*conformidade|auditoria.*qualidade/i.test(t)) return 'Qualidade e ISO'
  if (/milestone|cronograma|gestão.*projeto|pmo\b|escopo.*projeto/i.test(t)) return 'Gestão de Projetos'
  if (/controladoria|orçamento.*empresarial|kpi\b|budget|business.*intelligence/i.test(t)) return 'Controladoria'
  return 'Administrativo'
}

// ─── ATTACHMENT VIEWER ────────────────────────────────────────────────────────

function AttachmentViewerModal({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  const [rotation, setRotation] = useState(0)
  const [zoom,     setZoom]     = useState(1)
  const img = isImage(attachment.fileType)
  const pdf = isPDF(attachment.fileType)

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col" onClick={onClose}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-black/60 shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-lg mr-1">{fileEmoji(attachment.fileType)}</span>
        <span className="text-white text-sm font-medium flex-1 truncate">{attachment.fileName}</span>
        <span className="text-white/40 text-xs shrink-0">{fileSizeStr(attachment.fileSize)}</span>
        {img && (
          <>
            <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
              className="p-1.5 text-white/60 hover:text-white rounded" title="Ampliar">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
              className="p-1.5 text-white/60 hover:text-white rounded" title="Reduzir">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={() => setRotation(r => (r + 90) % 360)}
              className="p-1.5 text-white/60 hover:text-white rounded" title="Girar">
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        )}
        <a href={attachment.filePath} download={attachment.fileName}
          className="p-1.5 text-white/60 hover:text-white rounded" title="Baixar" onClick={e => e.stopPropagation()}>
          <Download className="w-4 h-4" />
        </a>
        <a href={attachment.filePath} target="_blank" rel="noopener noreferrer"
          className="p-1.5 text-white/60 hover:text-white rounded" title="Abrir em nova aba" onClick={e => e.stopPropagation()}>
          <Eye className="w-4 h-4" />
        </a>
        <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white rounded ml-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        {img && (
          <img
            src={attachment.filePath}
            alt={attachment.fileName}
            style={{ transform: `rotate(${rotation}deg) scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
            className="max-w-full max-h-full object-contain select-none"
          />
        )}
        {pdf && (
          <iframe src={attachment.filePath} className="w-full h-full border-0 rounded-lg bg-white" title="PDF" />
        )}
        {!img && !pdf && (
          <div className="text-center">
            <div className="text-7xl mb-5">{fileEmoji(attachment.fileType)}</div>
            <p className="text-white text-lg font-semibold">{attachment.fileName}</p>
            <p className="text-white/40 text-sm mt-1">{fileSizeStr(attachment.fileSize)}</p>
            <div className="flex gap-3 mt-6 justify-center">
              <a href={attachment.filePath} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 text-sm">
                  <Eye className="w-4 h-4" /> Abrir
                </button>
              </a>
              <a href={attachment.filePath} download={attachment.fileName}>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-800 hover:bg-white/90 text-sm font-medium">
                  <Download className="w-4 h-4" /> Baixar
                </button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

function NewItemModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ids: string[]) => void }) {
  const [tab,              setTab]              = useState<'drop' | 'paste' | 'upload'>('drop')
  const [uploading,        setUploading]        = useState(false)
  const [pasteText,        setPasteText]        = useState('')
  const [sender,           setSender]           = useState('')
  const [subject,          setSubject]          = useState('')
  const [dragging,         setDragging]         = useState(false)
  const [pasteFiles,       setPasteFiles]       = useState<File[]>([])
  const [pasteDropActive,  setPasteDropActive]  = useState(false)
  const fileRef      = useRef<HTMLInputElement>(null)
  const pasteFileRef = useRef<HTMLInputElement>(null)

  async function uploadFiles(files: File[]) {
    setUploading(true)
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    const res  = await fetch('/api/central/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.created?.length) { onCreated(data.created); onClose() }
  }

  async function submitPaste() {
    if (!pasteText.trim()) return
    setUploading(true)
    const res = await fetch('/api/central', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'PASTE', title: subject || 'Texto colado', subject: subject || null, senderName: sender || null, pastedContent: pasteText }),
    })
    const item = await res.json()

    if (item.id && pasteFiles.length > 0) {
      const fd = new FormData()
      pasteFiles.forEach(f => fd.append('files', f))
      await fetch(`/api/central/${item.id}/attachments`, { method: 'POST', body: fd })
    }

    setUploading(false)
    if (item.id) { onCreated([item.id]); onClose() }
  }

  function addPasteFiles(incoming: File[]) {
    setPasteFiles(prev => {
      const existing = new Set(prev.map(f => `${f.name}-${f.size}`))
      return [...prev, ...incoming.filter(f => !existing.has(`${f.name}-${f.size}`))]
    })
  }

  function handlePasteAreaPaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items)
    const imgItem = items.find(i => i.type.startsWith('image/'))
    if (imgItem) {
      e.preventDefault()
      const file = imgItem.getAsFile()
      if (file) addPasteFiles([file])
    }
  }

  function handleAttachDrop(e: React.DragEvent) {
    e.preventDefault()
    setPasteDropActive(false)
    addPasteFiles(Array.from(e.dataTransfer.files))
  }

  const TABS = [
    { id: 'drop',   label: 'Arrastar',    icon: Upload },
    { id: 'paste',  label: 'Colar texto', icon: ClipboardPaste },
    { id: 'upload', label: 'Selecionar',  icon: FolderOpen },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">Nova Entrada</h2>
            <p className="text-xs text-slate-400">Arquivo, texto ou e-mail · A IA analisará quando você solicitar</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex border-b border-slate-100">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors',
                tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === 'drop' && (
            <div
              onDrop={e => { e.preventDefault(); setDragging(false); const f = Array.from(e.dataTransfer.files); if (f.length) uploadFiles(f) }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={cn('border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50')}>
              <input ref={fileRef} type="file" multiple className="hidden"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.msg,.eml,.txt"
                onChange={e => { const f = Array.from(e.target.files || []); if (f.length) uploadFiles(f) }} />
              <Upload className={cn('w-10 h-10 mx-auto mb-3', dragging ? 'text-blue-500' : 'text-slate-300')} />
              <p className="font-semibold text-slate-700 mb-1">{dragging ? 'Solte aqui' : 'Arraste arquivos ou clique'}</p>
              <p className="text-xs text-slate-400">PDF, DOCX, XLSX, JPG, PNG, MSG, EML · 20 MB máx.</p>
              {uploading && <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600"><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</div>}
            </div>
          )}
          {tab === 'paste' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Remetente</label>
                  <input value={sender} onChange={e => setSender(e.target.value)} placeholder="Nome ou e-mail"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Assunto</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Assunto"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
              </div>
              <textarea rows={6} value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder="Cole aqui o conteúdo do e-mail ou documento. A IA analisará somente quando você solicitar…"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y" />

              {/* ── Attachments section ── */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <p className="text-xs font-semibold text-slate-600">Anexos</p>
                    {pasteFiles.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 leading-4">{pasteFiles.length}</span>
                    )}
                  </div>
                  <button onClick={() => pasteFileRef.current?.click()}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                  <input ref={pasteFileRef} type="file" multiple className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt,.xml,.zip"
                    onChange={e => addPasteFiles(Array.from(e.target.files || []))} />
                </div>

                <div
                  onDrop={handleAttachDrop}
                  onDragOver={e => { e.preventDefault(); setPasteDropActive(true) }}
                  onDragLeave={() => setPasteDropActive(false)}
                  onPaste={handlePasteAreaPaste}
                  className={cn(
                    'min-h-[56px] p-2 transition-colors',
                    pasteDropActive ? 'bg-blue-50' : 'bg-white'
                  )}>
                  {pasteFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-2 text-center">
                      <p className="text-xs text-slate-400">
                        Arraste arquivos, clique em <span className="text-blue-600">Adicionar</span> ou cole imagem com Ctrl+V
                      </p>
                      <p className="text-xs text-slate-300 mt-0.5">PDF · DOC · XLS · CSV · JPG · PNG · TXT · XML</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {pasteFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-sm">{fileEmoji(f.type || f.name)}</span>
                          <span className="flex-1 min-w-0 font-medium text-slate-700 truncate">{f.name}</span>
                          <span className="text-slate-400 shrink-0">{fileSizeStr(f.size)}</span>
                          <button onClick={() => setPasteFiles(prev => prev.filter((_, j) => j !== i))}
                            className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={submitPaste} disabled={uploading || !pasteText.trim()} className="w-full">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {pasteFiles.length > 0
                  ? `Criar entrada · ${pasteFiles.length} anexo${pasteFiles.length > 1 ? 's' : ''}`
                  : 'Criar entrada'}
              </Button>
            </div>
          )}
          {tab === 'upload' && (
            <div>
              <input ref={fileRef} type="file" multiple className="hidden"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.msg,.eml,.txt"
                onChange={e => { const f = Array.from(e.target.files || []); if (f.length) uploadFiles(f) }} />
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 rounded-xl py-10 hover:border-blue-300 hover:bg-slate-50 transition-colors">
                <Upload className="w-6 h-6 text-slate-400" />
                <div className="text-left">
                  <p className="font-medium text-slate-700">Selecionar arquivos</p>
                  <p className="text-xs text-slate-400">PDF, DOCX, XLSX, JPG, PNG, MSG, EML, TXT</p>
                </div>
              </button>
              {uploading && <div className="mt-4 flex items-center gap-2 text-sm text-blue-600"><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfigModal({ onClose }: { onClose: () => void }) {
  const [cfg,      setCfg]      = useState<Config | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanMsg,  setScanMsg]  = useState('')

  useEffect(() => { fetch('/api/central/config').then(r => r.json()).then(setCfg) }, [])

  async function save() {
    if (!cfg) return
    setSaving(true)
    await fetch('/api/central/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) })
    setSaving(false); onClose()
  }

  if (!cfg) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Configurações da Central</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Pasta Monitorada</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={cfg.folderEnabled} onChange={e => setCfg(p => p ? { ...p, folderEnabled: e.target.checked } : p)} className="sr-only peer" />
                <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
            <input value={cfg.folderPath || ''} onChange={e => setCfg(p => p ? { ...p, folderPath: e.target.value } : p)}
              placeholder="Ex: D:\Entrada DP"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none font-mono" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Encaminhamento de E-mails</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={cfg.emailEnabled} onChange={e => setCfg(p => p ? { ...p, emailEnabled: e.target.checked } : p)} className="sr-only peer" />
                <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
            <input value={cfg.emailAddress || ''} onChange={e => setCfg(p => p ? { ...p, emailAddress: e.target.value } : p)}
              placeholder="dp@suaempresa.com.br"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-100">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salvar
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}

function CreateActionModal({ item, suggestion, onClose, onCreated }: {
  item: CentralItem; suggestion: { type: string; title: string; prefill?: string }
  onClose: () => void; onCreated: () => void
}) {
  const [title,       setTitle]       = useState(suggestion.title)
  const [description, setDescription] = useState(suggestion.prefill || item.summary || '')
  const [priority,    setPriority]    = useState(item.priority || 'MEDIA')
  const [responsible, setResponsible] = useState(item.responsible || '')
  const [dueDate,     setDueDate]     = useState(item.dueDate || '')
  const [saving,      setSaving]      = useState(false)

  async function create() {
    setSaving(true)
    await fetch(`/api/central/${item.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: suggestion.type, title, description, priority, responsible, dueDate: dueDate || null }),
    })
    setSaving(false); onCreated(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <p className="text-xs text-violet-600 font-semibold uppercase tracking-wide">{suggestion.type}</p>
            <h2 className="font-bold text-slate-800">Confirmar criação</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prioridade</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white">
                <option value="URGENTE">🔴 Urgente</option>
                <option value="ALTA">🟠 Alta</option>
                <option value="MEDIA">🔵 Média</option>
                <option value="BAIXA">⚪ Baixa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prazo</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Responsável</label>
            <input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nome do responsável"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-100">
          <Button onClick={create} disabled={saving || !title.trim()} className="flex-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Criar {suggestion.type === 'TASK' ? 'Tarefa' : suggestion.type}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── AI CHAT PANEL (esquerda) ─────────────────────────────────────────────────

function AIChatPanel({ item, onRefresh, pendingAction, onPendingHandled }: {
  item: CentralItem
  onRefresh: () => void
  pendingAction?: { mode?: string; message?: string } | null
  onPendingHandled?: () => void
}) {
  const autoDetected = detectSpecialistLocal(
    [item.title, item.subject, item.pastedContent, item.summary, item.keywords,
     ...item.attachments.map(a => a.fileName)].filter(Boolean).join(' ')
  )

  const [messages,       setMessages]       = useState<ChatMessage[]>(item.chats || [])
  const [input,          setInput]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [specialist,     setSpecialist]     = useState<string>(autoDetected)
  const [showSpecChange, setShowSpecChange] = useState(false)
  const [createAction,   setCreateAction]   = useState<{ type: string; title: string; prefill?: string } | null>(null)
  const [copiedId,       setCopiedId]       = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMessages(item.chats || [])
    setSpecialist(detectSpecialistLocal(
      [item.title, item.subject, item.pastedContent, item.summary, item.keywords,
       ...item.attachments.map(a => a.fileName)].filter(Boolean).join(' ')
    ))
  }, [item.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Handle trigger from AttachmentsTab
  useEffect(() => {
    if (pendingAction && !loading) {
      send(pendingAction.message || '', pendingAction.mode)
      onPendingHandled?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction])

  async function send(text: string, mode?: string) {
    const msg = text.trim()
    if (!msg && !mode) return
    const label = mode ? QUICK_ACTIONS.find(a => a.mode === mode)?.label || msg : msg
    const tempUser: ChatMessage = {
      id: `tmp-${Date.now()}`, role: 'user', content: label, mode: mode || null, createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUser])
    setInput('')
    setLoading(true)

    try {
      const res  = await fetch(`/api/central/${item.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg || label, mode: mode || undefined, specialist }),
      })
      const data = await res.json()
      if (data.specialist) setSpecialist(data.specialist)
      const assistantMsg: ChatMessage = {
        id: data.id || `tmp-ai-${Date.now()}`, role: 'assistant', content: data.response, mode: mode || null, createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev.filter(m => m.id !== tempUser.id), tempUser, assistantMsg])
      onRefresh()
    } catch {
      setMessages(prev => [...prev.filter(m => m.id !== tempUser.id), tempUser, {
        id: `err-${Date.now()}`, role: 'assistant', content: 'Erro ao contactar a IA. Tente novamente.', mode: null, createdAt: new Date().toISOString(),
      }])
    }
    setLoading(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function extractSuggestedReply(content: string) {
    const marker = '--- RESPOSTA SUGERIDA ---'
    const idx = content.indexOf(marker)
    return idx >= 0 ? content.slice(idx + marker.length).trim() : null
  }

  function extractSuggestedTask(content: string): { title: string; description: string } | null {
    const marker = '--- TAREFA SUGERIDA ---'
    const idx = content.indexOf(marker)
    if (idx < 0) return null
    const block = content.slice(idx + marker.length).trim()
    const titleMatch = block.match(/^Título:\s*(.+)$/m)
    return { title: titleMatch?.[1]?.trim() || 'Tarefa da IA', description: block }
  }

  return (
    <>
      {createAction && (
        <CreateActionModal
          item={item} suggestion={createAction}
          onClose={() => setCreateAction(null)}
          onCreated={() => { setCreateAction(null); onRefresh() }}
        />
      )}

      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800">Assistente da Entrada</p>
              <p className="text-xs text-slate-400 truncate">{item.title}</p>
            </div>
            {messages.length > 0 && (
              <button onClick={() => fetch(`/api/central/${item.id}/chat`, { method: 'DELETE' }).then(() => setMessages([]))}
                className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded" title="Limpar conversa">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Specialist badge */}
          <div className="mt-2 flex items-center gap-1.5 relative">
            <div className="flex-1 flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1">
              <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />
              <span className="text-xs font-semibold text-violet-700 truncate">{specialist}</span>
              <span className="text-xs text-violet-400 shrink-0">· Especialista Sênior</span>
            </div>
            <button
              onClick={() => setShowSpecChange(v => !v)}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 border border-slate-200 whitespace-nowrap transition-colors"
              title="Trocar especialista">
              Trocar
            </button>

            {/* Specialist dropdown */}
            {showSpecChange && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-600">Trocar Especialista</p>
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {SPECIALIST_LIST.map(s => (
                    <button key={s} onClick={() => { setSpecialist(s); setShowSpecChange(false) }}
                      className={cn(
                        'w-full text-left text-xs px-3 py-1.5 hover:bg-slate-50 transition-colors',
                        s === specialist ? 'text-violet-700 font-semibold bg-violet-50' : 'text-slate-700'
                      )}>
                      {s === specialist && '✓ '}{s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions — horizontal scrollable chips */}
        <div className="border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Ações:</span>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {QUICK_ACTIONS.map(a => (
                <button key={a.mode} onClick={() => send('', a.mode)} disabled={loading}
                  title={a.label}
                  className={cn(
                    'flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-xs font-medium',
                    'border border-current/10 transition-colors disabled:opacity-40 whitespace-nowrap',
                    a.color
                  )}>
                  <a.icon className="w-3 h-3 shrink-0" />
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageSquare className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">Assistente pronto</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[180px]">Clique em uma ação rápida ou faça uma pergunta sobre esta entrada</p>
            </div>
          )}

          {messages.map(msg => {
            const isUser      = msg.role === 'user'
            const replyText   = !isUser ? extractSuggestedReply(msg.content) : null
            const taskData    = !isUser ? extractSuggestedTask(msg.content)  : null

            return (
              <div key={msg.id} className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
                {!isUser && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={cn('max-w-[88%] space-y-2')}>
                  <div className={cn('rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm')}>
                    {msg.content}
                  </div>

                  {/* Action buttons for assistant messages */}
                  {!isUser && (
                    <div className="flex flex-wrap gap-1.5 ml-0.5">
                      <button onClick={() => copyText(msg.content, msg.id)}
                        className="flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-500 rounded-full px-2 py-0.5 hover:bg-slate-50 transition-colors">
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copiado' : 'Copiar'}
                      </button>

                      {replyText && (
                        <>
                          <button onClick={() => copyText(replyText, msg.id + '-reply')}
                            className="flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2 py-0.5 hover:bg-emerald-100 transition-colors">
                            <Copy className="w-3 h-3" /> Copiar resposta
                          </button>
                          <button onClick={() => setCreateAction({ type: 'TASK', title: `Responder: ${item.title}`, prefill: replyText })}
                            className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5 hover:bg-blue-100 transition-colors">
                            <CheckSquare className="w-3 h-3" /> Criar tarefa
                          </button>
                        </>
                      )}

                      {taskData && (
                        <button onClick={() => setCreateAction({ type: 'TASK', title: taskData.title, prefill: taskData.description })}
                          className="flex items-center gap-1 text-xs bg-violet-50 border border-violet-200 text-violet-700 rounded-full px-2 py-0.5 hover:bg-violet-100 transition-colors">
                          <Plus className="w-3 h-3" /> Criar tarefa
                        </button>
                      )}

                      {(msg.mode === 'analyze' || msg.mode === 'risks') && (
                        <button onClick={() => setCreateAction({ type: 'TASK', title: `Analisar: ${item.title}`, prefill: msg.content })}
                          className="flex items-center gap-1 text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-full px-2 py-0.5 hover:bg-orange-100 transition-colors">
                          <CheckSquare className="w-3 h-3" /> Criar ação
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {isUser && (
                  <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            )
          })}

          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-100 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Pergunte algo sobre esta entrada…"
              rows={2}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50"
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 text-center">Enter para enviar · Shift+Enter nova linha</p>
        </div>
      </div>
    </>
  )
}

// ─── CONTENT VIEWER (centro) ──────────────────────────────────────────────────

function AttachmentRow({ a, itemId, onView, onDelete }: {
  a: Attachment
  itemId: string
  onView: (a: Attachment) => void
  onDelete?: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm(`Remover "${a.fileName}"?`)) return
    setDeleting(true)
    await fetch(`/api/central/${itemId}/attachments/${a.id}`, { method: 'DELETE' })
    setDeleting(false)
    onDelete(a.id)
  }

  return (
    <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 group">
      <span className="text-base shrink-0">{fileEmoji(a.fileType)}</span>
      <button onClick={() => onView(a)} className="flex-1 min-w-0 text-left font-medium text-slate-700 truncate hover:text-blue-600 transition-colors">
        {a.fileName}
      </button>
      <span className="text-slate-400 shrink-0">{fileSizeStr(a.fileSize)}</span>
      <button onClick={() => onView(a)} className="text-slate-300 hover:text-blue-500 transition-colors" title="Visualizar">
        <Eye className="w-3.5 h-3.5" />
      </button>
      <a href={a.filePath} download={a.fileName} className="text-slate-300 hover:text-slate-600 transition-colors" title="Baixar">
        <Download className="w-3.5 h-3.5" />
      </a>
      {onDelete && (
        <button onClick={handleDelete} disabled={deleting}
          className="text-slate-200 hover:text-red-400 transition-colors disabled:opacity-40" title="Remover">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  )
}

function ContentViewer({ item, onRefresh }: { item: CentralItem; onRefresh?: () => void }) {
  const [viewerAtt,  setViewerAtt]  = useState<Attachment | null>(null)
  const [localAtts,  setLocalAtts]  = useState<Attachment[]>(item.attachments)
  const primary = localAtts[0]

  useEffect(() => { setLocalAtts(item.attachments) }, [item.id, item.attachments])

  function handleDeleteAtt(id: string) {
    setLocalAtts(prev => prev.filter(a => a.id !== id))
    onRefresh?.()
  }

  // Shared attachment list section
  function AttachmentList() {
    if (localAtts.length === 0) return null
    return (
      <div className="border-t border-slate-100 px-4 py-3 bg-white shrink-0">
        <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
          <Paperclip className="w-3 h-3" /> Anexos ({localAtts.length})
        </p>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {localAtts.map(a => (
            <AttachmentRow
              key={a.id}
              a={{ ...a, filePath: a.filePath.startsWith('/') ? a.filePath : `/${a.filePath}` }}
              itemId={item.id}
              onView={setViewerAtt}
              onDelete={id => handleDeleteAtt(id)}
            />
          ))}
        </div>
      </div>
    )
  }

  if (item.source === 'EMAIL' || (primary && /eml|msg/.test(primary.fileType))) {
    return (
      <>
        {viewerAtt && <AttachmentViewerModal attachment={viewerAtt} onClose={() => setViewerAtt(null)} />}
        <div className="flex flex-col h-full">
          <div className="border-b border-slate-200 p-4 bg-white shrink-0 space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">E-mail recebido</p>
            {item.subject && <p className="font-semibold text-slate-800 text-sm">{item.subject}</p>}
            {(item.senderName || item.senderEmail) && (
              <p className="text-xs text-slate-500"><span className="font-medium">De:</span> {item.senderName} {item.senderEmail ? `<${item.senderEmail}>` : ''}</p>
            )}
            <p className="text-xs text-slate-400"><span className="font-medium">Recebido:</span> {formatDate(item.createdAt)}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-white">
            {item.pastedContent
              ? <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{item.pastedContent}</pre>
              : <p className="text-slate-400 text-sm italic">Conteúdo não extraído. Veja o arquivo anexado.</p>}
          </div>
          <AttachmentList />
        </div>
      </>
    )
  }

  if (item.source === 'PASTE') {
    return (
      <>
        {viewerAtt && <AttachmentViewerModal attachment={viewerAtt} onClose={() => setViewerAtt(null)} />}
        <div className="flex flex-col h-full bg-white">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 shrink-0">
            <ClipboardPaste className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Texto colado</span>
            {localAtts.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                <Paperclip className="w-3 h-3" />{localAtts.length} anexo{localAtts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {item.pastedContent
              ? <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{item.pastedContent}</pre>
              : <p className="text-slate-400 text-sm italic">Nenhum texto colado.</p>}
          </div>
          <AttachmentList />
        </div>
      </>
    )
  }

  if (primary && isImage(primary.fileType)) {
    return (
      <>
        {viewerAtt && <AttachmentViewerModal attachment={viewerAtt} onClose={() => setViewerAtt(null)} />}
        <div className="flex flex-col h-full">
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 p-4 gap-3 overflow-hidden">
            <img src={primary.filePath} alt={primary.fileName}
              onClick={() => setViewerAtt(primary)}
              className="max-w-full max-h-full object-contain rounded-lg shadow-md cursor-zoom-in" />
            <p className="text-xs text-slate-400 shrink-0">{primary.fileName} · {fileSizeStr(primary.fileSize)}</p>
          </div>
          {localAtts.length > 1 && <AttachmentList />}
        </div>
      </>
    )
  }

  if (primary && isPDF(primary.fileType)) {
    return (
      <>
        {viewerAtt && <AttachmentViewerModal attachment={viewerAtt} onClose={() => setViewerAtt(null)} />}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0">
            <span className="text-xs font-medium text-slate-600">{primary.fileName}</span>
            <a href={primary.filePath} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Eye className="w-3 h-3" /> Abrir em nova aba
            </a>
          </div>
          <iframe src={primary.filePath} className="flex-1 border-0" title="PDF Preview" />
          {localAtts.length > 1 && <AttachmentList />}
        </div>
      </>
    )
  }

  if (primary) {
    return (
      <>
        {viewerAtt && <AttachmentViewerModal attachment={viewerAtt} onClose={() => setViewerAtt(null)} />}
        <div className="flex flex-col h-full bg-white">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-5xl">{fileEmoji(primary.fileType)}</div>
            <div>
              <p className="font-semibold text-slate-700">{primary.fileName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{fileSizeStr(primary.fileSize)}</p>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">Visualização não disponível para este formato.</p>
            <div className="flex gap-2">
              <a href={primary.filePath} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><Eye className="w-3.5 h-3.5" /> Abrir</Button>
              </a>
              <a href={primary.filePath} download={primary.fileName}>
                <Button size="sm"><Download className="w-3.5 h-3.5" /> Baixar</Button>
              </a>
            </div>
          </div>
          {localAtts.length > 1 && <AttachmentList />}
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 bg-white">
      <File className="w-16 h-16" />
      <p className="text-sm font-medium">Sem conteúdo para exibir</p>
    </div>
  )
}

// ─── ATTACHMENTS TAB ──────────────────────────────────────────────────────────

function AttachmentsTab({ item, onRefresh, onAnalyze }: {
  item: CentralItem
  onRefresh: () => void
  onAnalyze: (mode: string, message?: string) => void
}) {
  const [localAtts,   setLocalAtts]   = useState<Attachment[]>(item.attachments)
  const [uploading,   setUploading]   = useState(false)
  const [dragging,    setDragging]    = useState(false)
  const [viewerAtt,   setViewerAtt]   = useState<Attachment | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setLocalAtts(item.attachments) }, [item.id, item.attachments])

  async function uploadFiles(files: File[]) {
    setUploading(true)
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    await fetch(`/api/central/${item.id}/attachments`, { method: 'POST', body: fd })
    setUploading(false)
    onRefresh()
  }

  async function deleteAtt(id: string, name: string) {
    if (!confirm(`Remover "${name}"?`)) return
    await fetch(`/api/central/${item.id}/attachments/${id}`, { method: 'DELETE' })
    setLocalAtts(prev => prev.filter(a => a.id !== id))
    onRefresh()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  function handlePaste(e: React.ClipboardEvent) {
    const img = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))?.getAsFile()
    if (img) { e.preventDefault(); uploadFiles([img]) }
  }

  return (
    <>
      {viewerAtt && <AttachmentViewerModal attachment={viewerAtt} onClose={() => setViewerAtt(null)} />}
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-slate-100 shrink-0 flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-xs font-bold text-slate-700 flex-1">Anexos</p>
          {localAtts.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{localAtts.length}</span>
          )}
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2 py-1 transition-colors">
            <Plus className="w-3 h-3" /> Novo anexo
          </button>
          <input ref={fileRef} type="file" multiple className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.xml,.txt,.jpg,.jpeg,.png,.webp,.zip"
            onChange={e => uploadFiles(Array.from(e.target.files || []))} />
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onPaste={handlePaste}
          className={cn(
            'mx-3 mt-3 mb-1 border-2 border-dashed rounded-xl px-3 py-2.5 text-center text-xs transition-colors',
            dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50/50'
          )}>
          {uploading
            ? <div className="flex items-center justify-center gap-2 text-blue-600"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando…</div>
            : <span className="text-slate-400">Arraste arquivos aqui ou pressione <span className="text-blue-600 cursor-pointer" onClick={() => fileRef.current?.click()}>selecionar</span> · Ctrl+V para imagens</span>
          }
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {localAtts.length === 0 && !uploading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-2">
              <Paperclip className="w-8 h-8 text-slate-200" />
              <p className="text-xs text-slate-400 font-medium">Nenhum anexo</p>
              <p className="text-xs text-slate-300">Adicione arquivos usando o botão acima</p>
            </div>
          )}
          {localAtts.map(a => (
            <div key={a.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 group">
              <span className="text-base shrink-0">{fileEmoji(a.fileType)}</span>
              <div className="flex-1 min-w-0">
                <button onClick={() => setViewerAtt(a)} className="text-xs font-medium text-slate-700 hover:text-blue-600 truncate block w-full text-left transition-colors">
                  {a.fileName}
                </button>
                <p className="text-xs text-slate-400">{fileSizeStr(a.fileSize)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setViewerAtt(a)} className="p-1 text-slate-400 hover:text-blue-500 rounded" title="Visualizar">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <a href={a.filePath} download={a.fileName} className="p-1 text-slate-400 hover:text-slate-600 rounded" title="Baixar">
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button onClick={() => onAnalyze('analyze-attachments', `Analise especificamente o arquivo "${a.fileName}".`)}
                  className="p-1 text-slate-400 hover:text-violet-500 rounded" title="Analisar com IA">
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteAtt(a.id, a.fileName)} className="p-1 text-slate-200 hover:text-red-400 rounded" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        {localAtts.length > 0 && (
          <div className="border-t border-slate-100 px-3 py-2 shrink-0 space-y-1">
            <button onClick={() => onAnalyze('analyze-attachments')}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg px-3 py-2 transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Analisar todos os anexos com IA
            </button>
            {localAtts.length > 1 && (
              <button onClick={() => onAnalyze('analyze-attachments', `Compare todos os ${localAtts.length} anexos desta entrada: ${localAtts.map(a => a.fileName).join(', ')}. Identifique divergências, dados coincidentes e pontos de atenção.`)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 transition-colors">
                <AlertTriangle className="w-3.5 h-3.5" /> Comparar e encontrar divergências
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── DETAILS PANEL (direita) ──────────────────────────────────────────────────

function DetailsPanel({ item, onRefresh, onDelete, onCreateAction }: {
  item: CentralItem
  onRefresh: () => void
  onDelete: () => void
  onCreateAction: (a: { type: string; title: string; prefill?: string }) => void
}) {
  const [archiving, setArchiving] = useState(false)

  async function archive() {
    setArchiving(true)
    await fetch(`/api/central/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ARCHIVED' }),
    })
    setArchiving(false); onRefresh()
  }

  async function deleteItem() {
    if (!confirm('Remover esta entrada permanentemente?')) return
    await fetch(`/api/central/${item.id}`, { method: 'DELETE' })
    onDelete()
  }

  const PRIMARY_ACTIONS = [
    { type: 'TASK',       label: 'Tarefa',       icon: CheckSquare,  color: 'bg-blue-600    hover:bg-blue-700   text-white' },
    { type: 'PENDING',    label: 'Pendência',    icon: Clock,        color: 'bg-amber-500   hover:bg-amber-600  text-white' },
    { type: 'CONFERENCE', label: 'Conferência',  icon: Calendar,     color: 'bg-indigo-600  hover:bg-indigo-700 text-white' },
    { type: 'CONTRACT',   label: 'Contrato',     icon: FileText,     color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-100 shrink-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Converter em</p>
      </div>

      {/* Primary action buttons — compact */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {PRIMARY_ACTIONS.map(a => (
          <button
            key={a.type}
            onClick={() => onCreateAction({
              type:    a.type,
              title:   item.subject || item.title,
              prefill: item.summary || '',
            })}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-colors',
              a.color
            )}>
            <a.icon className="w-3.5 h-3.5 shrink-0" />
            {a.label}
          </button>
        ))}

        <div className="border-t border-slate-100 pt-1.5 space-y-0.5">
          <button
            onClick={archive}
            disabled={archiving}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-40">
            <Archive className="w-3.5 h-3.5 shrink-0" />
            Arquivar
          </button>
          <button
            onClick={deleteItem}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Excluir
          </button>
        </div>
      </div>

      {/* Footer — status strip */}
      <div className="border-t border-slate-100 px-3 py-2.5 shrink-0 space-y-1">
        <span className={cn('inline-flex text-xs border rounded-full px-2 py-0.5 font-medium leading-none', STATUS_COLOR[item.status])}>
          {STATUS_LABEL[item.status] || item.status}
        </span>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300">{formatRelativeTime(item.createdAt)}</span>
          {item.attachments?.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-slate-300">
              <Paperclip className="w-3 h-3" />{item.attachments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ITEM CARD ────────────────────────────────────────────────────────────────

function ItemCard({ item, selected, onClick }: { item: CentralItem; selected: boolean; onClick: () => void }) {
  const SrcIcon  = SRC_ICON[item.source] || Upload
  const isUrgent = item.priority === 'URGENTE'
  const isPending = item.status === 'PENDING'

  return (
    <button onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-3 border-b border-slate-100 transition-all relative',
        selected
          ? 'bg-blue-50 border-l-[3px] border-l-blue-600 pl-[9px]'
          : cn('border-l-[3px] hover:bg-slate-50', isUrgent ? 'border-l-red-400' : 'border-l-transparent')
      )}>
      <div className="flex items-start gap-2.5">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
          selected ? 'bg-blue-100' : isUrgent ? 'bg-red-100' :
          item.status === 'ANALYZED' || item.status === 'ACTIONED' ? 'bg-violet-100' : 'bg-slate-100')}>
          <SrcIcon className={cn('w-3.5 h-3.5',
            selected ? 'text-blue-600' : isUrgent ? 'text-red-500' :
            item.status === 'ANALYZED' || item.status === 'ACTIONED' ? 'text-violet-500' : 'text-slate-400')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold truncate', selected ? 'text-blue-800' : 'text-slate-800')}>
            {item.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {item.senderName && <span className="text-xs text-slate-400 truncate max-w-[110px]">{item.senderName}</span>}
            {item.category && <><span className="text-xs text-slate-200">·</span><span className="text-xs text-slate-400 truncate">{item.category}</span></>}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className={cn('text-xs border rounded-full px-1.5 leading-5', STATUS_COLOR[item.status])}>
              {isPending ? '⏳' : ''}{STATUS_LABEL[item.status]?.split(' ')[0] || item.status}
            </span>
            <div className="flex items-center gap-1.5">
              {item.attachments?.length > 0 && (
                <span className="text-xs text-slate-300 flex items-center gap-0.5">
                  <Paperclip className="w-3 h-3" />{item.attachments.length}
                </span>
              )}
              <span className="text-xs text-slate-300">{formatRelativeTime(item.createdAt)}</span>
            </div>
          </div>
        </div>
        {isUrgent && <Zap className="w-3 h-3 text-red-400 shrink-0 mt-1" />}
      </div>
    </button>
  )
}

// ─── FULL DETAIL VIEW ─────────────────────────────────────────────────────────

type DetailTab   = 'assistente' | 'conteudo' | 'acoes' | 'anexos'
type CenterTab   = 'conteudo' | 'anexos'

function DetailView({ itemId, onRefresh, onDelete }: {
  itemId: string; onRefresh: () => void; onDelete: () => void
}) {
  const [item,          setItem]          = useState<CentralItem | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [createAction,  setCreateAction]  = useState<{ type: string; title: string; prefill?: string } | null>(null)
  const [mobileTab,     setMobileTab]     = useState<DetailTab>('assistente')
  const [centerTab,     setCenterTab]     = useState<CenterTab>('conteudo')
  const [pendingAction, setPendingAction] = useState<{ mode?: string; message?: string } | null>(null)

  const load = useCallback(async () => {
    const res  = await fetch(`/api/central/${itemId}`)
    const data = await res.json()
    setItem(data)
    setLoading(false)
  }, [itemId])

  useEffect(() => { setLoading(true); load() }, [load])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
    </div>
  )
  if (!item) return null

  const refresh = () => { load(); onRefresh() }

  function triggerAnalysis(mode: string, message?: string) {
    setPendingAction({ mode, message })
    setMobileTab('assistente')
    // Desktop: chat panel receives the trigger via pendingAction prop
  }

  const attCount = item.attachments.length

  return (
    <>
      {/* ── Mobile — 4 tabs ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:hidden">
        <div className="flex border-b border-slate-200 shrink-0 bg-white">
          {([
            { id: 'assistente', label: 'IA',       icon: Bot },
            { id: 'conteudo',   label: 'Conteúdo', icon: FileText },
            { id: 'anexos',     label: 'Anexos',   icon: Paperclip },
            { id: 'acoes',      label: 'Ações',    icon: Zap },
          ] as { id: DetailTab; label: string; icon: typeof Bot }[]).map(t => (
            <button key={t.id} onClick={() => setMobileTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium border-b-2 transition-colors',
                mobileTab === t.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
              {t.id === 'anexos' && attCount > 0 && (
                <span className="ml-0.5 bg-blue-100 text-blue-600 rounded-full text-xs px-1 leading-4">{attCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'assistente' && (
            <AIChatPanel item={item} onRefresh={refresh} pendingAction={pendingAction} onPendingHandled={() => setPendingAction(null)} />
          )}
          {mobileTab === 'conteudo' && <ContentViewer item={item} onRefresh={refresh} />}
          {mobileTab === 'anexos'   && <AttachmentsTab item={item} onRefresh={refresh} onAnalyze={triggerAnalysis} />}
          {mobileTab === 'acoes'    && (
            <DetailsPanel item={item} onRefresh={refresh} onDelete={onDelete} onCreateAction={setCreateAction} />
          )}
        </div>
      </div>

      {/* ── Desktop — Assistente | [Conteúdo|Anexos tabs] | Ações ── */}
      <div className="flex-1 hidden lg:flex min-w-0 overflow-hidden">

        {/* Assistente — flex-1 */}
        <div className="flex-1 border-r border-slate-200 flex flex-col overflow-hidden min-w-0" style={{ minWidth: '300px' }}>
          <AIChatPanel
            item={item}
            onRefresh={refresh}
            pendingAction={pendingAction}
            onPendingHandled={() => setPendingAction(null)}
          />
        </div>

        {/* Center panel: Conteúdo | Anexos tabs — flex-1 */}
        <div className="flex-1 border-r border-slate-200 flex flex-col overflow-hidden min-w-0">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200 shrink-0 bg-white">
            {([
              { id: 'conteudo', label: 'Conteúdo', icon: FileText },
              { id: 'anexos',   label: 'Anexos',   icon: Paperclip },
            ] as { id: CenterTab; label: string; icon: typeof FileText }[]).map(t => (
              <button key={t.id} onClick={() => setCenterTab(t.id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors',
                  centerTab === t.id
                    ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
                {t.id === 'anexos' && attCount > 0 && (
                  <span className={cn(
                    'rounded-full text-xs px-1.5 leading-4 font-medium',
                    centerTab === 'anexos' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  )}>{attCount}</span>
                )}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {centerTab === 'conteudo' && <ContentViewer item={item} onRefresh={refresh} />}
            {centerTab === 'anexos'   && <AttachmentsTab item={item} onRefresh={refresh} onAnalyze={mode => { triggerAnalysis(mode); /* stay on center panel */ }} />}
          </div>
        </div>

        {/* Ações — 180px (compact, same as original) */}
        <div className="flex flex-col overflow-hidden shrink-0" style={{ width: '180px' }}>
          <DetailsPanel item={item} onRefresh={refresh} onDelete={onDelete} onCreateAction={setCreateAction} />
        </div>
      </div>

      {createAction && (
        <CreateActionModal
          item={item}
          suggestion={createAction}
          onClose={() => setCreateAction(null)}
          onCreated={() => { setCreateAction(null); load(); onRefresh() }}
        />
      )}
    </>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function InboxClient() {
  const [items,      setItems]      = useState<CentralItem[]>([])
  const [stats,      setStats]      = useState<Stats>({ total: 0, pending: 0, analyzed: 0, urgente: 0, actioned: 0, today: 0 })
  const [categories, setCategories] = useState<CatCount[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew,    setShowNew]    = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [search,     setSearch]     = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterStatus)   params.set('status',   filterStatus)
    if (filterCategory) params.set('category', filterCategory)
    if (search)         params.set('search',   search)
    const res  = await fetch(`/api/central?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setStats(data.stats || {})
    setCategories(data.categories || [])
    setLoading(false)
  }, [filterStatus, filterCategory, search])

  useEffect(() => { load() }, [load])

  function afterCreated(ids: string[]) {
    load()
    if (ids[0]) setSelectedId(ids[0])
    // NO auto-analysis — user decides when to ask the AI
  }

  const KPI = [
    { label: 'Total',            value: stats.total,    filter: '',         accent: 'text-slate-800' },
    { label: 'Hoje',             value: stats.today,    filter: '',         accent: 'text-blue-600' },
    { label: 'Aguardando IA',    value: stats.pending,  filter: 'PENDING',  accent: 'text-slate-500' },
    { label: 'Analisados',       value: stats.analyzed, filter: 'ANALYZED', accent: 'text-violet-600' },
    { label: 'Urgentes',         value: stats.urgente,  filter: '',         accent: 'text-red-600' },
    { label: 'Ações criadas',    value: stats.actioned, filter: 'ACTIONED', accent: 'text-green-600' },
  ]

  return (
    <>
      {showNew    && <NewItemModal   onClose={() => setShowNew(false)}    onCreated={afterCreated} />}
      {showConfig && <ConfigModal    onClose={() => setShowConfig(false)} />}

      <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Central Inteligente de Entrada</h1>
            <p className="text-xs text-slate-400">Converse com a IA sobre cada documento · análise somente quando solicitada</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100" title="Atualizar">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowConfig(true)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100" title="Configurações">
              <Settings className="w-4 h-4" />
            </button>
            <Button onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4" /> Nova Entrada
            </Button>
          </div>
        </div>

        {/* KPI bar */}
        <div className="grid grid-cols-6 gap-2 mb-3 shrink-0">
          {KPI.map(k => (
            <button key={k.label}
              onClick={() => k.filter && setFilterStatus(filterStatus === k.filter ? '' : k.filter)}
              className={cn('rounded-xl py-2 px-3 text-center border transition-all',
                k.filter && filterStatus === k.filter
                  ? 'bg-blue-50 border-blue-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm')}>
              <p className={cn('text-xl font-bold', k.accent)}>{k.value}</p>
              <p className="text-xs text-slate-400 leading-tight">{k.label}</p>
            </button>
          ))}
        </div>

        {/* Main layout */}
        <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white flex-1 min-h-0">

          {/* Entry list (260px fixed) */}
          <div className="flex flex-col border-r border-slate-200 shrink-0 overflow-hidden" style={{ width: '260px' }}>
            {/* Search */}
            <div className="p-2 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50" />
              </div>
            </div>

            {/* Quick filters */}
            <div className="px-2 py-1.5 border-b border-slate-100 flex gap-1 flex-wrap shrink-0">
              {[
                { label: 'Todas', value: '' },
                { label: 'Pendentes', value: 'PENDING' },
                { label: 'Analisadas', value: 'ANALYZED' },
              ].map(f => (
                <button key={f.value} onClick={() => setFilterStatus(filterStatus === f.value ? '' : f.value)}
                  className={cn('text-xs px-2 py-0.5 rounded-full border transition-colors',
                    filterStatus === f.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400')}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Category filters */}
            {categories.length > 0 && (
              <div className="px-2 py-1.5 border-b border-slate-100 shrink-0">
                {categories.slice(0, 6).map(c => (
                  <button key={c.name} onClick={() => setFilterCategory(filterCategory === c.name ? '' : c.name)}
                    className={cn('w-full flex items-center justify-between text-xs px-2 py-1 rounded-lg transition-colors',
                      filterCategory === c.name ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100')}>
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 ml-1 opacity-60">{c.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-2 space-y-1">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />)}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                  <Inbox className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs font-medium">Nenhuma entrada</p>
                  <button onClick={() => setShowNew(true)} className="mt-2 text-xs text-blue-600 hover:underline">+ Nova</button>
                </div>
              ) : (
                items.map(item => (
                  <ItemCard key={item.id} item={item} selected={selectedId === item.id} onClick={() => setSelectedId(item.id)} />
                ))
              )}
            </div>
          </div>

          {/* Detail view OR empty state */}
          {selectedId ? (
            <DetailView
              key={selectedId}
              itemId={selectedId}
              onRefresh={load}
              onDelete={() => { setSelectedId(null); load() }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-50 to-blue-50 border border-blue-100 flex items-center justify-center">
                <Bot className="w-10 h-10 text-blue-300" />
              </div>
              <div>
                <p className="font-semibold text-slate-600">Selecione uma entrada</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">O Assistente da Entrada estará disponível para conversar sobre cada documento</p>
              </div>
              <Button onClick={() => setShowNew(true)}>
                <Plus className="w-4 h-4" /> Nova Entrada
              </Button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
