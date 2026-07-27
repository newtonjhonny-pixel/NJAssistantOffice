import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status   = searchParams.get("status")
  const type     = searchParams.get("type")
  const search   = searchParams.get("q")
  const favorite = searchParams.get("favorite")

  const items = await prisma.presentation.findMany({
    where: {
      ...(status   && status !== "all" && { status }),
      ...(type     && { type }),
      ...(favorite === "true" && { favorite: true }),
      ...(search && {
        OR: [
          { title:       { contains: search } },
          { description: { contains: search } },
          { objective:   { contains: search } },
        ],
      }),
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: { select: { versions: true, history: true } },
    },
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    await prisma.user.upsert({
      where:  { id: "default-user" },
      update: {},
      create: { id: "default-user", name: "Newton", email: "admin@sistema.local", role: "admin" },
    })

    const item = await prisma.presentation.create({
      data: {
        title:       body.title,
        description: body.description ?? null,
        type:        body.type,
        status:      "draft",
        objective:   body.objective  ?? null,
        audience:    body.audience   ?? null,
        tags:        body.tags       ?? null,
        userId:      "default-user",
      },
    })

    await prisma.presentationHistory.create({
      data: {
        presentationId: item.id,
        action:         "CRIACAO",
        description:    "Apresentação criada",
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[POST /api/apresentacoes]", message)
    return NextResponse.json({ error: "Não foi possível criar a apresentação." }, { status: 500 })
  }
}
