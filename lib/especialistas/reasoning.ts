// ─── Camada 6 · Motor de Raciocínio ──────────────────────────────────────────
// Pipeline determinístico de 6 camadas para cada resposta do especialista.
// Camada 1: Conhecimento Nativo → Camada 2: RAG → Camada 3: Atualização
// Camada 4: Memória → Camada 5: Ferramentas → Camada 6: Raciocínio e Resposta

import { aiService } from "@/lib/ai/gateway"
import { specialistManager } from "@/lib/ai/specialists"
import type { AIMessage, AITool } from "@/lib/ai/gateway"
import { getSpecialist } from "./config"
import { searchDocuments, buildContext, sanitizeResponse, NOT_FOUND_MESSAGE } from "./knowledge"
import { needsUpdate, isConceptualQuestion, SPECIALIST_UPDATE_FALLBACK } from "./intelligence"
import { getRelevantMemory, extractAndSaveMemory } from "./memory"
import { SPECIALIST_TOOLS, executarFerramenta } from "./tools/index"
import { knowledgeManager } from "@/lib/ai/knowledge"
import { memoryManager } from "@/lib/ai/memory"
import { updateManager } from "@/lib/ai/update"
import type { KnowledgeSearchResult } from "@/lib/ai/knowledge"

// ─── Classificação da pergunta ────────────────────────────────────────────────

export type QuestionMode = "expert" | "rag" | "update-nofound"

export function classifyQuestion(text: string, docs: unknown[]): QuestionMode {
  if (isConceptualQuestion(text)) return "expert"
  if (docs.length > 0) return "rag"
  return "update-nofound"
}

// ─── Construção do system prompt por modo ─────────────────────────────────────

