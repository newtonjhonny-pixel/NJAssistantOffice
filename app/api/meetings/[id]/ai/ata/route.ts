import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai/gateway'
import { requirePermission, meetingFullInclude } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `Você é um assistente de redação corporativa especializado em atas de reunião.

Você receberá os dados JÁ REGISTRADOS de uma reunião. Sua tarefa é redigir a ata
reorganizando e melhorando a redação desses dados.

PROIBIDO:
- Criar assuntos, decisões, ações, responsáveis, prazos, participantes ou fatos que não estejam nos dados.
- Alterar nomes, datas, valores ou o sentido de qualquer registro.
- Preencher lacunas com suposições. Se algo não foi registrado, simplesmente não mencione.

OBRIGATÓRIO:
- Usar exclusivamente as informações fornecidas.
- Redigir de forma impessoal, objetiva e profissional, no passado.
- Manter a estrutura: objetivo, assuntos tratados, decisões, ações (com responsável e prazo) e encerramento.
- Responder em português do Brasil, em HTML simples (h3, p, ul, li, strong). Sem CSS, sem <html>/<body>.
- Responder somente com a ata, sem preâmbulo.`

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const denied = await requirePermission('ai')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    if (!aiService.isConfigured())
      return NextResponse.json({ error: 'IA não configurada neste ambiente.' }, { status: 503 })

    const m = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: meetingFullInclude,
    })
    if (!m) return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })

    const stripHtml = (s: string | null) => (s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    // Somente os dados registrados — a estrutura continua sendo a fonte da verdade.
    const dados = {
      titulo: m.title,
      data: m.date,
      horario: [m.startTime, m.endTime].filter(Boolean).join(' às ') || null,
      local: m.location,
      organizador: m.organizer?.name ?? null,
      objetivo: m.objective,
      participantes: m.participants.map(p => ({
        nome: p.teamMember?.name ?? p.externalName,
        funcao: p.teamMember?.role ?? p.externalRole,
        presenca: p.attendanceStatus,
      })),
      assuntos: m.agendaItems.map(a => ({
        ordem: a.order,
        titulo: a.title,
        descricao: a.description,
        oQueFoiConversado: stripHtml(a.discussion) || null,
        decisoes: a.decisions.map(d => d.description),
        acoes: a.actions.map(ac => ({
          acao: ac.description,
          responsavel: ac.responsible?.name ?? null,
          prazo: ac.dueDate,
          status: ac.status,
        })),
      })),
      decisoesGerais: m.decisions.filter(d => !d.agendaItemId).map(d => d.description),
      acoesGerais: m.actions.filter(a => !a.agendaItemId).map(a => ({
        acao: a.description,
        responsavel: a.responsible?.name ?? null,
        prazo: a.dueDate,
        status: a.status,
      })),
      resumoFinal: m.finalSummary,
      observacoes: m.observations,
    }

    const temConteudo =
      dados.assuntos.length || dados.decisoesGerais.length || dados.acoesGerais.length || dados.objetivo
    if (!temConteudo)
      return NextResponse.json(
        { error: 'Não há conteúdo registrado suficiente para organizar a ata.' },
        { status: 400 },
      )

    const result = await aiService.ask({
      module: 'meetings.ata',
      systemPrompt: SYSTEM_PROMPT,
      message: `Redija a ata usando EXCLUSIVAMENTE estes dados registrados:\n\n${JSON.stringify(dados, null, 2)}`,
    })

    const suggestion = (result?.content ?? '').trim()
    if (!suggestion)
      return NextResponse.json({ error: 'A IA não retornou a ata. Tente novamente.' }, { status: 502 })

    // Não grava nada: a tela mostra o comparativo e o usuário decide.
    return NextResponse.json({ suggestion, original: m.finalSummary ?? '' })
  } catch (e) {
    console.error('[meetings/ai/ata POST]', e)
    return NextResponse.json({ error: 'Erro ao organizar a ata' }, { status: 500 })
  }
}
