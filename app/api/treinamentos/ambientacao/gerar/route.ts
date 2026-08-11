import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

/** Gera um ID curto para elementos de slide */
function sid() { return Math.random().toString(36).slice(2, 9) }

/** Cor de fundo dos slides por posição */
const SLIDE_BGS = ['#1e3a5f', '#ffffff', '#f0f4ff', '#1e3a5f', '#ffffff', '#f0f4ff']

/**
 * Monta o array de slides no formato do editor de apresentações.
 * Slide 1  → Capa (título da ambientação)
 * Slide 2  → Agenda (lista de processos)
 * Slide N+ → Um slide por processo com todos os dados reais
 * Último   → Encerramento
 */
function buildSlides(
  titulo: string,
  departamento: string | null,
  publicoAlvo: string,
  blocos: Array<Record<string, unknown>>
) {
  const slides: unknown[] = []

  // ── Capa ────────────────────────────────────────────────────────────────────
  slides.push({
    id: sid(), bg: '#1e3a5f',
    elements: [
      { id: sid(), type: 'title',    x: 8,  y: 28, w: 84, h: 16, content: titulo,
        fontSize: '4xl', bold: true, align: 'center', color: '#ffffff' },
      { id: sid(), type: 'subtitle', x: 15, y: 50, w: 70, h: 10,
        content: departamento ? `${departamento}` : 'Ambientação Operacional',
        fontSize: 'xl', align: 'center', color: '#93c5fd' },
      { id: sid(), type: 'text',     x: 20, y: 64, w: 60, h:  8,
        content: `Público-alvo: ${publicoAlvo}`,
        fontSize: 'sm', align: 'center', color: '#bfdbfe' },
    ],
  })

  // ── Agenda ───────────────────────────────────────────────────────────────────
  const agendaItems = blocos.map((b, i) => `${i + 1}. ${b.titulo}`).join('\n')
  slides.push({
    id: sid(), bg: '#ffffff',
    elements: [
      { id: sid(), type: 'title',  x: 8,  y: 10, w: 84, h: 14, content: 'O que vamos ver hoje',
        fontSize: '3xl', bold: true, align: 'left', color: '#1e3a5f' },
      { id: sid(), type: 'text',   x: 8,  y: 28, w: 84, h: 60, content: agendaItems,
        fontSize: 'lg', align: 'left', color: '#334155' },
    ],
  })

  // ── Um slide por processo ────────────────────────────────────────────────────
  blocos.forEach((bloco, idx) => {
    const bg = SLIDE_BGS[(idx % 2 === 0) ? 2 : 0]
    const textColor = bg === '#1e3a5f' ? '#e2e8f0' : '#334155'
    const headColor = bg === '#1e3a5f' ? '#ffffff' : '#1e3a5f'
    const labelColor = bg === '#1e3a5f' ? '#93c5fd' : '#6366f1'

    // Monta corpo do slide com dados reais
    const linhas: string[] = []
    if (bloco.objetivo)   linhas.push(`🎯 Objetivo: ${bloco.objetivo}`)
    if (bloco.responsavel && bloco.responsavel !== 'Não informado') linhas.push(`👤 Responsável: ${bloco.responsavel}`)
    if (bloco.area)       linhas.push(`🏢 Área: ${bloco.area}`)
    if (bloco.frequencia && bloco.frequencia !== 'Não informado') linhas.push(`🔁 Frequência: ${bloco.frequencia}`)
    if (bloco.entrada && bloco.entrada !== 'Não informado')   linhas.push(`📥 Entradas: ${bloco.entrada}`)
    if (bloco.saida && bloco.saida !== 'Não informado')       linhas.push(`📤 Saídas: ${bloco.saida}`)
    if (bloco.sistema && bloco.sistema !== 'Não informado')   linhas.push(`💻 Sistemas/Ferramentas: ${bloco.sistema}`)
    if (bloco.prazo && bloco.prazo !== 'Não informado')       linhas.push(`⏱ Prazo/SLA: ${bloco.prazo}`)
    if (bloco.riscos)     linhas.push(`⚠️ Riscos: ${bloco.riscos}`)

    const corpo = linhas.length ? linhas.join('\n') : 'Dados não informados no processo.'

    slides.push({
      id: sid(), bg,
      elements: [
        { id: sid(), type: 'text',  x: 8,  y: 5,  w: 30, h: 8,
          content: bloco.codigo ? `${bloco.codigo}` : `Processo ${idx + 1}`,
          fontSize: 'sm', bold: false, align: 'left', color: labelColor },
        { id: sid(), type: 'title', x: 8,  y: 11, w: 84, h: 13,
          content: String(bloco.titulo),
          fontSize: '3xl', bold: true, align: 'left', color: headColor },
        { id: sid(), type: 'text',  x: 8,  y: 27, w: 84, h: 65,
          content: corpo,
          fontSize: 'base', align: 'left', color: textColor },
      ],
    })
  })

  // ── Encerramento ─────────────────────────────────────────────────────────────
  slides.push({
    id: sid(), bg: '#1e3a5f',
    elements: [
      { id: sid(), type: 'title', x: 10, y: 35, w: 80, h: 16, content: 'Dúvidas?',
        fontSize: '4xl', bold: true, align: 'center', color: '#ffffff' },
      { id: sid(), type: 'text',  x: 15, y: 56, w: 70, h: 10,
        content: titulo,
        fontSize: 'lg', align: 'center', color: '#93c5fd' },
    ],
  })

  return slides
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { titulo, processIds = [], departamento, publicoAlvo, responsavel } = body

  if (!titulo)          return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })
  if (!processIds.length) return NextResponse.json({ error: 'Selecione ao menos um processo' }, { status: 400 })

  // ── 1. Busca dados reais dos processos ──────────────────────────────────────
  const placeholders = processIds.map(() => '?').join(',')
  const processos = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, name, code, owner, department, frequency, objective, description,
            inputs, outputs, tools, sla, risks, notes, status
     FROM "Process" WHERE id IN (${placeholders})`,
    ...processIds
  )

  const processosEnriquecidos: Array<Record<string, unknown> & { fluxogramas: Record<string, unknown>[] }> = await Promise.all(
    processos.map(async (proc) => {
      const fluxogramas = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id, title, description FROM "Flowchart" WHERE "processId" = ? LIMIT 3`,
        proc.id
      ).catch(() => [])
      return { ...proc, fluxogramas }
    })
  )

  // ── 2. Monta blocos da ambientação ──────────────────────────────────────────
  const blocos = processosEnriquecidos.map((proc, idx) => ({
    ordem:       idx + 1,
    processId:   proc.id,
    titulo:      proc.name        ?? 'Processo',
    codigo:      proc.code        ?? null,
    objetivo:    proc.objective   ?? null,
    responsavel: proc.owner       ?? 'Não informado',
    area:        proc.department  ?? departamento ?? null,
    frequencia:  proc.frequency   ?? 'Não informado',
    sistema:     proc.tools       ?? 'Não informado',
    entrada:     proc.inputs      ?? 'Não informado',
    saida:       proc.outputs     ?? 'Não informado',
    prazo:       proc.sla         ?? 'Não informado',
    riscos:      proc.risks       ?? null,
    observacoes: proc.notes       ?? null,
    status:      proc.status      ?? null,
    fluxogramas: proc.fluxogramas,
  }))

  const conteudo = {
    tipo: 'AMBIENTACAO_PROCESSOS',
    geradoEm: new Date().toISOString(),
    blocos,
  }

  // ── 3. Cria a Apresentação com slides já populados ──────────────────────────
  const slides = buildSlides(titulo, departamento ?? null, publicoAlvo ?? 'Novos colaboradores', blocos)
  const now = new Date()

  // Garante que o usuário padrão existe
  await prisma.user.upsert({
    where:  { id: 'default-user' },
    update: {},
    create: { id: 'default-user', name: 'Newton', email: 'admin@sistema.local', role: 'admin' },
  })

  const apres = await prisma.presentation.create({
    data: {
      title:       titulo,
      description: `Ambientação com ${blocos.length} processo(s): ${blocos.map(b => b.titulo).join(', ')}`,
      type:        'slides',
      status:      'draft',
      objective:   `Apresentar o funcionamento operacional — ${titulo}`,
      audience:    publicoAlvo ?? 'Novos colaboradores',
      content:     JSON.stringify({ slides }),
      linkedTo:    JSON.stringify({ type: 'training', id: 'pending' }),
      userId:      'default-user',
    },
  })

  // Registra histórico da apresentação
  await prisma.presentationHistory.create({
    data: { presentationId: apres.id, action: 'CRIACAO', description: 'Gerado automaticamente da ambientação' },
  })

  // ── 4. Cria o Training AMBIENTACAO vinculado à apresentação ─────────────────
  const trainingId = randomUUID()

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Training"
       ("id","tipo","modalidade","titulo","objetivo","departamento","publicoAlvo","responsavel",
        "presentationId","status","obrigatorio","conteudo","createdAt","updatedAt")
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    trainingId,
    'AMBIENTACAO',
    'SIMPLIFICADO',
    titulo,
    `Apresentação dos processos do ${departamento ?? 'departamento'}`,
    departamento  ?? null,
    publicoAlvo   ?? 'Novos colaboradores',
    responsavel   ?? null,
    apres.id,
    'RASCUNHO',
    false,
    JSON.stringify(conteudo),
    now, now,
  )

  // Atualiza linkedTo da apresentação com o trainingId real
  await prisma.presentation.update({
    where: { id: apres.id },
    data:  { linkedTo: JSON.stringify({ type: 'training', id: trainingId }) },
  })

  await prisma.$executeRawUnsafe(
    `INSERT INTO "TrainingHistory" ("id","trainingId","acao","descricao","createdAt")
     VALUES (?,?,'CRIACAO','Ambientação gerada a partir de processos existentes',?)`,
    randomUUID(), trainingId, now,
  )

  return NextResponse.json({
    trainingId,
    presentationId: apres.id,
    titulo,
    totalProcessos: blocos.length,
    totalSlides: slides.length,
  }, { status: 201 })
}
