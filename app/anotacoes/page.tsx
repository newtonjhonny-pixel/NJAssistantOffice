import { Suspense } from "react"
import { AnotacoesModuleClient } from "@/components/notes/AnotacoesModuleClient"

export const dynamic = "force-dynamic"

export default function AnotacoesPage() {
  return (
    <Suspense>
      <AnotacoesModuleClient />
    </Suspense>
  )
}
