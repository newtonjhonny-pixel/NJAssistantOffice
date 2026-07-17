// ─── Camada 4 · Memória Contextual ───────────────────────────────────────────
// Três horizontes: curto prazo (janela), médio prazo (sessão), longo prazo (DB).

import { prisma } from "@/lib/prisma"
import { aiService } from "@/lib/ai/gateway"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type MemoryType = "topic" | "entity" | "preference" | "summary"

export interface MemoryEntry {
  key: string
  value: string
  type: MemoryType
  relevance: number
}

// ─── Salvar memória (longo prazo) ─────────────────────────────────────────────

export async function saveMemory(
  specialist: string,
  conversationId: string,
  entries: MemoryEntry[],
): Promise<void> {
  for (const e of entries) {
    // Upsert por (specialist + conversationId + key)
    const existing = await prisma.especialistaMemory.findFirst({
      where: { specialist, conversationId, key: e.key },
    })
    if (existing) {
      await prisma.especialistaMemory.update({
        where: { id: existing.id },
        data: { value: e.value, relevance: e.relevance, updatedAt: new Date() },
      })
    } else {
      await prisma.especialistaMemory.create({
        data: {
          specialist,
          conversationId,
          type: e.type,
          key: e.key,
          value: e.value,
          relevance: e.relevance,
        },
      })
    }
  }
}

// ─── Recuperar memória relevante ──────────────────────────────────────────────

export async function getRelevantMemory(
  specialist: string,
  conversationId: string,
): Promise<string> {
  const entries = await prisma.especialistaMemory.findMany({
    where: {
      specialist,
      conversationId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { relevance: "desc" },
    take: 20,
  })

  if (!entries.length) return ""

  const lines = entries.map(e => `[${e.type.toUpperCase()}] ${e.key}: ${e.value}`)
  return `MEMÓRIA DA CONVERSA:\n${lines.join("\n")}`
}

// ─── Extrair e salvar tópicos da conversa ─────────────────────────────────────
// Chamado ao final de cada troca, de forma assíncrona (fire-and-forget).

export async function extractAndSaveMemory(
  specialist: string,
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
): Promise<void> {
  try {
    const prompt = `Analise este trecho de conversa e extraia informações relevantes para memorizar.
Retorne um JSON com array "memories" onde cada item tem:
- key: identificador curto (ex: "tema_principal", "empresa_usuario", "cargo_usuario")
- value: valor conciso (máx 100 chars)
- type: "topic" | "entity" | "preference"
- relevance: número 0.0-1.0

Extraia apenas o que for útil para o especialista em futuras mensagens desta mesma conversa.
Não extraia informações óbvias ou sem contexto.

USUÁRIO: ${userMessage.slice(0, 500)}
ESPECIALISTA: ${assistantMessage.slice(0, 500)}

Responda APENAS o JSON, sem markdown.`

    const result = await aiService.ask({
      module: "especialistas.memory.extract",
      specialist,
      message: prompt,
      maxTokens: 400,
      temperature: 0,
    })

    const raw = result.content.trim() || "{}"
    const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(cleaned) as { memories?: MemoryEntry[] }
    const memories = parsed.memories ?? []

    if (memories.length > 0) {
      await saveMemory(specialist, conversationId, memories)
    }
  } catch {
    // Silencioso — memória não é crítica para o fluxo principal
  }
}

// ─── Sumarizar conversa longa ─────────────────────────────────────────────────

export async function summarizeConversation(
  specialist: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<void> {
  if (messages.length < 10) return

  try {
    const transcript = messages
      .slice(-20)
      .map(m => `${m.role === "user" ? "Usuário" : "Especialista"}: ${m.content.slice(0, 300)}`)
      .join("\n")

    const result = await aiService.ask({
      module: "especialistas.memory.summarize",
      specialist,
      message: `Faça um resumo técnico conciso (máx 300 chars) dos principais tópicos abordados:\n\n${transcript}`,
      maxTokens: 150,
      temperature: 0,
    })

    const summary = result.content.trim()
    if (!summary) return

    await saveMemory(specialist, conversationId, [
      { key: "resumo_conversa", value: summary, type: "summary", relevance: 0.9 },
    ])
  } catch {
    // Silencioso
  }
}
