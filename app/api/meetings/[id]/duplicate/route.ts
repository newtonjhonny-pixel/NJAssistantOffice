import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logHistory, requirePermission, isValidDate, meetingFullInclude } from '@/lib/meetings/service'

export const dynamic = 'force-dynamic'
type Ctx = { params: { id: string } }

// ─── POST /api/meetings/[id]/duplicate ───────────────────────────────────────
// Copia: título, tipo, objetivo, local, organizador, participantes e a
// ESTRUTURA da pauta (título/descrição/ordem/apresentador/tempo/prioridade).
//
// NÃO copia: discussões, decisões, ações, resumo final nem conclusão — a nova
// reunião nasce limpa. Opcionalmente traz as ações pendentes da anterior como
// novos assuntos (carryPendingActions).
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requirePermission('create')
    if (denied) return NextResponse.json({ error: denied }, { status: 403 })

    const origin = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: {
        participants: true,
        agendaItems: { orderBy: { order: 'asc' } },
      },
    })
    if (!origin) return NextResponse.json({ error: 'Reunião de origem não encontrada.' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const {
      date, startTime, endTime, title,
      carryPendingActions = false,   // trazer pendências da anterior como assuntos
      createdBy,
    } = body

    if (date && !isValidDate(date))
      return NextResponse.json({ error: 'Data inválida. Use YYYY-MM-DD.' }, { status: 400 })

    const novaData = date || new Date().toISOString().slice(0, 10)

    const created = await prisma.$transaction(async tx => {
      const meeting = await tx.meeting.create({
        data: {
          title:        title?.trim() || origin.title,
          objective:    origin.objective,
          type:         origin.type,
          category:     origin.category,
          date:         novaData,
          startTime:    startTime !== undefined ? startTime : origin.startTime,
          endTime:      endTime   !== undefined ? endTime   : origin.endTime,
          location:     origin.location,
          meetingUrl:   origin.meetingUrl,
          organizerId:  origin.organizerId,
          recurrence:   origin.recurrence,
          status:       'RASCUNHO',   // nasce como rascunho, nunca concluída
          duplicatedFromId: origin.id,
          createdBy:    createdBy || null,
          // finalSummary / completedAt / completedBy ficam vazios de propósito
        },
      })

      // Participantes (mesma composição)
      if (origin.participants.length) {
        await tx.meetingParticipant.createMany({
          data: origin.participants.map(p => ({
            meetingId:     meeting.id,
            teamMemberId:  p.teamMemberId,
            externalName:  p.externalName,
            externalEmail: p.externalEmail,
            externalRole:  p.externalRole,
            attendanceStatus: 'CONVIDADO',   // presença reinicia
          })),
        })
      }

      // Estrutura da pauta — SEM discussion e com status zerado
      let ordem = 0
      for (const item of origin.agendaItems) {
        ordem += 1
        await tx.meetingAgendaItem.create({
          data: {
            meetingId: meeting.id,
            order: ordem,
            title: item.title,
            description: item.description,
            discussion: null,             // não copia o que foi conversado
            presenterId: item.presenterId,
            estimatedMinutes: item.estimatedMinutes,
            priority: item.priority,
            status: 'NAO_INICIADO',       // não copia como concluído
          },
        })
      }

      // Pendências da reunião anterior viram assuntos de acompanhamento
      if (carryPendingActions) {
        const pending = await tx.meetingAction.findMany({
          where: { meetingId: origin.id, status: { in: ['A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO'] } },
          include: { responsible: { select: { name: true } } },
        })
        for (const act of pending) {
          ordem += 1
          await tx.meetingAgendaItem.create({
            data: {
              meetingId: meeting.id,
              order: ordem,
              title: `Acompanhamento: ${act.description.slice(0, 120)}`,
              description:
                `Pendência da reunião anterior de ${origin.date}.` +
                (act.responsible ? ` Responsável: ${act.responsible.name}.` : '') +
                (act.dueDate ? ` Prazo: ${act.dueDate}.` : ''),
              presenterId: act.responsibleId,
              priority: act.priority,
              status: 'NAO_INICIADO',
            },
          })
        }
      }

      return meeting
    })

    await logHistory(created.id, 'DUPLICADA', 'Reunião duplicada',
      `Origem: ${origin.title} (${origin.date})`, createdBy)
    await logHistory(origin.id, 'DUPLICADA', 'Reunião usada como base',
      `Nova reunião em ${novaData}`, createdBy)

    const full = await prisma.meeting.findUnique({
      where: { id: created.id },
      include: meetingFullInclude,
    })
    return NextResponse.json(full, { status: 201 })
  } catch (e) {
    console.error('[meetings/duplicate POST]', e)
    return NextResponse.json({ error: 'Erro ao duplicar reunião' }, { status: 500 })
  }
}

// ─── GET /api/meetings/[id]/duplicate — prévia das pendências ────────────────
// Mostra o que seria trazido da reunião anterior antes de confirmar.
export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const pending = await prisma.meetingAction.findMany({
      where: { meetingId: params.id, status: { in: ['A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO'] } },
      include: { responsible: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ pendingActions: pending, count: pending.length })
  } catch (e) {
    console.error('[meetings/duplicate GET]', e)
    return NextResponse.json({ error: 'Erro ao consultar pendências' }, { status: 500 })
  }
}
