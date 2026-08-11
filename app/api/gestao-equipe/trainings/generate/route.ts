import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"
import { generateTrainingPlanAI } from "@/lib/ai/team"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json()
  const { memberId, topic, objective } = body
  if (!memberId || !topic) {
    return NextResponse.json({ error: "memberId e topic são obrigatórios" }, { status: 400 })
  }
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } })
  if (!member) return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 })

  const result = await generateTrainingPlanAI(member, topic, objective || "")
  return NextResponse.json(result)
}
