import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const active = searchParams.get("active")
  const search = searchParams.get("search")

  const categories = await prisma.activityCategory.findMany({
    where: {
      ...(active !== null && active !== "" && { active: active === "true" }),
      ...(search && { name: { contains: search } }),
    },
    include: { _count: { select: { activities: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, description, department, color, icon, active, order } = body

  if (!name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ")
  const existing = await prisma.activityCategory.findMany({ select: { name: true } })
  const dup = existing.find(e => e.name.trim().toLowerCase().replace(/\s+/g, " ") === normalized)
  if (dup) return NextResponse.json({ error: `Já existe uma categoria com nome similar: "${dup.name}"` }, { status: 409 })

  const cat = await prisma.activityCategory.create({
    data: {
      name: name.trim(),
      description: description || null,
      department: department || null,
      color: color || "#6B7280",
      icon: icon || "📋",
      active: active !== false,
      order: order ?? 0,
    },
    include: { _count: { select: { activities: true } } },
  })
  return NextResponse.json(cat, { status: 201 })
}
