import { prisma } from './prisma'

export type NotificationType =
  | 'TASK_CREATED'
  | 'TASK_URGENT'
  | 'TASK_OVERDUE'
  | 'TASK_WAITING'
  | 'EMAIL_RECEIVED'
  | 'AI_SUGGESTION'

export async function createNotification(data: {
  type: NotificationType
  title: string
  message: string
  relatedType?: 'task' | 'inbox'
  relatedId?: string
}) {
  // fire-and-forget — never blocks the main flow
  prisma.notification.create({ data }).catch(() => {})
}
