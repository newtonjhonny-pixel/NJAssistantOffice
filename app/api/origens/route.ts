import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULTS = [
  { name: 'E-mail',                   icon: '📧', color: '#3B82F6', order: 0 },
  { name: 'Reunião',                  icon: '👥', color: '#8B5CF6', order: 1 },
  { name: 'WhatsApp',                 icon: '💬', color: '#10B981', order: 2 },
  { name: 'Telefone',                 icon: '📞', color: '#F59E0B', order: 3 },
  { name: 'Atendimento Presencial',   icon: '🏢', color: '#6366F1', order: 4 },
  { name: 'Sistema Interno',          icon: '💻', color: '#64748B', order: 5 },
  { name: 'Solicitação da Diretoria', icon: '⭐', color: '#EF4444', order: 6 },
  { name: 'Auditoria',                icon: '🔍', color: '#F97316', order: 7 },
  { name: 'Jurídico',                 icon: '⚖️', color: '#0EA5E9', order: 8 },
  { name: 'Departamento Pessoal',     icon: '📋', color: '#D97706', order: 9 },
  { name: 'RH',                       icon: '👤', color: '#EC4899', order: 10 },
  { name: 'SST',                      icon: '🦺', color: '#059669', order: 11 },
  { name: 'Meio Ambiente',            icon: '🌿', color: '#16A34A', order: 12 },
  { name: 'Financeiro',               icon: '💰', color: '#CA8A04', order: 13 },
  { name: 'Compras',                  icon: '🛒', color: '#7C3AED', order: 14 },
  { name: 'Comercial',                icon: '📈', color: '#2563EB', order: 15 },
  { name: 'TI',                       icon: '🖥️', color: '#0891B2', order: 16 },
  { name: 'Projeto',                  icon: '📁', color: '#9333EA', order: 17 },
  { name: 'Cliente',                  icon: '🤝', color: '#DC2626', order: 18 },
  { name: 'Fornecedor',               icon: '🚚', color: '#65A30D', order: 19 },
  { name: 'Outro',                    icon: '📌', color: '#94A3B8', order: 20 },
]

async function seedDefaults() {
  for (const d of DEFAULTS) {
    await prisma.taskOrigin.upsert({
      where: { name: d.name },
      update: {},
      create: { ...d, createdBy: 'sistema' },
    })
  }
}

export async function GET() {
  const count = await prisma.taskOrigin.count()
  if (count === 0) await seedDefaults()

  const origens = await prisma.taskOrigin.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { tasks: true } } },
  })
  return NextResponse.json(origens)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    const existingCount = await prisma.taskOrigin.count()
    const origem = await prisma.taskOrigin.create({
      data: {
        name:        body.name.trim(),
        description: body.description ?? null,
        color:       body.color       ?? '#6B7280',
        icon:        body.icon        ?? '📌',
        active:      body.active      ?? true,
        order:       body.order       ?? existingCount,
        createdBy:   'Newton',
      },
      include: { _count: { select: { tasks: true } } },
    })
    return NextResponse.json(origem, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Já existe uma origem com este nome.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar origem.', details: msg }, { status: 500 })
  }
}
