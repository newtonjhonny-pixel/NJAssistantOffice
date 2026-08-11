import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const activityId = searchParams.get("activityId")
  const active = searchParams.get("active")

  const items = await prisma.activityItem.findMany({
    where: {
      ...(activityId && { activityId }),
      ...(active !== null && active !== "" && { active: active === "true" }),
    },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { activityId, title, description, order, required, defaultResponsible, defaultDays, observation, active } = body

  if (!activityId) return NextResponse.json({ error: "activityId é obrigatório" }, { status: 400 })
  if (!title?.trim()) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })

  const item = await prisma.activityItem.create({
    data: {
      activityId,
      title: title.trim(),
      description: description || null,
      order: order ?? 0,
      required: required !== false,
      defaultResponsible: defaultResponsible || null,
      defaultDays: defaultDays ?? null,
      observation: observation || null,
      active: active !== false,
    },
  })
  return NextResponse.json(item, { status: 201 })
}

// Bulk reorder
export async function PUT(req: Request) {
  const body = await req.json()
  const { items } = body as { items: { id: string; order: number }[] }
  if (!Array.isArray(items)) return NextResponse.json({ error: "items[] required" }, { status: 400 })

  await Promise.all(
    items.map(({ id, order }) =>
      prisma.activityItem.update({ where: { id }, data: { order } })
    )
  )
  return NextResponse.json({ ok: true })
}
