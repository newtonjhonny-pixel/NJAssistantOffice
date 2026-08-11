import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")
  const status = searchParams.get("status")

  const trainings = await prisma.teamTraining.findMany({
    where: {
      ...(memberId && { memberId }),
      ...(status && { status }),
    },
    include: { member: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(trainings)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { memberId, topic, objective, plannedDate, completedDate, status, responsible, expectedResult, evaluation, observations, aiPlan } = body
  if (!memberId || !topic) {
    return NextResponse.json({ error: "Colaborador e tema são obrigatórios" }, { status: 400 })
  }
  const training = await prisma.teamTraining.create({
    data: {
      memberId, topic,
      objective: objective || null,
      plannedDate: plannedDate ? new Date(plannedDate) : null,
      completedDate: completedDate ? new Date(completedDate) : null,
      status: status || "PLANEJADO",
      responsible: responsible || null,
      expectedResult: expectedResult || null,
      evaluation: evaluation || null,
      observations: observations || null,
      aiPlan: aiPlan || null,
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })
  await prisma.teamHistory.create({
    data: {
      memberId,
      type: "TREINAMENTO",
      title: `Treinamento: ${topic}`,
      description: training.member.name,
    },
  })
  return NextResponse.json(training, { status: 201 })
}
