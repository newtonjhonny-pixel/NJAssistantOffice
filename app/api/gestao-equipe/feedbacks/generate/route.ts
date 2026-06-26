import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateFeedbackAI } from "@/lib/ai/team"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json()
  const { memberId, type, context } = body
  if (!memberId || !type || !context) {
    return NextResponse.json({ error: "memberId, type e context são obrigatórios" }, { status: 400 })
  }
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } })
  if (!member) return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 })

  const result = await generateFeedbackAI(member, type, context)
  return NextResponse.json(result)
}
