import { Suspense } from 'react'
import TreinamentosClient from '@/components/treinamentos/TreinamentosClient'

export const metadata = { title: 'Treinamentos — NJ Assistant Office' }

export default function TreinamentosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
      <TreinamentosClient />
    </Suspense>
  )
}
