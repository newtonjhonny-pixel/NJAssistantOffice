import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const member = await prisma.teamMember.findUnique({
    where: { id: params.id },
    include: {
      feedbacks:  { orderBy: { feedbackDate: "desc" } },
      directions: { orderBy: { createdAt: "desc" } },
      vacations:  { orderBy: { createdAt: "desc" } },
      trainings:  { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
      history:    { orderBy: { createdAt: "desc" }, take: 20 },
    },
  })
  if (!member) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // Busca companyId (coluna extra não mapeada no schema Prisma)
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT m."companyId", cc."code" AS "companyCode", cc."name" AS "companyName"
       FROM "TeamMember" m
       LEFT JOIN "ClientCompany" cc ON cc."id" = m."companyId"
       WHERE m."id" = ?`,
      params.id
    )
    if (rows.length) {
      return NextResponse.json({
        ...member,
        companyId:   rows[0].companyId,
        companyCode: rows[0].companyCode,
        companyName: rows[0].companyName,
      })
    }
  } catch {}

  return NextResponse.json(member)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, role, sector, unit, email, phone, joinedAt, status, observations, companyId } = body

  const member = await prisma.teamMember.update({
    where: { id: params.id },
    data: {
      ...(name         !== undefined && { name }),
      ...(role         !== undefined && { role }),
      sector:      sector      ?? null,
      unit:        unit        ?? null,
      email:       email       ?? null,
      phone:       phone       ?? null,
      joinedAt:    joinedAt ? new Date(joinedAt) : null,
      ...(status !== undefined && { status }),
      observations: observations ?? null,
    },
  })

  // Atualiza companyId via raw SQL se enviado (incluindo null para desvincular)
  if (Object.prototype.hasOwnProperty.call(body, 'companyId')) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "TeamMember" SET "companyId" = ? WHERE "id" = ?`,
        companyId || null, params.id
      )
    } catch {}
  }

  if (status) {
    await prisma.teamHistory.create({
      data: {
        memberId:    member.id,
        type:        "STATUS",
        title:       `Status alterado para ${status}`,
        description: member.name,
      },
    })
  }

  return NextResponse.json({ ...member, companyId: companyId !== undefined ? companyId || null : undefined })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.teamMember.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
