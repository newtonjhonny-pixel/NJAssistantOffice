import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function GET(req: NextRequest) {
  const processId = new URL(req.url).searchParams.get("processId") || ""
  const rows = await prisma.$queryRawUnsafe(
    processId
      ? `SELECT * FROM "RaciMatrix" WHERE processId = ? ORDER BY updatedAt DESC`
      : `SELECT * FROM "RaciMatrix" ORDER BY updatedAt DESC`,
    ...(processId ? [processId] : [])
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
  const id  = randomUUID()
  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    `INSERT INTO "RaciMatrix" (id, processId, name, description, activities, roles, entries, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    body.processId   || null,
    body.name.trim(),
    body.description || null,
    JSON.stringify(body.activities ?? []),
    JSON.stringify(body.roles      ?? []),
    JSON.stringify(body.entries    ?? {}),
    body.notes       || null,
    now, now,
  )
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "RaciMatrix" WHERE id = ?`, id) as unknown[]
  return NextResponse.json(rows[0], { status: 201 })
}
