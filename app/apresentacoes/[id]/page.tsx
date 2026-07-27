import { Suspense } from "react"
import { ApresentacaoDetalheClient } from "@/components/apresentacoes/ApresentacaoDetalheClient"

export const dynamic = "force-dynamic"

export default function ApresentacaoDetalhePage({ params }: { params: { id: string } }) {
  return (
    <Suspense>
      <ApresentacaoDetalheClient id={params.id} />
    </Suspense>
  )
}
