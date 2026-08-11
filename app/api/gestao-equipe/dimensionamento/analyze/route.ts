import { NextResponse } from 'next/server'
import { generateDimensionamentoAnalysisAI } from '@/lib/ai/dimensionamento'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { summary, members } = body
    // Aceita tanto `config` (formato antigo) quanto `bandConfig`+`capacityRef` (formato novo)
    const config = body.config ?? {
      bandGreen:   body.bandConfig?.bandGreen   ?? 60,
      bandBlue:    body.bandConfig?.bandBlue    ?? 75,
      bandYellow:  body.bandConfig?.bandYellow  ?? 85,
      bandOrange:  body.bandConfig?.bandOrange  ?? 95,
      capacityRef: body.capacityRef             ?? 100,
    }
    if (!summary || !members) {
return NextResponse.json({ error: 'summary e members são obrigatórios' }, { status: 400 })
    }
    const result = await generateDimensionamentoAnalysisAI(summary, members, config)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[dimensionamento/analyze POST]', e)
    return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 })
  }
}
