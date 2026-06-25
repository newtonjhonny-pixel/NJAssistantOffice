import { ConferenciaDetalheClient } from "@/components/conferencia/ConferenciaDetalheClient"

export const metadata = { title: "Detalhe da Conferência — NJ Assistant Office" }

export default function ConferenciaDetalhePage({ params }: { params: { id: string } }) {
  return <ConferenciaDetalheClient id={params.id} />
}
