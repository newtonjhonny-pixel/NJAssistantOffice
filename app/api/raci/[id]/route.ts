import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "RaciMatrix" WHERE id = ?`, params.id) as unknown[]
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    `UPDATE "RaciMatrix" SET "processId"=?, name=?, description=?, activities=?, roles=?, entries=?, notes=?, "updatedAt"=? WHERE id=?`,
    body.processId   ?? null,
    body.name.trim(),
    body.description ?? null,
    JSON.stringify(body.activities ?? []),
    JSON.stringify(body.roles      ?? []),
    JSON.stringify(body.entries    ?? {}),
    body.notes       ?? null,
    now,
    params.id,
  )
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "RaciMatrix" WHERE id = ?`, params.id) as unknown[]
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM "RaciMatrix" WHERE id = ?`, params.id)
  return NextResponse.json({ ok: true })
}
