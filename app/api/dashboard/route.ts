import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [tasks, inbox] = await Promise.all([
    prisma.task.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.inboxItem.findMany({ where: { isIgnored: false, isRead: false } }),
  ])

  const now = new Date()
  const overdue = tasks.filter(
    t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA'
  )
  const urgent = tasks.filter(t => t.priority === 'URGENTE' && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA')
  const waiting = tasks.filter(t => t.status === 'AGUARDANDO_RETORNO')
  const open = tasks.filter(t => t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA')
  const completed = tasks.filter(t => t.status === 'CONCLUIDA')

  return NextResponse.json({
    counts: {
      open: open.length,
      completed: completed.length,
      urgent: urgent.length,
      overdue: overdue.length,
      waiting: waiting.length,
      inbox: inbox.length,
    },
    topPriorities: [...urgent, ...overdue]
      .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
      .slice(0, 5),
    alerts: overdue.slice(0, 5),
    waiting: waiting.slice(0, 5),
    recentTasks: tasks.slice(0, 5),
  })
}
