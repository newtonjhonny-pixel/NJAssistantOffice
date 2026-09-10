import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai/gateway'
import { requirePermission } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'

// A IA aqui é ASSISTENTE DE REDAÇÃO. Ela reescreve o texto que recebe e nada mais.
const SYSTEM_PROMPT = `Você é um assistente de redação corporativa.

Melhore exclusivamente a clareza, gramática, organização e profissionalismo do texto fornecido.

Preserve integralmente fatos, nomes, datas, valores, decisões, responsáveis e prazos.

Não crie fatos.
Não crie decisões.
Não crie responsáveis.
Não crie datas.
Não altere o sentido do conteúdo.

Quando o texto for uma anotação de reunião, organize-o de maneira objetiva e profissional.

REGRAS DE SAÍDA:
- Responda SOMENTE com o texto reescrito, sem preâmbulo, sem comentários e sem aspas envolvendo o resultado.
- Não acrescente títulos, assinaturas ou seções que não existam no original.
- Se o texto já estiver adequado, devolva-o praticamente inalterado.
- Mantenha o mesmo idioma do original (português do Brasil).
- Se o texto de entrada contiver HTML simples (parágrafos, listas, negrito), devolva HTML equivalente.`

const MODES: Record<string, string> = {
  melhorar:     'Melhore a escrita mantendo o mesmo nível de detalhe.',
  profissional: 'Deixe o texto mais formal e profissional, sem inflar o conteúdo.',
  resumir:      'Resuma o texto mantendo TODOS os fatos, nomes, prazos e decisões citados.',
  topicos:      'Reorganize o conteúdo em tópicos objetivos, sem inventar itens.',
  portugues:    'Corrija apenas ortografia, gramática e pontuação. Altere o mínimo possível.',
  ata:          'Reescreva no estilo de ata de reunião: impessoal, objetivo e no passado.',
}

export async function POST(req: NextRequest) {
  try {
    const denied = await requirePermission('ai')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    if (!aiService.isConfigured())
      return NextResponse.json(
        { error: 'IA não configurada neste ambiente. Verifique a chave do provedor.' },
        { status: 503 },
      )

    const { text, mode = 'melhorar', context } = await req.json()

    if (!text || typeof text !== 'string' || !text.trim())
      return NextResponse.json({ error: 'Envie o texto a ser melhorado.' }, { status: 400 })
    if (text.length > 20000)
      return NextResponse.json({ error: 'Texto muito longo (máx. 20.000 caracteres).' }, { status: 400 })
    if (!MODES[mode])
      return NextResponse.json({ error: `Modo inválido. Use: ${Object.keys(MODES).join(', ')}` }, { status: 400 })

    const instrucao = MODES[mode]
    const ctx = context ? `\n\nContexto (apenas para entender o texto, NÃO incorpore ao resultado): ${String(context).slice(0, 500)}` : ''

    const result = await aiService.ask({
      module: 'meetings.improve',
      systemPrompt: SYSTEM_PROMPT,
      message: `${instrucao}${ctx}\n\n--- TEXTO ORIGINAL ---\n${text}`,
    })

    const suggestion = (result?.content ?? '').trim()
    if (!suggestion)
      return NextResponse.json({ error: 'A IA não retornou sugestão. Tente novamente.' }, { status: 502 })

    // O original é devolvido junto para a tela montar o comparativo.
    return NextResponse.json({ original: text, suggestion, mode })
  } catch (e) {
    console.error('[meetings/ai/improve POST]', e)
    return NextResponse.json({ error: 'Erro ao consultar a IA' }, { status: 500 })
  }
}
