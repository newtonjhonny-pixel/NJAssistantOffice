"use client"

import { useEffect, useRef, useState } from "react"
import {
  Sparkles, Send, Loader2, User, Bot, RefreshCw,
  AlertTriangle, BarChart2, ShieldCheck, FileSearch,
  TrendingUp, Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  aiPowered?: boolean
}

const QUICK_ACTIONS = [
  { icon: AlertTriangle, label: "Riscos críticos",          prompt: "Quais são os riscos mais críticos cadastrados? Analise e sugira prioridades de ação." },
  { icon: BarChart2,     label: "Indicadores abaixo da meta", prompt: "Quais indicadores estão abaixo da meta ou em situação crítica? Sugira ações corretivas." },
  { icon: ShieldCheck,   label: "Obrigações vencidas",       prompt: "Há obrigações de conformidade vencidas ou próximas do vencimento? Liste e sugira providências." },
  { icon: FileSearch,    label: "Resumo de auditorias",      prompt: "Faça um resumo das auditorias registradas, destacando não conformidades e pendências." },
  { icon: TrendingUp,    label: "Plano de melhoria",         prompt: "Com base nos dados de riscos, controles e indicadores, sugira um plano de melhoria dos processos com prioridades." },
  { icon: Lightbulb,     label: "Novos indicadores",         prompt: "Com base nos processos cadastrados, quais novos indicadores-chave de desempenho (KPIs) você recomenda criar?" },
]

function formatContent(text: string) {
  const lines = text.split("\n")
  return lines.map((line, i) => {
    if (line.startsWith("# "))  return <h2 key={i} className="text-base font-bold text-slate-800 mt-3 mb-1">{line.slice(2)}</h2>
    if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-bold text-slate-700 mt-2 mb-0.5">{line.slice(3)}</h3>
    if (line.startsWith("### ")) return <h4 key={i} className="text-sm font-semibold text-slate-700 mt-1">{line.slice(4)}</h4>
    if (line.startsWith("• ") || line.startsWith("- ")) {
      const content = line.slice(2)
      return <li key={i} className="text-sm text-slate-700 ml-4 list-disc">{renderInline(content)}</li>
    }
    if (/^\d+\. /.test(line)) {
      const content = line.replace(/^\d+\. /, "")
      return <li key={i} className="text-sm text-slate-700 ml-4 list-decimal">{renderInline(content)}</li>
    }
    if (line.trim() === "") return <div key={i} className="h-1" />
    return <p key={i} className="text-sm text-slate-700 leading-relaxed">{renderInline(line)}</p>
  })
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-800">{p.slice(2, -2)}</strong>
      : p
  )
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

export function TabIAProcessos() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou o assistente de IA para Gestão de Processos. Tenho acesso aos dados de processos, riscos, controles, conformidade, indicadores e auditorias da organização.\n\nComo posso ajudar?",
    },
  ])
  const [input, setInput]   = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    const userMsg: Message = { id: Date.now() + "u", role: "user", content: msg }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    const history = messages
      .filter(m => m.id !== "welcome")
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res  = await fetch("/api/processos/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      })
      const data = await res.json()
      const aiMsg: Message = {
        id: Date.now() + "a",
        role: "assistant",
        content: data.content ?? "Erro ao processar.",
        aiPowered: data.aiPowered,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + "e",
        role: "assistant",
        content: "Erro ao conectar com o assistente. Tente novamente.",
      }])
    } finally {
      setLoading(false)
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  function reset() {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou o assistente de IA para Gestão de Processos. Tenho acesso aos dados de processos, riscos, controles, conformidade, indicadores e auditorias da organização.\n\nComo posso ajudar?",
    }])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[520px]">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            IA Processos
          </h2>
          <p className="text-sm text-slate-500">Assistente inteligente com acesso aos dados de processos, riscos e conformidade</p>
        </div>
        <button onClick={reset} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Nova conversa">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Ações rápidas — só mostra quando conversa está no início */}
      {messages.length <= 1 && (
        <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3">
          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon
            return (
              <button key={a.label} onClick={() => send(a.prompt)}
                className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-all text-left group">
                <Icon className="w-4 h-4 text-violet-400 group-hover:text-violet-600 mt-0.5 shrink-0" />
                <span className="text-xs text-slate-600 group-hover:text-slate-800 font-medium leading-tight">{a.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map(m => (
          <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
            {/* Avatar */}
            <div className={cn("shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
              m.role === "user" ? "bg-blue-600" : "bg-gradient-to-br from-violet-500 to-violet-600")}>
              {m.role === "user"
                ? <User className="w-4 h-4 text-white" />
                : <Bot  className="w-4 h-4 text-white" />}
            </div>

            {/* Balão */}
            <div className={cn("max-w-[82%] rounded-2xl px-4 py-3",
              m.role === "user"
                ? "bg-blue-600 text-white rounded-tr-sm"
                : "bg-white border border-slate-200 rounded-tl-sm shadow-sm")}>
              {m.role === "user"
                ? <p className="text-sm leading-relaxed">{m.content}</p>
                : <div className="space-y-0.5">{formatContent(m.content)}</div>}
              {m.aiPowered === false && m.role === "assistant" && m.id !== "welcome" && (
                <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-1.5">
                  Resposta simulada — configure OPENAI_API_KEY para IA real
                </p>
              )}
              {m.aiPowered === true && (
                <p className="text-[10px] text-violet-400 mt-2 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Gerado por IA
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-600">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando dados…
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-sm flex items-end gap-2 p-3">
        <textarea
          ref={inputRef}
          rows={1}
          className="flex-1 resize-none text-sm text-slate-800 placeholder:text-slate-400 outline-none max-h-32 bg-transparent"
          placeholder="Pergunte sobre riscos, indicadores, conformidade ou processos…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          style={{ lineHeight: "1.5" }}
        />
        <Button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="shrink-0 rounded-xl h-9 w-9 p-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
