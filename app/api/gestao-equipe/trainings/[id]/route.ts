import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const t = await prisma.teamTraining.update({
    where: { id: params.id },
    data: {
      ...(body.topic && { topic: body.topic }),
      objective: body.objective ?? undefined,
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : undefined,
      completedDate: body.completedDate ? new Date(body.completedDate) : undefined,
      ...(body.status && { status: body.status }),
      responsible: body.responsible ?? undefined,
      expectedResult: body.expectedResult ?? undefined,
      evaluation: body.evaluation ?? undefined,
      observations: body.observations ?? undefined,
      aiPlan: body.aiPlan ?? undefined,
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })
  return NextResponse.json(t)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.teamTraining.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
