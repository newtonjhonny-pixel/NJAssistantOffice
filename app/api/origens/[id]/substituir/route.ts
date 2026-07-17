import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/origens/[id]/substituir
// Body: { newOriginId: string }
// Migra todas as tarefas da origem antiga para a nova, depois exclui a antiga.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { newOriginId } = body

    if (!newOriginId || typeof newOriginId !== 'string') {
      return NextResponse.json({ error: 'newOriginId é obrigatório.' }, { status: 400 })
    }
    if (newOriginId === params.id) {
      return NextResponse.json({ error: 'A origem substituta deve ser diferente da origem atual.' }, { status: 400 })
    }

    const [oldOrigin, newOrigin] = await Promise.all([
      prisma.taskOrigin.findUnique({ where: { id: params.id } }),
      prisma.taskOrigin.findUnique({ where: { id: newOriginId } }),
    ])

    if (!oldOrigin) return NextResponse.json({ error: 'Origem não encontrada.' }, { status: 404 })
    if (!newOrigin) return NextResponse.json({ error: 'Origem substituta não encontrada.' }, { status: 404 })

    // Conta as tarefas afetadas
    const affectedTasks = await prisma.task.findMany({
      where: { originId: params.id },
      select: { id: true },
    })

    // Atualiza todas as tarefas: novo originId + campo origin (texto legado)
    await prisma.task.updateMany({
      where: { originId: params.id },
      data: {
        originId: newOriginId,
        origin:   newOrigin.name,
      },
    })

    // Registra histórico em cada tarefa afetada
    if (affectedTasks.length > 0) {
      await prisma.taskHistory.createMany({
        data: affectedTasks.map(t => ({
          taskId:      t.id,
          action:      'ORIGEM_ALTERADA',
          description: `Origem alterada de "${oldOrigin.name}" para "${newOrigin.name}" (substituição em lote).`,
          oldValue:    oldOrigin.name,
          newValue:    newOrigin.name,
        })),
      })
    }

    // Remove a origem antiga
    await prisma.taskOrigin.delete({ where: { id: params.id } })

    return NextResponse.json({
      ok: true,
      migratedTasks: affectedTasks.length,
      from: oldOrigin.name,
      to:   newOrigin.name,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Erro ao substituir origem.', details: msg }, { status: 500 })
  }
}
