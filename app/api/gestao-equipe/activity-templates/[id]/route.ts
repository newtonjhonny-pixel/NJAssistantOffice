import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

const INCLUDE = {
  actCategory: true,
  items: { orderBy: { order: "asc" as const } },
  _count: { select: { memberLinks: true } },
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const t = await prisma.activityTemplate.findUnique({ where: { id: params.id }, include: INCLUDE })
  if (!t) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(t)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, description, categoryId, category, department, active, order, observations } = body

  if (name !== undefined && !name?.trim())
    return NextResponse.json({ error: "Nome não pode ser vazio" }, { status: 400 })

  if (name) {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, " ")
    const existing = await prisma.activityTemplate.findMany({ where: { id: { not: params.id } }, select: { name: true } })
    const dup = existing.find(e => e.name.trim().toLowerCase().replace(/\s+/g, " ") === normalized)
    if (dup) return NextResponse.json({ error: `Já existe atividade com nome similar: "${dup.name}"` }, { status: 409 })
  }

  // Sincronizar category string quando categoryId mudar
  let derivedCategory = category
  if (categoryId !== undefined && derivedCategory === undefined) {
    if (categoryId) {
      const cat = await prisma.activityCategory.findUnique({ where: { id: categoryId }, select: { name: true } })
      derivedCategory = cat?.name ?? null
    } else {
      derivedCategory = null
    }
  }

  const template = await prisma.activityTemplate.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(derivedCategory !== undefined && { category: derivedCategory }),
      ...(department !== undefined && { department: department || null }),
      ...(active !== undefined && { active }),
      ...(order !== undefined && { order }),
      ...(observations !== undefined && { observations: observations || null }),
    },
    include: INCLUDE,
  })
  return NextResponse.json(template)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const links = await prisma.memberActivityLink.count({ where: { activityTemplateId: params.id } })
  if (links > 0)
    return NextResponse.json(
      { error: `Esta atividade está vinculada a ${links} colaborador(es). Desative-a ou remova os vínculos antes de excluir.` },
      { status: 409 }
    )
  await prisma.activityTemplate.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

// Duplicar atividade (com itens)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const original = await prisma.activityTemplate.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { order: "asc" } } },
  })
  if (!original) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const copy = await prisma.activityTemplate.create({
    data: {
      name: `${original.name} (cópia)`,
      description: original.description,
      categoryId: original.categoryId,
      category: original.category,
      department: original.department,
      active: original.active,
      order: original.order + 1,
      observations: original.observations,
      items: {
        create: original.items.map(it => ({
          title: it.title,
          description: it.description,
          order: it.order,
          required: it.required,
          defaultResponsible: it.defaultResponsible,
          defaultDays: it.defaultDays,
          observation: it.observation,
          active: it.active,
        })),
      },
    },
    include: INCLUDE,
  })
  return NextResponse.json(copy, { status: 201 })
}
