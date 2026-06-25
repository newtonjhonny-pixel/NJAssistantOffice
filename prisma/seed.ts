import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'newton@njgestor.com.br' },
    update: {},
    create: {
      name: 'Newton',
      email: 'newton@njgestor.com.br',
      role: 'admin',
    },
  })

  // Tarefas de exemplo
  const tasks = [
    {
      title: 'Conferir pagamento da rescisão contratual',
      description: 'Verificar valores e datas do pagamento da rescisão do funcionário João Silva.',
      origin: 'E-mail',
      priority: 'URGENTE',
      status: 'PENDENTE',
      person: 'RH - Maria Santos',
      dueDate: new Date(Date.now() - 86400000), // ontem (atrasada)
      userId: user.id,
    },
    {
      title: 'Cobrar retorno do departamento fiscal',
      description: 'Aguardando documentos para fechamento do mês.',
      origin: 'Demanda interna',
      priority: 'ALTA',
      status: 'AGUARDANDO_RETORNO',
      person: 'Dep. Fiscal - Carlos Andrade',
      dueDate: new Date(Date.now() + 86400000 * 2),
      userId: user.id,
    },
    {
      title: 'Responder solicitação do jurídico',
      description: 'Parecer sobre contrato de prestação de serviços.',
      origin: 'E-mail',
      priority: 'ALTA',
      status: 'PENDENTE',
      person: 'Jurídico - Dra. Ana Lima',
      dueDate: new Date(Date.now() + 86400000 * 1),
      userId: user.id,
    },
    {
      title: 'Reunião de alinhamento com equipe',
      description: 'Alinhamento sobre metas do trimestre.',
      origin: 'Agenda',
      priority: 'MEDIA',
      status: 'EM_ANDAMENTO',
      person: 'Equipe administrativa',
      dueDate: new Date(Date.now() + 86400000 * 3),
      userId: user.id,
    },
    {
      title: 'Protocolar documentos na prefeitura',
      description: 'Documentação para renovação de alvará.',
      origin: 'Demanda interna',
      priority: 'ALTA',
      status: 'PENDENTE',
      person: 'Dep. Legal',
      dueDate: new Date(Date.now() + 86400000 * 5),
      userId: user.id,
    },
    {
      title: 'Elaborar relatório mensal de atividades',
      description: 'Relatório consolidado das atividades administrativas de junho.',
      origin: 'Rotina',
      priority: 'MEDIA',
      status: 'PENDENTE',
      person: 'Newton',
      dueDate: new Date(Date.now() + 86400000 * 7),
      userId: user.id,
    },
    {
      title: 'Verificar contrato de fornecedor',
      description: 'Analisar cláusulas de renovação do contrato de limpeza.',
      origin: 'E-mail',
      priority: 'BAIXA',
      status: 'PENDENTE',
      person: 'Dep. Compras',
      dueDate: new Date(Date.now() + 86400000 * 10),
      userId: user.id,
    },
    {
      title: 'Acompanhar processo trabalhista nº 1234/2024',
      description: 'Verificar andamento no sistema do TRT.',
      origin: 'Jurídico',
      priority: 'URGENTE',
      status: 'AGUARDANDO_RETORNO',
      person: 'Dra. Ana Lima',
      dueDate: new Date(Date.now() - 86400000 * 3), // 3 dias atrás (atrasada)
      userId: user.id,
    },
    {
      title: 'Atualizar cadastro de funcionários',
      description: 'Atualizar dados de contato e endereço dos funcionários.',
      origin: 'Rotina',
      priority: 'BAIXA',
      status: 'CONCLUIDA',
      person: 'Newton',
      userId: user.id,
    },
    {
      title: 'Enviar documentação para auditoria',
      description: 'Preparar e enviar dossiê para auditoria externa.',
      origin: 'E-mail',
      priority: 'URGENTE',
      status: 'EM_ANDAMENTO',
      person: 'Dir. Financeiro',
      dueDate: new Date(Date.now() + 86400000 * 1),
      userId: user.id,
    },
    {
      title: 'Revisar política de benefícios',
      description: 'Adequar política de benefícios conforme nova legislação.',
      origin: 'Demanda interna',
      priority: 'MEDIA',
      status: 'PENDENTE',
      person: 'RH',
      dueDate: new Date(Date.now() + 86400000 * 15),
      userId: user.id,
    },
    {
      title: 'Solicitar orçamentos para equipamentos',
      description: 'Levantar 3 orçamentos para aquisição de equipamentos de TI.',
      origin: 'Demanda interna',
      priority: 'MEDIA',
      status: 'AGUARDANDO_RETORNO',
      person: 'Dep. TI',
      dueDate: new Date(Date.now() - 86400000 * 2), // 2 dias atrás
      userId: user.id,
    },
  ]

  for (const task of tasks) {
    const created = await prisma.task.create({ data: task })
    await prisma.taskHistory.create({
      data: {
        taskId: created.id,
        action: 'CRIACAO',
        description: 'Tarefa criada',
      },
    })
  }

  // Itens da caixa de entrada
  const inboxItems = [
    {
      sender: 'Maria Santos',
      senderEmail: 'maria.santos@empresa.com.br',
      subject: 'Rescisão contratual - João Silva',
      body: 'Prezado Newton, segue em anexo os documentos referentes à rescisão contratual do funcionário João Silva. Solicito sua verificação dos valores calculados e confirmação do pagamento até amanhã. Atenciosamente, Maria Santos - RH',
      summary: 'Solicitação de verificação dos valores de rescisão do funcionário João Silva com urgência.',
      suggestedTask: 'Verificar e confirmar valores da rescisão de João Silva',
      suggestedReply: 'Prezada Maria,\n\nRecebi os documentos. Realizarei a verificação dos valores hoje e retorno com a confirmação até o final do dia.\n\nAtenciosamente,\nNewton',
      receivedAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      sender: 'Carlos Andrade',
      senderEmail: 'carlos.andrade@fiscal.com.br',
      subject: 'Atraso na entrega dos documentos fiscais',
      body: 'Bom dia Newton, Estou com dificuldades para fechar os documentos do mês devido a pendências dos fornecedores. Precisarei de mais 3 dias úteis. Por favor, confirme se é possível. Grato, Carlos',
      summary: 'Departamento fiscal solicita prorrogação de 3 dias úteis para entrega de documentos.',
      suggestedTask: 'Avaliar impacto da prorrogação fiscal e comunicar decisão a Carlos',
      suggestedReply: 'Carlos, entendido. Podemos conceder o prazo adicional, porém solicito que a entrega ocorra impreterivelmente até sexta-feira. Favor confirmar o recebimento desta mensagem. Newton',
      receivedAt: new Date(Date.now() - 3600000 * 5),
    },
    {
      sender: 'Dra. Ana Lima',
      senderEmail: 'ana.lima@juridico.com.br',
      subject: 'Parecer urgente - Contrato de prestação de serviços',
      body: 'Newton, preciso do seu parecer sobre o contrato de prestação de serviços da empresa XYZ. Existem cláusulas que precisam ser revisadas antes da assinatura prevista para amanhã. Segue o documento para análise. Ana Lima',
      summary: 'Jurídico solicita análise urgente de contrato antes da assinatura amanhã.',
      suggestedTask: 'Analisar cláusulas do contrato XYZ e enviar parecer ao jurídico',
      suggestedReply: 'Dra. Ana, recebi o contrato e iniciarei a análise imediatamente. Retorno com o parecer ainda hoje. Newton',
      receivedAt: new Date(Date.now() - 3600000 * 1),
    },
    {
      sender: 'Dir. Roberto Campos',
      senderEmail: 'roberto.campos@diretoria.com.br',
      subject: 'Reunião de planejamento estratégico - Confirmação',
      body: 'Prezado Newton, confirmamos a reunião de planejamento estratégico para o próximo dia 28/06 às 14h na sala de reuniões principal. Pauta: revisão de metas, indicadores e plano de ação para o 2º semestre. Confirme sua presença. Dir. Roberto Campos',
      summary: 'Confirmação de reunião estratégica em 28/06 às 14h. Necessária confirmação de presença.',
      suggestedTask: 'Confirmar presença na reunião de 28/06 e preparar material',
      suggestedReply: 'Prezado Diretor Roberto, confirmo minha presença na reunião do dia 28/06 às 14h. Estarei preparado com os materiais necessários. Atenciosamente, Newton',
      receivedAt: new Date(Date.now() - 3600000 * 24),
    },
    {
      sender: 'Fornecedor TechEquip',
      senderEmail: 'vendas@techequip.com.br',
      subject: 'Orçamento nº 2024/789 - Equipamentos de TI',
      body: 'Newton, conforme solicitado, segue orçamento para os equipamentos de TI. Total: R$ 45.800,00. Validade: 15 dias. Condições: 30/60/90 dias. Aguardamos retorno para agendamento de entrega. TechEquip',
      summary: 'Orçamento de R$ 45.800,00 para equipamentos de TI com validade de 15 dias.',
      suggestedTask: 'Analisar orçamento TechEquip e comparar com demais cotações',
      suggestedReply: 'Prezados, recebemos o orçamento. Estamos em processo de análise comparativa e retornaremos em breve com nossa decisão. Newton',
      receivedAt: new Date(Date.now() - 3600000 * 48),
      isRead: true,
    },
  ]

  for (const item of inboxItems) {
    await prisma.inboxItem.create({ data: item })
  }

  // ─── Projeto de exemplo ───────────────────────────────────────────────────────
  const existingProject = await prisma.project.findFirst({ where: { name: 'Criação do Sistema de Departamento Pessoal' } })
  if (!existingProject) {
    const projeto = await prisma.project.create({
      data: {
        name:        'Criação do Sistema de Departamento Pessoal',
        description: 'Desenvolvimento completo do sistema de DP para gestão de funcionários, folha de pagamento e documentação.',
        objective:   'Automatizar processos do departamento pessoal, reduzindo retrabalho e aumentando a confiabilidade das informações.',
        responsible: 'Newton',
        startDate:   new Date('2026-06-01'),
        dueDate:     new Date('2026-09-30'),
        priority:    'ALTA',
        status:      'EM_ANDAMENTO',
      },
    })

    const stagesData = [
      { name: 'Levantamento de Requisitos', order: 0, status: 'CONCLUIDA', startDate: new Date('2026-06-01'), dueDate: new Date('2026-06-10') },
      { name: 'Banco de Dados',             order: 1, status: 'CONCLUIDA', startDate: new Date('2026-06-11'), dueDate: new Date('2026-06-20') },
      { name: 'Telas Principais',           order: 2, status: 'EM_ANDAMENTO', startDate: new Date('2026-06-21'), dueDate: new Date('2026-07-31') },
      { name: 'Testes',                     order: 3, status: 'NAO_INICIADA', startDate: new Date('2026-08-01'), dueDate: new Date('2026-08-20') },
      { name: 'Implantação',                order: 4, status: 'NAO_INICIADA', startDate: new Date('2026-08-21'), dueDate: new Date('2026-09-30') },
    ]

    const stages = []
    for (const s of stagesData) {
      const stage = await prisma.projectStage.create({ data: { projectId: projeto.id, ...s } })
      stages.push(stage)
    }

    const tasksData = [
      { stageId: stages[0].id, title: 'Entrevistas com usuários do DP', status: 'CONCLUIDA' },
      { stageId: stages[0].id, title: 'Documentação dos requisitos', status: 'CONCLUIDA' },
      { stageId: stages[1].id, title: 'Modelagem do banco de dados', status: 'CONCLUIDA' },
      { stageId: stages[1].id, title: 'Criação das migrations', status: 'CONCLUIDA' },
      { stageId: stages[2].id, title: 'Tela de cadastro de funcionários', status: 'CONCLUIDA' },
      { stageId: stages[2].id, title: 'Tela de folha de pagamento', status: 'EM_ANDAMENTO' },
      { stageId: stages[2].id, title: 'Tela de rescisão contratual', status: 'PENDENTE' },
      { stageId: stages[2].id, title: 'Tela de férias e afastamentos', status: 'PENDENTE' },
      { stageId: stages[3].id, title: 'Testes unitários', status: 'PENDENTE' },
      { stageId: stages[3].id, title: 'Testes de integração', status: 'PENDENTE' },
      { stageId: stages[4].id, title: 'Configuração do servidor', status: 'PENDENTE' },
      { stageId: stages[4].id, title: 'Deploy e validação final', status: 'PENDENTE' },
    ]

    for (const t of tasksData) {
      await prisma.projectTask.create({ data: { projectId: projeto.id, priority: 'MEDIA', ...t } })
    }

    await prisma.projectMilestone.createMany({
      data: [
        { projectId: projeto.id, title: 'Requisitos aprovados pelo cliente', dueDate: new Date('2026-06-10'), completedAt: new Date('2026-06-09'), status: 'CONCLUIDA', description: 'Requisitos validados e assinados pelo cliente em reunião.' },
        { projectId: projeto.id, title: 'Banco de dados em produção',        dueDate: new Date('2026-06-20'), completedAt: new Date('2026-06-20'), status: 'CONCLUIDA', description: 'Migrations aplicadas com sucesso no servidor de produção.' },
        { projectId: projeto.id, title: 'Primeira versão funcional',          dueDate: new Date('2026-07-31'), status: 'PENDENTE',  description: 'Entrega da primeira versão com telas principais operacionais.' },
        { projectId: projeto.id, title: 'Aprovação final do cliente',         dueDate: new Date('2026-09-15'), status: 'PENDENTE',  description: 'Validação final de todos os módulos pelo cliente.' },
      ],
    })

    await prisma.projectHistory.createMany({
      data: [
        { projectId: projeto.id, type: 'CRIACAO',         title: 'Projeto criado',            description: 'Projeto "Criação do Sistema de DP" foi criado.', createdAt: new Date('2026-06-01') },
        { projectId: projeto.id, type: 'ETAPA_CONCLUIDA', title: 'Etapa concluída',            description: 'Etapa "Levantamento de Requisitos" foi concluída.', createdAt: new Date('2026-06-10') },
        { projectId: projeto.id, type: 'MARCO_CUMPRIDO',  title: 'Marco cumprido',             description: 'Marco "Requisitos aprovados pelo cliente" foi cumprido.', createdAt: new Date('2026-06-10') },
        { projectId: projeto.id, type: 'ETAPA_CONCLUIDA', title: 'Etapa concluída',            description: 'Etapa "Banco de Dados" foi concluída.', createdAt: new Date('2026-06-20') },
        { projectId: projeto.id, type: 'STATUS',          title: 'Status alterado',            description: 'Status alterado de "PLANEJADO" para "EM_ANDAMENTO".', createdAt: new Date('2026-06-21') },
      ],
    })
  }

  console.log('Seed concluído com sucesso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
