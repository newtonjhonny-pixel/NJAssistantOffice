import { TaskForm } from "@/components/tasks/TaskForm"

export default function NewTaskPage() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Nova Tarefa</h2>
      <TaskForm />
    </div>
  )
}
