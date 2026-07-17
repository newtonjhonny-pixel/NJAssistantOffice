import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

const SYSTEM = `Você é um especialista em Recursos Humanos, Departamento Pessoal e Gestão por Processos.
Analisa descrições de cargos e organiza as atividades em processos estruturados.
Responda sempre em português brasileiro, de forma profissional e estruturada.
Use ** para negrito. Organize em seções claras com títulos em maiúsculas.
Nunca invente dados — baseie-se apenas nas informações fornecidas.`

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { mode } = await req.json() as { mode: 'organize' | 'improve' | 'separate' | 'flowchart' | 'checklist'; processName?: string; content?: string }
  const body = await req.clone().json() as { mode: string; processName?: string; content?: string }

  const role = await prisma.jobRole.findUnique({
    where: { id: params.id },
    include: { processes: { include: { checklistItems: true } } },
  })
  if (!role) return NextResponse.json({ error: 'Cargo não encontrado' }, { status: 404 })

  const descriptionText = [
    role.objective         && `Objetivo: ${role.objective}`,
    role.mission           && `Missão: ${role.mission}`,
    role.responsibilities  && `Responsabilidades: ${role.responsibilities}`,
    role.dailyActivities   && `Atividades diárias: ${role.dailyActivities}`,
    role.weeklyActivities  && `Atividades semanais: ${role.weeklyActivities}`,
    role.monthlyActivities && `Atividades mensais: ${role.monthlyActivities}`,
    role.eventualActivities&& `Atividades eventuais: ${role.eventualActivities}`,
    role.technicalSkills   && `Competências técnicas: ${role.technicalSkills}`,
    role.behavioralSkills  && `Competências comportamentais: ${role.behavioralSkills}`,
    role.kpis              && `KPIs: ${role.kpis}`,
  ].filter(Boolean).join('\n\n')

  if (!aiService.isConfigured()) {
    return NextResponse.json({ content: buildFallback(mode, role.name, descriptionText, body.processName, body.content), aiPowered: false })
  }

  let prompt = ''
  if (mode === 'organize') {
    prompt = `Cargo: ${role.name} | Departamento: ${role.department ?? 'N/A'}\n\n${descriptionText}\n\nOrganize todas as atividades acima em PROCESSOS DE TRABALHO claramente definidos. Para cada processo crie:\n- Nome do processo\n- Descrição objetiva\n- Passo a passo numerado\n- Checklist de itens (1 por linha com ☐)\n- Prazo ou frequência\n- Responsável sugerido\n\nIdentifique também atividades duplicadas e sugira melhorias na estrutura.`
  } else if (mode === 'improve') {
    prompt = `Cargo: ${role.name} | Departamento: ${role.department ?? 'N/A'}\n\n${descriptionText}\n\nMelhore e padronize profissionalmente esta descrição de cargo:\n1. Reescreva o objetivo e missão com linguagem corporativa\n2. Organize as responsabilidades em tópicos claros\n3. Elimine duplicidades\n4. Sugira competências técnicas e comportamentais faltantes\n5. Sugira KPIs relevantes para este cargo\n6. Sugira treinamentos recomendados\n7. Corrija o português`
  } else if (mode === 'separate') {
    const inputText = body.content || descriptionText
    prompt = `Cargo: ${role.name}\n\nTexto com atividades:\n${inputText}\n\nSepare automaticamente estas atividades em PROCESSOS DE TRABALHO de RH/DP. Para cada processo identifique:\n- Nome do processo (ex: Admissão, Rescisão, Férias, Folha, eSocial, FGTS, etc.)\n- Atividades relacionadas\n- Checklist sugerido (☐ item)\n- Prazo típico\n- Documentos necessários\n\nFormate de forma clara e estruturada.`
  } else if (mode === 'flowchart') {
    const processName = body.processName || 'Processo'
    const proc = role.processes.find(p => p.name === processName)
    const text = proc?.steps || proc?.description || descriptionText
    prompt = `Cargo: ${role.name} | Processo: ${processName}\n\nAtividades:\n${text}\n\nGere um FLUXOGRAMA TEXTUAL detalhado para este processo, usando o formato:\n\n[INÍCIO]\n↓\n[Etapa 1]\n↓\n[Decisão? Sim →] [Não ↓]\n↓\n[Etapa 2]\n↓\n[FIM]\n\nSeja detalhado e contemple os pontos de decisão importantes.`
  } else if (mode === 'checklist') {
    const processName = body.processName || 'Processo'
    const proc = role.processes.find(p => p.name === processName)
    const text = proc?.description || proc?.steps || descriptionText
    prompt = `Cargo: ${role.name} | Processo: ${processName}\n\nDescrição:\n${text}\n\nCrie um CHECKLIST COMPLETO e detalhado para este processo. Liste cada item com ☐ e organize por etapa. Inclua todos os documentos, verificações e ações necessárias.`
  }

  try {
    const result = await aiService.ask({
      module: 'job-roles.analyze',
      specialist: 'Recursos Humanos e Departamento Pessoal',
      systemPrompt: SYSTEM,
      message: prompt,
      maxTokens: 2000,
    })
    return NextResponse.json({ content: result.content, aiPowered: result.aiPowered })
  } catch {
    return NextResponse.json({ content: buildFallback(mode, role.name, descriptionText, body.processName, body.content), aiPowered: false })
  }
}

