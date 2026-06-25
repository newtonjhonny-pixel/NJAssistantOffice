import { NextRequest, NextResponse } from 'next/server'
import { analyzeTask } from '@/lib/ai/agents'
import { isAIConfigured } from '@/lib/ai/openai'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const responses = await analyzeTask(params.id)
    return NextResponse.json({ responses, aiConfigured: isAIConfigured() })
  } catch (err: unknown) {
    console.error('[analyze] erro:', err)
    return NextResponse.json(
      { error: 'Erro ao analisar tarefa', aiConfigured: isAIConfigured() },
      { status: 500 }
    )
  }
}
