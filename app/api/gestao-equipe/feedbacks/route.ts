import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")
  const type = searchParams.get("type")

  const feedbacks = await prisma.teamFeedback.findMany({
    where: {
      ...(memberId && { memberId }),
      ...(type && { type }),
    },
    include: { member: { select: { id: true, name: true, role: true } } },
    orderBy: { feedbackDate: "desc" },
  })
  return NextResponse.json(feedbacks)
}

export async function POST(req: Request) {
  const body = await req.json()
  const {
    memberId, feedbackDate, type, observedSituation,
    positivePoints, improvementPoints, orientationGiven,
    agreedAction, nextFollowUp, observations, aiGenerated, aiContent,
  } = body
  if (!memberId || !type) {
    return NextResponse.json({ error: "Colaborador e tipo são obrigatórios" }, { status: 400 })
  }
  const feedback = await prisma.teamFeedback.create({
    data: {
      memberId, type,
      feedbackDate: feedbackDate ? new Date(feedbackDate) : new Date(),
      observedSituation: observedSituation || null,
      positivePoints: positivePoints || null,
      improvementPoints: improvementPoints || null,
      orientationGiven: orientationGiven || null,
      agreedAction: agreedAction || null,
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
      observations: observations || null,
      aiGenerated: aiGenerated ?? false,
      aiContent: aiContent || null,
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })
  await prisma.teamHistory.create({
    data: {
      memberId,
      type: "FEEDBACK",
      title: `Feedback registrado: ${type}`,
      description: feedback.member.name,
    },
  })
  return NextResponse.json(feedback, { status: 201 })
}
