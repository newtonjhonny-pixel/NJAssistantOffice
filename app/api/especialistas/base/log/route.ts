import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const specialist = req.nextUrl.searchParams.get("specialist")
  const where = specialist ? { specialist } : {}

  const logs = await prisma.especialistaUpdateLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(logs)
}
