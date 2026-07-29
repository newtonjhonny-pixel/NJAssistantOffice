// ─── Camada 6 · Motor de Raciocínio ──────────────────────────────────────────
// Pipeline determinístico de 6 camadas para cada resposta do especialista.
// Camada 1: Conhecimento Nativo → Camada 2: RAG → Camada 3: Atualização
// Camada 4: Memória → Camada 5: Ferramentas → Camada 6: Raciocínio e Resposta

import { aiService } from "@/lib/ai/gateway"
import { specialistManager } from "@/lib/ai/specialists"
import type { AIMessage, AITool } from "@/lib/ai/gateway"
import { getSpecialist } from "./config"
import { searchDocuments, buildContext, sanitizeResponse, NOT_FOUND_MESSAGE } from "./knowledge"
import { isConceptualQuestion, classifyIntent, type IntentMode, SPECIALIST_UPDATE_FALLBACK } from "./intelligence"
import { getRelevantMemory } from "./memory"
import { SPECIALIST_TOOLS, executarFerramenta } from "./tools/index"
import { knowledgeManager } from "@/lib/ai/knowledge"
import { memoryManager } from "@/lib/ai/memory"
import { updateManager } from "@/lib/ai/update"
import type { KnowledgeSearchResult } from "@/lib/ai/knowledge"

// ─── Detecção temporal ────────────────────────────────────────────────────────

const TEMPORAL_TRIGGERS = [
  "atualizacao", "atualizacoes", "novidade", "novidades",
  "mudou", "mudanca", "ultima", "mais recente",
  "hoje", "ontem", "esta semana", "este mes", "este ano",
  "versao vigente", "nota tecnica nova",
]

const MONTH_MAP: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
}

export type TemporalPeriod = "today" | "yesterday" | "week" | "month" | "year" | null

export interface TemporalInfo {
  isTemporal: boolean
  period: TemporalPeriod
  year?: number
  month?: number
}

export function detectTemporalQuery(text: string): TemporalInfo {
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[çÇ]/g, "c")
    .trim()

  const isTemporal = TEMPORAL_TRIGGERS.some(kw => norm.includes(kw))
  if (!isTemporal) return { isTemporal: false, period: null }

  const now = new Date()

  if (norm.includes("hoje")) {
    return { isTemporal: true, period: "today", year: now.getFullYear(), month: now.getMonth() }
  }
  if (norm.includes("ontem")) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return { isTemporal: true, period: "yesterday", year: yesterday.getFullYear(), month: yesterday.getMonth() }
  }
  if (norm.includes("esta semana")) {
    return { isTemporal: true, period: "week" }
  }
  for (const [monthName, monthIdx] of Object.entries(MONTH_MAP)) {
    if (norm.includes(monthName)) {
      const yearMatch = norm.match(/\b(20\d{2})\b/)
      const year = yearMatch ? parseInt(yearMatch[1], 10) : now.getFullYear()
      return { isTemporal: true, period: "month", month: monthIdx, year }
    }
  }
  if (norm.includes("este mes")) {
    return { isTemporal: true, period: "month", year: now.getFullYear(), month: now.getMonth() }
  }
  if (norm.includes("este ano")) {
    return { isTemporal: true, period: "year", year: now.getFullYear() }
  }
  const yearMatch = norm.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    return { isTemporal: true, period: "year", year: parseInt(yearMatch[1], 10) }
  }

  return { isTemporal: true, period: null }
}

// ─── Filtro temporal de documentos ───────────────────────────────────────────

