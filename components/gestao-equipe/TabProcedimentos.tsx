"use client"

import {
  useState, useEffect, useCallback, useRef, DragEvent, ClipboardEvent,
} from "react"
import {
  ClipboardList, FileText, CheckSquare, Plus, ArrowLeft, Save,
  Sparkles, Loader2, Download, Trash2, Edit2, Eye, X, ZoomIn,
  GripVertical, AlertCircle, Check, Copy, Search, Filter,
  Image as ImageIcon, Upload
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { cn, formatDate } from "@/lib/utils"

// ─── TYPES ───────────────────────────────────────────────────────────────────

type DocType = 'POP' | 'IT' | 'CHECKLIST'

interface ProcedureStep {
  id: string; order: number; title: string; description: string | null
  imagePath: string | null; notes: string | null; attentionPoint: string | null
}
interface ChecklistItem {
  id: string; order: number; description: string; required: boolean; notes: string | null
}
interface ProcedureDoc {
  id: string; type: DocType; title: string; process: string | null
  department: string | null; responsible: string | null; objective: string | null
  application: string | null; systemsUsed: string | null; description: string | null
  responsibilities: string | null; attentionPoints: string | null; risks: string | null
  expectedResult: string | null; notes: string | null
  createdAt: string; updatedAt: string
  steps: ProcedureStep[]
  checklistItems: ChecklistItem[]
  _count?: { steps: number; checklistItems: number }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DocType, string> = { POP: 'POP', IT: 'Instrução de Trabalho', CHECKLIST: 'Checklist' }
const TYPE_COLORS: Record<DocType, string> = {
  POP:       'bg-blue-100 text-blue-700 border-blue-200',
  IT:        'bg-violet-100 text-violet-700 border-violet-200',
  CHECKLIST: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}
const TYPE_ICONS = {
  POP:       ClipboardList,
  IT:        FileText,
  CHECKLIST: CheckSquare,
}

const PROCESS_TYPES = [
  'Admissão', 'Férias', 'Rescisão', 'Folha de Pagamento', 'Encargos',
  'Benefícios', 'eSocial', 'FGTS', 'IRRF', 'DCTFWeb', 'Auditoria',
  'Fiscalização', 'Outros',
]

function renderAI(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
}

async function imageToBase64(path: string): Promise<string | null> {
  try {
    const res  = await fetch(path)
    const blob = await res.blob()
    return await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── SMALL UI PRIMITIVES ─────────────────────────────────────────────────────

function Field({ label, value, onChange, rows = 3, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void
  rows?: number; placeholder?: string
}) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>}
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y" />
    </div>
  )
}

function Input({ label, value, onChange, placeholder = '', list }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; list?: string[]
}) {
  const id = `input-${label.replace(/\s/g, '')}`
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>}
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} list={list ? id : undefined}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
      {list && (
        <datalist id={id}>{list.map(o => <option key={o} value={o} />)}</datalist>
      )}
    </div>
  )
}

function AIBlock({ content, aiPowered, onApply }: {
  content: string; aiPowered: boolean; onApply?: () => void
}) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(content)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {aiPowered
            ? <Sparkles className="w-4 h-4 text-violet-600" />
            : <AlertCircle className="w-4 h-4 text-amber-500" />}
          <span className="text-xs font-semibold text-violet-800">
            {aiPowered ? 'Resultado da IA' : 'Simulação (configure OPENAI_API_KEY)'}
          </span>
        </div>
        <div className="flex gap-2">
          {onApply && (
            <button onClick={onApply} className="text-xs bg-violet-600 text-white px-3 py-1 rounded-full hover:bg-violet-700">
              Aplicar ao documento
            </button>
          )}
          <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: renderAI(content) }} />
    </div>
  )
}

// ─── IMAGE PICKER (Paste / Drag / Click) ─────────────────────────────────────

function ImagePicker({ imageSrc, onChange, onRemove }: {
  imageSrc: string | null  // existing path OR base64 preview
  onChange: (base64: string) => void
  onRemove: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.match(/^image\/(png|jpg|jpeg|webp)$/)) { alert('Formato não suportado. Use PNG, JPG, JPEG ou WEBP.'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande. Limite: 5 MB.'); return }
    const b64 = await fileToBase64(file)
    onChange(b64)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onPaste(e: ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) { const file = item.getAsFile(); if (file) handleFile(file) }
  }

  if (imageSrc) {
    return (
      <div className="space-y-2">
        <div className="relative group inline-block">
          <img
            src={imageSrc}
            alt="Imagem do passo"
            className="max-h-48 max-w-full rounded-lg border border-slate-200 object-contain cursor-zoom-in"
            onClick={() => setLightbox(true)}
          />
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setLightbox(true)}
              className="bg-black/50 text-white rounded p-1 hover:bg-black/70">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRemove}
              className="bg-red-500/80 text-white rounded p-1 hover:bg-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {lightbox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setLightbox(false)}>
            <img src={imageSrc} alt="Ampliado" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
            <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      tabIndex={0}
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onPaste={onPaste}
      onClick={() => fileRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors select-none',
        dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      )}>
      <input ref={fileRef} type="file" className="hidden" accept="image/png,image/jpg,image/jpeg,image/webp"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
      <p className="text-xs text-slate-400">
        Clique, arraste ou <strong>Ctrl+V</strong> para colar imagem
      </p>
      <p className="text-xs text-slate-300 mt-0.5">PNG, JPG, WEBP • até 5 MB</p>
    </div>
  )
}

