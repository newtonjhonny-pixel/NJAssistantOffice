import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()

  const prev = await prisma.teamActivity.findUnique({ where: { id: params.id } })

  const a = await prisma.teamActivity.update({
    where: { id: params.id },
    data: {
      ...(body.title && { title: body.title }),
      description: body.description ?? undefined,
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      ...(body.priority && { priority: body.priority }),
      ...(body.status && { status: body.status }),
      statusObservation: body.statusObservation ?? undefined,
      expectedResult: body.expectedResult ?? undefined,
      deliveredResult: body.deliveredResult ?? undefined,
      coordinatorRating: body.coordinatorRating ?? undefined,
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })

  if (body.status && prev?.status !== body.status) {
    await prisma.teamHistory.create({
      data: {
        memberId: a.memberId,
        type: "STATUS",
        title: `Atividade: ${prev?.status} → ${body.status}`,
        description: `${a.member.name} — ${a.title}${body.statusObservation ? ` | ${body.statusObservation}` : ""}`,
      },
    })
  }

  return NextResponse.json(a)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.teamActivity.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
