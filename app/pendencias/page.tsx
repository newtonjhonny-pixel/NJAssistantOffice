import { redirect } from "next/navigation"

export default function PendenciasPage() {
  redirect("/tasks?tab=pendencias")
}
