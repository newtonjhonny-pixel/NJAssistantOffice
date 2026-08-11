import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

const INCLUDE = {
  actCategory: true,
  items: { orderBy: { order: "asc" as const } },
  _count: { select: { memberLinks: true } },
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const active = searchParams.get("active")
  const categoryId = searchParams.get("categoryId")
  const categoryStr = searchParams.get("category")
  const search = searchParams.get("search")

  const templates = await prisma.activityTemplate.findMany({
    where: {
      ...(active !== null && active !== "" && { active: active === "true" }),
      ...(categoryId && { categoryId }),
      ...(categoryStr && !categoryId && { category: categoryStr }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    },
    include: INCLUDE,
    orderBy: [{ order: "asc" }, { name: "asc" }],
  })
  return NextResponse.json(templates)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, description, categoryId, category, department, active, order, observations, items } = body

  if (!name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ")
  const existing = await prisma.activityTemplate.findMany({ select: { name: true } })
  const dup = existing.find(e => e.name.trim().toLowerCase().replace(/\s+/g, " ") === normalized)
  if (dup) return NextResponse.json({ error: `Já existe uma atividade com nome similar: "${dup.name}"` }, { status: 409 })

  let derivedCategory = category || null
  if (categoryId && !derivedCategory) {
    const cat = await prisma.activityCategory.findUnique({ where: { id: categoryId }, select: { name: true } })
    derivedCategory = cat?.name ?? null
  }

  const template = await prisma.activityTemplate.create({
    data: {
      name: name.trim(),
      description: description || null,
      categoryId: categoryId || null,
      category: derivedCategory,
      department: department || null,
      active: active !== false,
      order: order ?? 0,
      observations: observations || null,
      ...(items?.length > 0 && {
        items: {
          create: (items as any[]).map((it, idx) => ({
            title: it.title?.trim() || `Item ${idx + 1}`,
            description: it.description || null,
            order: it.order ?? idx,
            required: it.required !== false,
            defaultResponsible: it.defaultResponsible || null,
            defaultDays: it.defaultDays ?? null,
            observation: it.observation || null,
            active: it.active !== false,
          })),
        },
      }),
    },
    include: INCLUDE,
  })
  return NextResponse.json(template, { status: 201 })
}
