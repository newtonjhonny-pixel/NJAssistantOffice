import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Returns full data for report generation (individual or general)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")
  const department = searchParams.get("department")
  const groupBy = searchParams.get("groupBy") || "member"

  const links = await prisma.memberActivityLink.findMany({
    where: {
      ...(memberId && { memberId }),
      ...(department && { member: { sector: department } }),
    },
    include: {
      member: { select: { id: true, name: true, role: true, sector: true, unit: true } },
      activityTemplate: true,
    },
    orderBy: [{ member: { name: "asc" } }, { activityTemplate: { order: "asc" } }, { activityTemplate: { name: "asc" } }],
  })

  if (groupBy === "member") {
    // Group by member
    const grouped: Record<string, { member: typeof links[0]["member"]; links: typeof links }> = {}
    for (const link of links) {
      if (!grouped[link.memberId]) grouped[link.memberId] = { member: link.member, links: [] }
      grouped[link.memberId].links.push(link)
    }
    return NextResponse.json({ groupBy: "member", groups: Object.values(grouped) })
  }

  return NextResponse.json({ groupBy: "flat", links })
}
