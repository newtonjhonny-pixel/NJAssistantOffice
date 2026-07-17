import { NextRequest, NextResponse } from 'next/server'
import { analyzeTask } from '@/lib/ai/agents'
import { aiService } from '@/lib/ai/gateway'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const responses = await analyzeTask(params.id)
    return NextResponse.json({ responses, aiConfigured: aiService.isConfigured() })
  } catch (err: unknown) {
    console.error('[analyze] erro:', err)
    return NextResponse.json(
      { error: 'Erro ao analisar tarefa', aiConfigured: aiService.isConfigured() },
      { status: 500 }
    )
  }
}
