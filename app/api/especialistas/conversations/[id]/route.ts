import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const conv = await prisma.especialistaConversation.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })
  if (!conv) return NextResponse.json({ error: "Não encontrada." }, { status: 404 })
  return NextResponse.json(conv)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { title, specialist, isFavorite, isArchived } = body
  const conv = await prisma.especialistaConversation.update({
    where: { id: params.id },
    data: {
      ...(title      !== undefined && { title:      title.trim() }),
      ...(specialist !== undefined && { specialist }),
      ...(isFavorite !== undefined && { isFavorite }),
      ...(isArchived !== undefined && { isArchived }),
    },
  })
  return NextResponse.json(conv)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.especialistaConversation.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
