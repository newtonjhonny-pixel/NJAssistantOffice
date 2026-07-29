import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")
  const category = searchParams.get("category")
  const department = searchParams.get("department")
  const search = searchParams.get("search")

  const links = await prisma.memberActivityLink.findMany({
    where: {
      ...(memberId && { memberId }),
      ...(category && { activityTemplate: { category } }),
      ...(department && { activityTemplate: { department } }),
      ...(search && {
        OR: [
          { activityTemplate: { name: { contains: search } } },
          { member: { name: { contains: search } } },
        ],
      }),
    },
    include: {
      member: { select: { id: true, name: true, role: true, sector: true, unit: true } },
      activityTemplate: { include: { actCategory: true, items: { orderBy: { order: "asc" as const } } } },
      itemLinks: { include: { item: true }, orderBy: { item: { order: "asc" as const } } },
    },
    orderBy: [{ member: { name: "asc" } }, { includedAt: "desc" }],
  })
  return NextResponse.json(links)
}

// POST: vincular uma ou várias atividades a um colaborador de uma vez
export async function POST(req: Request) {
  const body = await req.json()
  const { memberId, activityTemplateIds, includedAt, observations } = body as {
    memberId: string
    activityTemplateIds: string[]
    includedAt: string   // YYYY-MM-DD
    observations?: string
  }

  if (!memberId) return NextResponse.json({ error: "Colaborador é obrigatório" }, { status: 400 })
  if (!activityTemplateIds?.length) return NextResponse.json({ error: "Selecione ao menos uma atividade" }, { status: 400 })

  const today = includedAt || new Date().toISOString().slice(0, 10)

  // Verificar duplicidades
  const existing = await prisma.memberActivityLink.findMany({
    where: { memberId, activityTemplateId: { in: activityTemplateIds } },
    include: { activityTemplate: { select: { name: true } } },
  })

  const existingIds = new Set(existing.map(e => e.activityTemplateId))
  const toCreate = activityTemplateIds.filter(id => !existingIds.has(id))

  const created = await Promise.all(
    toCreate.map(activityTemplateId =>
      prisma.memberActivityLink.create({
        data: { memberId, activityTemplateId, includedAt: today, observation: observations || null },
        include: {
          member: { select: { id: true, name: true, role: true, sector: true, unit: true } },
          activityTemplate: { include: { actCategory: true, items: { orderBy: { order: "asc" as const } } } },
          itemLinks: { include: { item: true } },
        },
      })
    )
  )

  // Registrar histórico
  const member = await prisma.teamMember.findUnique({ where: { id: memberId }, select: { name: true } })
  if (created.length > 0) {
    await prisma.teamHistory.create({
      data: {
        memberId,
        type: "ATIVIDADE_VINCULADA",
        title: `${created.length} atividade(s) vinculada(s)`,
        description: `${member?.name} — ${created.map((c: any) => c.activityTemplate.name).join(", ")}`,
      },
    })
  }

  return NextResponse.json({
    created,
    skipped: existing.map(e => e.activityTemplate.name),
    createdCount: created.length,
    skippedCount: existing.length,
  }, { status: 201 })
}
