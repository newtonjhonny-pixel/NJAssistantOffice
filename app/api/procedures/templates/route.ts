import { NextRequest, NextResponse } from 'next/server'
import { prismaSqlite as prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'


// GET â€” lista todos os templates, opcionalmente filtrados por tipo
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || ''

  let sql = `SELECT id, type, title, process, department, responsible,
               objective, description, tags, code, version, status
             FROM "ProcedureDocument"
             WHERE tags LIKE '%__template__%'`
  const params: unknown[] = []
  if (type) { sql += ` AND type = ?`; params.push(type) }
  sql += ` ORDER BY title ASC`

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
  return NextResponse.json(rows)
}
