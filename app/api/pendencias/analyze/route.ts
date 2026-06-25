import { NextRequest, NextResponse } from 'next/server'
import { analyzePending } from '@/lib/ai/agents'
import { isAIConfigured } from '@/lib/ai/openai'

export async function POST(req: NextRequest) {
  const { taskId } = await req.json()
  if (!taskId) return NextResponse.json({ error: 'taskId obrigatório' }, { status: 400 })

  try {
    const response = await analyzePending(taskId)
    return NextResponse.json({ ...response, aiConfigured: isAIConfigured() })
  } catch (err: unknown) {
    console.error('[pendencias/analyze] erro:', err)
    return NextResponse.json(
      { error: 'Erro ao analisar pendência', aiConfigured: isAIConfigured() },
      { status: 500 }
    )
  }
}
