import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

const SYSTEM = `Você é um assistente especialista em Departamento Pessoal (DP), Recursos Humanos e processos administrativos.
Analise o documento ou texto e responda EXATAMENTE no formato especificado.
Use || para separar campos em listas. Seja objetivo e profissional.
Responda sempre em português brasileiro.`

function buildFallback(title: string, content: string): string {
  const lc = (content + title).toLowerCase()
  const cat = lc.includes('rescis') ? 'Rescisão'
    : lc.includes('admiss') ? 'Admissão'
    : lc.includes('férias') || lc.includes('ferias') ? 'Férias'
    : lc.includes('folha') ? 'Folha de Pagamento'
    : lc.includes('fgts') ? 'FGTS'
    : lc.includes('esocial') || lc.includes('e-social') ? 'eSocial'
    : lc.includes('contrat') ? 'Contrato'
    : lc.includes('benefíc') || lc.includes('benefic') ? 'Benefícios'
    : lc.includes('treinam') ? 'Treinamento'
    : 'Departamento Pessoal'

  const prio = lc.includes('urgent') || lc.includes('prazo') || lc.includes('imediato') ? 'URGENTE'
    : lc.includes('important') || lc.includes('atenção') ? 'ALTA'
    : 'MEDIA'

  return `TIPO: Solicitação de ${cat}
EMPRESA: Não identificado
COLABORADOR: Não identificado
ASSUNTO: ${title}
PRIORIDADE: ${prio}
PRAZO: Não identificado
DEPARTAMENTO: Departamento Pessoal
RESPONSAVEL: Analista de DP
CATEGORIA: ${cat}
PALAVRAS_CHAVE: ${cat.toLowerCase()}, departamento pessoal, rh
RISCOS: Verificar prazos legais aplicáveis
RESUMO: Solicitação recebida relacionada a ${cat}. Requer análise e encaminhamento ao responsável. Configure OPENAI_API_KEY para análise detalhada com IA real.
SUGESTOES: TASK|Analisar solicitação de ${cat};CHECKLIST|Checklist de ${cat};
ANALISE: Documento recebido via Central Inteligente de Entrada. A análise detalhada requer configuração da OPENAI_API_KEY no arquivo .env do projeto.`
}

