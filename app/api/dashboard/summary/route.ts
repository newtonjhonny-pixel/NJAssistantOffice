import { NextResponse } from 'next/server'
import { getDailySummary } from '@/lib/ai/agents'
import { aiService } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const summary = await getDailySummary()
    return NextResponse.json({ ...summary, aiConfigured: aiService.isConfigured() })
  } catch (err: unknown) {
    console.error('[summary] erro:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar resumo', aiConfigured: aiService.isConfigured() },
      { status: 500 }
    )
  }
}
