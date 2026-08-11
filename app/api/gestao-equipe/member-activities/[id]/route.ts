import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { observation, includedAt } = body

  const link = await prisma.memberActivityLink.update({
    where: { id: params.id },
    data: {
      ...(observation !== undefined && { observation: observation || null }),
      ...(includedAt !== undefined && { includedAt }),
    },
    include: {
      member: { select: { id: true, name: true, role: true, sector: true, unit: true } },
      activityTemplate: true,
    },
  })

  await prisma.teamHistory.create({
    data: {
      memberId: link.memberId,
      type: "ATIVIDADE_EDITADA",
      title: `Observação editada: ${link.activityTemplate.name}`,
      description: link.member.name,
    },
  })

  return NextResponse.json(link)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const link = await prisma.memberActivityLink.findUnique({
    where: { id: params.id },
    include: {
      member: { select: { name: true } },
      activityTemplate: { select: { name: true } },
    },
  })
  if (!link) return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 })

  await prisma.memberActivityLink.delete({ where: { id: params.id } })

  await prisma.teamHistory.create({
    data: {
      memberId: link.memberId,
      type: "ATIVIDADE_REMOVIDA",
      title: `Atividade removida: ${link.activityTemplate.name}`,
      description: link.member.name,
    },
  })

  return NextResponse.json({ ok: true })
}
