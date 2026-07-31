import { Suspense } from "react"
import { ProcessosClient } from "@/components/processos/ProcessosClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Processos — NJ Assistant Office" }

export default function ProcessosPage() {
  return (
    <Suspense>
      <ProcessosClient />
    </Suspense>
  )
}
