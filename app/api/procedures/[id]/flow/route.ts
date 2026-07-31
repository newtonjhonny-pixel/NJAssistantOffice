import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// GET /api/procedures/[id]/flow — lista AS_IS e TO_BE do procedimento
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const flows = await (prisma as any).procedureFlow.findMany({
      where:   { documentId: id },
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json(flows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT /api/procedures/[id]/flow — upsert de um fluxo (type = AS_IS | TO_BE)
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { type, content } = body as { type: "AS_IS" | "TO_BE"; content: string }

  if (!type || !content) {
    return NextResponse.json({ error: "type e content são obrigatórios" }, { status: 400 })
  }
  if (type !== "AS_IS" && type !== "TO_BE") {
    return NextResponse.json({ error: "type deve ser AS_IS ou TO_BE" }, { status: 400 })
  }

  try {
    const existing = await (prisma as any).procedureFlow.findFirst({
      where: { documentId: id, type },
    })
    let flow
    if (existing) {
      flow = await (prisma as any).procedureFlow.update({
        where: { id: existing.id },
        data:  { content, updatedAt: new Date() },
      })
    } else {
      flow = await (prisma as any).procedureFlow.create({
        data: { documentId: id, type, content },
      })
    }
    return NextResponse.json(flow)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/procedures/[id]/flow?type=AS_IS|TO_BE
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const type = req.nextUrl.searchParams.get("type")
  if (!type) return NextResponse.json({ error: "type é obrigatório" }, { status: 400 })

  try {
    const existing = await (prisma as any).procedureFlow.findFirst({
      where: { documentId: id, type },
    })
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    await (prisma as any).procedureFlow.delete({ where: { id: existing.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
