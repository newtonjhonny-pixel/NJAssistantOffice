import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET: itens vinculados a um MemberActivityLink específico
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const linkId = searchParams.get("linkId")
  const memberId = searchParams.get("memberId")

  const itemLinks = await prisma.memberActivityItemLink.findMany({
    where: {
      ...(linkId && { linkId }),
      ...(memberId && { link: { memberId } }),
    },
    include: {
      item: true,
      link: {
        include: {
          member: { select: { id: true, name: true, role: true, sector: true, unit: true } },
          activityTemplate: { include: { actCategory: true } },
        },
      },
    },
    orderBy: [{ link: { activityTemplate: { name: "asc" } } }, { item: { order: "asc" } }],
  })
  return NextResponse.json(itemLinks)
}

// POST: vincular itens a um MemberActivityLink (bulk)
export async function POST(req: Request) {
  const body = await req.json()
  const { linkId, itemIds, includedAt, observation } = body as {
    linkId: string
    itemIds: string[]
    includedAt: string
    observation?: string
  }

  if (!linkId) return NextResponse.json({ error: "linkId é obrigatório" }, { status: 400 })
  if (!itemIds?.length) return NextResponse.json({ error: "Selecione ao menos um item" }, { status: 400 })

  const today = includedAt || new Date().toISOString().slice(0, 10)

  const existing = await prisma.memberActivityItemLink.findMany({
    where: { linkId, itemId: { in: itemIds } },
    include: { item: { select: { title: true } } },
  })
  const existingIds = new Set(existing.map(e => e.itemId))
  const toCreate = itemIds.filter(id => !existingIds.has(id))

  const created = await Promise.all(
    toCreate.map(itemId =>
      prisma.memberActivityItemLink.create({
        data: { linkId, itemId, includedAt: today, observation: observation || null },
        include: { item: true },
      })
    )
  )

  return NextResponse.json({
    created,
    skipped: existing.map(e => e.item.title),
    createdCount: created.length,
    skippedCount: existing.length,
  }, { status: 201 })
}
