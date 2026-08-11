import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { observation, includedAt } = body

  const link = await prisma.memberActivityItemLink.update({
    where: { id: params.id },
    data: {
      ...(observation !== undefined && { observation: observation || null }),
      ...(includedAt !== undefined && { includedAt }),
    },
    include: { item: true },
  })
  return NextResponse.json(link)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.memberActivityItemLink.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
