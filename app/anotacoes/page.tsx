import { Suspense } from "react"
import { NotesClient } from "@/components/notes/NotesClient"

export const dynamic = "force-dynamic"

export default function AnotacoesPage() {
  return (
    <Suspense>
      <NotesClient />
    </Suspense>
  )
}
