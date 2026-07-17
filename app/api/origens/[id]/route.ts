import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const origem = await prisma.taskOrigin.findUnique({
    where: { id: params.id },
    include: { _count: { select: { tasks: true } } },
  })
  if (!origem) return NextResponse.json({ error: 'Origem não encontrada' }, { status: 404 })
  return NextResponse.json(origem)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const origem = await prisma.taskOrigin.update({
      where: { id: params.id },
      data: {
        ...(body.name        !== undefined && { name:        body.name.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.color       !== undefined && { color:       body.color }),
        ...(body.icon        !== undefined && { icon:        body.icon }),
        ...(body.active      !== undefined && { active:      body.active }),
        ...(body.order       !== undefined && { order:       body.order }),
      },
      include: { _count: { select: { tasks: true } } },
    })
    return NextResponse.json(origem)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Já existe uma origem com este nome.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar origem.', details: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const count = await prisma.task.count({ where: { originId: params.id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `Esta origem está vinculada a ${count} tarefa(s). Desative-a em vez de excluir.` },
      { status: 400 }
    )
  }
  await prisma.taskOrigin.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