// ─── PDF EXPORT ──────────────────────────────────────────────────────────────

async function exportPDF(doc: ProcedureDoc) {
  // Collect all image paths
  const imagePaths: string[] = []
  if (doc.type === 'IT') {
    doc.steps.forEach(s => { if (s.imagePath) imagePaths.push(s.imagePath) })
  }

  // Convert images to base64
  const base64Map: Record<string, string> = {}
  await Promise.all(imagePaths.map(async p => {
    const b64 = await imageToBase64(p)
    if (b64) base64Map[p] = b64
  }))

  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const html = buildDocHTML(doc, base64Map, 'pdf', date)

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Popup bloqueado. Permita popups para este site.'); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => { try { win.print() } catch { /* */ } }, 500)
}

function exportWord(doc: ProcedureDoc) {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  // Word export uses server-stored paths directly — no base64 needed for .doc
  const bodyHTML = buildDocBody(doc, {}, 'word')
  const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
    xmlns:w='urn:schemas-microsoft-com:office:word'
    xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; }
    h1 { font-size: 16pt; border-bottom: 2pt solid #1e3a5f; padding-bottom: 6pt; }
    h2 { font-size: 12pt; color: #1e3a5f; border-left: 3pt solid #3b82f6; padding-left: 8pt; margin-top: 16pt; }
    h3 { font-size: 11pt; color: #1d4ed8; }
    p, li { line-height: 1.6; margin: 4pt 0; }
    .meta-table { border-collapse: collapse; width: 100%; margin: 8pt 0 16pt; }
    .meta-table td { padding: 4pt 8pt; border: 1pt solid #e2e8f0; font-size: 10pt; }
    .step-box { border: 1pt solid #e2e8f0; padding: 8pt; margin: 8pt 0; }
    .step-img { max-width: 500pt; max-height: 300pt; }
    .cl-item { margin: 4pt 0; }
    .attention { color: #b45309; }
    .footer { border-top: 1pt solid #e2e8f0; margin-top: 16pt; padding-top: 6pt; font-size: 8pt; color: #94a3b8; }
  </style></head>
  <body>${bodyHTML}<div class="footer">Gerado em ${date}</div></body></html>`

  const blob = new Blob(['﻿', wordHtml], { type: 'application/msword' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${doc.type}-${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.doc`
  a.click()
  URL.revokeObjectURL(url)
}

function buildDocBody(doc: ProcedureDoc, base64Map: Record<string, string>, format: 'pdf' | 'word'): string {
  const imgTag = (path: string) => {
    const src = base64Map[path] || (format === 'word' ? `http://localhost:3000${path}` : path)
    return `<img src="${src}" class="${format === 'pdf' ? 'step-image' : 'step-img'}" alt="Imagem do passo" />`
  }

  const section = (title: string, content: string | null) =>
    content ? `<h2>${title}</h2><p>${content.replace(/\n/g, '<br>')}</p>` : ''

  const metaRows = [
    ['Tipo', TYPE_LABELS[doc.type]],
    doc.process     ? ['Processo', doc.process]         : null,
    doc.department  ? ['Departamento', doc.department]  : null,
    doc.responsible ? ['Responsável', doc.responsible]  : null,
  ].filter(Boolean) as string[][]

  const meta = `<table class="meta-table">${metaRows.map(([k, v]) =>
    `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`).join('')}</table>`

  if (doc.type === 'POP') {
    return `
      ${meta}
      ${section('Objetivo',           doc.objective)}
      ${section('Aplicação',          doc.application)}
      ${section('Materiais / Sistemas Utilizados', doc.systemsUsed)}
      ${section('Descrição do Procedimento',       doc.description)}
      ${section('Responsabilidades',  doc.responsibilities)}
      ${section('Pontos de Atenção',  doc.attentionPoints)}
      ${section('Riscos e Controles', doc.risks)}
      ${section('Resultado Esperado', doc.expectedResult)}
      ${section('Observações',        doc.notes)}
    `
  }

  if (doc.type === 'IT') {
    const stepsHTML = doc.steps.map(s => `
      <div class="${format === 'pdf' ? 'step-box' : 'step-box'}">
        <h3>Passo ${s.order + 1} — ${s.title}</h3>
        ${s.description    ? `<p>${s.description.replace(/\n/g, '<br>')}</p>` : ''}
        ${s.imagePath      ? imgTag(s.imagePath) : ''}
        ${s.attentionPoint ? `<p class="attention">⚠️ ${s.attentionPoint}</p>` : ''}
        ${s.notes          ? `<p><em>Obs: ${s.notes}</em></p>` : ''}
      </div>`).join('')
    return `
      ${meta}
      ${section('Objetivo',          doc.objective)}
      ${section('Sistema Utilizado', doc.systemsUsed)}
      <h2>Passo a Passo</h2>
      ${stepsHTML || '<p>Nenhum passo cadastrado.</p>'}
      ${section('Resultado Esperado', doc.expectedResult)}
      ${section('Observações',        doc.notes)}
    `
  }

  // CHECKLIST
  const itemsHTML = doc.checklistItems.map(c => `
    <div class="cl-item">
      <table style="border-collapse:collapse;width:100%;margin:2pt 0">
        <tr>
          <td style="width:18pt;border:1pt solid #cbd5e1;padding:3pt;text-align:center">☐</td>
          <td style="border:1pt solid #cbd5e1;padding:3pt">${c.description}</td>
          <td style="width:80pt;border:1pt solid #cbd5e1;padding:3pt;text-align:center;font-size:9pt;color:#64748b">${c.required ? 'Obrigatório' : 'Opcional'}</td>
          <td style="width:120pt;border:1pt solid #cbd5e1;padding:3pt;font-size:9pt;color:#64748b">${c.notes || ''}</td>
        </tr>
      </table>
    </div>`).join('')
  return `
    ${meta}
    ${section('Observações', doc.notes)}
    <h2>Itens de Conferência</h2>
    <table style="border-collapse:collapse;width:100%;margin-bottom:8pt">
      <tr style="background:#f8fafc">
        <th style="border:1pt solid #cbd5e1;padding:4pt;width:18pt">✓</th>
        <th style="border:1pt solid #cbd5e1;padding:4pt;text-align:left">Item</th>
        <th style="border:1pt solid #cbd5e1;padding:4pt;width:80pt">Tipo</th>
        <th style="border:1pt solid #cbd5e1;padding:4pt;width:120pt;text-align:left">Observação</th>
      </tr>
    </table>
    ${itemsHTML || '<p>Nenhum item cadastrado.</p>'}
  `
}

function buildDocHTML(doc: ProcedureDoc, base64Map: Record<string, string>, format: 'pdf' | 'word', date: string): string {
  const body = buildDocBody(doc, base64Map, format)
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>${TYPE_LABELS[doc.type]} — ${doc.title}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9.5pt; color: #1e293b; padding: 14mm 16mm; }
  h1 { font-size: 16pt; color: #0f172a; border-bottom: 2pt solid #1e3a5f; padding-bottom: 6pt; margin-bottom: 10pt; }
  h2 { font-size: 11pt; color: #1e3a5f; margin: 14pt 0 4pt; border-left: 3pt solid #3b82f6; padding-left: 8pt; break-after: avoid; }
  h3 { font-size: 10pt; color: #1d4ed8; margin: 8pt 0 4pt; break-after: avoid; }
  p { margin-bottom: 4pt; line-height: 1.5; }
  .meta-table { border-collapse: collapse; width: 100%; margin: 6pt 0 14pt; }
  .meta-table td { padding: 4pt 8pt; border: 1pt solid #e2e8f0; font-size: 8.5pt; }
  .step-box { border: 1pt solid #e2e8f0; border-radius: 4pt; padding: 8pt; margin: 6pt 0; break-inside: avoid; }
  .step-image { max-width: 100%; max-height: 300pt; object-fit: contain; display: block; margin: 6pt 0; break-inside: avoid; }
  .cl-item { break-inside: avoid; }
  .attention { color: #b45309; font-size: 8.5pt; margin-top: 4pt; }
  .badge { display: inline-block; background: #eff6ff; border: 1pt solid #bfdbfe; border-radius: 99pt; padding: 1pt 8pt; font-size: 7.5pt; color: #1d4ed8; margin-left: 8pt; }
  .footer { border-top: 1pt solid #e2e8f0; margin-top: 14pt; padding-top: 6pt; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
</style></head><body>
<h1>${doc.title} <span class="badge">${TYPE_LABELS[doc.type]}</span></h1>
${body}
<div class="footer"><span>Gerado em ${date}</span><span>Criado: ${formatDate(doc.createdAt)} · Atualizado: ${formatDate(doc.updatedAt)}</span></div>
</body></html>`
}

// ─── POP FORM ────────────────────────────────────────────────────────────────

function POPForm({ doc, onSaved }: { doc: ProcedureDoc; onSaved: () => void }) {
  const [form, setForm] = useState({
    title:           doc.title           ?? '',
    process:         doc.process         ?? '',
    department:      doc.department      ?? '',
    responsible:     doc.responsible     ?? '',
    objective:       doc.objective       ?? '',
    application:     doc.application     ?? '',
    systemsUsed:     doc.systemsUsed     ?? '',
    description:     doc.description     ?? '',
    responsibilities:doc.responsibilities?? '',
    attentionPoints: doc.attentionPoints ?? '',
    risks:           doc.risks           ?? '',
    expectedResult:  doc.expectedResult  ?? '',
    notes:           doc.notes           ?? '',
  })
  const [saving,    setSaving]    = useState(false)
  const [aiResult,  setAiResult]  = useState<{ content: string; aiPowered: boolean } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMode,    setAiMode]    = useState('')

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    setSaving(true)
    await fetch(`/api/procedures/${doc.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setSaving(false)
    onSaved()
  }

  async function runAI(mode: string) {
    setAiLoading(true); setAiMode(mode); setAiResult(null)
    const res  = await fetch(`/api/procedures/${doc.id}/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, content: form.description }),
    })
    setAiResult(await res.json())
    setAiLoading(false)
  }

  // Apply AI result to relevant fields based on mode
  function applyAI() {
    if (!aiResult) return
    if (aiMode === 'generate-pop') {
      // Parse sections from AI text
      const c = aiResult.content
      const extract = (label: string) => {
        const rx = new RegExp(`\\*{0,2}${label}\\*{0,2}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\*{0,2}[A-ZÇÃÕÊ]{3,}\\*{0,2}[\\s\\S]*?\\n|$)`, 'i')
        return c.match(rx)?.[1]?.trim() ?? ''
      }
      setForm(p => ({
        ...p,
        objective:       extract('OBJETIVO')             || p.objective,
        application:     extract('APLICAÇÃO')            || p.application,
        description:     extract('DESCRIÇÃO DO PROCEDIMENTO') || p.description,
        responsibilities:extract('RESPONSABILIDADES')    || p.responsibilities,
        attentionPoints: extract('PONTOS DE ATENÇÃO')    || p.attentionPoints,
        risks:           extract('RISCOS')               || p.risks,
        expectedResult:  extract('RESULTADO ESPERADO')   || p.expectedResult,
      }))
    } else if (aiMode === 'attention-points') {
      setForm(p => ({ ...p, attentionPoints: aiResult.content }))
    } else if (aiMode === 'risks') {
      setForm(p => ({ ...p, risks: aiResult.content }))
    }
    setAiResult(null)
  }

  const aiButtons = [
    { mode: 'generate-pop',    label: 'Gerar POP com IA',            icon: Sparkles },
    { mode: 'improve-pop',     label: 'Melhorar texto',              icon: Sparkles },
    { mode: 'attention-points',label: 'Gerar Pontos de Atenção',     icon: AlertCircle },
    { mode: 'risks',           label: 'Gerar Riscos e Controles',    icon: AlertCircle },
  ]

  return (
    <div className="space-y-5">
      {/* AI toolbar */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Assistente de IA</p>
          <div className="flex flex-wrap gap-2">
            {aiButtons.map(b => (
              <Button key={b.mode} size="sm" variant="outline"
                onClick={() => runAI(b.mode)} disabled={aiLoading}
                className="border-violet-200 text-violet-700 hover:bg-violet-50">
                {aiLoading && aiMode === b.mode
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <b.icon className="w-3.5 h-3.5" />}
                {b.label}
              </Button>
            ))}
          </div>
          {aiResult && (
            <div className="mt-3">
              <AIBlock content={aiResult.content} aiPowered={aiResult.aiPowered} onApply={applyAI} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info básica */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Informações Básicas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Título do POP *" value={form.title} onChange={v => set('title', v)} />
            <Input label="Processo" value={form.process} onChange={v => set('process', v)} list={PROCESS_TYPES} />
            <Input label="Departamento" value={form.department} onChange={v => set('department', v)} />
            <Input label="Responsável" value={form.responsible} onChange={v => set('responsible', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      {([
        ['objective',        'Objetivo',                    3],
        ['application',      'Aplicação',                   2],
        ['systemsUsed',      'Materiais / Sistemas Utilizados', 2],
        ['description',      'Descrição do Procedimento (passo a passo)', 6],
        ['responsibilities', 'Responsabilidades',            3],
        ['attentionPoints',  'Pontos de Atenção',            3],
        ['risks',            'Riscos e Controles',           3],
        ['expectedResult',   'Resultado Esperado',           2],
        ['notes',            'Observações',                  2],
      ] as [keyof typeof form, string, number][]).map(([k, label, rows]) => (
        <Card key={k}>
          <CardHeader className="pb-1"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
          <CardContent>
            <Field label="" value={form[k]} onChange={v => set(k, v)} rows={rows}
              placeholder={`Digite ${label.toLowerCase()}...`} />
          </CardContent>
        </Card>
      ))}

      {/* Save */}
      <div className="flex gap-2 pb-4">
        <Button onClick={save} disabled={saving || !form.title.trim()}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar POP
        </Button>
        <Button variant="outline" onClick={() => exportPDF({ ...doc, ...form } as unknown as ProcedureDoc)}>
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
        <Button variant="outline" onClick={() => exportWord({ ...doc, ...form } as unknown as ProcedureDoc)}>
          <Download className="w-3.5 h-3.5" /> Word
        </Button>
      </div>
    </div>
  )
}

// ─── IT FORM ─────────────────────────────────────────────────────────────────

interface LocalStep {
  id?: string
  order: number
  title: string
  description: string
  imagePath: string | null    // server path (already saved)
  imageBase64: string | null  // new image selected, not yet saved
  notes: string
  attentionPoint: string
  _editing?: boolean
}

function ITForm({ doc, onSaved }: { doc: ProcedureDoc; onSaved: () => void }) {
  const [form, setForm] = useState({
    title:         doc.title         ?? '',
    process:       doc.process       ?? '',
    department:    doc.department    ?? '',
    responsible:   doc.responsible   ?? '',
    objective:     doc.objective     ?? '',
    systemsUsed:   doc.systemsUsed   ?? '',
    expectedResult:doc.expectedResult?? '',
    notes:         doc.notes         ?? '',
  })
  const [steps, setSteps] = useState<LocalStep[]>(
    doc.steps.map(s => ({
      id: s.id, order: s.order, title: s.title,
      description: s.description ?? '', imagePath: s.imagePath,
      imageBase64: null, notes: s.notes ?? '', attentionPoint: s.attentionPoint ?? '',
    }))
  )
  const [saving,    setSaving]    = useState(false)
  const [aiResult,  setAiResult]  = useState<{ content: string; aiPowered: boolean } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMode,    setAiMode]    = useState('')

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })) }
  function setStep(i: number, k: keyof LocalStep, v: unknown) {
    setSteps(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s))
  }

  function addStep() {
    setSteps(p => [...p, {
      order: p.length, title: `Passo ${p.length + 1}`, description: '',
      imagePath: null, imageBase64: null, notes: '', attentionPoint: '', _editing: true,
    }])
  }

  function removeStep(i: number) {
    setSteps(p => p.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx })))
  }

  async function save() {
    setSaving(true)
    // Save doc header
    await fetch(`/api/procedures/${doc.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    // Delete all existing steps and recreate (simplest approach for ordering)
    for (const s of doc.steps) {
      await fetch(`/api/procedures/${doc.id}/steps/${s.id}`, { method: 'DELETE' })
    }
    for (const s of steps) {
      await fetch(`/api/procedures/${doc.id}/steps`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order:          s.order,
          title:          s.title,
          description:    s.description || null,
          notes:          s.notes       || null,
          attentionPoint: s.attentionPoint || null,
          imageBase64:    s.imageBase64 || undefined,
          // Keep existing imagePath if no new image selected
          imagePath:      s.imageBase64 ? undefined : (s.imagePath || null),
        }),
      })
    }
    setSaving(false)
    onSaved()
  }

  async function runAI(mode: string) {
    // Save current description to doc first so AI can read it
    await fetch(`/api/procedures/${doc.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n') }),
    })
    setAiLoading(true); setAiMode(mode); setAiResult(null)
    const res = await fetch(`/api/procedures/${doc.id}/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, content: form.objective || form.title }),
    })
    setAiResult(await res.json())
    setAiLoading(false)
  }

  function applySteps() {
    if (!aiResult) return
    // Parse numbered steps from AI result
    const lines = aiResult.content.split('\n')
    const parsed: LocalStep[] = []
    let current: LocalStep | null = null
    lines.forEach(line => {
      const stepMatch = line.match(/^\*{0,2}(?:Passo\s+)?(\d+)[.\-—]\s*\*{0,2}(.+)/)
      if (stepMatch) {
        if (current) parsed.push(current)
        current = {
          order: parsed.length, title: stepMatch[2].replace(/\*\*/g, '').trim(),
          description: '', imagePath: null, imageBase64: null, notes: '', attentionPoint: '', _editing: false,
        }
      } else if (current) {
        const attn = line.match(/⚠️\s*(.+)/)
        if (attn) current.attentionPoint = attn[1].trim()
        else if (line.trim()) current.description += (current.description ? '\n' : '') + line.trim()
      }
    })
    if (current) parsed.push(current)
    if (parsed.length > 0) setSteps(parsed)
    setAiResult(null)
  }

  // Build preview doc for export
  const previewDoc: ProcedureDoc = {
    ...doc, ...form,
    steps: steps.map(s => ({
      id: s.id || '', order: s.order, title: s.title,
      description: s.description || null,
      imagePath: s.imagePath,
      notes: s.notes || null, attentionPoint: s.attentionPoint || null,
    })),
    checklistItems: [],
  }

  return (
    <div className="space-y-5">
      {/* AI toolbar */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Assistente de IA</p>
          <div className="flex flex-wrap gap-2">
            {[
              { mode: 'generate-steps', label: 'Gerar passos com IA' },
              { mode: 'improve-steps',  label: 'Melhorar passos' },
              { mode: 'attention-points', label: 'Pontos de atenção' },
            ].map(b => (
              <Button key={b.mode} size="sm" variant="outline"
                onClick={() => runAI(b.mode)} disabled={aiLoading}
                className="border-violet-200 text-violet-700 hover:bg-violet-50">
                {aiLoading && aiMode === b.mode
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Sparkles className="w-3.5 h-3.5" />}
                {b.label}
              </Button>
            ))}
          </div>
          {aiResult && (
            <div className="mt-3">
              <AIBlock content={aiResult.content} aiPowered={aiResult.aiPowered}
                onApply={aiMode === 'generate-steps' || aiMode === 'improve-steps' ? applySteps : undefined} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info básica */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Informações Básicas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Título da IT *" value={form.title} onChange={v => set('title', v)} />
            <Input label="Processo" value={form.process} onChange={v => set('process', v)} list={PROCESS_TYPES} />
            <Input label="Departamento" value={form.department} onChange={v => set('department', v)} />
            <Input label="Responsável" value={form.responsible} onChange={v => set('responsible', v)} />
            <Input label="Sistema Utilizado" value={form.systemsUsed} onChange={v => set('systemsUsed', v)} />
            <Input label="Resultado Esperado" value={form.expectedResult} onChange={v => set('expectedResult', v)} />
          </div>
          <Field label="Objetivo" value={form.objective} onChange={v => set('objective', v)} rows={2} />
          <Field label="Observações" value={form.notes} onChange={v => set('notes', v)} rows={2} />
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Passos ({steps.length})</CardTitle>
            <Button size="sm" onClick={addStep}>
              <Plus className="w-3.5 h-3.5" /> Adicionar Passo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum passo ainda. Use o botão acima ou a IA para gerar.</p>
            </div>
          ) : steps.map((step, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={step.title}
                    onChange={e => setStep(i, 'title', e.target.value)}
                    className="bg-transparent font-medium text-sm text-slate-700 outline-none flex-1 min-w-0"
                    placeholder="Título do passo..."
                  />
                </div>
                <button onClick={() => removeStep(i)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <Field label="Descrição" value={step.description}
                  onChange={v => setStep(i, 'description', v)} rows={3}
                  placeholder="Descreva o que deve ser feito neste passo..." />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Ponto de Atenção" value={step.attentionPoint}
                    onChange={v => setStep(i, 'attentionPoint', v)} rows={2}
                    placeholder="O que o usuário precisa observar..." />
                  <Field label="Observação" value={step.notes}
                    onChange={v => setStep(i, 'notes', v)} rows={2} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Imagem (opcional)</label>
                  <ImagePicker
                    imageSrc={step.imageBase64 || step.imagePath}
                    onChange={b64 => setStep(i, 'imageBase64', b64)}
                    onRemove={() => { setStep(i, 'imageBase64', null); setStep(i, 'imagePath', null) }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2 pb-4">
        <Button onClick={save} disabled={saving || !form.title.trim()}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar IT
        </Button>
        <Button variant="outline" onClick={() => exportPDF(previewDoc)}>
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
        <Button variant="outline" onClick={() => exportWord(previewDoc)}>
          <Download className="w-3.5 h-3.5" /> Word
        </Button>
      </div>
    </div>
  )
}

// ─── CHECKLIST FORM ───────────────────────────────────────────────────────────

interface LocalItem {
  id?: string; description: string; required: boolean; notes: string
}

function ChecklistForm({ doc, onSaved }: { doc: ProcedureDoc; onSaved: () => void }) {
  const [form, setForm] = useState({
    title:       doc.title       ?? '',
    process:     doc.process     ?? '',
    department:  doc.department  ?? '',
    responsible: doc.responsible ?? '',
    notes:       doc.notes       ?? '',
  })
  const [items, setItems] = useState<LocalItem[]>(
    doc.checklistItems.map(c => ({ id: c.id, description: c.description, required: c.required, notes: c.notes ?? '' }))
  )
  const [saving,    setSaving]    = useState(false)
  const [aiResult,  setAiResult]  = useState<{ content: string; aiPowered: boolean } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMode,    setAiMode]    = useState('')
  const [newItem,   setNewItem]   = useState('')

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })) }
  function setItem(i: number, k: keyof LocalItem, v: unknown) {
    setItems(p => p.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  }
  function addItem() {
    if (!newItem.trim()) return
    setItems(p => [...p, { description: newItem.trim(), required: true, notes: '' }])
    setNewItem('')
  }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)) }

  async function save() {
    setSaving(true)
    await fetch(`/api/procedures/${doc.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    await fetch(`/api/procedures/${doc.id}/checklist`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    setSaving(false)
    onSaved()
  }

  async function runAI(mode: string) {
    setAiLoading(true); setAiMode(mode); setAiResult(null)
    const res = await fetch(`/api/procedures/${doc.id}/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, processType: form.process || form.title }),
    })
    setAiResult(await res.json())
    setAiLoading(false)
  }

  function applyChecklist() {
    if (!aiResult) return
    const lines = aiResult.content.split('\n')
    const parsed: LocalItem[] = []
    lines.forEach(line => {
      const m = line.match(/☐\s+(.+?)(?:\s*\|\s*Obrigatório:\s*(Sim|Não))?$/)
      if (m) {
        parsed.push({ description: m[1].trim(), required: m[2] !== 'Não', notes: '' })
      }
    })
    if (parsed.length > 0) setItems(parsed)
    setAiResult(null)
  }

  const previewDoc: ProcedureDoc = {
    ...doc, ...form, steps: [],
    checklistItems: items.map((c, i) => ({ id: c.id || '', order: i, description: c.description, required: c.required, notes: c.notes || null })),
  }

  return (
    <div className="space-y-5">
      {/* AI toolbar */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Assistente de IA</p>
          <div className="flex flex-wrap gap-2">
            {[
              { mode: 'generate-checklist', label: 'Gerar Checklist com IA' },
              { mode: 'improve-checklist',  label: 'Melhorar Checklist' },
              { mode: 'it-to-checklist',    label: 'A partir de IT' },
            ].map(b => (
              <Button key={b.mode} size="sm" variant="outline"
                onClick={() => runAI(b.mode)} disabled={aiLoading}
                className="border-violet-200 text-violet-700 hover:bg-violet-50">
                {aiLoading && aiMode === b.mode
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Sparkles className="w-3.5 h-3.5" />}
                {b.label}
              </Button>
            ))}
          </div>
          {aiResult && (
            <div className="mt-3">
              <AIBlock content={aiResult.content} aiPowered={aiResult.aiPowered} onApply={applyChecklist} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Informações Básicas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Título *" value={form.title} onChange={v => set('title', v)} />
            <Input label="Processo" value={form.process} onChange={v => set('process', v)} list={PROCESS_TYPES} />
            <Input label="Departamento" value={form.department} onChange={v => set('department', v)} />
            <Input label="Responsável" value={form.responsible} onChange={v => set('responsible', v)} />
          </div>
          <Field label="Observações" value={form.notes} onChange={v => set('notes', v)} rows={2} />
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Itens de Conferência ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add item */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Novo item... (Enter para adicionar)"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            <Button size="sm" onClick={addItem} disabled={!newItem.trim()}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum item. Adicione acima ou use a IA para gerar.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 group border border-slate-100 rounded-lg px-3 py-2 hover:bg-slate-50">
                  <span className="text-slate-300 mt-0.5 text-sm shrink-0">{i + 1}.</span>
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => setItem(i, 'description', e.target.value)}
                    className="flex-1 text-sm bg-transparent outline-none text-slate-700 min-w-0"
                    placeholder="Descrição do item..."
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={item.required}
                        onChange={e => setItem(i, 'required', e.target.checked)}
                        className="rounded" />
                      Obrigatório
                    </label>
                    <button onClick={() => removeItem(i)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 pb-4">
        <Button onClick={save} disabled={saving || !form.title.trim()}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar Checklist
        </Button>
        <Button variant="outline" onClick={() => exportPDF(previewDoc)}>
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
        <Button variant="outline" onClick={() => exportWord(previewDoc)}>
          <Download className="w-3.5 h-3.5" /> Word
        </Button>
      </div>
    </div>
  )
}

// ─── DETAIL VIEW ─────────────────────────────────────────────────────────────

function DocDetail({ docId, onBack }: { docId: string; onBack: () => void }) {
  const [doc,     setDoc]     = useState<ProcedureDoc | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch(`/api/procedures/${docId}`)
    setDoc(await res.json())
    setLoading(false)
  }, [docId])

  useEffect(() => { load() }, [load])

  if (loading || !doc) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
    </div>
  )

  const Icon = TYPE_ICONS[doc.type]

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-1">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <Icon className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">{doc.title}</h2>
            <span className={cn('text-xs border rounded-full px-2.5 py-0.5 font-semibold', TYPE_COLORS[doc.type])}>
              {TYPE_LABELS[doc.type]}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPDF(doc)}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportWord(doc)}>
            <Download className="w-3.5 h-3.5" /> Word
          </Button>
        </div>
      </div>

      {/* Editor by type */}
      {doc.type === 'POP'       && <POPForm       doc={doc} onSaved={() => { load(); onBack() }} />}
      {doc.type === 'IT'        && <ITForm         doc={doc} onSaved={() => { load(); onBack() }} />}
      {doc.type === 'CHECKLIST' && <ChecklistForm  doc={doc} onSaved={() => { load(); onBack() }} />}
    </div>
  )
}

// ─── MAIN LIST ────────────────────────────────────────────────────────────────

export function TabProcedimentos() {
  const [docs,     setDocs]     = useState<ProcedureDoc[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState<DocType | null>(null)

  // Filters
  const [search,      setSearch]      = useState('')
  const [filterType,  setFilterType]  = useState<DocType | ''>('')
  const [filterProc,  setFilterProc]  = useState('')
  const [filterDept,  setFilterDept]  = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterDept) params.set('department', filterDept)
    if (search)     params.set('search', search)
    const res = await fetch(`/api/procedures?${params}`)
    setDocs(await res.json())
    setLoading(false)
  }, [filterType, filterDept, search])

  useEffect(() => { load() }, [load])

  async function createDoc(type: DocType) {
    setCreating(null)
    const res = await fetch('/api/procedures', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title: `Novo ${TYPE_LABELS[type]}` }),
    })
    const doc = await res.json()
    await load()
    setSelected(doc.id)
  }

  async function deleteDoc(id: string) {
    if (!confirm('Remover este documento?')) return
    await fetch(`/api/procedures/${id}`, { method: 'DELETE' })
    await load()
  }

  if (selected) {
    return <DocDetail docId={selected} onBack={() => { setSelected(null); load() }} />
  }

  const filtered = docs.filter(d =>
    (!filterProc || d.process?.toLowerCase().includes(filterProc.toLowerCase())) &&
    (!search     || d.title.toLowerCase().includes(search.toLowerCase()) ||
                    d.process?.toLowerCase().includes(search.toLowerCase()) ||
                    d.description?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Criar novo */}
      {!creating ? (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Criar novo documento</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([
              { type: 'POP'      as DocType, desc: 'Procedimento Operacional Padrão — documente processos com objetivo, riscos e passo a passo.' },
              { type: 'IT'       as DocType, desc: 'Instrução de Trabalho — passo a passo com imagens de tela para orientar a execução.' },
              { type: 'CHECKLIST'as DocType, desc: 'Checklist — lista de conferência para garantir que nenhum item foi esquecido.' },
            ] as { type: DocType; desc: string }[]).map(({ type, desc }) => {
              const Icon = TYPE_ICONS[type]
              return (
                <button
                  key={type}
                  onClick={() => createDoc(type)}
                  className="group text-left border-2 border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all bg-white"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3',
                    type === 'POP' ? 'bg-blue-100' : type === 'IT' ? 'bg-violet-100' : 'bg-emerald-100')}>
                    <Icon className={cn('w-5 h-5',
                      type === 'POP' ? 'text-blue-600' : type === 'IT' ? 'text-violet-600' : 'text-emerald-600')} />
                  </div>
                  <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                    {TYPE_LABELS[type]}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Filters + search */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Buscar por título, processo..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as DocType | '')}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
          <option value="">Todos os tipos</option>
          <option value="POP">POP</option>
          <option value="IT">Instrução de Trabalho</option>
          <option value="CHECKLIST">Checklist</option>
        </select>
        <input type="text" placeholder="Filtrar por processo..." value={filterProc}
          onChange={e => setFilterProc(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-44" />
        <input type="text" placeholder="Departamento..." value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-36" />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search || filterType || filterProc ? 'Nenhum documento encontrado' : 'Nenhum documento criado ainda'}</p>
          <p className="text-sm mt-1">Use os cards acima para criar seu primeiro documento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const Icon = TYPE_ICONS[doc.type]
            return (
              <div key={doc.id}
                className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-start justify-between gap-3 hover:shadow-md hover:border-slate-300 transition-all group">
                <button className="flex items-start gap-3 flex-1 text-left min-w-0" onClick={() => setSelected(doc.id)}>
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    doc.type === 'POP' ? 'bg-blue-100' : doc.type === 'IT' ? 'bg-violet-100' : 'bg-emerald-100')}>
                    <Icon className={cn('w-4 h-4',
                      doc.type === 'POP' ? 'text-blue-600' : doc.type === 'IT' ? 'text-violet-600' : 'text-emerald-600')} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                        {doc.title}
                      </p>
                      <span className={cn('text-xs border rounded-full px-2 py-0.5 font-medium shrink-0', TYPE_COLORS[doc.type])}>
                        {TYPE_LABELS[doc.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                      {doc.process     && <span>{doc.process}</span>}
                      {doc.department  && <span>• {doc.department}</span>}
                      {doc.responsible && <span>• {doc.responsible}</span>}
                      {doc.type === 'IT'
                        ? <span>• {doc._count?.steps ?? 0} passo{(doc._count?.steps ?? 0) !== 1 ? 's' : ''}</span>
                        : doc.type === 'CHECKLIST'
                        ? <span>• {doc._count?.checklistItems ?? 0} ite{(doc._count?.checklistItems ?? 0) !== 1 ? 'ns' : 'm'}</span>
                        : null}
                      <span>• Atualizado {formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => exportPDF(doc)} title="PDF"
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setSelected(doc.id)} title="Editar"
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteDoc(doc.id)} title="Excluir"
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
