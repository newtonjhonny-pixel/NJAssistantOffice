import { Suspense } from "react"
import { TasksModuleClient } from "@/components/tasks/TasksModuleClient"

export const dynamic = "force-dynamic"

export default function TasksPage() {
  return (
    <Suspense>
      <TasksModuleClient />
    </Suspense>
  )
}
