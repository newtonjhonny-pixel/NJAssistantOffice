import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")

  const activities = await prisma.teamActivity.findMany({
    where: {
      ...(memberId && { memberId }),
      ...(status && { status }),
      ...(priority && { priority }),
    },
    include: { member: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(activities)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { memberId, title, description, receivedAt, dueDate, priority, status, statusObservation, expectedResult } = body
  if (!memberId || !title) {
    return NextResponse.json({ error: "Colaborador e título são obrigatórios" }, { status: 400 })
  }
  const activity = await prisma.teamActivity.create({
    data: {
      memberId, title,
      description: description || null,
      receivedAt: receivedAt ? new Date(receivedAt) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || "MEDIA",
      status: status || "PENDENTE",
      statusObservation: statusObservation || null,
      expectedResult: expectedResult || null,
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })
  await prisma.teamHistory.create({
    data: {
      memberId,
      type: "ATIVIDADE_DIRECIONADA",
      title: `Atividade: ${title}`,
      description: `${activity.member.name} — ${status || "PENDENTE"}`,
    },
  })
  return NextResponse.json(activity, { status: 201 })
}
