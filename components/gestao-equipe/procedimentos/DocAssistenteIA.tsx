"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, RefreshCw, Loader2, Bot, User, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "assistant" | "user"
  content: string
  aiPowered?: boolean
}

// ─── Markdown-lite renderer ────────────────────────────────────────────────

function renderMd(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^(\d+\.\s)/gm, '<span class="font-semibold text-violet-700">$1</span>')
    .replace(/^[•\-]\s(.+)/gm, '<span class="flex gap-1.5"><span class="text-violet-400 shrink-0">•</span><span>$1</span></span>')
    .replace(/\n/g, '<br />')
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocAssistenteIA({ docId, docTitle }: { docId: string; docTitle: string }) {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState("")
  const [loading,    setLoading]    = useState(false)
  const [analyzing,  setAnalyzing]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function runAnalise() {
    setAnalyzing(true)
    setMessages([])
    try {
      const res = await fetch(`/api/procedures/${docId}/analyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mode: "analise-completa" }),
      })
      const data = await res.json()
      setMessages([{ role: "assistant", content: data.content, aiPowered: data.aiPowered }])
    } catch {
      setMessages([{ role: "assistant", content: "Erro ao conectar com o serviço de IA. Tente novamente.", aiPowered: false }])
    } finally {
      setAnalyzing(false)
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")

    const userMsg: Message = { role: "user", content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch(`/api/procedures/${docId}/analyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mode: "chat", message: text }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.content, aiPowered: data.aiPowered }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Erro ao conectar com o serviço de IA.", aiPowered: false }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header + botão de análise */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Assistente IA</p>
            <p className="text-xs text-slate-500">Análise automática e perguntas sobre o documento</p>
          </div>
        </div>
        <button
          onClick={runAnalise}
          disabled={analyzing || loading}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
        >
          {analyzing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          {analyzing ? "Analisando…" : "Analisar documento"}
        </button>
      </div>

      {/* Área de mensagens */}
      <div className="flex flex-col gap-3 min-h-[200px]">
        {messages.length === 0 && !analyzing && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-violet-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500">Assistente pronto</p>
              <p className="text-xs mt-0.5">
                Clique em <strong>Analisar documento</strong> para uma análise automática,<br />
                ou faça uma pergunta sobre <strong>{docTitle}</strong> abaixo.
              </p>
            </div>
          </div>
        )}

        {analyzing && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200">
            <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
            <span className="text-sm text-violet-700">Analisando o documento com IA…</span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            {/* Avatar */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              msg.role === "assistant" ? "bg-violet-100" : "bg-slate-100",
            )}>
              {msg.role === "assistant"
                ? <Bot className="w-3.5 h-3.5 text-violet-600" />
                : <User className="w-3.5 h-3.5 text-slate-500" />}
            </div>

            {/* Bubble */}
            <div className={cn(
              "flex-1 max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed",
              msg.role === "assistant"
                ? "bg-white border border-slate-200 text-slate-700"
                : "bg-violet-600 text-white ml-auto",
            )}>
              {msg.role === "assistant" ? (
                <>
                  <div
                    className="prose-sm"
                    dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }}
                  />
                  {msg.aiPowered === false && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100 text-xs text-amber-600">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Modo local (sem IA configurada)
                    </div>
                  )}
                </>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input de chat */}
      <div className="flex gap-2 pt-2 border-t border-slate-200">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Faça uma pergunta sobre este documento…"
          disabled={loading || analyzing}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading || analyzing}
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
