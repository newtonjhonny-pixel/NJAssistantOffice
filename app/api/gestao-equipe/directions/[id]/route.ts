import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-sqlite"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const d = await prisma.teamActivityDirection.update({
    where: { id: params.id },
    data: {
      ...(body.title && { title: body.title }),
      description: body.description ?? undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      ...(body.priority && { priority: body.priority }),
      ...(body.complexity && { complexity: body.complexity }),
      expectedResult: body.expectedResult ?? undefined,
      aiOrientation: body.aiOrientation ?? undefined,
      ...(body.status && { status: body.status }),
    },
    include: { member: { select: { id: true, name: true, role: true } } },
  })
  return NextResponse.json(d)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.teamActivityDirection.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
