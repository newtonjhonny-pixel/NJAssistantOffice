import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, description } = await req.json()
    if (!action || !description) {
      return NextResponse.json({ error: 'action e description são obrigatórios' }, { status: 400 })
    }
    const entry = await prisma.taskHistory.create({
      data: { taskId: params.id, action, description },
    })
    return NextResponse.json(entry, { status: 201 })
  } catch (err) {
    console.error('[task-history] erro:', err)
    return NextResponse.json({ error: 'Erro ao registrar histórico' }, { status: 500 })
  }
}
