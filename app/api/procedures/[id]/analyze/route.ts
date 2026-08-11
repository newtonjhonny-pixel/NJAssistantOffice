import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
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
  | 'analise-completa'
  | 'chat'

const TYPE_ANALYSIS_SYSTEM: Record<string, string> = {
  POP: `Você é especialista em Gestão por Processos e Qualidade. Analise o POP verificando: clareza do objetivo/escopo, adequação de responsabilidades, cobertura de riscos e controles, alinhamento com boas práticas (ISO 9001).`,
  IT:  `Você é especialista em Gestão de Processos. Analise a IT verificando: detalhamento dos passos, clareza para o executor, pontos críticos sem imagens, riscos operacionais não documentados.`,
  CHECKLIST: `Você é especialista em Qualidade e Controles Internos. Analise o Checklist verificando: completude dos itens, cobertura dos pontos críticos, objetividade, itens que faltam ser marcados como obrigatórios.`,
  POLITICA: `Você é especialista em Governança Corporativa e Compliance. Analise a Política verificando: alinhamento com legislação, clareza das diretrizes e responsabilidades, cobertura de cenários e exceções.`,
  NORMA: `Você é especialista em Normatização e Qualidade. Analise a Norma verificando: conformidade com normas de referência, clareza dos requisitos, definições e terminologia, lacunas técnicas.`,
  CONTINGENCIA: `Você é especialista em Continuidade de Negócios. Analise o Plano de Contingência verificando: adequação de RTOs/RPOs, clareza dos procedimentos de ativação, completude de equipes e canais, cenários não cobertos.`,
  TERMO: `Você é especialista em Gestão Contratual e Compliance. Analise o Termo verificando: clareza do objeto e obrigações, completude das cláusulas, adequação do foro/legislação, riscos jurídicos não mitigados.`,
  MANUAL: `Você é especialista em Gestão Documental. Analise o documento verificando qualidade, completude e boas práticas.`,
}

