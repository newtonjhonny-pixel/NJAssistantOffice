import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const feedback = await prisma.teamFeedback.update({
    where: { id: params.id },
    data: {
      ...(body.type && { type: body.type }),
      ...(body.feedbackDate && { feedbackDate: new Date(body.feedbackDate) }),
      observedSituation: body.observedSituation ?? undefined,
      positivePoints: body.positivePoints ?? undefined,
      improvementPoints: body.improvementPoints ?? undefined,
      orientationGiven: body.orientationGiven ?? undefined,
      agreedAction: body.agreedAction ?? undefined,
      nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null,
      observations: body.observations ?? undefined,
      aiContent: body.aiContent ?? undefined,
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })
  return NextResponse.json(feedback)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.teamFeedback.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
