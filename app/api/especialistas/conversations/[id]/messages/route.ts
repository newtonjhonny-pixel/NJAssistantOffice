import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSpecialist, detectSpecialist } from "@/lib/especialistas/config"
import { needsUpdate, makeVersion, nextScheduledUpdate } from "@/lib/especialistas/intelligence"
import { SEED_DOCUMENTS } from "@/lib/especialistas/seed-data"
import { runReasoningPipeline } from "@/lib/especialistas/reasoning"
import { aiService } from "@/lib/ai/gateway"
import { specialistManager } from "@/lib/ai/specialists"

export const dynamic = "force-dynamic"

// ─── Seed automático da base quando vazia ─────────────────────────────────────

async function autoUpdateBase(specialistId: string): Promise<{ version: string; newDocs: number }> {
  const t0       = Date.now()
  const prevCount = await prisma.especialistaDocument.count({ where: { specialist: specialistId } })

  let docCount = prevCount
  if (prevCount === 0) {
    const docs = SEED_DOCUMENTS[specialistId]
    if (docs?.length) {
      for (const d of docs) {
        await prisma.especialistaDocument.create({
          data: {
            specialist: specialistId, title: d.title, category: d.category,
            type: "documento", source: d.source, version: d.version,
            tags: d.tags, content: d.content,
          },
        })
      }
      docCount = await prisma.especialistaDocument.count({ where: { specialist: specialistId } })
    }
  }

  const version  = makeVersion()
  const duration = Date.now() - t0
  const newDocs  = Math.max(0, docCount - prevCount)

  const rows = await prisma.especialistaDocument.groupBy({
    by: ["category"], where: { specialist: specialistId }, _count: { _all: true },
  })
  const byCategory = JSON.stringify(Object.fromEntries(rows.map(r => [r.category, r._count._all])))

  await prisma.especialistaBase.upsert({
    where:  { specialist: specialistId },
    update: { status: docCount > 0 ? "ATUALIZADO" : "DESATUALIZADO", lastUpdated: new Date(), lastChecked: new Date(), version, docCount, docsByCategory: byCategory, nextUpdate: nextScheduledUpdate() },
    create: { specialist: specialistId, status: docCount > 0 ? "ATUALIZADO" : "DESATUALIZADO", lastUpdated: new Date(), lastChecked: new Date(), version, docCount, docsByCategory: byCategory, nextUpdate: nextScheduledUpdate() },
  })

  if (newDocs > 0) {
    await prisma.especialistaUpdateLog.create({
      data: { specialist: specialistId, version, newDocs, updatedDocs: 0, removedDocs: 0, duration, triggeredBy: "auto" },
    })
  }

  return { version, newDocs }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const messages = await prisma.especialistaMessage.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(messages)
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { content, specialistId } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 })

  const conv = await prisma.especialistaConversation.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  })
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 })

  const allText  = [conv.title, ...conv.messages.map(m => m.content), content].join(" ")
  const specialist = specialistId
    ? getSpecialist(specialistId)
    : detectSpecialist(allText, conv.specialist)
  const managedSpecialist = specialistManager.get(specialist.id)

  // Salva mensagem do usuário
  await prisma.especialistaMessage.create({
    data: { conversationId: params.id, role: "user", content: content.trim(), specialist: specialist.id },
  })

  const history = conv.messages.map(m => ({
    role: m.role as "user" | "assistant", content: m.content,
  }))

  // Auto-título na primeira mensagem
  let newTitle = conv.title
  if (conv.messageCount === 0) {
    try {
      const result = await aiService.ask({
        module: "especialistas.conversation.title",
        specialist: managedSpecialist?.id ?? specialist.id,
        systemPrompt: "Gere um título curto (máximo 6 palavras) em português para esta conversa com um especialista. Responda APENAS o título, sem aspas nem pontuação final.",
        message: content.trim(),
        maxTokens: 20,
        temperature: 0.3,
      })
      newTitle = result.content.trim() || conv.title
    } catch { /* mantém título original */ }
  }

  // ── Camada 3: Auto-seed quando a base está vazia ou quando needsUpdate ────────
  const requiresUpdate = needsUpdate(content)
  let autoUpdated = false
  let baseVersion: string | null = null

  if (requiresUpdate) {
    const result = await autoUpdateBase(specialist.id)
    autoUpdated  = result.newDocs > 0
    baseVersion  = result.version
  } else {
    // Verifica se a base está vazia e faz seed silencioso
    const count = await prisma.especialistaDocument.count({ where: { specialist: specialist.id } })
    if (count === 0) {
      const result = await autoUpdateBase(specialist.id)
      autoUpdated  = result.newDocs > 0
      baseVersion  = result.version
    }
  }

  // ── Camadas 1–6: Motor de Raciocínio completo ─────────────────────────────────
  const result = await runReasoningPipeline({
    specialistId: specialist.id,
    conversationId: params.id,
    userMessage: content.trim(),
    history,
    autoUpdated,
  })

  // Resolve versão da base se ainda não temos
  if (!baseVersion) {
    const base = await prisma.especialistaBase.findUnique({ where: { specialist: specialist.id } })
    baseVersion = base?.version ?? null
  }

  // ── Salva resposta do assistente ─────────────────────────────────────────────
  const assistantMsg = await prisma.especialistaMessage.create({
    data: {
      conversationId: params.id,
      role:           "assistant",
      content:        result.content,
      sources:        result.sources || null,
      specialist:     specialist.id,
      docsUsed:       result.docsUsed.length ? JSON.stringify(result.docsUsed) : null,
      autoUpdated,
    },
  })

  // ── Salva execuções de ferramentas (se houver) ───────────────────────────────
  for (const te of result.toolsExecuted) {
    await prisma.especialistaToolExecution.create({
      data: {
        specialist:     specialist.id,
        conversationId: params.id,
        toolName:       te.name,
        input:          JSON.stringify({}),
        output:         JSON.stringify(te.result),
      },
    }).catch(() => {})
  }

  await prisma.especialistaConversation.update({
    where: { id: params.id },
    data:  { specialist: specialist.id, messageCount: { increment: 2 }, title: newTitle },
  })

  return NextResponse.json({
    message:       assistantMsg,
    specialist:    specialist.id,
    sources:       result.sources,
    autoUpdated,
    baseVersion,
    docsUsed:      result.docsUsed,
    mode:          result.mode,
    searchMode:    result.searchMode,
    toolsExecuted: result.toolsExecuted.map(t => t.name),
  })
}
