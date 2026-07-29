import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { title, description, order, required, defaultResponsible, defaultDays, observation, active } = body

  const item = await prisma.activityItem.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title: title?.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(order !== undefined && { order }),
      ...(required !== undefined && { required }),
      ...(defaultResponsible !== undefined && { defaultResponsible: defaultResponsible || null }),
      ...(defaultDays !== undefined && { defaultDays: defaultDays ?? null }),
      ...(observation !== undefined && { observation: observation || null }),
      ...(active !== undefined && { active }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  // Verifica vínculos com colaboradores
  const links = await prisma.memberActivityItemLink.count({ where: { itemId: params.id } })
  if (links > 0)
    return NextResponse.json(
      { error: `Este item está vinculado a ${links} colaborador(es). Desative-o ao invés de excluir.` },
      { status: 409 }
    )
  await prisma.activityItem.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

// Duplicar item
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const original = await prisma.activityItem.findUnique({ where: { id: params.id } })
  if (!original) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })

  const maxOrder = await prisma.activityItem.findFirst({
    where: { activityId: original.activityId },
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const copy = await prisma.activityItem.create({
    data: {
      activityId: original.activityId,
      title: `${original.title} (cópia)`,
      description: original.description,
      order: (maxOrder?.order ?? 0) + 1,
      required: original.required,
      defaultResponsible: original.defaultResponsible,
      defaultDays: original.defaultDays,
      observation: original.observation,
      active: original.active,
    },
  })
  return NextResponse.json(copy, { status: 201 })
}
