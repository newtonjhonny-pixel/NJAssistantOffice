import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type        = searchParams.get('type')       || ''
  const search      = searchParams.get('search')     || ''
  const department  = searchParams.get('department') || ''
  const responsible = searchParams.get('responsible')|| ''

  let sql = `SELECT d.*,
    (SELECT COUNT(*) FROM "ProcedureStep" s WHERE s."documentId" = d.id) AS stepCount,
    (SELECT COUNT(*) FROM "ProcedureChecklistItem" c WHERE c."documentId" = d.id) AS checklistCount
    FROM "ProcedureDocument" d WHERE 1=1`
  const params: unknown[] = []

  if (type)        { sql += ` AND d.type = ?`;               params.push(type) }
  if (department)  { sql += ` AND d.department = ?`;         params.push(department) }
  if (responsible) { sql += ` AND d.responsible = ?`;        params.push(responsible) }
  if (search) {
    const s = `%${search}%`
    sql += ` AND (d.title LIKE ? OR d.process LIKE ? OR d.description LIKE ?)`
    params.push(s, s, s)
  }
  sql += ` ORDER BY d."updatedAt" DESC`

  const docs = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(docs.map(d => {
    const { stepCount, checklistCount, ...rest } = d
    return { ...rest, _count: { steps: Number(stepCount ?? 0), checklistItems: Number(checklistCount ?? 0) } }
  }))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const id  = randomUUID()
  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProcedureDocument"
      (id, type, title, process, department, responsible, objective, application,
       "systemsUsed", description, responsibilities, "attentionPoints", risks, "expectedResult", notes, "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    body.type,
    body.title           || 'Novo ' + body.type,
    body.process         || null,
    body.department      || null,
    body.responsible     || null,
    body.objective       || null,
    body.application     || null,
    body.systemsUsed     || null,
    body.description     || null,
    body.responsibilities|| null,
    body.attentionPoints || null,
    body.risks           || null,
    body.expectedResult  || null,
    body.notes           || null,
    now, now,
  )
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureDocument" WHERE id = ?`, id
  )
  return NextResponse.json(rows[0], { status: 201 })
}
