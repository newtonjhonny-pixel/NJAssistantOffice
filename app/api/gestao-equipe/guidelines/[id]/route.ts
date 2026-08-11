import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const g = await prisma.teamGuideline.update({
    where: { id: params.id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.category && { category: body.category }),
      description: body.description ?? undefined,
      reason: body.reason ?? undefined,
      practicalUse: body.practicalUse ?? undefined,
      responsible: body.responsible ?? undefined,
      ...(body.status && { status: body.status }),
      observations: body.observations ?? undefined,
      aiContent: body.aiContent ?? undefined,
    },
  })
  return NextResponse.json(g)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.teamGuideline.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
