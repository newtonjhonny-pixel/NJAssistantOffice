import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search     = searchParams.get("search")     || ""
  const category   = searchParams.get("category")   || ""
  const department = searchParams.get("department") || ""
  const status     = searchParams.get("status")     || ""

  // Raw SQL — Prisma runtime não reconhece Process sem restart do engine
  let sql = `SELECT * FROM "Process" WHERE 1=1`
  const params: unknown[] = []

  if (search) {
    const s = `%${search}%`
    params.push(s, s, s)
    sql += ` AND (name LIKE ? OR code LIKE ? OR description LIKE ?)`
  }
  if (category)   { params.push(category);   sql += ` AND category = ?` }
  if (department) { params.push(`%${department}%`); sql += ` AND department LIKE ?` }
  if (status)     { params.push(status);     sql += ` AND status = ?` }

  sql += ` ORDER BY "updatedAt" DESC`

  const rows = await prisma.$queryRawUnsafe(sql, ...params)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })

  const id  = randomUUID()
  const now = new Date().toISOString()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Process" (id, code, name, description, objective, owner, department, category, status, sla, frequency, inputs, outputs, tools, risks, notes, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    body.code        || null,
    body.name.trim(),
    body.description || null,
    body.objective   || null,
    body.owner       || null,
    body.department  || null,
    body.category    || null,
    body.status      || "ATIVO",
    body.sla         || null,
    body.frequency   || null,
    body.inputs      || null,
    body.outputs     || null,
    body.tools       || null,
    body.risks       || null,
    body.notes       || null,
    now,
    now,
  )

  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "Process" WHERE id = ?`, id) as unknown[]
  return NextResponse.json(rows[0], { status: 201 })
}