function parseAIResponse(raw: string) {
  const get = (key: string) => {
    const rx = new RegExp(`^${key}:\\s*(.+)$`, 'm')
    return raw.match(rx)?.[1]?.trim() || null
  }

  const sugStr = get('SUGESTOES') || ''
  const suggestions = sugStr.split(';').filter(Boolean).map(s => {
    const [type, ...rest] = s.split('|')
    return { type: type.trim(), title: rest.join('|').trim() }
  }).filter(s => s.title)

  return {
    company:     get('EMPRESA'),
    collaborator:get('COLABORADOR'),
    subject:     get('ASSUNTO'),
    priority:    (['URGENTE','ALTA','MEDIA','BAIXA'].includes(get('PRIORIDADE') || '') ? get('PRIORIDADE') : 'MEDIA') as string,
    dueDate:     get('PRAZO'),
    department:  get('DEPARTAMENTO'),
    responsible: get('RESPONSAVEL'),
    category:    get('CATEGORIA'),
    keywords:    get('PALAVRAS_CHAVE'),
    risks:       get('RISCOS'),
    summary:     get('RESUMO'),
    aiRaw:       raw,
    suggestions,
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.centralItem.findUnique({
    where: { id: params.id },
    include: { attachments: true },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Set to ANALYZING
  await prisma.centralItem.update({ where: { id: params.id }, data: { status: 'ANALYZING' } })
  await prisma.centralHistory.create({
    data: { itemId: params.id, action: 'ANALISANDO', detail: 'IA iniciou análise' },
  })

  const contentForAI = [
    item.pastedContent && `CONTEÚDO DO DOCUMENTO:\n${item.pastedContent.substring(0, 4000)}`,
    item.subject       && `ASSUNTO: ${item.subject}`,
    item.senderName    && `REMETENTE: ${item.senderName}`,
    item.attachments.length && `ARQUIVOS ANEXADOS: ${item.attachments.map(a => a.fileName).join(', ')}`,
  ].filter(Boolean).join('\n\n') || `ARQUIVO: ${item.title}`

  const prompt = `Analise o seguinte documento/e-mail/solicitação de Departamento Pessoal:

${contentForAI}

Responda EXATAMENTE neste formato (uma linha por campo):
TIPO: [tipo da solicitação]
EMPRESA: [empresa ou "Não identificado"]
COLABORADOR: [nome do colaborador ou "Não identificado"]
ASSUNTO: [assunto resumido em até 80 caracteres]
PRIORIDADE: [URGENTE|ALTA|MEDIA|BAIXA]
PRAZO: [data (DD/MM/AAAA) ou descrição ou "Não identificado"]
DEPARTAMENTO: [departamento responsável]
RESPONSAVEL: [responsável sugerido]
CATEGORIA: [Admissão|Rescisão|Férias|Folha de Pagamento|Benefícios|eSocial|FGTS|IRRF|Contrato|Treinamento|Auditoria|Fiscal|Jurídico|Compras|RH|Outros]
PALAVRAS_CHAVE: [palavra1, palavra2, palavra3, palavra4]
RISCOS: [riscos identificados ou "Nenhum crítico identificado"]
RESUMO: [resumo em 2-3 linhas do que foi solicitado e por quê é importante]
SUGESTOES: [TIPO|Título da sugestão separados por ; Ex: TASK|Criar tarefa de rescisão;CHECKLIST|Checklist de rescisão;]
ANALISE: [análise completa e detalhada do documento]`

  let raw: string
  let aiPowered = false

  if (aiService.isConfigured()) {
    try {
      const result = await aiService.ask({
        module: 'central.analyze',
        specialist: 'Departamento Pessoal',
        systemPrompt: SYSTEM,
        message: prompt,
        maxTokens: 1500,
      })
      raw = result.content
      aiPowered = result.aiPowered
    } catch {
      raw = buildFallback(item.title, contentForAI)
    }
  } else {
    raw = buildFallback(item.title, contentForAI)
  }

  const parsed = parseAIResponse(raw)

  // Update item with parsed data
  const updated = await prisma.centralItem.update({
    where: { id: params.id },
    data: {
      status:      'ANALYZED',
      aiPowered,
      title:       parsed.subject || item.title,
      company:     parsed.company     || undefined,
      collaborator:parsed.collaborator|| undefined,
      subject:     parsed.subject     || undefined,
      priority:    parsed.priority    || 'MEDIA',
      dueDate:     parsed.dueDate     || undefined,
      department:  parsed.department  || undefined,
      responsible: parsed.responsible || undefined,
      category:    parsed.category    || undefined,
      keywords:    parsed.keywords    || undefined,
      risks:       parsed.risks       || undefined,
      summary:     parsed.summary     || undefined,
      aiRaw:       raw,
    },
  })

  // Create suggestions
  await prisma.centralSuggestion.deleteMany({ where: { itemId: params.id } })
  if (parsed.suggestions.length) {
    await prisma.centralSuggestion.createMany({
      data: parsed.suggestions.map(s => ({
        itemId: params.id,
        type:   s.type,
        title:  s.title,
      })),
    })
  }

  await prisma.centralHistory.create({
    data: {
      itemId: params.id,
      action: 'ANALISADO',
      detail: `${aiPowered ? 'IA real' : 'Simulação'} — Categoria: ${parsed.category || 'Não identificado'} · Prioridade: ${parsed.priority}`,
    },
  })

  const full = await prisma.centralItem.findUnique({
    where: { id: params.id },
    include: {
      attachments: true,
      history:     { orderBy: { createdAt: 'asc' } },
      suggestions: { orderBy: { createdAt: 'asc' } },
    },
  })
  return NextResponse.json(full)
}