const ANALISE_SUFFIX = `
Responda em português brasileiro. Sua análise deve conter:
1. **Pontos Fortes** — o que está bem documentado
2. **Lacunas Identificadas** — o que está faltando ou incompleto
3. **Recomendações** — sugestões concretas e acionáveis
4. **Avaliação Geral** — nota de 1 a 10 com justificativa

Use bullet points. Seja objetivo. Limite a 500 palavras.`

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json() as { mode: Mode; content?: string; processType?: string; message?: string }
  const { mode, content, processType, message } = body

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
    prompt = `Com base nas informações abaixo, gere um POP (Procedimento Operacional Padrão) completo e profissional:\n\n${docContext}\n\nEstruture em:\n**OBJETIVO**\n**APLICAÃ‡ÃƒO**\n**RESPONSÁVEIS**\n**MATERIAIS/SISTEMAS UTILIZADOS**\n**DESCRIÃ‡ÃƒO DO PROCEDIMENTO** (passo a passo numerado)\n**RESPONSABILIDADES**\n**PONTOS DE ATENÃ‡ÃƒO**\n**RISCOS E CONTROLES**\n**RESULTADO ESPERADO**\n**OBSERVAÃ‡Ã•ES**`
  } else if (mode === 'improve-pop') {
    prompt = `Melhore, padronize e torne mais profissional o seguinte POP de Departamento Pessoal:\n\n${docContext}\n\nMantenha a estrutura, melhore a linguagem, elimine ambiguidades, adicione clareza nos passos e sugira itens importantes que estejam faltando.`
  } else if (mode === 'attention-points') {
    prompt = `Com base no seguinte processo de DP/RH, gere uma lista de PONTOS DE ATENÃ‡ÃƒO importantes:\n\n${docContext}\n\nFormate como lista com â€¢ para cada ponto. Foque em erros comuns, prazos críticos, obrigações legais e riscos de conformidade.`
  } else if (mode === 'risks') {
    prompt = `Com base no seguinte processo de DP/RH, gere uma lista de RISCOS e seus CONTROLES:\n\n${docContext}\n\nFormate como:\nâ€¢ **Risco:** [descrição] â†’ **Controle:** [ação preventiva/corretiva]\n\nIdentifique riscos legais, trabalhistas, operacionais e de prazo.`
  } else if (mode === 'generate-steps') {
    prompt = `Com base na descrição abaixo, gere um passo a passo detalhado para uma Instrução de Trabalho (IT):\n\n${docContext}\n\nFormate cada passo como:\n**Passo N â€” [Título do passo]**\n[Descrição detalhada da ação]\nâš ï¸ Ponto de atenção: [se aplicável]\n\nSeja específico e prático. Pense em quem executa pela primeira vez.`
  } else if (mode === 'improve-steps') {
    const stepsText = doc.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description || ''}`).join('\n')
    prompt = `Melhore os passos abaixo da Instrução de Trabalho "${doc.title}":\n\n${stepsText}\n\nPara cada passo:\n- Melhore a clareza da descrição\n- Adicione pontos de atenção se relevante\n- Sugira se algum passo deve ser dividido\n- Corrija o português\n\nRetorne os passos melhorados no mesmo formato numerado.`
  } else if (mode === 'generate-checklist') {
    const pt = processType || doc.process || doc.title
    prompt = `Gere um checklist completo e detalhado para o processo: **${pt}** (Departamento Pessoal/RH).\n\nContexto adicional: ${docContext}\n\nFormate cada item como:\nâ˜ [Descrição do item] | Obrigatório: [Sim/Não]\n\nOrganize por etapas do processo. Inclua documentos necessários, prazos legais, verificações obrigatórias e conferências finais.`
  } else if (mode === 'improve-checklist') {
    const itemsText = doc.checklistItems.map((c, i) => `${i + 1}. ${c.description} (${c.required ? 'Obrigatório' : 'Opcional'})`).join('\n')
    prompt = `Melhore e complete o seguinte checklist de "${doc.title}":\n\n${itemsText}\n\nSugira itens que estejam faltando, melhore as descrições e indique corretamente quais são obrigatórios.`
  } else if (mode === 'it-to-checklist') {
    const stepsText = doc.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description || ''}`).join('\n')
    prompt = `Converta a seguinte Instrução de Trabalho em um CHECKLIST de conferência:\n\nIT: ${doc.title}\n\nPassos:\n${stepsText}\n\nGere um checklist com â€¢ para cada item verificável. Inclua documentos, confirmações e conferências finais.`
  } else if (mode === 'analise-completa' || mode === 'chat') {
    // Constrói contexto rico do documento
    const richContext = [
      `TIPO: ${doc.type}`,
      `TÍTULO: ${doc.title}`,
      `STATUS: ${doc.status} | VERSÃO: ${doc.version}`,
      doc.objective   && `OBJETIVO: ${doc.objective}`,
      doc.scope       && `ESCOPO: ${doc.scope}`,
      doc.department  && `DEPARTAMENTO: ${doc.department}`,
      doc.responsible && `RESPONSÁVEL: ${doc.responsible}`,
      doc.description && `CONTEÚDO: ${doc.description?.slice(0, 600)}`,
      doc.risks       && `RISCOS/CONTROLES: ${doc.risks?.slice(0, 400)}`,
      doc.attentionPoints && `PONTOS DE ATENÇÃO: ${doc.attentionPoints}`,
      doc.notes       && `OBSERVAÇÕES: ${doc.notes}`,
    ].filter(Boolean).join('\n')

    const sysAnalise = (TYPE_ANALYSIS_SYSTEM[doc.type] ?? TYPE_ANALYSIS_SYSTEM.MANUAL) + ANALISE_SUFFIX

    if (mode === 'analise-completa') {
      prompt = `Analise o seguinte documento:\n\n${richContext}`
    } else {
      prompt = `Contexto do documento:\n${richContext}\n\n---\nPergunta: ${message ?? content ?? 'O que você pode me dizer sobre este documento?'}`
    }

    try {
      const result = await aiService.ask({
        module:       'procedures.analise',
        specialist:   'Analista de Documentos',
        systemPrompt: sysAnalise,
        message:      prompt,
        temperature:  0.4,
        maxTokens:    900,
      })
      return NextResponse.json({ content: result.content, aiPowered: result.aiPowered })
    } catch {
      return NextResponse.json({
        content: mode === 'analise-completa'
          ? `*(IA não configurada — configure OPENAI_API_KEY no .env para análise automática)*\n\nDocumento: **${doc.title}** (${doc.type})\nStatus: ${doc.status} | Versão: ${doc.version}`
          : `*(IA não configurada — não é possível responder perguntas sem OPENAI_API_KEY)*`,
        aiPowered: false,
      })
    }
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
  const tag = '*(IA não configurada â€” resultado simulado)*'
  if (mode === 'generate-pop' || mode === 'improve-pop') {
    return `**POP â€” ${title.toUpperCase()}**\n\n${tag}\n\n**OBJETIVO**\nDescrever o procedimento para execução correta e padronizada do processo "${process || title}".\n\n**APLICAÃ‡ÃƒO**\nAplica-se aos colaboradores do Departamento Pessoal responsáveis pela execução deste processo.\n\n**RESPONSÁVEIS**\nâ€¢ Analista de DP â€” execução\nâ€¢ Supervisor de DP â€” revisão e aprovação\n\n**DESCRIÃ‡ÃƒO DO PROCEDIMENTO**\n1. Receber a solicitação ou documento de entrada\n2. Verificar a completude da documentação\n3. Registrar no sistema competente\n4. Realizar os cálculos e lançamentos necessários\n5. Conferir os valores calculados\n6. Obter aprovação do responsável\n7. Comunicar ao colaborador/área envolvida\n8. Arquivar documentação\n\n**PONTOS DE ATENÃ‡ÃƒO**\nâ€¢ Observar os prazos legais\nâ€¢ Conferir a legislação vigente antes de executar\nâ€¢ Validar todos os documentos antes do processamento\n\n**RESULTADO ESPERADO**\nProcesso executado dentro do prazo, sem erros e com a documentação arquivada corretamente.\n\nAdicione OPENAI_API_KEY no .env para geração completa com IA real.`
  }
  if (mode === 'attention-points') {
    return `**PONTOS DE ATENÃ‡ÃƒO â€” ${title.toUpperCase()}**\n\n${tag}\n\nâ€¢ Observar os prazos legais estabelecidos em lei\nâ€¢ Conferir a documentação antes de iniciar o processo\nâ€¢ Verificar se há pendências do colaborador no sistema\nâ€¢ Atenção ao cálculo de médias variáveis\nâ€¢ Confirmar dados antes do envio ao eSocial\nâ€¢ Verificar se o processo está dentro da validade\nâ€¢ Conferir assinaturas obrigatórias\n\nAdicione OPENAI_API_KEY para pontos de atenção específicos.`
  }
  if (mode === 'risks') {
    return `**RISCOS E CONTROLES â€” ${title.toUpperCase()}**\n\n${tag}\n\nâ€¢ **Risco:** Atraso no processo â†’ **Controle:** Definir responsável e prazo interno com antecedência de 2 dias\nâ€¢ **Risco:** Erro no cálculo â†’ **Controle:** Conferência dupla antes da geração do documento final\nâ€¢ **Risco:** Documentação incompleta â†’ **Controle:** Checklist de documentos obrigatórios na entrada\nâ€¢ **Risco:** Descumprimento legal â†’ **Controle:** Consultar legislação vigente a cada processo\nâ€¢ **Risco:** Falha no sistema â†’ **Controle:** Backup manual e protocolo de contingência\n\nAdicione OPENAI_API_KEY para análise de riscos personalizada.`
  }
  if (mode === 'generate-steps') {
    return `**PASSO A PASSO â€” ${title.toUpperCase()}**\n\n${tag}\n\n**Passo 1 â€” Receber a solicitação**\nReceber e protocolar a solicitação do processo. Verificar se está assinada e completa.\nâš ï¸ Ponto de atenção: Não iniciar sem a solicitação formal.\n\n**Passo 2 â€” Verificar documentação**\nConferir todos os documentos necessários conforme checklist padrão.\n\n**Passo 3 â€” Acessar o sistema**\nAcessar o sistema de gestão e localizar o cadastro do colaborador.\nâš ï¸ Ponto de atenção: Confirmar CPF e matrícula antes de qualquer lançamento.\n\n**Passo 4 â€” Realizar os lançamentos**\nInserir os dados conforme formulário de entrada. Conferir valores calculados.\n\n**Passo 5 â€” Gerar o documento**\nGerar o documento ou relatório do processo. Conferir os dados impressos.\n\n**Passo 6 â€” Obter assinatura**\nColher assinatura do responsável e do colaborador, quando aplicável.\n\n**Passo 7 â€” Arquivar**\nArquivar via digital e física conforme padrão do departamento.\n\nAdicione OPENAI_API_KEY para passo a passo personalizado.`
  }
  if (mode === 'generate-checklist' || mode === 'it-to-checklist') {
    const proc = processType || process || title
    return `**CHECKLIST â€” ${proc.toUpperCase()}**\n\n${tag}\n\nâ˜ Receber solicitação/documentação | Obrigatório: Sim\nâ˜ Conferir dados do colaborador no sistema | Obrigatório: Sim\nâ˜ Verificar prazo legal do processo | Obrigatório: Sim\nâ˜ Conferir documentos obrigatórios | Obrigatório: Sim\nâ˜ Realizar lançamentos no sistema | Obrigatório: Sim\nâ˜ Conferir valores calculados | Obrigatório: Sim\nâ˜ Obter assinatura do responsável | Obrigatório: Sim\nâ˜ Comunicar ao colaborador | Obrigatório: Sim\nâ˜ Enviar ao financeiro, se aplicável | Obrigatório: Não\nâ˜ Arquivar documentação | Obrigatório: Sim\nâ˜ Registrar conclusão do processo | Obrigatório: Sim\n\nAdicione OPENAI_API_KEY para checklist personalizado.`
  }
  return `**RESULTADO â€” ${title.toUpperCase()}**\n\n${tag}\n\nAdicione OPENAI_API_KEY no .env para usar a IA real.`
}
