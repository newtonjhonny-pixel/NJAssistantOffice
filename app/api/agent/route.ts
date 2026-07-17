import { NextRequest, NextResponse } from 'next/server'
import { getAgentResponse, getOrchestratedResponse } from '@/lib/ai/agents'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { agent, message, history } = body

  if (!agent || !message) {
    return NextResponse.json({ error: 'agent e message são obrigatórios' }, { status: 400 })
  }

  try {
    const response = agent === 'ORCHESTRATOR'
      ? await getOrchestratedResponse(message, history ?? [])
      : await getAgentResponse(agent, message, history ?? [])

    // Salvar a interação (não bloqueia a resposta)
    prisma.agentInteraction.createMany({
      data: [
        { userId: 'default-user', agent, role: 'user', content: message },
        { userId: 'default-user', agent, role: 'assistant', content: response.content },
      ],
    }).catch(() => {/* ignora erro de log */})

    return NextResponse.json({ ...response, aiConfigured: aiService.isConfigured() })
  } catch (err: unknown) {
    console.error('[agent] erro:', err)
    return NextResponse.json({
      agent,
      agentName: agent,
      icon: '⚠️',
      aiPowered: false,
      aiConfigured: aiService.isConfigured(),
      content: 'Ocorreu um erro ao processar sua solicitação. Tente novamente em instantes.',
    })
  }
}
