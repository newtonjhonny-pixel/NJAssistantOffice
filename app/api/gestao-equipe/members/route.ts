import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  const members = await prisma.teamMember.findMany({
    where: {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { role: { contains: search } },
          { sector: { contains: search } },
        ],
      }),
    },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          feedbacks: true,
          directions: true,
          vacations: true,
          trainings: true,
          activities: true,
        },
      },
    },
  })
  return NextResponse.json(members)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, role, sector, unit, email, phone, joinedAt, status, observations } = body
  if (!name || !role) {
    return NextResponse.json({ error: "Nome e cargo são obrigatórios" }, { status: 400 })
  }
  const member = await prisma.teamMember.create({
    data: {
      name, role,
      sector: sector || null,
      unit: unit || null,
      email: email || null,
      phone: phone || null,
      joinedAt: joinedAt ? new Date(joinedAt) : null,
      status: status || "ATIVO",
      observations: observations || null,
    },
  })
  await prisma.teamHistory.create({
    data: {
      memberId: member.id,
      type: "MEMBRO_CRIADO",
      title: "Colaborador cadastrado",
      description: `${name} — ${role}`,
    },
  })
  return NextResponse.json(member, { status: 201 })
}
