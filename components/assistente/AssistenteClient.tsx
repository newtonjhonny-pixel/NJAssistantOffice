"use client"

import { useEffect, useRef, useState } from "react"
import {
  Send, Loader2, Sparkles, ChevronDown, ChevronUp,
  BarChart2, Users, ArrowLeft, X,
} from "lucide-react"
import { cn, AGENT_COLORS } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentResponse {
  agent: string
  agentName: string
  content: string
  icon: string
  aiPowered: boolean
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  agent: string
  agentName: string
  icon: string
  aiPowered: boolean
  timestamp: Date
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SPECIALISTS = [
  {
    key: "COORDENADOR",
    icon: "👔",
    name: "Coordenador Administrativo",
    color: "from-slate-600 to-slate-700",
    badge: "bg-slate-100 text-slate-700",
    description: [
      "Analisa todas as tarefas",
      "Define prioridades",
      "Organiza o dia",
      "Identifica gargalos",
      "Mostra riscos",
    ],
  },
  {
    key: "ASSISTENTE",
    icon: "👨‍💼",
    name: "Assistente Administrativo",
    color: "from-blue-500 to-blue-600",
    badge: "bg-blue-50 text-blue-700",
    description: [
      "Organiza agenda e tarefas",
      "Ajuda na rotina diária",
      "Controla atividades",
    ],
  },
  {
    key: "ANALISTA",
    icon: "🔍",
    name: "Analista Administrativo",
    color: "from-violet-500 to-violet-600",
    badge: "bg-violet-50 text-violet-700",
    description: [
      "Analisa demandas",
      "Sugere plano de ação",
      "Explica como resolver problemas",
      "Orienta o usuário",
    ],
  },
  {
    key: "REDATOR",
    icon: "✍️",
    name: "Redator Administrativo",
    color: "from-emerald-500 to-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
    description: [
      "E-mails e mensagens",
      "Comunicados e pareceres",
      "Cobranças profissionais",
    ],
  },
  {
    key: "PENDENCIAS",
    icon: "⚠️",
    name: "Gestor de Pendências",
    color: "from-orange-500 to-orange-600",
    badge: "bg-orange-50 text-orange-700",
    description: [
      "Monitora atrasos",
      "Tarefas sem andamento",
      "Aguardando retorno",
      "Riscos de vencimento",
    ],
  },
]

const MAIN_SUGGESTIONS = [
  "O que devo fazer hoje?",
  "Quais atividades estão atrasadas?",
  "Analise a situação atual das demandas",
  "Gere uma cobrança profissional",
  "Organize minhas prioridades para hoje",
  "Quais pendências precisam de atenção?",
]

const ALL_AGENT_KEYS = ["COORDENADOR", "ASSISTENTE", "ANALISTA", "REDATOR", "PENDENCIAS"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderContent(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>")
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator({ color }: { color: string }) {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 bg-gradient-to-br text-white",
        color,
      )}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-slate-400 rounded-full animate-pulse-dot"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  msg,
  showAnalysis,
  agentAnalysis,
  loadingAnalysis,
  expandedAnalysis,
  onRequestAnalysis,
  onToggleAnalysis,
  messages,
}: {
  msg: Message
  showAnalysis: boolean
  agentAnalysis: Record<string, AgentResponse[]>
  loadingAnalysis: Record<string, boolean>
  expandedAnalysis: Record<string, boolean>
  onRequestAnalysis: (msgId: string, userMsg: string, history: { role: string; content: string }[]) => void
  onToggleAnalysis: (msgId: string) => void
  messages: Message[]
}) {
  const isUser = msg.role === "user"
  const avatarColor = AGENT_COLORS[msg.agent] || "from-slate-500 to-slate-600"

  return (
    <div>
      <div className={cn("flex gap-3 animate-fade-in", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-bold",
          isUser ? "bg-slate-700 text-white" : `bg-gradient-to-br ${avatarColor} text-white`,
        )}>
          {isUser ? "N" : msg.icon}
        </div>

        <div className={cn("max-w-[78%]", isUser && "items-end flex flex-col")}>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs text-slate-400">{isUser ? "Você" : msg.agentName}</p>
            {!isUser && msg.aiPowered && (
              <span className="text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />GPT
              </span>
            )}
            <p className="text-xs text-slate-300">
              {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-slate-800 text-white rounded-tr-sm"
              : "bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-sm",
          )}>
            <div className="agent-content" dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
          </div>
        </div>
      </div>

      {/* Analysis panel (main chat only) */}
      {!isUser && showAnalysis && (
        <div className="ml-11 mt-2">
          {!agentAnalysis[msg.id] && !loadingAnalysis[msg.id] && (
            <button
              onClick={() => {
                const idx = messages.findIndex(m => m.id === msg.id)
                const userMsg = idx > 0 ? messages[idx - 1] : null
                if (userMsg) {
                  const hist = messages.slice(0, idx - 1).map(m => ({ role: m.role, content: m.content }))
                  onRequestAnalysis(msg.id, userMsg.content, hist)
                }
              }}
              className="text-xs text-slate-400 hover:text-blue-600 border border-dashed border-slate-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5"
            >
              <BarChart2 className="w-3 h-3" />
              Ver análise de todos os especialistas
            </button>
          )}

          {loadingAnalysis[msg.id] && (
            <div className="flex items-center gap-2 text-xs text-slate-400 px-1 py-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Consultando todos os especialistas...
            </div>
          )}

          {agentAnalysis[msg.id] && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => onToggleAnalysis(msg.id)}
                className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <BarChart2 className="w-3 h-3" />Análise completa dos especialistas
                </span>
                {expandedAnalysis[msg.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {expandedAnalysis[msg.id] && (
                <div className="divide-y divide-slate-100">
                  {agentAnalysis[msg.id].map(ar => (
                    <div key={ar.agent} className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-600 mb-1.5">{ar.icon} {ar.agentName}</p>
                      <div
                        className="text-xs text-slate-600 leading-relaxed agent-content"
                        dangerouslySetInnerHTML={{ __html: renderContent(ar.content) }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssistenteClient() {
  // NJ Assistant (main) chat
  const [messages, setMessages] = useState<Message[]>([])

  // Specialist chats — keyed by agent key, separate history per specialist
  const [view, setView] = useState<"main" | "specialist">("main")
  const [activeSpecialistKey, setActiveSpecialistKey] = useState<string | null>(null)
  const [specialistMessages, setSpecialistMessages] = useState<Record<string, Message[]>>({})

  // UI
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null)
  const [showExperts, setShowExperts] = useState(false)

  // Analysis panel (main chat only)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({})
  const [agentAnalysis, setAgentAnalysis] = useState<Record<string, AgentResponse[]>>({})
  const [loadingAnalysis, setLoadingAnalysis] = useState<Record<string, boolean>>({})

  const bottomRef = useRef<HTMLDivElement>(null)

  const specialist = SPECIALISTS.find(s => s.key === activeSpecialistKey) ?? null
  const currentMessages = view === "main"
    ? messages
    : (specialistMessages[activeSpecialistKey!] ?? [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentMessages])

  function openSpecialist(key: string) {
    setActiveSpecialistKey(key)
    setView("specialist")
    setShowExperts(false)
    setInput("")
    setSending(false)
  }

  function backToMain() {
    setView("main")
    setActiveSpecialistKey(null)
    setInput("")
    setSending(false)
  }

  function appendMessage(msg: Message) {
    if (view === "main") {
      setMessages(prev => [...prev, msg])
    } else {
      setSpecialistMessages(prev => ({
        ...prev,
        [activeSpecialistKey!]: [...(prev[activeSpecialistKey!] ?? []), msg],
      }))
    }
  }

  async function fetchAgentAnalysis(
    msgId: string,
    userMessage: string,
    history: { role: string; content: string }[],
  ) {
    setLoadingAnalysis(prev => ({ ...prev, [msgId]: true }))
    setExpandedAnalysis(prev => ({ ...prev, [msgId]: true }))
    try {
      const results = await Promise.all(
        ALL_AGENT_KEYS.map(agent =>
          fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent, message: userMessage, history }),
          }).then(r => r.json()),
        ),
      )
      setAgentAnalysis(prev => ({ ...prev, [msgId]: results }))
    } finally {
      setLoadingAnalysis(prev => ({ ...prev, [msgId]: false }))
    }
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || sending) return

    const agentKey = view === "main" ? "ORCHESTRATOR" : activeSpecialistKey!

    appendMessage({
      id: Date.now().toString(),
      role: "user",
      content: msg,
      agent: agentKey,
      agentName: "Newton",
      icon: "👤",
      aiPowered: false,
      timestamp: new Date(),
    })
    setInput("")
    setSending(true)

    const history = currentMessages.slice(-20).map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: agentKey, message: msg, history }),
      })
      const data = await res.json()

      if (data.aiConfigured !== undefined) setAiConfigured(data.aiConfigured)

      appendMessage({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        agent: data.agent ?? agentKey,
        agentName: data.agentName ?? (view === "main" ? "NJ Assistant" : specialist?.name ?? ""),
        icon: data.icon ?? (view === "main" ? "🤖" : specialist?.icon ?? ""),
        aiPowered: data.aiPowered ?? false,
        timestamp: new Date(),
      })
    } catch {
      appendMessage({
        id: Date.now().toString(),
        role: "assistant",
        content: "Ocorreu um erro ao processar sua solicitação. Tente novamente.",
        agent: agentKey,
        agentName: view === "main" ? "NJ Assistant" : specialist?.name ?? "",
        icon: view === "main" ? "🤖" : specialist?.icon ?? "",
        aiPowered: false,
        timestamp: new Date(),
      })
    } finally {
      setSending(false)
    }
  }

  // ─── Header ───────────────────────────────────────────────────────────────

  const headerBg = view === "specialist" && specialist
    ? `bg-gradient-to-r ${specialist.color}`
    : "bg-gradient-to-r from-slate-700 to-slate-800"

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col h-[calc(100vh-140px)] animate-fade-in">
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

        {/* ── Header ── */}
        <div className={cn("px-5 py-4 text-white shrink-0 transition-all duration-300", headerBg)}>
          <div className="flex items-center justify-between">

            {/* Left: identity */}
            <div className="flex items-center gap-3">
              {view === "specialist" && (
                <button
                  onClick={backToMain}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors mr-1"
                  title="Voltar ao NJ Assistant"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <span className="text-2xl">
                {view === "main" ? "🤖" : specialist?.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">
                    {view === "main" ? "NJ Assistant" : specialist?.name}
                  </p>
                  {view === "main" && aiConfigured !== null && (
                    <span className={cn(
                      "text-xs rounded-full px-2 py-0.5 flex items-center gap-1",
                      aiConfigured ? "bg-violet-500/30 text-violet-200" : "bg-amber-500/20 text-amber-200",
                    )}>
                      {aiConfigured ? <><Sparkles className="w-2.5 h-2.5" />IA Real</> : "Modo simulado"}
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-75">
                  {view === "main"
                    ? "Escritório Virtual Inteligente · Nunca executa ações automaticamente"
                    : "Conversa direta com o especialista · Nunca executa ações automaticamente"}
                </p>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              {view === "main" && (
                <button
                  onClick={() => setShowAnalysis(v => !v)}
                  title="Mostrar análise de todos os especialistas por resposta"
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all",
                    showAnalysis
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/80",
                  )}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Análise
                </button>
              )}
              <button
                onClick={() => setShowExperts(v => !v)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-medium",
                  showExperts
                    ? "bg-white/25 text-white"
                    : "bg-white/15 text-white hover:bg-white/25",
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Especialistas
              </button>
              {currentMessages.length > 0 && (
                <button
                  onClick={() => {
                    if (view === "main") setMessages([])
                    else setSpecialistMessages(prev => ({ ...prev, [activeSpecialistKey!]: [] }))
                  }}
                  className="text-xs text-white/50 hover:text-white transition-colors px-1"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {currentMessages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">
                {view === "main" ? "🤖" : specialist?.icon}
              </div>
              <p className="font-semibold text-slate-700 text-lg">
                {view === "main" ? "NJ Assistant" : specialist?.name}
              </p>
              <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
                {view === "main"
                  ? "Seu escritório virtual inteligente. Pergunte qualquer coisa — o sistema escolhe automaticamente o especialista certo."
                  : `Você está conversando diretamente com o ${specialist?.name}. O histórico desta conversa é separado do NJ Assistant.`}
              </p>
              {view === "main" && (
                <div className="grid grid-cols-2 gap-2 mt-6 max-w-lg mx-auto">
                  {MAIN_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs text-left border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 hover:border-blue-300 transition-all text-slate-600"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentMessages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              showAnalysis={view === "main" && showAnalysis}
              agentAnalysis={agentAnalysis}
              loadingAnalysis={loadingAnalysis}
              expandedAnalysis={expandedAnalysis}
              onRequestAnalysis={fetchAgentAnalysis}
              onToggleAnalysis={id =>
                setExpandedAnalysis(prev => ({ ...prev, [id]: !prev[id] }))
              }
              messages={currentMessages}
            />
          ))}

          {sending && (
            <TypingIndicator
              color={view === "main"
                ? "from-slate-600 to-slate-700"
                : (specialist ? `${specialist.color}` : "from-slate-600 to-slate-700")}
            />
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="p-4 border-t border-slate-200 shrink-0">
          <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                view === "main"
                  ? "Pergunte ao NJ Assistant..."
                  : `Pergunte ao ${specialist?.name}...`
              }
              disabled={sending}
              className="flex-1 px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className={cn(
                "px-4 py-3 rounded-xl text-white font-medium transition-all bg-gradient-to-r disabled:opacity-40",
                view === "specialist" && specialist ? specialist.color : "from-slate-600 to-slate-700",
              )}
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Os especialistas apenas sugerem. Nenhuma ação é executada automaticamente.
          </p>
        </div>
      </div>

      {/* ── Specialists Drawer ── */}
      {showExperts && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/25 z-10 rounded-2xl"
            onClick={() => setShowExperts(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white z-20 flex flex-col rounded-r-2xl border-l border-slate-200 shadow-xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <p className="font-semibold text-slate-800 text-sm">Especialistas</p>
              </div>
              <button
                onClick={() => setShowExperts(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="px-5 py-3 text-xs text-slate-500 border-b border-slate-100 shrink-0">
              Clique em <strong>Conversar</strong> para abrir uma sessão exclusiva com o especialista. O NJ Assistant os aciona automaticamente em segundo plano.
            </p>

            {/* Specialist list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {SPECIALISTS.map(sp => (
                <div
                  key={sp.key}
                  className={cn(
                    "rounded-xl border transition-all",
                    activeSpecialistKey === sp.key && view === "specialist"
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{sp.icon}</span>
                      <p className="text-xs font-semibold text-slate-800 leading-tight">{sp.name}</p>
                    </div>
                    <ul className="space-y-0.5 mb-3 pl-1">
                      {sp.description.map(d => (
                        <li key={d} className="text-xs text-slate-500 flex items-start gap-1.5">
                          <span className="text-slate-300 mt-0.5">•</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => openSpecialist(sp.key)}
                      className={cn(
                        "w-full text-xs font-medium py-2 px-3 rounded-lg transition-all bg-gradient-to-r text-white",
                        sp.color,
                        activeSpecialistKey === sp.key && view === "specialist"
                          ? "opacity-80"
                          : "hover:opacity-90",
                      )}
                    >
                      {activeSpecialistKey === sp.key && view === "specialist"
                        ? "✓ Em conversa"
                        : "Conversar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
