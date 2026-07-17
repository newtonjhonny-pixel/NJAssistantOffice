import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { detectSpecialist } from "@/lib/especialistas/config"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search   = searchParams.get("q") ?? ""
  const archived = searchParams.get("archived") === "true"
  const favorite = searchParams.get("favorite") === "true"

  const where: Record<string, unknown> = { isArchived: archived }
  if (favorite) where.isFavorite = true
  if (search)   where.title = { contains: search }

  const conversations = await prisma.especialistaConversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, title: true, specialist: true,
      isFavorite: true, isArchived: true,
      messageCount: true, createdAt: true, updatedAt: true,
    },
  })
  return NextResponse.json(conversations)
}

export async function POST(req: Request) {
  const { title, specialist, firstMessage } = await req.json()
  const detected = detectSpecialist(firstMessage ?? title ?? "", specialist)
  const conv = await prisma.especialistaConversation.create({
    data: {
      title:      title?.trim() || "Nova conversa",
      specialist: detected.id,
    },
  })
  return NextResponse.json(conv, { status: 201 })
}
