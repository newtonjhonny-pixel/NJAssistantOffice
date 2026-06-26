import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateDirectionAI } from "@/lib/ai/team"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json()
  const { memberId, title, description, priority, complexity } = body
  if (!memberId || !title) {
    return NextResponse.json({ error: "memberId e title são obrigatórios" }, { status: 400 })
  }
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } })
  if (!member) return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 })

  const result = await generateDirectionAI(member, title, description || "", priority || "MEDIA", complexity || "SIMPLES")
  return NextResponse.json(result)
}
