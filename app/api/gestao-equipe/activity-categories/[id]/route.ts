import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, description, department, color, icon, active, order } = body

  if (name !== undefined && !name?.trim())
    return NextResponse.json({ error: "Nome não pode ser vazio" }, { status: 400 })

  if (name) {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, " ")
    const existing = await prisma.activityCategory.findMany({
      where: { id: { not: params.id } }, select: { name: true },
    })
    const dup = existing.find(e => e.name.trim().toLowerCase().replace(/\s+/g, " ") === normalized)
    if (dup) return NextResponse.json({ error: `Já existe categoria com nome similar: "${dup.name}"` }, { status: 409 })
  }

  const cat = await prisma.activityCategory.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(department !== undefined && { department: department || null }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(active !== undefined && { active }),
      ...(order !== undefined && { order }),
    },
    include: { _count: { select: { activities: true } } },
  })
  return NextResponse.json(cat)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const count = await prisma.activityTemplate.count({ where: { categoryId: params.id } })
  if (count > 0)
    return NextResponse.json(
      { error: `Esta categoria possui ${count} atividade(s) vinculada(s). Desative-a ou mova as atividades antes de excluir.` },
      { status: 409 }
    )
  await prisma.activityCategory.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
