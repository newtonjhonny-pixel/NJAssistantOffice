import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")
  const status = searchParams.get("status")

  const directions = await prisma.teamActivityDirection.findMany({
    where: {
      ...(memberId && { memberId }),
      ...(status && { status }),
    },
    include: { member: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(directions)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { memberId, title, description, dueDate, priority, complexity, expectedResult, aiOrientation, status } = body
  if (!memberId || !title) {
    return NextResponse.json({ error: "Colaborador e título são obrigatórios" }, { status: 400 })
  }
  const direction = await prisma.teamActivityDirection.create({
    data: {
      memberId, title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || "MEDIA",
      complexity: complexity || "SIMPLES",
      expectedResult: expectedResult || null,
      aiOrientation: aiOrientation || null,
      status: status || "PLANEJADA",
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })
  await prisma.teamHistory.create({
    data: {
      memberId,
      type: "ATIVIDADE_DIRECIONADA",
      title: `Direcionamento: ${title}`,
      description: direction.member.name,
    },
  })
  return NextResponse.json(direction, { status: 201 })
}
