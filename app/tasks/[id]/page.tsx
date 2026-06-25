import { TaskDetailClient } from "@/components/tasks/TaskDetailClient"

export const dynamic = "force-dynamic"

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  return <TaskDetailClient id={params.id} />
}
