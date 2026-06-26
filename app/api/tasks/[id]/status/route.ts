import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()

  const { statusNovo, observacao, responsavel, waitingFor, waitingReason } = body

  if (!statusNovo) return NextResponse.json({ error: 'statusNovo é obrigatório' }, { status: 400 })
  if (!observacao?.trim()) return NextResponse.json({ error: 'A observação é obrigatória para alteração do status.' }, { status: 400 })
  if (!responsavel?.trim()) return NextResponse.json({ error: 'O responsável pela alteração é obrigatório.' }, { status: 400 })

  if (statusNovo === 'AGUARDANDO_RETORNO' && !waitingFor?.trim()) {
    return NextResponse.json({ error: 'Informe de quem está aguardando retorno.' }, { status: 400 })
  }

  const existing = await prisma.task.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  if (existing.status === statusNovo) {
    return NextResponse.json({ error: 'O status selecionado já é o status atual.' }, { status: 400 })
  }

  const [task] = await prisma.$transaction([
    prisma.task.update({
      where: { id: params.id },
      data: { status: statusNovo },
    }),
    prisma.taskStatusHistory.create({
      data: {
        taskId: params.id,
        statusAnterior: existing.status,
        statusNovo,
        observacao: observacao.trim(),
        responsavel: responsavel.trim(),
        ...(waitingFor && { waitingFor: waitingFor.trim() }),
        ...(waitingReason && { waitingReason: waitingReason.trim() }),
      },
    }),
    prisma.taskHistory.create({
      data: {
        taskId: params.id,
        action: 'STATUS',
        description: `Status alterado por ${responsavel.trim()}: ${observacao.trim()}`,
        oldValue: existing.status,
        newValue: statusNovo,
      },
    }),
  ])

  // Notificações
  if (statusNovo === 'AGUARDANDO_RETORNO') {
    createNotification({
      type: 'TASK_WAITING',
      title: '⏳ Tarefa aguardando retorno',
      message: `${existing.title} — aguardando: ${waitingFor}`,
      relatedType: 'task',
      relatedId: params.id,
    })
  }

  return NextResponse.json(task)
}
