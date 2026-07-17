import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

const SYSTEM = `Você é um especialista em Departamento Pessoal, Recursos Humanos e Gestão por Processos.
Cria documentos operacionais profissionais: POPs, Instruções de Trabalho e Checklists.
Responda sempre em português brasileiro, de forma clara, objetiva e estruturada.
Use ** para negrito. Organize em seções numeradas ou com bullets (•).
Nunca invente dados — baseie-se apenas nas informações fornecidas.`

type Mode =
  | 'generate-pop'
  | 'improve-pop'
  | 'attention-points'
  | 'risks'
  | 'generate-steps'
  | 'improve-steps'
  | 'generate-checklist'
  | 'improve-checklist'
  | 'it-to-checklist'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json() as { mode: Mode; content?: string; processType?: string }
  const { mode, content, processType } = body

  const doc = await prisma.procedureDocument.findUnique({
    where: { id: params.id },
    include: { steps: { orderBy: { order: 'asc' } }, checklistItems: { orderBy: { order: 'asc' } } },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const docContext = [
    doc.title       && `Título: ${doc.title}`,
    doc.process     && `Processo: ${doc.process}`,
    doc.department  && `Departamento: ${doc.department}`,
    doc.responsible && `Responsável: ${doc.responsible}`,
    doc.objective   && `Objetivo: ${doc.objective}`,
    doc.description && `Descrição: ${doc.description}`,
    content         && `Texto adicional: ${content}`,
  ].filter(Boolean).join('\n')

  if (!aiService.isConfigured()) {
    return NextResponse.json({ content: buildFallback(mode, doc.title, doc.process, processType), aiPowered: false })
  }

  let prompt = ''

  if (mode === 'generate-pop') {
    prompt = `Com base nas informações abaixo, gere um POP (Procedimento Operacional Padrão) completo e profissional:\n\n${docContext}\n\nEstruture em:\n**OBJETIVO**\n**APLICAÇÃO**\n**RESPONSÁVEIS**\n**MATERIAIS/SISTEMAS UTILIZADOS**\n**DESCRIÇÃO DO PROCEDIMENTO** (passo a passo numerado)\n**RESPONSABILIDADES**\n**PONTOS DE ATENÇÃO**\n**RISCOS E CONTROLES**\n**RESULTADO ESPERADO**\n**OBSERVAÇÕES**`
  } else if (mode === 'improve-pop') {
    prompt = `Melhore, padronize e torne mais profissional o seguinte POP de Departamento Pessoal:\n\n${docContext}\n\nMantenha a estrutura, melhore a linguagem, elimine ambiguidades, adicione clareza nos passos e sugira itens importantes que estejam faltando.`
  } else if (mode === 'attention-points') {
    prompt = `Com base no seguinte processo de DP/RH, gere uma lista de PONTOS DE ATENÇÃO importantes:\n\n${docContext}\n\nFormate como lista com • para cada ponto. Foque em erros comuns, prazos críticos, obrigações legais e riscos de conformidade.`
  } else if (mode === 'risks') {
    prompt = `Com base no seguinte processo de DP/RH, gere uma lista de RISCOS e seus CONTROLES:\n\n${docContext}\n\nFormate como:\n• **Risco:** [descrição] → **Controle:** [ação preventiva/corretiva]\n\nIdentifique riscos legais, trabalhistas, operacionais e de prazo.`
  } else if (mode === 'generate-steps') {
    prompt = `Com base na descrição abaixo, gere um passo a passo detalhado para uma Instrução de Trabalho (IT):\n\n${docContext}\n\nFormate cada passo como:\n**Passo N — [Título do passo]**\n[Descrição detalhada da ação]\n⚠️ Ponto de atenção: [se aplicável]\n\nSeja específico e prático. Pense em quem executa pela primeira vez.`
  } else if (mode === 'improve-steps') {
    const stepsText = doc.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description || ''}`).join('\n')
    prompt = `Melhore os passos abaixo da Instrução de Trabalho "${doc.title}":\n\n${stepsText}\n\nPara cada passo:\n- Melhore a clareza da descrição\n- Adicione pontos de atenção se relevante\n- Sugira se algum passo deve ser dividido\n- Corrija o português\n\nRetorne os passos melhorados no mesmo formato numerado.`
  } else if (mode === 'generate-checklist') {
    const pt = processType || doc.process || doc.title
    prompt = `Gere um checklist completo e detalhado para o processo: **${pt}** (Departamento Pessoal/RH).\n\nContexto adicional: ${docContext}\n\nFormate cada item como:\n☐ [Descrição do item] | Obrigatório: [Sim/Não]\n\nOrganize por etapas do processo. Inclua documentos necessários, prazos legais, verificações obrigatórias e conferências finais.`
  } else if (mode === 'improve-checklist') {
    const itemsText = doc.checklistItems.map((c, i) => `${i + 1}. ${c.description} (${c.required ? 'Obrigatório' : 'Opcional'})`).join('\n')
    prompt = `Melhore e complete o seguinte checklist de "${doc.title}":\n\n${itemsText}\n\nSugira itens que estejam faltando, melhore as descrições e indique corretamente quais são obrigatórios.`
  } else if (mode === 'it-to-checklist') {
    const stepsText = doc.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description || ''}`).join('\n')
    prompt = `Converta a seguinte Instrução de Trabalho em um CHECKLIST de conferência:\n\nIT: ${doc.title}\n\nPassos:\n${stepsText}\n\nGere um checklist com • para cada item verificável. Inclua documentos, confirmações e conferências finais.`
  }

  try {
    const result = await aiService.ask({
      module: 'procedures.analyze',
      specialist: 'Departamento Pessoal e Processos',
      systemPrompt: SYSTEM,
      message: prompt,
      maxTokens: 2500,
    })
    return NextResponse.json({ content: result.content, aiPowered: result.aiPowered })
  } catch {
    return NextResponse.json({ content: buildFallback(mode, doc.title, doc.process, processType), aiPowered: false })
  }
}

