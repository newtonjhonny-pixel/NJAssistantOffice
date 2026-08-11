import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  const guidelines = await prisma.teamGuideline.findMany({
    where: {
      ...(category && { category }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(guidelines)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { title, category, description, reason, practicalUse, responsible, status, observations, aiGenerated, aiContent } = body
  if (!title || !category) {
    return NextResponse.json({ error: "Título e categoria são obrigatórios" }, { status: 400 })
  }
  const guideline = await prisma.teamGuideline.create({
    data: {
      title, category,
      description: description || null,
      reason: reason || null,
      practicalUse: practicalUse || null,
      responsible: responsible || null,
      status: status || "ATIVA",
      observations: observations || null,
      aiGenerated: aiGenerated ?? false,
      aiContent: aiContent || null,
    },
  })
  await prisma.teamHistory.create({
    data: {
      type: "DIRETRIZ",
      title: `Diretriz criada: ${title}`,
      description: category,
    },
  })
  return NextResponse.json(guideline, { status: 201 })
}
