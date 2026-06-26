import { NextResponse } from "next/server"
import { generateGuidelineAI } from "@/lib/ai/team"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json()
  const { title, category, reason } = body
  if (!title || !category || !reason) {
    return NextResponse.json({ error: "title, category e reason são obrigatórios" }, { status: 400 })
  }
  const result = await generateGuidelineAI(title, category, reason)
  return NextResponse.json(result)
}
