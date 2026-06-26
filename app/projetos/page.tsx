import { Suspense } from "react"
import { ProjetosClient } from "@/components/projetos/ProjetosClient"

export const dynamic = "force-dynamic"

export default function ProjetosPage() {
  return (
    <Suspense>
      <ProjetosClient />
    </Suspense>
  )
}