function buildSystemPrompt(
  basePrompt: string,
  contextBlock: string,
  memoryBlock: string,
  mode: QuestionMode,
): string {
  const memSection = memoryBlock ? `\n\n${memoryBlock}` : ""

  if (mode === "expert") {
    const docsSection = contextBlock
      ? `\n\nDOCUMENTOS DA BASE (use para validar e enriquecer):\n${contextBlock}`
      : ""
    return (
      basePrompt +
      docsSection +
      memSection +
      `\n\nINSTRUÇÕES DE RESPOSTA:
1. Responda com conhecimento técnico especializado completo — você é o expert, não depende da base.
2. Use os documentos acima (se houver) para validar, citar versões específicas e enriquecer.
3. Nunca mencione limitações de modelo, data de treinamento ou falta de acesso à internet.
4. Se usar a memória da conversa, integre naturalmente sem anunciar que está usando.
5. Estruture bem: use títulos, bullets e exemplos quando útil.
6. Cite sempre a base legal ou metodológica ao final.`
    )
  }

  if (mode === "rag") {
    return (
      basePrompt +
      `\n\n${contextBlock}` +
      memSection +
      `\n\nINSTRUÇÕES DE RESPOSTA:
1. Para dados específicos (versões, datas, portarias, notas técnicas): use PREFERENCIALMENTE os documentos acima.
2. Para conceitos, funcionamento geral e contexto: complemente com seu conhecimento especializado.
3. Cite os documentos da base quando usar informações deles — "[1]", "[2]" etc.
4. Nunca mencione limitações de modelo, data de treinamento ou falta de acesso à internet.
5. Se usar a memória da conversa, integre naturalmente.
6. Cite as fontes ao final.`
    )
  }

  // update-nofound
  return (
    basePrompt +
    memSection +
    `\n\nINSTRUÇÕES DE RESPOSTA:
1. Não foi encontrada atualização oficial específica na Base de Conhecimento sobre este tema.
2. Inicie a resposta comunicando isso de forma profissional e direta.
3. Em seguida, explique o funcionamento geral do tema com seu conhecimento técnico especializado.
4. Indique os documentos e fontes oficiais que o usuário deve consultar para a versão mais recente.
5. Nunca mencione limitações de modelo, data de treinamento ou falta de acesso à internet.`
  )
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

  // ── Camadas 2 + 4: KnowledgeManager + MemoryManager (em paralelo) ─────────────
  // Busca documentos (semântica → TF-IDF) e memória de médio/longo prazo juntos.
  // Fallback silencioso para as implementações legadas se qualquer erro ocorrer.
  let docs: KnowledgeSearchResult[] = []
  let contextBlock = ''
  let memoryBlock  = ''

  try {
    const knowledgeCtx = await knowledgeManager.getKnowledgeWithMemory(
      specialistId,
      userMessage,
      conversationId,
      {
        docLimit:     5,
        threshold:    0.20,
        historyLimit: 0,   // short-term history já vem no param `history`
      },
    )
    docs         = knowledgeCtx.docs
    contextBlock = knowledgeCtx.contextBlock
    memoryBlock  = knowledgeCtx.memoryBlock
  } catch {
    // Fallback para implementações originais (preserva RAG atual)
    const [legacyDocs, legacyMemory] = await Promise.all([
      searchDocuments(specialistId, userMessage, 5),
      getRelevantMemory(specialistId, conversationId),
    ])
    docs         = legacyDocs as unknown as KnowledgeSearchResult[]
    contextBlock = buildContext(legacyDocs)
    memoryBlock  = legacyMemory
  }

  // UpdateManager: verifica status da base de forma não-bloqueante (apenas log)
  updateManager.isDue(specialistId).catch(() => {})

  // ── Camada 6: Classificação da pergunta ──────────────────────────────────────
  const mode = classifyQuestion(userMessage, docs)

  // ── Camada 6: Montagem do system prompt ──────────────────────────────────────
  const systemFull = buildSystemPrompt(basePrompt, contextBlock, memoryBlock, mode)

  // ── Camada 5: Ferramentas disponíveis ────────────────────────────────────────
  const tools = managedSpecialist?.policies.toolsEnabled === false
    ? []
    : SPECIALIST_TOOLS[specialistId] ?? []
  const toolsExecuted: Array<{ name: string; result: object }> = []

  // ── Camada 6: Chamada à IA ───────────────────────────────────────────────────
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
        maxTokens: 2000,
        temperature: mode === "expert" ? 0.35 : 0.2,
      })
      aiContent = result.content || NOT_FOUND_MESSAGE
    } else {
      const firstPass = await aiService.ask({
        module: "especialistas.reasoning.tools",
        specialist: gatewaySpecialistId,
        message: userMessage,
        messages,
        tools: tools as AITool[],
        toolChoice: "auto",
        maxTokens: 2000,
        temperature: mode === "expert" ? 0.35 : 0.2,
      })

      // ── Camada 5: Execução de ferramentas (function calling) ─────────────────
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

          toolMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult),
          })
        }

        // Segunda chamada: IA interpreta o resultado das ferramentas
        const followUp = await aiService.ask({
          module: "especialistas.reasoning.tools.followup",
          specialist: gatewaySpecialistId,
          message: userMessage,
          messages: toolMessages,
          maxTokens: 2000,
          temperature: 0.2,
        })
        aiContent = followUp.content || NOT_FOUND_MESSAGE
      } else {
        aiContent = firstPass.content || NOT_FOUND_MESSAGE
      }
    }
  } catch (err) {
    console.error("[reasoning] OpenAI error:", err)
    aiContent = "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente."
  }

  // ── Sanitização ─────────────────────────────────────────────────────────────
  const sanitized = sanitizeResponse(aiContent)
  const finalContent = sanitized ?? (mode === "update-nofound" ? SPECIALIST_UPDATE_FALLBACK : NOT_FOUND_MESSAGE)

  // ── Camada 4: Memória — registra aprendizado assincronamente ─────────────────
  // MemoryManager extrai tópicos/entidades/preferências, persiste e promove long-term.
  const messageCount = history.length + 1
  memoryManager.afterExchange(specialistId, conversationId, userMessage, finalContent, messageCount)
    .catch(() => {})

  // ── Metadados da resposta ────────────────────────────────────────────────────
  const docsUsed   = docs.map(d => d.title)
  const sources    = docs.map(d => d.source).filter((s): s is string => !!s).filter((v, i, a) => a.indexOf(v) === i).join(" | ")
  const searchMode = (docs[0]?.searchMode ?? undefined) as string | undefined

  return {
    content: finalContent,
    mode,
    docsUsed,
    sources,
    toolsExecuted,
    searchMode,
  }
}
