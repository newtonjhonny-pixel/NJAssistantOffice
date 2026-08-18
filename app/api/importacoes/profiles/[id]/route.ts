import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { ensureImportSchema } from '../../_utils'

export const dynamic = 'force-dynamic'

// PATCH /api/importacoes/profiles/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()
    const body = await req.json()
    const allowed = ['name', 'mappingJson', 'sampleHeadersJson', 'confidence']
    const now = new Date().toISOString()

    for (const key of allowed) {
      if (body[key] !== undefined) {
        const val = typeof body[key] === 'object' ? JSON.stringify(body[key]) : body[key]
        await prisma.$executeRawUnsafe(
          `UPDATE "ImportSourceProfile" SET "${key}" = ?, "updatedAt" = ? WHERE "id" = ?`,
          val, now, params.id
        )
      }
    }
    const profile = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ImportSourceProfile" WHERE "id" = ?`, params.id
    )
    return NextResponse.json({ profile: profile[0] })
  } catch (e) {
    console.error('[importacoes profiles PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}

// DELETE /api/importacoes/profiles/[id]
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureImportSchema()
    await prisma.$executeRawUnsafe(
      `UPDATE "ImportSourceProfile" SET "active" = 0, "updatedAt" = ? WHERE "id" = ?`,
      new Date().toISOString(), params.id
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[importacoes profiles DELETE]', e)
    return NextResponse.json({ error: 'Erro ao remover perfil' }, { status: 500 })
  }
}
