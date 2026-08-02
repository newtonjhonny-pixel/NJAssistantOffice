import { NextResponse } from 'next/server'
import { generateDimensionamentoAnalysisAI } from '@/lib/ai/dimensionamento'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { summary, members, config } = body
    if (!summary || !members || !config) {
      return NextResponse.json({ error: 'summary, members e config são obrigatórios' }, { status: 400 })
    }
    const result = await generateDimensionamentoAnalysisAI(summary, members, config)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[dimensionamento/analyze POST]', e)
    return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 })
  }
}