function applyTemporalFilter(
  docs: KnowledgeSearchResult[],
  info: TemporalInfo,
): { filtered: KnowledgeSearchResult[]; discardedByDate: number } {
  if (!info.period) return { filtered: docs, discardedByDate: 0 }

  const now = new Date()

  const inPeriod = (doc: KnowledgeSearchResult): boolean => {
    const ref = doc.updatedAt ?? doc.createdAt
    if (!ref) return false

    if (info.period === "today") {
      const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
      return ref >= startOfDay
    }
    if (info.period === "yesterday") {
      const startOfYesterday = new Date(now); startOfYesterday.setDate(startOfYesterday.getDate() - 1); startOfYesterday.setHours(0, 0, 0, 0)
      const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
      return ref >= startOfYesterday && ref < startOfToday
    }
    if (info.period === "week") {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
      return ref >= weekAgo
    }
    if (info.period === "month" && info.year !== undefined && info.month !== undefined) {
      return ref.getFullYear() === info.year && ref.getMonth() === info.month
    }
    if (info.period === "year" && info.year !== undefined) {
      return ref.getFullYear() === info.year
    }
    return true
  }

  const filtered = docs.filter(inPeriod)
  return { filtered, discardedByDate: docs.length - filtered.length }
}

// ─── Thresholds RAG ───────────────────────────────────────────────────────────

const THRESHOLD_DEFAULT  = 0.20
const THRESHOLD_TEMPORAL = 0.55

// ─── Classificação do modo de resposta ───────────────────────────────────────
// Regra central: update-nofound SOMENTE para ATUALIZAÇÃO sem documentos recentes.
// Todos os outros casos com docs=0 usam expert (conhecimento técnico do modelo).

export type QuestionMode = "expert" | "rag" | "update-nofound"

export function classifyQuestion(
  text: string,
  docs: unknown[],
  intent: IntentMode,
): QuestionMode {
  // Conceitual → sempre expert (modelo responde com conhecimento nativo)
  if (isConceptualQuestion(text)) return "expert"
  // Atualização sem documentos recentes → honest update-nofound
  if (intent === "ATUALIZACAO" && docs.length === 0) return "update-nofound"
  // Qualquer pergunta com documentos → RAG
  if (docs.length > 0) return "rag"
  // Todas as demais sem documentos → expert (nunca retorna fallback genérico)
  return "expert"
}

// ─── Construção do system prompt por modo ─────────────────────────────────────
// Mantém o systemPrompt do especialista intacto e apenas injeta docs + memória.
// Evita duplicar instruções que já estão no prompt base (que é extenso).

function buildSystemPrompt(
  basePrompt: string,
  contextBlock: string,
  memoryBlock: string,
  mode: QuestionMode,
): string {
  const memSection = memoryBlock ? `\n\n${memoryBlock}` : ""

  if (mode === "update-nofound") {
    return (
      basePrompt +
      memSection +
      "\n\nINSTRUÇÃO: Não foi localizada atualização oficial específica nas fontes indexadas " +
      "para este período. Informe isso de forma clara, explique o funcionamento geral do tema " +
      "com seu conhecimento especializado e indique as fontes oficiais para consulta " +
      "(portal eSocial, Receita Federal, MTE, DOU)."
    )
  }

  // expert (sem docs) — inclui nota para não mencionar limitações
  if (!contextBlock) {
    return (
      basePrompt +
      "\n\nNOTA: A Base de Conhecimento não retornou documentos específicos para esta consulta. " +
      "Responda com conhecimento técnico especializado completo." +
      memSection
    )
  }

  // expert com docs ou rag — injeta documentos diretamente
  return basePrompt + `\n\n${contextBlock}` + memSection
}

// ─── Interface principal do motor ─────────────────────────────────────────────

export interface ReasoningInput {
  specialistId: string
  conversationId: string
  userMessage: string
  history: Array<{ role: "user" | "assistant"; content: string }>
  autoUpdated?: boolean
}

export interface ReasoningOutput {
  content: string
  mode: QuestionMode
  docsUsed: string[]
  sources: string
  toolsExecuted: Array<{ name: string; result: object }>
  searchMode?: string
}

