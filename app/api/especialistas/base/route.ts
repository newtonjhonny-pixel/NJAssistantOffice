import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SPECIALISTS, getSpecialist } from "@/lib/especialistas/config"
import { SEED_DOCUMENTS } from "@/lib/especialistas/seed-data"
import { ESOCIAL_INITIAL_LOAD_DOCS } from "@/lib/especialistas/esocial-initial-load"
import { makeVersion, nextScheduledUpdate } from "@/lib/especialistas/intelligence"
import { reindexSpecialist, indexDocument } from "@/lib/especialistas/embeddings"
import { updateManager, hashContent } from "@/lib/ai/update"

export const dynamic = "force-dynamic"

// Specialists that require an explicit initial load before incremental updates
const REQUIRES_INITIAL_LOAD = ["esocial"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function countByCategory(specialist: string): Promise<Record<string, number>> {
  const rows = await prisma.especialistaDocument.groupBy({
    by: ["category"],
    where: { specialist },
    _count: { _all: true },
  })
  return Object.fromEntries(rows.map(r => [r.category, r._count._all]))
}

async function seedSpecialist(specialistId: string): Promise<number> {
  const docs = SEED_DOCUMENTS[specialistId]
  if (!docs?.length) return 0
  const existing = await prisma.especialistaDocument.count({ where: { specialist: specialistId } })
  if (existing > 0) return existing
  for (const d of docs) {
    await prisma.especialistaDocument.create({
      data: {
        specialist: specialistId,
        title: d.title, category: d.category, type: "documento",
        source: d.source, version: d.version, tags: d.tags, content: d.content,
      },
    })
  }
  return await prisma.especialistaDocument.count({ where: { specialist: specialistId } })
}

async function ensureBases() {
  for (const s of SPECIALISTS) {
    const exists = await prisma.especialistaBase.findUnique({ where: { specialist: s.id } })
    if (!exists) {
      const needsInitial = REQUIRES_INITIAL_LOAD.includes(s.id)
      await prisma.especialistaBase.create({
        data: {
          specialist: s.id,
          status: needsInitial ? "CARGA_PENDENTE" : "DESATUALIZADO",
          docCount: 0,
          lastChecked: new Date(),
          sources: s.sources.join("\n"),
          nextUpdate: nextScheduledUpdate(),
          initialLoadDone: false,
        },
      })
    }
  }
}

// Core incremental update — refuses if initialLoadDone = false for REQUIRES_INITIAL_LOAD
async function updateOneSpecialist(
  specialistId: string,
  { force = false, triggeredBy = "manual" }: { force?: boolean; triggeredBy?: string } = {}
) {
  const sp = getSpecialist(specialistId)
  const t0 = Date.now()

  // Guard: block incremental update if initial load is required but not done
  if (REQUIRES_INITIAL_LOAD.includes(specialistId)) {
    const base = await prisma.especialistaBase.findUnique({ where: { specialist: specialistId } })
    if (!base?.initialLoadDone) {
      return {
        error: true,
        code: "INITIAL_LOAD_REQUIRED",
        message: `A base histórica do Especialista eSocial ainda não foi carregada. Execute primeiro a Carga Inicial.`,
        base,
        log: null,
      }
    }
  }

  const prevCount = await prisma.especialistaDocument.count({ where: { specialist: specialistId } })

  let docCount: number
  if (force && prevCount > 0) {
    await prisma.especialistaDocument.deleteMany({ where: { specialist: specialistId } })
    docCount = await seedSpecialist(specialistId)
  } else if (prevCount === 0) {
    docCount = await seedSpecialist(specialistId)
  } else {
    docCount = prevCount
  }

  const byCategory = await countByCategory(specialistId)
  const version    = makeVersion()
  const duration   = Date.now() - t0

  const newDocs     = Math.max(0, docCount - prevCount)
  const updatedDocs = force && prevCount > 0 ? prevCount : 0

  const base = await prisma.especialistaBase.upsert({
    where:  { specialist: specialistId },
    update: {
      status: docCount > 0 ? "ATUALIZADO" : "DESATUALIZADO",
      lastUpdated: new Date(), lastChecked: new Date(),
      version, docCount, docsByCategory: JSON.stringify(byCategory),
      nextUpdate: nextScheduledUpdate(), sources: sp.sources.join("\n"),
    },
    create: {
      specialist: specialistId,
      status: docCount > 0 ? "ATUALIZADO" : "DESATUALIZADO",
      lastUpdated: new Date(), lastChecked: new Date(),
      version, docCount, docsByCategory: JSON.stringify(byCategory),
      nextUpdate: nextScheduledUpdate(), sources: sp.sources.join("\n"),
      initialLoadDone: !REQUIRES_INITIAL_LOAD.includes(specialistId),
    },
  })

  const log = await prisma.especialistaUpdateLog.create({
    data: { specialist: specialistId, version, newDocs, updatedDocs, removedDocs: 0, duration, triggeredBy },
  })

  return { error: false, base, log }
}

// ─── Initial load for eSocial ─────────────────────────────────────────────────

async function runInitialLoad(specialistId: string) {
  if (!REQUIRES_INITIAL_LOAD.includes(specialistId)) {
    return { error: true, message: "Este especialista não requer carga inicial." }
  }

  const t0 = Date.now()
  const sp = getSpecialist(specialistId)

  // Mark base as "in progress"
  await prisma.especialistaBase.upsert({
    where:  { specialist: specialistId },
    update: { status: "CARGA_EM_ANDAMENTO", lastChecked: new Date() },
    create: {
      specialist: specialistId, status: "CARGA_EM_ANDAMENTO",
      docCount: 0, lastChecked: new Date(), sources: sp.sources.join("\n"),
      nextUpdate: nextScheduledUpdate(), initialLoadDone: false,
    },
  })

  // Delete existing documents to start fresh
  await prisma.especialistaDocument.deleteMany({ where: { specialist: specialistId } })

  // Seed all historical eSocial documents
  let indexed = 0
  let errors  = 0
  for (const d of ESOCIAL_INITIAL_LOAD_DOCS) {
    try {
      const doc = await prisma.especialistaDocument.create({
        data: {
          specialist: specialistId,
          title: d.title,
          category: d.category,
          type: "documento",
          source: d.source,
          version: d.version,
          tags: d.tags,
          content: d.content,
          isRevoked: d.isRevoked ?? false,
          checksum: d.content ? hashContent(d.content) : null,
        },
      })
      // Gera embedding assincronamente (não bloqueia a carga)
      indexDocument(doc.id).catch(() => {})
      indexed++
    } catch {
      errors++
    }
  }

  const byCategory = await countByCategory(specialistId)
  const docCount   = await prisma.especialistaDocument.count({ where: { specialist: specialistId } })
  const version    = makeVersion()
  const duration   = Date.now() - t0

  const base = await prisma.especialistaBase.upsert({
    where:  { specialist: specialistId },
    update: {
      status: "ATUALIZADO",
      lastUpdated: new Date(), lastChecked: new Date(),
      version, docCount, docsByCategory: JSON.stringify(byCategory),
      nextUpdate: nextScheduledUpdate(), sources: sp.sources.join("\n"),
      initialLoadDone: true, initialLoadAt: new Date(),
    },
    create: {
      specialist: specialistId, status: "ATUALIZADO",
      lastUpdated: new Date(), lastChecked: new Date(),
      version, docCount, docsByCategory: JSON.stringify(byCategory),
      nextUpdate: nextScheduledUpdate(), sources: sp.sources.join("\n"),
      initialLoadDone: true, initialLoadAt: new Date(),
    },
  })

  const log = await prisma.especialistaUpdateLog.create({
    data: {
      specialist: specialistId, version,
      newDocs: indexed, updatedDocs: 0, removedDocs: 0,
      duration, triggeredBy: "initial-load",
      status: errors > 0 ? "completed_with_errors" : "completed",
    },
  })

  return {
    error: false,
    base,
    log,
    indexed,
    errors,
    duration,
    message: `Carga inicial concluída: ${indexed} documentos indexados em ${duration}ms.`,
  }
}

// ─── GET — list all bases ──────────────────────────────────────────────────────

export async function GET() {
  await ensureBases()
  const bases = await prisma.especialistaBase.findMany({ orderBy: { specialist: "asc" } })
  return NextResponse.json(bases)
}

// ─── POST — update or initial-load ───────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json() as {
    specialist?: string
    force?: boolean
    action?: "update-all" | "update-outdated" | "update-one" | "initial-load" | "reindex" | "verificar-integridade" | "verificar-status" | "atualizar-via-manager"
    triggeredBy?: string
  }

  const { specialist, force = false, action, triggeredBy = "manual" } = body

  // ── Verificar Status (UpdateManager): detecção de staleness + agendamento ──
  if (action === "verificar-status" && specialist) {
    const [detection, isDue, base] = await Promise.all([
      updateManager.checkIfNeedsUpdate(specialist),
      updateManager.isDue(specialist),
      updateManager.baseRecord(specialist),
    ])
    return NextResponse.json({
      specialist,
      needsUpdate:    detection.needsUpdate,
      isDue,
      reason:         detection.reason,
      staleDays:      detection.staleDays,
      changedSources: detection.changedSources,
      newSources:     detection.newSources,
      lastUpdated:    base?.lastUpdated   ?? null,
      nextUpdate:     base?.nextUpdate    ?? null,
      docCount:       base?.docCount      ?? 0,
      status:         base?.status        ?? "DESATUALIZADO",
      version:        base?.version       ?? null,
      checkedAt:      detection.checkedAt,
    })
  }

  // ── Atualizar Base via UpdateManager (incremental, com invalidação de cache) ─
  if (action === "atualizar-via-manager" && specialist) {
    const result = await updateManager.update(specialist, {
      trigger:         "manual",
      invalidateCache: true,
    })
    // Mantém a base sincronizada para o GET retornar dados frescos
    const base = await updateManager.baseRecord(specialist)
    return NextResponse.json({
      specialist,
      status:          result.status,
      newDocs:         result.newDocs,
      updatedDocs:     result.updatedDocs,
      removedDocs:     result.removedDocs,
      duration:        result.duration,
      version:         result.version,
      cacheInvalidated: result.cacheInvalidated,
      error:           result.error ?? null,
      docCount:        base?.docCount ?? 0,
      lastUpdated:     base?.lastUpdated ?? null,
      message: result.status === "completed"
        ? `Base atualizada: ${result.updatedDocs} docs sincronizados, ${result.removedDocs} revogados.`
        : result.status === "skipped"
        ? `Atualização ignorada: ${result.error}`
        : `Falha na atualização: ${result.error}`,
    })
  }

  // ── Verificar Integridade: contagem de docs, embeddings e revogados ──
  if (action === "verificar-integridade" && specialist) {
    const total    = await prisma.especialistaDocument.count({ where: { specialist } })
    const revoked  = await prisma.especialistaDocument.count({ where: { specialist, isRevoked: true } })
    const active   = await prisma.especialistaDocument.count({ where: { specialist, isRevoked: false } })
    const withEmb  = await prisma.especialistaDocument.count({ where: { specialist, isRevoked: false, NOT: { embedding: null } } })
    const withoutEmb = active - withEmb
    const base     = await prisma.especialistaBase.findUnique({ where: { specialist } })
    const coverage = active > 0 ? Math.round((withEmb / active) * 100) : 0
    return NextResponse.json({
      specialist,
      total,
      active,
      revoked,
      withEmbedding: withEmb,
      withoutEmbedding: withoutEmb,
      coverage,
      lastUpdated: base?.lastUpdated ?? null,
      version: base?.version ?? null,
      status: coverage >= 80 ? "ok" : coverage >= 40 ? "parcial" : "critico",
      message: `Integridade verificada: ${withEmb}/${active} docs indexados semanticamente (${coverage}% cobertura).`,
    })
  }

  // ── Reindex: gera embeddings para todos os docs sem embedding ──
  if (action === "reindex" && specialist) {
    const result = await reindexSpecialist(specialist)
    await prisma.especialistaBase.updateMany({
      where: { specialist },
      data: { lastChecked: new Date() },
    })
    return NextResponse.json({
      message: `Reindexação concluída: ${result.indexed} docs indexados, ${result.errors} erros.`,
      ...result,
    })
  }

  // ── Initial load (eSocial) ──
  if (action === "initial-load" && specialist) {
    const result = await runInitialLoad(specialist)
    if (result.error) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }
    return NextResponse.json(result)
  }

  // ── Single specialist incremental update ──
  if (specialist) {
    const result = await updateOneSpecialist(specialist, { force, triggeredBy })
    if (result.error) {
      return NextResponse.json(
        { error: result.message, code: result.code, base: result.base },
        { status: 409 }
      )
    }
    return NextResponse.json({
      base: result.base, log: result.log,
      message: `Base atualizada: ${result.base?.docCount} documentos.`,
    })
  }

  // ── All specialists ──
  if (action === "update-all") {
    await ensureBases()
    const results = []
    for (const s of SPECIALISTS) {
      const r = await updateOneSpecialist(s.id, { force: false, triggeredBy })
      if (!r.error) results.push(r)
    }
    const bases = await prisma.especialistaBase.findMany({ orderBy: { specialist: "asc" } })
    return NextResponse.json({ bases, logs: results.map(r => r.log), message: "Todas as bases atualizadas." })
  }

  // ── Only outdated ──
  if (action === "update-outdated") {
    await ensureBases()
    const all = await prisma.especialistaBase.findMany()
    const outdated = all.filter(b =>
      (b.status !== "ATUALIZADO" && b.status !== "CARGA_PENDENTE" && b.status !== "CARGA_EM_ANDAMENTO") ||
      b.docCount === 0
    )
    const results = []
    for (const b of outdated) {
      const r = await updateOneSpecialist(b.specialist, { force: false, triggeredBy })
      if (!r.error) results.push(r)
    }
    const bases = await prisma.especialistaBase.findMany({ orderBy: { specialist: "asc" } })
    return NextResponse.json({ bases, logs: results.map(r => r.log), message: `${results.length} base(s) atualizada(s).` })
  }

  // ── Fallback: seed all (non-initial-load specialists only) ──
  await ensureBases()
  for (const s of SPECIALISTS) {
    await updateOneSpecialist(s.id, { force: false, triggeredBy })
  }
  const bases = await prisma.especialistaBase.findMany({ orderBy: { specialist: "asc" } })
  return NextResponse.json({ bases, message: "Todas as bases verificadas." })
}
