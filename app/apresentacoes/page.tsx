import { Suspense } from "react"
import { ApresentacoesClient } from "@/components/apresentacoes/ApresentacoesClient"

export const dynamic = "force-dynamic"

export default function ApresentacoesPage() {
  return (
    <Suspense>
      <ApresentacoesClient />
    </Suspense>
  )
}
