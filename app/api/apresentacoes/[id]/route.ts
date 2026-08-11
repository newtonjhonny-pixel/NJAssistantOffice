import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.presentation.findUnique({
    where: { id: params.id },
    include: {
      versions: { orderBy: { createdAt: "desc" } },
      history:  { orderBy: { createdAt: "desc" } },
    },
  })
  if (!item) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const content = body.content === undefined
      ? undefined
      : typeof body.content === "string"
        ? body.content
        : JSON.stringify(body.content)

    const item = await prisma.presentation.update({
      where: { id: params.id },
      data: {
        ...(body.title       !== undefined && { title:       body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type        !== undefined && { type:        body.type }),
        ...(body.status      !== undefined && { status:      body.status }),
        ...(content          !== undefined && { content }),
        ...(body.thumbnail   !== undefined && { thumbnail:   body.thumbnail }),
        ...(body.favorite    !== undefined && { favorite:    body.favorite }),
        ...(body.tags        !== undefined && { tags:        body.tags }),
        ...(body.objective   !== undefined && { objective:   body.objective }),
        ...(body.audience    !== undefined && { audience:    body.audience }),
        ...(body.linkedTo    !== undefined && { linkedTo:    body.linkedTo }),
      },
    })

    await prisma.presentationHistory.create({
      data: {
        presentationId: params.id,
        action:         body.favorite !== undefined ? "FAVORITO" : "EDICAO",
        description:    body.historyNote ?? "Apresentação atualizada",
      },
    })

    return NextResponse.json(item)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[PUT /api/apresentacoes/[id]]", message)
    return NextResponse.json({ error: "Não foi possível atualizar." }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.presentation.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[DELETE /api/apresentacoes/[id]]", message)
    return NextResponse.json({ error: "Não foi possível excluir." }, { status: 500 })
  }
}