function buildFallback(mode: Mode, title: string, process?: string | null, processType?: string): string {
  const tag = '*(IA não configurada — resultado simulado)*'
  if (mode === 'generate-pop' || mode === 'improve-pop') {
    return `**POP — ${title.toUpperCase()}**\n\n${tag}\n\n**OBJETIVO**\nDescrever o procedimento para execução correta e padronizada do processo "${process || title}".\n\n**APLICAÇÃO**\nAplica-se aos colaboradores do Departamento Pessoal responsáveis pela execução deste processo.\n\n**RESPONSÁVEIS**\n• Analista de DP — execução\n• Supervisor de DP — revisão e aprovação\n\n**DESCRIÇÃO DO PROCEDIMENTO**\n1. Receber a solicitação ou documento de entrada\n2. Verificar a completude da documentação\n3. Registrar no sistema competente\n4. Realizar os cálculos e lançamentos necessários\n5. Conferir os valores calculados\n6. Obter aprovação do responsável\n7. Comunicar ao colaborador/área envolvida\n8. Arquivar documentação\n\n**PONTOS DE ATENÇÃO**\n• Observar os prazos legais\n• Conferir a legislação vigente antes de executar\n• Validar todos os documentos antes do processamento\n\n**RESULTADO ESPERADO**\nProcesso executado dentro do prazo, sem erros e com a documentação arquivada corretamente.\n\nAdicione OPENAI_API_KEY no .env para geração completa com IA real.`
  }
  if (mode === 'attention-points') {
    return `**PONTOS DE ATENÇÃO — ${title.toUpperCase()}**\n\n${tag}\n\n• Observar os prazos legais estabelecidos em lei\n• Conferir a documentação antes de iniciar o processo\n• Verificar se há pendências do colaborador no sistema\n• Atenção ao cálculo de médias variáveis\n• Confirmar dados antes do envio ao eSocial\n• Verificar se o processo está dentro da validade\n• Conferir assinaturas obrigatórias\n\nAdicione OPENAI_API_KEY para pontos de atenção específicos.`
  }
  if (mode === 'risks') {
    return `**RISCOS E CONTROLES — ${title.toUpperCase()}**\n\n${tag}\n\n• **Risco:** Atraso no processo → **Controle:** Definir responsável e prazo interno com antecedência de 2 dias\n• **Risco:** Erro no cálculo → **Controle:** Conferência dupla antes da geração do documento final\n• **Risco:** Documentação incompleta → **Controle:** Checklist de documentos obrigatórios na entrada\n• **Risco:** Descumprimento legal → **Controle:** Consultar legislação vigente a cada processo\n• **Risco:** Falha no sistema → **Controle:** Backup manual e protocolo de contingência\n\nAdicione OPENAI_API_KEY para análise de riscos personalizada.`
  }
  if (mode === 'generate-steps') {
    return `**PASSO A PASSO — ${title.toUpperCase()}**\n\n${tag}\n\n**Passo 1 — Receber a solicitação**\nReceber e protocolar a solicitação do processo. Verificar se está assinada e completa.\n⚠️ Ponto de atenção: Não iniciar sem a solicitação formal.\n\n**Passo 2 — Verificar documentação**\nConferir todos os documentos necessários conforme checklist padrão.\n\n**Passo 3 — Acessar o sistema**\nAcessar o sistema de gestão e localizar o cadastro do colaborador.\n⚠️ Ponto de atenção: Confirmar CPF e matrícula antes de qualquer lançamento.\n\n**Passo 4 — Realizar os lançamentos**\nInserir os dados conforme formulário de entrada. Conferir valores calculados.\n\n**Passo 5 — Gerar o documento**\nGerar o documento ou relatório do processo. Conferir os dados impressos.\n\n**Passo 6 — Obter assinatura**\nColher assinatura do responsável e do colaborador, quando aplicável.\n\n**Passo 7 — Arquivar**\nArquivar via digital e física conforme padrão do departamento.\n\nAdicione OPENAI_API_KEY para passo a passo personalizado.`
  }
  if (mode === 'generate-checklist' || mode === 'it-to-checklist') {
    const proc = processType || process || title
    return `**CHECKLIST — ${proc.toUpperCase()}**\n\n${tag}\n\n☐ Receber solicitação/documentação | Obrigatório: Sim\n☐ Conferir dados do colaborador no sistema | Obrigatório: Sim\n☐ Verificar prazo legal do processo | Obrigatório: Sim\n☐ Conferir documentos obrigatórios | Obrigatório: Sim\n☐ Realizar lançamentos no sistema | Obrigatório: Sim\n☐ Conferir valores calculados | Obrigatório: Sim\n☐ Obter assinatura do responsável | Obrigatório: Sim\n☐ Comunicar ao colaborador | Obrigatório: Sim\n☐ Enviar ao financeiro, se aplicável | Obrigatório: Não\n☐ Arquivar documentação | Obrigatório: Sim\n☐ Registrar conclusão do processo | Obrigatório: Sim\n\nAdicione OPENAI_API_KEY para checklist personalizado.`
  }
  return `**RESULTADO — ${title.toUpperCase()}**\n\n${tag}\n\nAdicione OPENAI_API_KEY no .env para usar a IA real.`
}
