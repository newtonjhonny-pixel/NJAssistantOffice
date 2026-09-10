import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── GET /api/meetings/[id]/history ──────────────────────────────────────────
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.meetingHistory.findMany({
      where: { meetingId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[meetings/history GET]', e)
    return NextResponse.json({ error: 'Erro ao listar histórico' }, { status: 500 })
  }
}