export async function runReasoningPipeline(input: ReasoningInput): Promise<ReasoningOutput> {
  const { specialistId, conversationId, userMessage, history } = input
  const specialist = getSpecialist(specialistId)
  const managedSpecialist = specialistManager.get(specialist.id)
  const gatewaySpecialistId = managedSpecialist?.id ?? specialist.id
  const basePrompt = specialist.systemPrompt || managedSpecialist?.basePrompt || ""

  // ── Classificação de intenção e detecção temporal ─────────────────────────
  const intent       = classifyIntent(userMessage)
  const temporalInfo = detectTemporalQuery(userMessage)
  const threshold    = temporalInfo.isTemporal ? THRESHOLD_TEMPORAL : THRESHOLD_DEFAULT

  // ── Camadas 2 + 4: KnowledgeManager + MemoryManager (em paralelo) ──────────
  let docs: KnowledgeSearchResult[] = []
  let contextBlock = ''
  let memoryBlock  = ''

  const searchStart    = Date.now()
  let docsRaw          = 0
  let discardedByDate  = 0

  try {
    const knowledgeCtx = await knowledgeManager.getKnowledgeWithMemory(
      specialistId,
      userMessage,
      conversationId,
      { docLimit: 5, threshold, historyLimit: 0 },
    )

    if (temporalInfo.isTemporal && temporalInfo.period) {
      docsRaw = knowledgeCtx.docs.length
      const { filtered, discardedByDate: dbd } = applyTemporalFilter(knowledgeCtx.docs, temporalInfo)
      discardedByDate = dbd

      if (filtered.length !== docsRaw) {
        const rebuiltCtx = knowledgeManager.buildContext(
          specialistId, userMessage, filtered,
          knowledgeCtx.memory, knowledgeCtx.history,
        )
        docs         = filtered
        contextBlock = rebuiltCtx.contextBlock
        memoryBlock  = knowledgeCtx.memoryBlock
      } else {
        docs         = knowledgeCtx.docs
        contextBlock = knowledgeCtx.contextBlock
        memoryBlock  = knowledgeCtx.memoryBlock
      }
    } else {
      docs         = knowledgeCtx.docs
      contextBlock = knowledgeCtx.contextBlock
      memoryBlock  = knowledgeCtx.memoryBlock
    }
  } catch {
    const [legacyDocs, legacyMemory] = await Promise.all([
      searchDocuments(specialistId, userMessage, 5),
      getRelevantMemory(specialistId, conversationId),
    ])
    docs         = legacyDocs as unknown as KnowledgeSearchResult[]
    contextBlock = buildContext(legacyDocs)
    memoryBlock  = legacyMemory
  }

  const searchMs = Date.now() - searchStart

  // UpdateManager: verifica status da base (não-bloqueante)
  updateManager.isDue(specialistId).catch(() => {})

  // ── Classificação do modo de resposta ─────────────────────────────────────
  const mode = classifyQuestion(userMessage, docs, intent)

  // ── Log técnico ───────────────────────────────────────────────────────────
  console.log(
    `[specialist:reasoning] specialist=${specialistId} intent=${intent} mode=${mode}` +
    ` threshold=${threshold} filtroTemporal=${temporalInfo.period ?? "none"} searchMs=${searchMs}` +
    ` docsRaw=${docsRaw || docs.length} discardedByDate=${discardedByDate} docsFinal=${docs.length}`,
  )

  // ── Montagem do system prompt ─────────────────────────────────────────────
  const systemFull = buildSystemPrompt(basePrompt, contextBlock, memoryBlock, mode)

  // ── Ferramentas disponíveis ───────────────────────────────────────────────
  // Só ativa ferramentas de cálculo quando a mensagem contém dados numéricos
  // (salário, valor, datas). Sem dados → resposta explicativa sem tool calls.
  const hasNumericData = /\d[\d.,]*|\bR\$|\bsalari[oa] de\b|\bremunera[çc][aã]o de\b/i.test(userMessage)
  const tools = (managedSpecialist?.policies.toolsEnabled !== false && hasNumericData)
    ? SPECIALIST_TOOLS[specialistId] ?? []
    : []
  const toolsExecuted: Array<{ name: string; result: object }> = []

  // ── Chamada à IA ──────────────────────────────────────────────────────────
  const messages: AIMessage[] = [
    { role: "system", content: systemFull },
    ...history.slice(-20).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ]

  let aiContent: string

  try {
    if (tools.length === 0) {
      const result = await aiService.ask({
        module: "especialistas.reasoning",
        specialist: gatewaySpecialistId,
        systemPrompt: systemFull,
        message: userMessage,
        history: history.slice(-20) as AIMessage[],
        temperature: mode === "expert" ? 0.35 : 0.2,
      })
      // Se conteúdo vier vazio (erro técnico), usa NOT_FOUND_MESSAGE como bridge
      aiContent = result.content || NOT_FOUND_MESSAGE
    } else {
      const firstPass = await aiService.ask({
        module: "especialistas.reasoning.tools",
        specialist: gatewaySpecialistId,
        message: userMessage,
        messages,
        tools: tools as AITool[],
        toolChoice: "auto",
        temperature: mode === "expert" ? 0.35 : 0.2,
      })

      if (firstPass.finishReason === "tool_calls" && firstPass.toolCalls?.length) {
        const toolMessages: AIMessage[] = [
          ...messages,
          { role: "assistant", content: firstPass.content, toolCalls: firstPass.toolCalls },
        ]

        for (const tc of firstPass.toolCalls) {
          const fn       = tc.function
          const toolName = fn.name
          const toolArgs = JSON.parse(fn.arguments) as Record<string, unknown>
          const toolResult = executarFerramenta(specialistId, toolName, toolArgs)
          toolsExecuted.push({ name: toolName, result: toolResult })
          toolMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResult) })
        }

        const followUp = await aiService.ask({
          module: "especialistas.reasoning.tools.followup",
          specialist: gatewaySpecialistId,
          message: userMessage,
          messages: toolMessages,
          temperature: 0.2,
        })
        aiContent = followUp.content || NOT_FOUND_MESSAGE
      } else if (firstPass.content) {
        // modelo respondeu em texto (sem invocar ferramenta)
        aiContent = firstPass.content
      } else {
        // firstPass sem content e sem tool_calls (ex: tokens esgotados no tool call JSON)
        // fallback: chamada simples sem ferramentas
        const plainFallback = await aiService.ask({
          module: "especialistas.reasoning",
          specialist: gatewaySpecialistId,
          systemPrompt: systemFull,
          message: userMessage,
          history: history.slice(-20) as AIMessage[],
          temperature: mode === "expert" ? 0.35 : 0.2,
        })
        aiContent = plainFallback.content || NOT_FOUND_MESSAGE
      }
    }
  } catch (err) {
    console.error("[specialist:reasoning] AI error:", err)
    aiContent = "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente."
  }

  // ── Sanitização ───────────────────────────────────────────────────────────
  // sanitizeResponse agora remove frases proibidas (não mata a resposta inteira).
  // fallback só ocorre quando: modo=update-nofound E conteúdo é inválido após limpeza.
  const sanitized   = sanitizeResponse(aiContent)
  const finalContent = sanitized !== null
    ? sanitized
    : (mode === "update-nofound" ? SPECIALIST_UPDATE_FALLBACK : aiContent)

  if (sanitized === null) {
    console.log(`[specialist:reasoning] sanitize=null mode=${mode} specialist=${specialistId}`)
  }

  // ── Memória: registra aprendizado assincronamente ─────────────────────────
  const messageCount = history.length + 1
  memoryManager.afterExchange(specialistId, conversationId, userMessage, finalContent, messageCount)
    .catch(() => {})

  // ── Metadados ─────────────────────────────────────────────────────────────
  const docsUsed   = docs.map(d => d.title)
  const sources    = docs.map(d => d.source).filter((s): s is string => !!s).filter((v, i, a) => a.indexOf(v) === i).join(" | ")
  const searchMode = (docs[0]?.searchMode ?? undefined) as string | undefined

  return { content: finalContent, mode, docsUsed, sources, toolsExecuted, searchMode }
}
