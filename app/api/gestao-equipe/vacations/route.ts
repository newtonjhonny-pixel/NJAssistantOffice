import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")
  const status = searchParams.get("status")

  const vacations = await prisma.teamVacation.findMany({
    where: {
      ...(memberId && { memberId }),
      ...(status && { status }),
    },
    include: { member: { select: { id: true, name: true, role: true, sector: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(vacations)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { memberId, acquisitivePeriod, availableDays, startDate, returnDate, status, substitute, observations } = body
  if (!memberId) {
    return NextResponse.json({ error: "Colaborador é obrigatório" }, { status: 400 })
  }
  const vacation = await prisma.teamVacation.create({
    data: {
      memberId,
      acquisitivePeriod: acquisitivePeriod || null,
      availableDays: availableDays ? Number(availableDays) : null,
      startDate: startDate ? new Date(startDate) : null,
      returnDate: returnDate ? new Date(returnDate) : null,
      status: status || "A_PROGRAMAR",
      substitute: substitute || null,
      observations: observations || null,
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })
  await prisma.teamHistory.create({
    data: {
      memberId,
      type: "FERIAS",
      title: `Férias registradas: ${status || "A_PROGRAMAR"}`,
      description: vacation.member.name,
    },
  })
  return NextResponse.json(vacation, { status: 201 })
}
