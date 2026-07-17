"use client"

import {
  useState, useEffect, useRef, useCallback,
} from "react"
import {
  PenLine, Search, Star, Archive, Trash2, Copy, FileDown,
  Plus, X, Check, Send, Sparkles, Tag, ChevronRight,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Quote, Code, Minus, Link as LinkIcon, CheckSquare as CheckSquareIcon,
  Table as TableIcon, Printer, Clock, Folder, RefreshCw,
  MoreHorizontal, Eye, ArrowUpLeft, Loader2, Bot, Heart,
  PanelLeft, PanelRight, History, ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn, formatDate, formatDateTime } from "@/lib/utils"

// ─── TIPOS ───────────────────────────────────────────────────────────────────

type NotePatch = {
  title?: string
  content?: string
  category?: string
  priority?: string
  status?: string
  isFavorite?: boolean
  observations?: string | null
  archivedAt?: string | null
  tags?: string[]
}


interface NoteTag        { id: string; name: string }
interface NoteAttachment { id: string; fileName: string; fileType: string; fileSize: number; filePath: string; createdAt: string }
interface NoteAiMessage  { id: string; noteId?: string; role: string; content: string; mode: string | null; createdAt: string }
interface NoteHistoryEntry { id: string; type: string; title: string; description: string | null; createdAt: string }

interface Note {
  id: string
  title: string
  content: string
  category: string
  priority: string
  status: string
  isFavorite: boolean
  observations: string | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  tags: NoteTag[]
  attachments: { id: string }[]
  aiMessages?: NoteAiMessage[]
  history?: NoteHistoryEntry[]
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Departamento Pessoal", "Reuniões", "Ideias", "Pendências",
  "Projetos", "Processos", "Treinamentos", "Jurisprudência",
  "Legislação", "Sistemas", "Pessoal", "Outros",
]

const PRIORITIES: Record<string, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente",
}
const PRIORITY_COLORS: Record<string, string> = {
  BAIXA:   "bg-green-50 text-green-700 border-green-200",
  MEDIA:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  ALTA:    "bg-orange-50 text-orange-700 border-orange-200",
  URGENTE: "bg-red-50 text-red-700 border-red-200",
}
const STATUSES: Record<string, string> = {
  RASCUNHO: "Rascunho", ATIVA: "Ativa", ARQUIVADA: "Arquivada",
}

const SPECIALIST_LIST = [
  "Departamento Pessoal",
  "Recursos Humanos",
  "Jurídico Trabalhista",
  "Jurídico Cível",
  "Administrativo",
  "Gestão Empresarial",
  "Financeiro",
  "Fiscal e Tributário",
  "Contabilidade",
  "Compras e Suprimentos",
  "Gestão de Contratos",
  "Compliance e Auditoria",
  "Controladoria",
  "Saúde e Segurança do Trabalho",
  "Medicina do Trabalho",
  "Tecnologia da Informação",
  "Gestão de Projetos",
  "Qualidade e ISO",
  "Licitações Públicas",
  "Gestão Pública",
  "LGPD e Privacidade",
  "Recursos Humanos",
  "Administrativo",
]

const SPECIALIST_PATTERNS: [RegExp, string][] = [
  [/cct\b|clt\b|fgts|esocial|férias|rescisão|admissão|holerite|folha.*pagamento|sindicato|convenção.*coletiva|aviso.*prévio|dissídio/i, "Departamento Pessoal"],
  [/nr-\d|ppra|pcmso|cipa|epi\b|acidente.*trabalho|saúde.*ocupacional|laudo.*médico|cat\b/i, "Saúde e Segurança do Trabalho"],
  [/processo.*trt|vara.*trabalho|reclamação.*trabalhista|audiência.*trabalhista/i, "Jurídico Trabalhista"],
  [/processo.*cível|vara.*cível|tjsp|tribunal.*justiça/i, "Jurídico Cível"],
  [/nf-e|nfse|ibs\b|cbs\b|sped|icms|iss\b|pis\b|cofins|nota.*fiscal|tributário/i, "Fiscal e Tributário"],
  [/contrato|aditivo.*contrato|fornecedor|prestador.*serviço|vigência.*contrato/i, "Gestão de Contratos"],
  [/balanço|demonstração.*resultado|dre\b|patrimônio.*líquido|plano.*contas|contabilidade/i, "Contabilidade"],
  [/lgpd|dados.*pessoais|tratamento.*dados|consentimento|privacidade/i, "LGPD e Privacidade"],
  [/licitação|pregão|edital.*licitação|lei.*14133|lei.*8666/i, "Licitações Públicas"],
  [/compliance|auditoria|controle.*interno|segregação.*funções/i, "Compliance e Auditoria"],
  [/fluxo.*caixa|tesouraria|contas.*pagar|contas.*receber|orçamento.*empresa/i, "Financeiro"],
  [/cotação|pedido.*compra|requisição.*compra|sourcing/i, "Compras e Suprimentos"],
  [/recrutamento|seleção.*pessoal|treinamento|clima.*organizacional|avaliação.*desempenho/i, "Recursos Humanos"],
  [/iso\s*\d|norma.*qualidade|certificação|não.*conformidade/i, "Qualidade e ISO"],
  [/milestone|cronograma|gestão.*projeto|pmo\b|escopo.*projeto/i, "Gestão de Projetos"],
  [/controladoria|orçamento.*empresarial|kpi\b|budget\b/i, "Controladoria"],
]

function detectSpecialistLocal(text: string): string {
  const lower = text.toLowerCase()
  for (const [pattern, name] of SPECIALIST_PATTERNS) {
    if (pattern.test(lower)) return name
  }
  return "Administrativo"
}

