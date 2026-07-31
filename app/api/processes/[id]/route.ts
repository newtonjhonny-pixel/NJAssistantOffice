import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "Process" WHERE id = ?`, params.id) as unknown[]
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    `UPDATE "Process" SET code=?, name=?, description=?, objective=?, owner=?, department=?, category=?, status=?, sla=?, frequency=?, inputs=?, outputs=?, tools=?, risks=?, notes=?, "updatedAt"=? WHERE id=?`,
    body.code        ?? null,
    body.name.trim(),
    body.description ?? null,
    body.objective   ?? null,
    body.owner       ?? null,
    body.department  ?? null,
    body.category    ?? null,
    body.status      ?? "ATIVO",
    body.sla         ?? null,
    body.frequency   ?? null,
    body.inputs      ?? null,
    body.outputs     ?? null,
    body.tools       ?? null,
    body.risks       ?? null,
    body.notes       ?? null,
    now,
    params.id,
  )

  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "Process" WHERE id = ?`, params.id) as unknown[]
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "Process" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
