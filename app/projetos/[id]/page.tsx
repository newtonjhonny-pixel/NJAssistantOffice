import { ProjetoDetalheClient } from "@/components/projetos/ProjetoDetalheClient"

export default function ProjetoDetalhePage({ params }: { params: { id: string } }) {
  return <ProjetoDetalheClient id={params.id} />
}
