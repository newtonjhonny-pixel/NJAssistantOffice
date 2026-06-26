import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const v = await prisma.teamVacation.update({
    where: { id: params.id },
    data: {
      acquisitivePeriod: body.acquisitivePeriod ?? undefined,
      availableDays: body.availableDays != null ? Number(body.availableDays) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      returnDate: body.returnDate ? new Date(body.returnDate) : undefined,
      ...(body.status && { status: body.status }),
      substitute: body.substitute ?? undefined,
      observations: body.observations ?? undefined,
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })
  if (body.status) {
    await prisma.teamHistory.create({
      data: {
        memberId: v.memberId,
        type: "FERIAS",
        title: `Férias: status alterado para ${body.status}`,
        description: v.member.name,
      },
    })
  }
  return NextResponse.json(v)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.teamVacation.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
