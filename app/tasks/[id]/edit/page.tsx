import { prisma } from "@/lib/prisma"
import { TaskForm } from "@/components/tasks/TaskForm"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({ where: { id: params.id } })
  if (!task) notFound()

  return (
    <div className="w-full max-w-2xl">
      <Link href={`/tasks/${params.id}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Voltar para a tarefa
      </Link>
      <h2 className="text-xl font-bold text-slate-800 mb-6">Editar Tarefa</h2>
      <TaskForm task={{
        ...task,
        dueDate:    task.dueDate?.toISOString()    || null,
        receivedAt: task.receivedAt?.toISOString() || null,
        responsible: task.responsible || null,
      }} />
    </div>
  )
}
