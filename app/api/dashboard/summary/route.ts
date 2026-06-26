import { NextResponse } from 'next/server'
import { getDailySummary } from '@/lib/ai/agents'
import { isAIConfigured } from '@/lib/ai/openai'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const summary = await getDailySummary()
    return NextResponse.json({ ...summary, aiConfigured: isAIConfigured() })
  } catch (err: unknown) {
    console.error('[summary] erro:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar resumo', aiConfigured: isAIConfigured() },
      { status: 500 }
    )
  }
}