function buildFallback(mode: string, name: string, desc: string, processName?: string, content?: string): string {
  if (mode === 'organize' || mode === 'separate') {
    return `**ORGANIZAÇÃO DE PROCESSOS — ${name.toUpperCase()}**\n\n*(IA não configurada — resultado simulado)*\n\n**PROCESSO: Admissão**\n☐ Receber documentação do colaborador\n☐ Cadastrar no sistema\n☐ Assinar contrato de trabalho\n☐ Registrar na CTPS\n☐ Enviar ao eSocial\n\n**PROCESSO: Folha de Pagamento**\n☐ Coletar marcações de ponto\n☐ Lançar horas extras e faltas\n☐ Calcular proventos e descontos\n☐ Gerar holerites\n☐ Enviar DCTFWeb\n\n**PROCESSO: Rescisão**\n☐ Receber comunicado\n☐ Verificar estabilidade\n☐ Calcular verbas rescisórias\n☐ Emitir TRCT\n☐ Realizar homologação\n\nAdicione OPENAI_API_KEY no .env para análise completa com IA real.`
  }
  if (mode === 'improve') {
    return `**DESCRIÇÃO MELHORADA — ${name.toUpperCase()}**\n\n*(IA não configurada — resultado simulado)*\n\n**OBJETIVO DO CARGO**\nResponsável pela execução das rotinas de Departamento Pessoal, garantindo o cumprimento da legislação trabalhista e a gestão eficiente dos processos de pessoal.\n\n**COMPETÊNCIAS SUGERIDAS**\n• Conhecimento em CLT e legislação trabalhista\n• Domínio de sistemas de folha de pagamento\n• Atenção a detalhes e organização\n• Proatividade e gestão do tempo\n\n**KPIs SUGERIDOS**\n• Prazo de envio da folha\n• Índice de erros nos cálculos\n• Tempo médio de admissão\n\nAdicione OPENAI_API_KEY no .env para melhorias reais com IA.`
  }
  if (mode === 'flowchart') {
    return `**FLUXOGRAMA — ${processName ?? 'Processo'}**\n\n*(IA não configurada — resultado simulado)*\n\n[INÍCIO]\n↓\n[Receber solicitação]\n↓\n[Verificar documentação]\n↓\n[Documentos completos?]\nSim → [Processar]\nNão → [Solicitar pendências] → [Verificar documentação]\n↓\n[Executar processo]\n↓\n[Validar resultado]\n↓\n[Arquivar]\n↓\n[FIM]\n\nAdicione OPENAI_API_KEY para fluxograma detalhado.`
  }
  return `**CHECKLIST — ${processName ?? 'Processo'}**\n\n*(IA não configurada — resultado simulado)*\n\n☐ Verificar documentação necessária\n☐ Confirmar prazos legais\n☐ Executar lançamentos no sistema\n☐ Revisar cálculos\n☐ Obter assinaturas necessárias\n☐ Arquivar documentos\n☐ Registrar conclusão\n\nAdicione OPENAI_API_KEY para checklist personalizado com IA.`
}
