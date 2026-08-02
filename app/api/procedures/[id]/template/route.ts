import { NextRequest, NextResponse } from 'next/server'
import { prismaSqlite as prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'



// POST â†’ marcar documento como template
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT tags FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tags = rows[0].tags as string | null
  if (tags?.includes('__template__')) return NextResponse.json({ ok: true, isTemplate: true })

  const newTags = tags ? `${tags},__template__` : '__template__'
  await prisma.$executeRawUnsafe(
    `UPDATE "ProcedureDocument" SET tags = ?, "updatedAt" = ? WHERE id = ?`,
    newTags, new Date(), params.id
  )
  return NextResponse.json({ ok: true, isTemplate: true })
}

// DELETE â†’ desmarcar como template
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT tags FROM "ProcedureDocument" WHERE id = ?`, params.id
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tags = rows[0].tags as string | null
  const newTags = tags
    ? tags.split(',').map(t => t.trim()).filter(t => t && t !== '__template__').join(',') || null
    : null

  await prisma.$executeRawUnsafe(
    `UPDATE "ProcedureDocument" SET tags = ?, "updatedAt" = ? WHERE id = ?`,
    newTags, new Date(), params.id
  )
  return NextResponse.json({ ok: true, isTemplate: false })
}
