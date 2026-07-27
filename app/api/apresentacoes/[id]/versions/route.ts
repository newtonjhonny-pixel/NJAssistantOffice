import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET — list versions
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const versions = await prisma.presentationVersion.findMany({
    where:   { presentationId: params.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(versions)
}

// POST — save a new snapshot
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { label } = await req.json()

    const presentation = await prisma.presentation.findUnique({
      where: { id: params.id },
      select: { content: true },
    })
    if (!presentation) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const version = await prisma.presentationVersion.create({
      data: {
        presentationId: params.id,
        label:          label?.trim() || null,
        content:        presentation.content ?? "",
      },
    })

    await prisma.presentationHistory.create({
      data: {
        presentationId: params.id,
        action:         "EDICAO",
        description:    `Versão salva: ${label?.trim() || "sem título"}`,
      },
    })

    return NextResponse.json(version)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
