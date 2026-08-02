import { NextRequest, NextResponse } from 'next/server'
import { prismaSqlite as prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'



const MARKER = '__link__'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "ProcedureAttachment"
     WHERE "documentId" = ? AND "fileType" = ?
     ORDER BY "createdAt" ASC`,
    params.id, MARKER,
  )
  // filePath = target doc id; fileName = target doc title; fileSize = target doc type encoded as number (unused)
  // Enrich with current target doc title/status/type
  const enriched = await Promise.all(rows.map(async (r) => {
    const target = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, title, type, status, version FROM "ProcedureDocument" WHERE id = ?`,
      r.filePath,
    )
    return {
      linkId:      r.id,
      targetId:    r.filePath as string,
      targetTitle: target[0]?.title ?? r.fileName,
      targetType:  target[0]?.type  ?? null,
      targetStatus:target[0]?.status ?? null,
      targetVersion:target[0]?.version ?? null,
      note:        r.notes ?? null,
    }
  }))
  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { targetId, note } = body
  if (!targetId) return NextResponse.json({ error: 'targetId required' }, { status: 400 })

  // Prevent self-link
  if (targetId === params.id) return NextResponse.json({ error: 'Cannot link to itself' }, { status: 400 })

  // Check if already linked
  const existing = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id FROM "ProcedureAttachment"
     WHERE "documentId" = ? AND "fileType" = ? AND "filePath" = ?`,
    params.id, MARKER, targetId,
  )
  if (existing.length) return NextResponse.json({ error: 'Already linked' }, { status: 409 })

  // Fetch target title
  const target = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, title, type, status, version FROM "ProcedureDocument" WHERE id = ?`, targetId,
  )
  if (!target.length) return NextResponse.json({ error: 'Target not found' }, { status: 404 })

  const id  = randomUUID()
  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProcedureAttachment"
       (id, "documentId", "stepId", "fileName", "fileType", "fileSize", "filePath", "createdAt")
     VALUES (?, ?, NULL, ?, ?, 0, ?, ?)`,
    id, params.id,
    target[0].title as string,
    MARKER,
    targetId,
    now,
  )

  return NextResponse.json({
    linkId:       id,
    targetId,
    targetTitle:  target[0].title,
    targetType:   target[0].type,
    targetStatus: target[0].status,
    targetVersion:target[0].version,
    note:         note ?? null,
  }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const linkId = searchParams.get('linkId')
  if (!linkId) return NextResponse.json({ error: 'linkId required' }, { status: 400 })

  await prisma.$executeRawUnsafe(
    `DELETE FROM "ProcedureAttachment"
     WHERE id = ? AND "documentId" = ? AND "fileType" = ?`,
    linkId, params.id, MARKER,
  )
  return NextResponse.json({ ok: true })
}