const AI_QUICK_ACTIONS = [
  { mode: "analyze",          label: "Analisar anotação",           icon: "🔎", group: "análise" },
  { mode: "summarize",        label: "Resumir",                     icon: "📋", group: "análise" },
  { mode: "improve",          label: "Melhorar texto",              icon: "✨", group: "texto" },
  { mode: "rewrite",          label: "Reescrever profissionalmente", icon: "🖊️", group: "texto" },
  { mode: "grammar",          label: "Corrigir português",          icon: "📝", group: "texto" },
  { mode: "risks",            label: "Identificar riscos",          icon: "⚠️", group: "análise" },
  { mode: "pending",          label: "Identificar pendências",      icon: "⏳", group: "análise" },
  { mode: "responsible",      label: "Identificar responsáveis",    icon: "👤", group: "análise" },
  { mode: "action-plan",      label: "Criar plano de ação",         icon: "🎯", group: "criar" },
  { mode: "checklist",        label: "Criar checklist",             icon: "☑️", group: "criar" },
  { mode: "pop",              label: "Criar POP",                   icon: "📋", group: "criar" },
  { mode: "work-instruction", label: "Criar Instrução de Trabalho", icon: "📌", group: "criar" },
  { mode: "flow",             label: "Criar fluxo do processo",     icon: "🔄", group: "criar" },
  { mode: "schedule",         label: "Criar cronograma",            icon: "📅", group: "criar" },
  { mode: "presentation",     label: "Criar apresentação",          icon: "🖥️", group: "criar" },
  { mode: "email",            label: "Criar e-mail",                icon: "📧", group: "criar" },
  { mode: "report",           label: "Criar relatório",             icon: "📊", group: "criar" },
  { mode: "minutes",          label: "Criar ata",                   icon: "📄", group: "criar" },
  { mode: "contract",         label: "Criar contrato",              icon: "📜", group: "criar" },
  { mode: "training",         label: "Criar treinamento",           icon: "🎓", group: "criar" },
  { mode: "procedure",        label: "Converter em procedimento",   icon: "🏭", group: "criar" },
  { mode: "legislation",      label: "Verificar legislação",        icon: "⚖️", group: "análise" },
  { mode: "extract-tasks",    label: "Extrair tarefas",             icon: "🔍", group: "análise" },
  { mode: "organize",         label: "Organizar ideias",            icon: "🗂️", group: "texto" },
  { mode: "suggest-title",    label: "Sugerir título",              icon: "💡", group: "meta" },
  { mode: "suggest-tags",     label: "Sugerir tags",                icon: "🏷️", group: "meta" },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function excerpt(html: string, len = 110): string {
  const text = stripHtml(html)
  return text.length > len ? text.slice(0, len) + "…" : text
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isImageType(type: string) { return type.startsWith("image/") }

// ─── PDF BUILDER ─────────────────────────────────────────────────────────────

function buildNotePdf(note: Note, tags: NoteTag[], attachments: NoteAttachment[]): string {
  const emitDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  const tagsStr  = tags.map(t => t.name).join(", ") || "—"

  const attachList = attachments.length
    ? `<ul style="margin:0;padding-left:16pt">${attachments.map(a =>
        `<li style="margin-bottom:3pt">${a.fileName} <span style="color:#94a3b8">(${formatSize(a.fileSize)})</span></li>`
      ).join("")}</ul>`
    : "<p>Nenhum anexo.</p>"

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${note.title}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1e293b; padding: 14mm 18mm; background: #fff; }
  h1 { font-size: 18pt; font-weight: 700; color: #0f172a; margin-bottom: 4pt; }
  h2 { font-size: 11pt; font-weight: 700; color: #1e3a5f; margin: 14pt 0 5pt; }
  h3, h4, h5 { font-size: 10pt; font-weight: 700; color: #1e3a5f; margin: 10pt 0 4pt; }
  p { line-height: 1.5; margin-bottom: 6pt; }
  ul, ol { padding-left: 18pt; margin-bottom: 8pt; line-height: 1.5; }
  li { margin-bottom: 3pt; }
  blockquote { border-left: 3pt solid #94a3b8; padding-left: 10pt; color: #475569; margin: 8pt 0; font-style: italic; }
  pre, code { background: #f8fafc; border: 1pt solid #e2e8f0; border-radius: 4pt; font-family: monospace; font-size: 8.5pt; padding: 6pt; display: block; white-space: pre-wrap; margin-bottom: 6pt; }
  .header { border-bottom: 2pt solid #1e3a5f; padding-bottom: 8pt; margin-bottom: 12pt; }
  .meta { display: flex; gap: 12pt; flex-wrap: wrap; font-size: 8.5pt; color: #64748b; margin-top: 5pt; }
  .badge { display: inline-block; border-radius: 99pt; padding: 1pt 7pt; font-size: 8pt; font-weight: 600; border: 1pt solid; }
  .section { margin-bottom: 14pt; break-inside: avoid; }
  .tags { margin-top: 4pt; }
  .tag { display: inline-block; background: #eff6ff; color: #1e40af; border: 1pt solid #bfdbfe; border-radius: 99pt; padding: 1pt 7pt; font-size: 7.5pt; margin: 0 3pt 3pt 0; }
  .content-area { line-height: 1.6; }
  .footer { border-top: 1pt solid #e2e8f0; padding-top: 6pt; margin-top: 14pt; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
  img { max-width: 100%; height: auto; border-radius: 4pt; margin: 6pt 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; font-size: 9pt; }
  th { background: #1e3a5f; color: #fff; padding: 4pt 7pt; text-align: left; }
  td { padding: 4pt 7pt; border-bottom: 1pt solid #e2e8f0; }
  hr { border: none; border-top: 1pt solid #e2e8f0; margin: 10pt 0; }
  input[type=checkbox] { margin-right: 4pt; }
</style>
</head>
<body>

<div class="header">
  <h1>${note.title}</h1>
  <div class="meta">
    <span>Categoria: <strong>${note.category}</strong></span>
    <span>Prioridade: <strong>${PRIORITIES[note.priority] ?? note.priority}</strong></span>
    <span>Status: <strong>${STATUSES[note.status] ?? note.status}</strong></span>
    <span>Criada em: <strong>${formatDate(note.createdAt)}</strong></span>
    <span>Atualizada em: <strong>${formatDate(note.updatedAt)}</strong></span>
  </div>
  ${tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${t.name}</span>`).join("")}</div>` : ""}
</div>

<div class="section content-area">
  ${note.content || "<p><em>Sem conteúdo.</em></p>"}
</div>

${note.observations ? `<div class="section"><h2>Observações</h2><p>${note.observations}</p></div>` : ""}

${attachments.length ? `<div class="section"><h2>Anexos (${attachments.length})</h2>${attachList}</div>` : ""}

<div class="footer">
  <span>Exportado em ${emitDate}</span>
  <span>ID: ${note.id.slice(0, 8).toUpperCase()}</span>
</div>

</body>
</html>`
}

async function openNotePdf(note: Note, tags: NoteTag[], attachments: NoteAttachment[]) {
  const html = buildNotePdf(note, tags, attachments)
  const win  = window.open("", "_blank", "width=900,height=700,scrollbars=yes")
  if (!win) { alert("Popup bloqueado. Permita pop-ups para exportar o PDF."); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => { try { win.print() } catch { /* ignore */ } }, 500)
}

// ─── RICH TEXT TOOLBAR ───────────────────────────────────────────────────────

function execFmt(cmd: string, value?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(document as any).execCommand(cmd, false, value ?? null)
}

interface ToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>
  onLink: () => void
  onChecklist: () => void
  onTable: () => void
}

function EditorToolbar({ editorRef, onLink, onChecklist, onTable }: ToolbarProps) {
  const btn = (icon: React.ReactNode, title: string, action: () => void, active?: boolean) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); action() }}
      className={cn(
        "p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900",
        active && "bg-slate-200 text-slate-900"
      )}
    >
      {icon}
    </button>
  )

  const sep = <div className="w-px h-5 bg-slate-200 mx-0.5" />

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex-wrap">
      {btn(<Bold className="w-3.5 h-3.5" />, "Negrito (Ctrl+B)", () => execFmt("bold"))}
      {btn(<Italic className="w-3.5 h-3.5" />, "Itálico (Ctrl+I)", () => execFmt("italic"))}
      {btn(<UnderlineIcon className="w-3.5 h-3.5" />, "Sublinhado (Ctrl+U)", () => execFmt("underline"))}
      {sep}
      {btn(<span className="text-xs font-bold">H1</span>, "Título 1", () => execFmt("formatBlock", "h1"))}
      {btn(<span className="text-xs font-bold">H2</span>, "Título 2", () => execFmt("formatBlock", "h2"))}
      {btn(<span className="text-xs font-bold">H3</span>, "Título 3", () => execFmt("formatBlock", "h3"))}
      {sep}
      {btn(<List className="w-3.5 h-3.5" />, "Lista com marcadores", () => execFmt("insertUnorderedList"))}
      {btn(<ListOrdered className="w-3.5 h-3.5" />, "Lista numerada", () => execFmt("insertOrderedList"))}
      {btn(<CheckSquareIcon className="w-3.5 h-3.5" />, "Checklist", onChecklist)}
      {sep}
      {btn(<Quote className="w-3.5 h-3.5" />, "Citação", () => execFmt("formatBlock", "blockquote"))}
      {btn(<Code className="w-3.5 h-3.5" />, "Bloco de código", () => execFmt("formatBlock", "pre"))}
      {sep}
      {btn(<span className="text-[10px] font-bold px-0.5" style={{ background: "#fef08a", color: "#713f12", borderRadius: 2 }}>A</span>, "Destacar texto", () => execFmt("hiliteColor", "#fef08a"))}
      {btn(<LinkIcon className="w-3.5 h-3.5" />, "Inserir link", onLink)}
      {btn(<TableIcon className="w-3.5 h-3.5" />, "Inserir tabela", onTable)}
      {btn(<Minus className="w-3.5 h-3.5" />, "Separador", () => execFmt("insertHorizontalRule"))}
      {sep}
      {btn(<span className="text-[10px]">✕</span>, "Remover formatação", () => execFmt("removeFormat"))}
    </div>
  )
}

// ─── NOTE CARD ───────────────────────────────────────────────────────────────

function NoteCard({
  note, selected, onClick,
}: { note: Note; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors",
        selected && "bg-blue-50 border-l-2 border-l-blue-500"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className={cn("text-sm font-semibold leading-tight line-clamp-1 flex-1", selected ? "text-blue-700" : "text-slate-800")}>
          {note.title || "Sem título"}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {note.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
          {note.status === "RASCUNHO" && (
            <span className="text-[10px] text-slate-400 border border-slate-200 rounded px-1">Rascunho</span>
          )}
        </div>
      </div>
      {note.content && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">{excerpt(note.content)}</p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-400">{note.category}</span>
        {note.tags.slice(0, 3).map(t => (
          <span key={t.id} className="text-[10px] bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">{t.name}</span>
        ))}
        {note.tags.length > 3 && <span className="text-[10px] text-slate-400">+{note.tags.length - 3}</span>}
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5">{formatDate(note.updatedAt)}</p>
    </button>
  )
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export function NotesClient() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [notes,       setNotes]       = useState<Note[]>([])
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [filter,      setFilter]      = useState("all")
  const [catFilter,   setCatFilter]   = useState<string | null>(null)
  const [tagFilter,   setTagFilter]   = useState<string | null>(null)
  const [search,      setSearch]      = useState("")
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [savedAt,     setSavedAt]     = useState<Date | null>(null)

  // Editor local state
  const [localTitle,  setLocalTitle]  = useState("")
  const [localTags,   setLocalTags]   = useState("")      // comma-separated
  const [localCat,    setLocalCat]    = useState("Outros")
  const [localPri,    setLocalPri]    = useState("MEDIA")
  const [localStatus, setLocalStatus] = useState("ATIVA")
  const [localObs,    setLocalObs]    = useState("")

  // Attachments for selected note
  const [attachments, setAttachments] = useState<NoteAttachment[]>([])
  const [uploading,   setUploading]   = useState(false)

  // Right panel tab
  const [rightTab,    setRightTab]    = useState<"editor" | "ai" | "history">("editor")

  // AI chat
  const [aiMessages,      setAiMessages]      = useState<NoteAiMessage[]>([])
  const [aiInput,         setAiInput]         = useState("")
  const [aiLoading,       setAiLoading]       = useState(false)
  const [specialist,      setSpecialist]      = useState("Administrativo")
  const [showSpecChange,  setShowSpecChange]  = useState(false)

  // History
  const [noteHistory, setNoteHistory] = useState<NoteHistoryEntry[]>([])

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  // New note modal
  const [showModal,   setShowModal]   = useState(false)
  const [newTitle,    setNewTitle]    = useState("")
  const [newCat,      setNewCat]      = useState("Outros")

  // Mobile panel
  const [mobilePanel, setMobilePanel] = useState<"left" | "center" | "right">("center")

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Refs
  const editorRef     = useRef<HTMLDivElement>(null)
  const saveTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiEndRef      = useRef<HTMLDivElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)

  const selectedNote = notes.find(n => n.id === selectedId) ?? null

  // ── Load notes ─────────────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all" && filter !== "category" && filter !== "tag") params.set("filter", filter)
      if (catFilter) params.set("category", catFilter)
      if (tagFilter) params.set("tag", tagFilter)
      if (search)    params.set("q", search)
      const res  = await fetch(`/api/notes?${params}`)
      const data = await res.json()
      setNotes(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [filter, catFilter, tagFilter, search])

  useEffect(() => { loadNotes() }, [loadNotes])

  // ── Select note ────────────────────────────────────────────────────────────
  const selectNote = useCallback(async (id: string) => {
    setSelectedId(id)
    setRightTab("editor")
    // Load full note
    const res  = await fetch(`/api/notes/${id}`)
    const data: Note & { aiMessages: NoteAiMessage[]; history: NoteHistoryEntry[] } = await res.json()
    // Update in list
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n))
    // Set local editor state
    setLocalTitle(data.title)
    setLocalTags(data.tags.map(t => t.name).join(", "))
    setLocalCat(data.category)
    setLocalPri(data.priority)
    setLocalStatus(data.status)
    setLocalObs(data.observations ?? "")
    // Set editor content
    if (editorRef.current) editorRef.current.innerHTML = data.content || "<p><br></p>"
    // Attachments
    const attRes   = await fetch(`/api/notes/${id}/attachments`)
    const attData  = await attRes.json()
    setAttachments(Array.isArray(attData) ? attData : [])
    // AI messages
    setAiMessages(data.aiMessages ?? [])
    // History
    setNoteHistory(data.history ?? [])
    // Auto-detect specialist
    const contextText = [
      data.title, data.category, data.observations,
      data.tags.map((t: { name: string }) => t.name).join(" "),
      data.content.replace(/<[^>]+>/g, " "),
    ].filter(Boolean).join(" ")
    setSpecialist(detectSpecialistLocal(contextText))
    setShowSpecChange(false)
    setMobilePanel("right")
  }, [])

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const saveNote = useCallback(async (partial: NotePatch) => {
    if (!selectedId) return
    setSaving(true)
    try {
      await fetch(`/api/notes/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      })
      setSavedAt(new Date())
      const { tags: tagStrings, ...restPartial } = partial
      setNotes(prev => prev.map(n => n.id === selectedId
        ? {
            ...n,
            ...restPartial,
            updatedAt: new Date().toISOString(),
            tags: tagStrings ? tagStrings.map((name, i) => ({ id: `tmp-${i}`, name })) : n.tags,
          }
        : n
      ))
    } finally {
      setSaving(false)
    }
  }, [selectedId])

  const debounceSave = useCallback((partial: NotePatch) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveNote(partial), 1500)
  }, [saveNote])

  const handleEditorInput = useCallback(() => {
    const content = editorRef.current?.innerHTML || ""
    debounceSave({ content })
  }, [debounceSave])

  const handleTitleChange = (v: string) => {
    setLocalTitle(v)
    debounceSave({ title: v })
  }

  const handleMetaChange = (field: string, value: string) => {
    if (field === "category") { setLocalCat(value); debounceSave({ category: value }) }
    if (field === "priority") { setLocalPri(value); debounceSave({ priority: value }) }
    if (field === "status")   { setLocalStatus(value); debounceSave({ status: value }) }
    if (field === "observations") { setLocalObs(value); debounceSave({ observations: value }) }
  }

  const handleTagsChange = (v: string) => {
    setLocalTags(v)
    const tags = v.split(",").map(t => t.trim()).filter(Boolean)
    debounceSave({ tags })
  }

  // ── Paste image ────────────────────────────────────────────────────────────
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imgItem = items.find(i => i.kind === "file" && i.type.startsWith("image/"))
    if (!imgItem || !selectedId) return
    e.preventDefault()
    const file = imgItem.getAsFile()
    if (!file) return
    const form = new FormData()
    form.append("file", file, `paste-${Date.now()}.png`)
    setUploading(true)
    try {
      const res  = await fetch(`/api/notes/${selectedId}/attachments`, { method: "POST", body: form })
      const data = await res.json()
      if (data.id) {
        setAttachments(prev => [...prev, data])
        // Insert image inline in editor
        const src = data.filePath
        document.execCommand("insertHTML", false, `<img src="${src}" alt="${data.fileName}" style="max-width:100%;border-radius:6px;margin:4px 0" />`)
        handleEditorInput()
      }
    } finally { setUploading(false) }
  }, [selectedId, handleEditorInput])

  // ── Toolbar helpers ────────────────────────────────────────────────────────
  const handleLink = useCallback(() => {
    const url = prompt("URL do link:")
    if (url) execFmt("createLink", url)
  }, [])

  const handleChecklist = useCallback(() => {
    execFmt("insertHTML", `<div style="display:flex;align-items:baseline;gap:6px;margin:2px 0"><input type="checkbox" /><span> </span></div>`)
  }, [])

  const handleTable = useCallback(() => {
    execFmt("insertHTML", `
<table style="width:100%;border-collapse:collapse;margin:8px 0">
  <thead><tr>
    <th style="border:1px solid #e2e8f0;padding:6px 10px;background:#f8fafc;text-align:left">Coluna 1</th>
    <th style="border:1px solid #e2e8f0;padding:6px 10px;background:#f8fafc;text-align:left">Coluna 2</th>
    <th style="border:1px solid #e2e8f0;padding:6px 10px;background:#f8fafc;text-align:left">Coluna 3</th>
  </tr></thead>
  <tbody><tr>
    <td style="border:1px solid #e2e8f0;padding:6px 10px"> </td>
    <td style="border:1px solid #e2e8f0;padding:6px 10px"> </td>
    <td style="border:1px solid #e2e8f0;padding:6px 10px"> </td>
  </tr></tbody>
</table>`)
  }, [])

  // ── Note actions ───────────────────────────────────────────────────────────
  const toggleFavorite = async () => {
    if (!selectedNote) return
    const next = !selectedNote.isFavorite
    await saveNote({ isFavorite: next })
    await fetch(`/api/notes/${selectedId}/history`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "FAVORITO", title: next ? "Anotação favoritada" : "Anotação desfavoritada" }),
    })
  }

  const archiveNote = async () => {
    if (!selectedNote) return
    const isArchived = selectedNote.status === "ARQUIVADA"
    const next = isArchived ? "ATIVA" : "ARQUIVADA"
    await saveNote({ status: next, archivedAt: isArchived ? null : new Date().toISOString() })
    setLocalStatus(next)
    await fetch(`/api/notes/${selectedId}/history`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: next === "ARQUIVADA" ? "ARQUIVO" : "RESTAURACAO", title: isArchived ? "Anotação restaurada" : "Anotação arquivada" }),
    })
    if (!isArchived) { setSelectedId(null); loadNotes() }
  }

  const duplicateNote = async () => {
    if (!selectedNote) return
    const content = editorRef.current?.innerHTML || selectedNote.content
    const res = await fetch("/api/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:    `${selectedNote.title} (cópia)`,
        content,
        category: selectedNote.category,
        priority: selectedNote.priority,
        status:   "RASCUNHO",
        tags:     selectedNote.tags.map(t => t.name),
      }),
    })
    const data = await res.json()
    await loadNotes()
    selectNote(data.id)
  }

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: "DELETE" })
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selectedId === id) setSelectedId(null)
    setConfirmDelete(null)
  }

  const copyText = async () => {
    if (!selectedNote) return
    const content = editorRef.current?.innerHTML || selectedNote.content
    const text = [
      `# ${selectedNote.title}`,
      `Categoria: ${selectedNote.category} | Tags: ${selectedNote.tags.map(t => t.name).join(", ")}`,
      "",
      content.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " "),
    ].join("\n")
    await navigator.clipboard.writeText(text)
  }

  const printNote = () => {
    if (!selectedNote) return
    openNotePdf(selectedNote, selectedNote.tags, attachments)
    fetch(`/api/notes/${selectedId}/history`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "EXPORTACAO", title: "Anotação exportada em PDF" }),
    })
  }

  // ── File upload ────────────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    if (!selectedId) return
    const form = new FormData()
    form.append("file", file)
    setUploading(true)
    try {
      const res  = await fetch(`/api/notes/${selectedId}/attachments`, { method: "POST", body: form })
      const data = await res.json()
      if (data.id) setAttachments(prev => [...prev, data])
    } finally { setUploading(false) }
  }

  const deleteAttachment = async (id: string) => {
    if (!selectedId) return
    await fetch(`/api/notes/${selectedId}/attachments/${id}`, { method: "DELETE" })
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  // ── Create note ────────────────────────────────────────────────────────────
  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle || "Nova anotação", category: newCat }),
    })
    const data = await res.json()
    setShowModal(false)
    setNewTitle("")
    setNewCat("Outros")
    await loadNotes()
    selectNote(data.id)
  }

  // ── AI ─────────────────────────────────────────────────────────────────────
  const sendAiMessage = useCallback(async (message: string, mode?: string) => {
    if (!selectedId || !message.trim()) return
    const userMsg: NoteAiMessage = {
      id: `tmp-${Date.now()}`, noteId: selectedId, role: "user",
      content: message, mode: mode || null, createdAt: new Date().toISOString(),
    }
    setAiMessages(prev => [...prev, userMsg])
    setAiInput("")
    setAiLoading(true)
    try {
      const res  = await fetch(`/api/notes/${selectedId}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode, specialist }),
      })
      const data = await res.json()
      if (data.specialist) setSpecialist(data.specialist)
      const assistantMsg: NoteAiMessage = {
        id: data.id || `tmp-ai-${Date.now()}`, noteId: selectedId, role: "assistant",
        content: data.response, mode: mode || null, createdAt: new Date().toISOString(),
      }
      setAiMessages(prev => [...prev.filter(m => m.id !== userMsg.id), { ...userMsg, id: `u-${Date.now()}` }, assistantMsg])
    } catch {
      setAiMessages(prev => [...prev, {
        id: `err-${Date.now()}`, noteId: selectedId, role: "assistant",
        content: "Erro ao conectar com o assistente. Tente novamente.", mode: null, createdAt: new Date().toISOString(),
      }])
    } finally {
      setAiLoading(false)
    }
  }, [selectedId, specialist])

  const clearAiChat = async () => {
    if (!selectedId) return
    await fetch(`/api/notes/${selectedId}/chat`, { method: "DELETE" })
    setAiMessages([])
  }

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [aiMessages])

  // ── Parse AI markers ───────────────────────────────────────────────────────
  function extractMarker(content: string, marker: string): string | null {
    const idx = content.indexOf(marker)
    return idx !== -1 ? content.slice(idx + marker.length).trim() : null
  }

  function parseSuggestedTitles(content: string): string[] {
    const block = extractMarker(content, "--- TÍTULOS SUGERIDOS ---")
    if (!block) return []
    return block.split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean).slice(0, 3)
  }

  function parseSuggestedTags(content: string): string[] {
    const block = extractMarker(content, "--- TAGS SUGERIDAS ---")
    if (!block) return []
    return block.split(/[,\n]/).map(t => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean)
  }

  function parseExtractedTasks(content: string): Array<{title: string; dueDate: string; priority: string}> {
    const block = extractMarker(content, "--- TAREFAS EXTRAÍDAS ---")
    if (!block) return []
    const tasks: Array<{title: string; dueDate: string; priority: string}> = []
    const segments = block.split("---").filter(s => s.trim())
    for (const seg of segments) {
      const titleMatch = seg.match(/TAREFA:\s*(.+)/i)
      const dateMatch  = seg.match(/PRAZO:\s*(.+)/i)
      const priMatch   = seg.match(/PRIORIDADE:\s*(.+)/i)
      if (titleMatch) {
        tasks.push({
          title:    titleMatch[1].trim(),
          dueDate:  dateMatch?.[1].trim() ?? "Não definido",
          priority: priMatch?.[1].trim() ?? "MEDIA",
        })
      }
    }
    return tasks
  }

  const applyTitle = async (title: string) => {
    setLocalTitle(title)
    await saveNote({ title })
  }

  const applyTags = async (tags: string[]) => {
    const joined = tags.join(", ")
    setLocalTags(joined)
    await saveNote({ tags })
  }

  const createTaskFromAI = async (task: { title: string; dueDate: string; priority: string }) => {
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:    task.title,
        priority: task.priority === "NÃO DEFINIDO" ? "MEDIA" : task.priority,
        observations: `Criada a partir da anotação: ${selectedNote?.title}`,
      }),
    })
    await fetch(`/api/notes/${selectedId}/history`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "TAREFA_CRIADA", title: `Tarefa criada: ${task.title}` }),
    })
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags.map(t => t.name))))
  const catCounts: Record<string, number> = {}
  notes.forEach(n => { catCounts[n.category] = (catCounts[n.category] || 0) + 1 })

  // ── Render helpers ─────────────────────────────────────────────────────────
  const isArchived   = selectedNote?.status === "ARQUIVADA"
  const isFavorite   = selectedNote?.isFavorite ?? false

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-white">
      {/* ── MODAL NOVA ANOTAÇÃO ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Nova Anotação</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Título</label>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createNote()}
                  placeholder="Título da anotação..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Categoria</label>
                <select
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={createNote}>Criar</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ────────────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
        </div>
      )}

      {/* ── CONFIRM DELETE ───────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
            <Trash2 className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-800 mb-1">Excluir esta anotação?</p>
            <p className="text-xs text-slate-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => deleteNote(confirmDelete)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* COLUNA ESQUERDA — filtros                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <aside className={cn(
        "w-52 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50 overflow-y-auto",
        "hidden lg:flex",
        mobilePanel === "left" && "flex fixed inset-0 z-40 w-72"
      )}>
        <div className="p-3 border-b border-slate-200">
          <Button size="sm" className="w-full gap-1.5" onClick={() => setShowModal(true)}>
            <Plus className="w-3.5 h-3.5" />
            Nova Anotação
          </Button>
        </div>

        <nav className="p-2 space-y-0.5 flex-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase px-2 pt-2 pb-1">Filtros</p>
          {[
            { id: "all",       label: "Todas",         icon: <PenLine className="w-3.5 h-3.5" /> },
            { id: "favorites", label: "Favoritas",     icon: <Star    className="w-3.5 h-3.5" /> },
            { id: "recent",    label: "Recentes",      icon: <Clock   className="w-3.5 h-3.5" /> },
            { id: "archived",  label: "Arquivadas",    icon: <Archive className="w-3.5 h-3.5" /> },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setFilter(f.id); setCatFilter(null); setTagFilter(null) }}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === f.id && !catFilter && !tagFilter
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              )}
            >
              {f.icon}
              {f.label}
              {f.id === "all" && <span className="ml-auto text-[10px] opacity-60">{notes.filter(n => n.status !== "ARQUIVADA").length}</span>}
            </button>
          ))}

          <p className="text-[10px] font-semibold text-slate-400 uppercase px-2 pt-3 pb-1">Categorias</p>
          {CATEGORIES.filter(c => catCounts[c] > 0).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => { setCatFilter(c); setFilter("all"); setTagFilter(null) }}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                catFilter === c ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-200"
              )}
            >
              <Folder className="w-3 h-3 shrink-0" />
              <span className="truncate">{c}</span>
              <span className="ml-auto text-[10px] opacity-60">{catCounts[c]}</span>
            </button>
          ))}

          {allTags.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-slate-400 uppercase px-2 pt-3 pb-1">Tags</p>
              <div className="px-2 flex flex-wrap gap-1">
                {allTags.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTagFilter(t); setCatFilter(null); setFilter("all") }}
                    className={cn(
                      "text-[10px] rounded-full px-2 py-0.5 border transition-colors",
                      tagFilter === t
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </>
          )}
        </nav>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* COLUNA CENTRAL — lista de anotações                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "w-72 shrink-0 border-r border-slate-200 flex flex-col",
        mobilePanel !== "center" && "hidden lg:flex",
        mobilePanel === "center" && "flex"
      )}>
        {/* Search */}
        <div className="p-3 border-b border-slate-200 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar anotações..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400">{notes.length} {notes.length === 1 ? "anotação" : "anotações"}</p>
            <button type="button" onClick={loadNotes} className="p-1 text-slate-400 hover:text-slate-600">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <PenLine className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Nenhuma anotação encontrada.</p>
            </div>
          ) : (
            notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                selected={selectedId === note.id}
                onClick={() => selectNote(note.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* COLUNA DIREITA — editor + IA                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        mobilePanel !== "right" && "hidden lg:flex",
        mobilePanel === "right" && "flex"
      )}>
        {!selectedNote ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <PenLine className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">Nenhuma anotação selecionada.</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Selecione uma anotação na lista ou crie uma nova pelo botão no topo esquerdo.
            </p>
            {/* Mobile nav */}
            <button
              onClick={() => setMobilePanel("center")}
              className="mt-5 text-xs text-blue-600 flex items-center gap-1 lg:hidden"
            >
              <ArrowUpLeft className="w-3 h-3" />Ver anotações
            </button>
          </div>
        ) : (
          <>
            {/* ── Header da anotação ─────────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-white">
              {/* Title row */}
              <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                <button onClick={() => setMobilePanel("center")} className="lg:hidden text-slate-400 hover:text-slate-600 mr-1">
                  <ArrowUpLeft className="w-4 h-4" />
                </button>
                <input
                  value={localTitle}
                  onChange={e => handleTitleChange(e.target.value)}
                  className="flex-1 text-lg font-bold text-slate-900 border-none outline-none bg-transparent placeholder:text-slate-300"
                  placeholder="Título da anotação..."
                />
                <div className="flex items-center gap-1 shrink-0">
                  {saving
                    ? <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                    : savedAt && <span className="text-[10px] text-slate-400">Salvo {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  }
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 px-5 pb-2 flex-wrap">
                <select
                  value={localCat}
                  onChange={e => handleMetaChange("category", e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={localPri}
                  onChange={e => handleMetaChange("priority", e.target.value)}
                  className={cn("text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400", PRIORITY_COLORS[localPri])}
                >
                  {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select
                  value={localStatus}
                  onChange={e => handleMetaChange("status", e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                >
                  {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 flex-1 min-w-[120px]">
                  <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                  <input
                    value={localTags}
                    onChange={e => handleTagsChange(e.target.value)}
                    placeholder="tags, separadas, por, vírgula"
                    className="text-xs outline-none flex-1 bg-transparent"
                  />
                </div>
              </div>

              {/* Action buttons row */}
              <div className="flex items-center gap-1 px-5 pb-2.5 border-t border-slate-100 pt-2">
                <button
                  onClick={toggleFavorite}
                  title={isFavorite ? "Desfavoritar" : "Favoritar"}
                  className={cn("p-1.5 rounded-lg transition-colors", isFavorite ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:bg-slate-100")}
                >
                  <Star className={cn("w-4 h-4", isFavorite && "fill-amber-400")} />
                </button>
                <button
                  onClick={archiveNote}
                  title={isArchived ? "Restaurar" : "Arquivar"}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={duplicateNote}
                  title="Duplicar"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={copyText}
                  title="Copiar texto"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={printNote}
                  title="Exportar PDF"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <button
                  onClick={printNote}
                  title="Imprimir"
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <button
                  onClick={() => setConfirmDelete(selectedNote.id)}
                  title="Excluir"
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="ml-auto flex items-center gap-0.5">
                  {[
                    { key: "editor",  icon: <PenLine  className="w-3.5 h-3.5" />, label: "Editor" },
                    { key: "ai",      icon: <Sparkles className="w-3.5 h-3.5" />, label: "Assistente IA" },
                    { key: "history", icon: <History  className="w-3.5 h-3.5" />, label: "Histórico" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setRightTab(tab.key as "editor" | "ai" | "history")}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                        rightTab === tab.key ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── TAB: EDITOR ────────────────────────────────────────────── */}
            {rightTab === "editor" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <EditorToolbar
                  editorRef={editorRef}
                  onLink={handleLink}
                  onChecklist={handleChecklist}
                  onTable={handleTable}
                />

                {/* Editor area */}
                <div className="flex-1 overflow-y-auto">
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    onPaste={handlePaste}
                    onKeyDown={e => {
                      if (e.key === "Tab") { e.preventDefault(); execFmt("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;") }
                    }}
                    className="min-h-full px-6 py-5 text-sm text-slate-800 leading-relaxed outline-none
                      [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mb-2 [&_h1]:mt-4
                      [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-800 [&_h2]:mb-1.5 [&_h2]:mt-3
                      [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-700 [&_h3]:mb-1 [&_h3]:mt-2
                      [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:pl-5 [&_ol]:space-y-1
                      [&_li]:text-slate-700
                      [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2
                      [&_pre]:bg-slate-50 [&_pre]:border [&_pre]:border-slate-200 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-2 [&_pre]:whitespace-pre-wrap
                      [&_hr]:border-slate-200 [&_hr]:my-4
                      [&_a]:text-blue-600 [&_a]:underline
                      [&_table]:border-collapse [&_table]:w-full [&_table]:my-2
                      [&_th]:border [&_th]:border-slate-200 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-slate-50 [&_th]:text-left [&_th]:font-semibold [&_th]:text-xs
                      [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
                      [&_img]:max-w-full [&_img]:rounded-lg [&_img]:cursor-pointer"
                    style={{ caretColor: "#3b82f6" }}
                    onClick={e => {
                      const target = e.target as HTMLElement
                      if (target.tagName === "IMG") setLightboxSrc((target as HTMLImageElement).src)
                    }}
                  />
                </div>

                {/* Observations + Attachments */}
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 space-y-3">
                  {/* Observations */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Observações</label>
                    <textarea
                      rows={2}
                      value={localObs}
                      onChange={e => handleMetaChange("observations", e.target.value)}
                      placeholder="Observações adicionais..."
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none bg-white"
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Anexos ({attachments.length})</label>
                      <div className="flex items-center gap-1">
                        {uploading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" />Adicionar
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.docx,.xlsx,.doc,.xls,.png,.jpg,.jpeg,.webp,.gif"
                          multiple
                          onChange={e => { Array.from(e.target.files ?? []).forEach(uploadFile); e.target.value = "" }}
                        />
                      </div>
                    </div>
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map(a => (
                          <div key={a.id} className="group relative">
                            {isImageType(a.fileType) ? (
                              <div
                                onClick={() => setLightboxSrc(a.filePath)}
                                className="cursor-pointer border border-slate-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
                              >
                                <img src={a.filePath} alt={a.fileName} className="w-14 h-14 object-cover" />
                              </div>
                            ) : (
                              <a
                                href={a.filePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-blue-300 transition-colors bg-white"
                              >
                                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                  {a.fileName.split(".").pop()?.slice(0, 4)}
                                </span>
                                <span className="text-[10px] text-slate-600 max-w-[80px] truncate">{a.fileName}</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteAttachment(a.id)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: ASSISTENTE IA ─────────────────────────────────────── */}
            {rightTab === "ai" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Specialist badge */}
                <div className="border-b border-slate-200 px-4 py-2 bg-gradient-to-r from-violet-50 to-blue-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="text-xs font-semibold text-violet-700 truncate">{specialist} · Especialista Sênior</span>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowSpecChange(v => !v)}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border border-violet-200 bg-white text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      Trocar
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showSpecChange && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 max-h-64 overflow-y-auto">
                        {Array.from(new Set(SPECIALIST_LIST)).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => { setSpecialist(s); setShowSpecChange(false) }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs hover:bg-violet-50 transition-colors",
                              specialist === s ? "text-violet-700 font-semibold bg-violet-50" : "text-slate-700"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="border-b border-slate-200 px-4 py-2 bg-slate-50">
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                    {AI_QUICK_ACTIONS.map(a => (
                      <button
                        key={a.mode}
                        type="button"
                        onClick={() => sendAiMessage(a.label, a.mode)}
                        disabled={aiLoading}
                        className="flex items-center gap-1 text-[11px] font-medium whitespace-nowrap px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors shrink-0 disabled:opacity-40"
                      >
                        <span>{a.icon}</span>{a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {aiMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center mb-3">
                        <Bot className="w-6 h-6 text-violet-500" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Assistente da Anotação</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Use os botões acima ou envie uma mensagem para analisar, melhorar, estruturar ou transformar esta anotação.
                      </p>
                    </div>
                  )}

                  {aiMessages.map((msg, idx) => {
                    const isUser = msg.role === "user"
                    const titles = !isUser && msg.content.includes("--- TÍTULOS SUGERIDOS ---") ? parseSuggestedTitles(msg.content) : []
                    const tags   = !isUser && msg.content.includes("--- TAGS SUGERIDAS ---") ? parseSuggestedTags(msg.content) : []
                    const tasks  = !isUser && msg.content.includes("--- TAREFAS EXTRAÍDAS ---") ? parseExtractedTasks(msg.content) : []

                    return (
                      <div key={`${msg.id}-${idx}`} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                            <Bot className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <div className={cn(
                          "rounded-2xl px-4 py-3 text-sm max-w-[85%]",
                          isUser
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
                        )}>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {msg.content.split("---")[0].replace(/--- \w.*$/, "").trim() || msg.content}
                          </div>

                          {/* Suggested titles */}
                          {titles.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              <p className="text-xs font-semibold text-slate-500">Selecionar título:</p>
                              {titles.map((t, i) => (
                                <button
                                  key={i}
                                  onClick={() => applyTitle(t)}
                                  className="block w-full text-left text-xs px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-colors"
                                >
                                  ✓ {t}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Suggested tags */}
                          {tags.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-slate-500 mb-1.5">Tags sugeridas:</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {tags.map((t, i) => (
                                  <span key={i} className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">#{t}</span>
                                ))}
                              </div>
                              <button
                                onClick={() => applyTags(tags)}
                                className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Aplicar tags
                              </button>
                            </div>
                          )}

                          {/* Extracted tasks */}
                          {tasks.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-semibold text-slate-500">Tarefas identificadas:</p>
                              {tasks.map((t, i) => (
                                <div key={i} className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                                  <p className="text-xs font-semibold text-slate-800">{t.title}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500">Prazo: {t.dueDate}</span>
                                    <span className={cn("text-[10px] border rounded-full px-1.5 py-0.5 font-medium", PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.MEDIA)}>
                                      {PRIORITIES[t.priority] ?? t.priority}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => createTaskFromAI(t)}
                                    className="text-[11px] px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-1"
                                  >
                                    + Criar tarefa
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {aiLoading && (
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={aiEndRef} />
                </div>

                {/* Chat input */}
                <div className="border-t border-slate-200 p-3 bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-slate-400">Especialista em <span className="text-violet-600 font-medium">{specialist}</span></p>
                    {aiMessages.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAiChat}
                        className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Limpar conversa
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(aiInput) } }}
                      placeholder="Pergunte algo sobre esta anotação..."
                      disabled={aiLoading}
                      className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50"
                    />
                    <Button
                      size="sm"
                      onClick={() => sendAiMessage(aiInput)}
                      disabled={aiLoading || !aiInput.trim()}
                      className="px-3"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: HISTÓRICO ─────────────────────────────────────────── */}
            {rightTab === "history" && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {noteHistory.length === 0 ? (
                  <div className="text-center py-12 text-sm text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                    Nenhum registro no histórico.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {noteHistory.map(h => (
                      <div key={h.id} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px]">
                            {h.type === "CRIACAO"       ? "✨"
                            : h.type === "IA"           ? "🤖"
                            : h.type === "FAVORITO"     ? "⭐"
                            : h.type === "ARQUIVO"      ? "📦"
                            : h.type === "EXPORTACAO"   ? "📄"
                            : h.type === "TAREFA_CRIADA"? "✅"
                            : h.type === "ANEXO"        ? "📎"
                            :                            "✏️"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700">{h.title}</p>
                          {h.description && <p className="text-[11px] text-slate-500 mt-0.5">{h.description}</p>}
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(h.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex lg:hidden z-30">
        {[
          { panel: "left" as const,   icon: <PanelLeft  className="w-4 h-4" />, label: "Filtros" },
          { panel: "center" as const, icon: <PenLine    className="w-4 h-4" />, label: "Lista" },
          { panel: "right" as const,  icon: <PanelRight className="w-4 h-4" />, label: "Anotação" },
        ].map(item => (
          <button
            key={item.panel}
            type="button"
            onClick={() => setMobilePanel(item.panel)}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              mobilePanel === item.panel ? "text-blue-600" : "text-slate-400"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
