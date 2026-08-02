import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'
import { aiService } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'



const SYSTEM = `VocÃª Ã© um especialista em Departamento Pessoal, Recursos Humanos e GestÃ£o por Processos.
Cria documentos operacionais profissionais: POPs, InstruÃ§Ãµes de Trabalho e Checklists.
Responda sempre em portuguÃªs brasileiro, de forma clara, objetiva e estruturada.
Use ** para negrito. Organize em seÃ§Ãµes numeradas ou com bullets (â€¢).
Nunca invente dados â€” baseie-se apenas nas informaÃ§Ãµes fornecidas.`

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
    doc.title       && `TÃ­tulo: ${doc.title}`,
    doc.process     && `Processo: ${doc.process}`,
    doc.department  && `Departamento: ${doc.department}`,
    doc.responsible && `ResponsÃ¡vel: ${doc.responsible}`,
    doc.objective   && `Objetivo: ${doc.objective}`,
    doc.description && `DescriÃ§Ã£o: ${doc.description}`,
    content         && `Texto adicional: ${content}`,
  ].filter(Boolean).join('\n')

  if (!aiService.isConfigured()) {
    return NextResponse.json({ content: buildFallback(mode, doc.title, doc.process, processType), aiPowered: false })
  }

  let prompt = ''

  if (mode === 'generate-pop') {
    prompt = `Com base nas informaÃ§Ãµes abaixo, gere um POP (Procedimento Operacional PadrÃ£o) completo e profissional:\n\n${docContext}\n\nEstruture em:\n**OBJETIVO**\n**APLICAÃ‡ÃƒO**\n**RESPONSÃVEIS**\n**MATERIAIS/SISTEMAS UTILIZADOS**\n**DESCRIÃ‡ÃƒO DO PROCEDIMENTO** (passo a passo numerado)\n**RESPONSABILIDADES**\n**PONTOS DE ATENÃ‡ÃƒO**\n**RISCOS E CONTROLES**\n**RESULTADO ESPERADO**\n**OBSERVAÃ‡Ã•ES**`
  } else if (mode === 'improve-pop') {
    prompt = `Melhore, padronize e torne mais profissional o seguinte POP de Departamento Pessoal:\n\n${docContext}\n\nMantenha a estrutura, melhore a linguagem, elimine ambiguidades, adicione clareza nos passos e sugira itens importantes que estejam faltando.`
  } else if (mode === 'attention-points') {
    prompt = `Com base no seguinte processo de DP/RH, gere uma lista de PONTOS DE ATENÃ‡ÃƒO importantes:\n\n${docContext}\n\nFormate como lista com â€¢ para cada ponto. Foque em erros comuns, prazos crÃ­ticos, obrigaÃ§Ãµes legais e riscos de conformidade.`
  } else if (mode === 'risks') {
    prompt = `Com base no seguinte processo de DP/RH, gere uma lista de RISCOS e seus CONTROLES:\n\n${docContext}\n\nFormate como:\nâ€¢ **Risco:** [descriÃ§Ã£o] â†’ **Controle:** [aÃ§Ã£o preventiva/corretiva]\n\nIdentifique riscos legais, trabalhistas, operacionais e de prazo.`
  } else if (mode === 'generate-steps') {
    prompt = `Com base na descriÃ§Ã£o abaixo, gere um passo a passo detalhado para uma InstruÃ§Ã£o de Trabalho (IT):\n\n${docContext}\n\nFormate cada passo como:\n**Passo N â€” [TÃ­tulo do passo]**\n[DescriÃ§Ã£o detalhada da aÃ§Ã£o]\nâš ï¸ Ponto de atenÃ§Ã£o: [se aplicÃ¡vel]\n\nSeja especÃ­fico e prÃ¡tico. Pense em quem executa pela primeira vez.`
  } else if (mode === 'improve-steps') {
    const stepsText = doc.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description || ''}`).join('\n')
    prompt = `Melhore os passos abaixo da InstruÃ§Ã£o de Trabalho "${doc.title}":\n\n${stepsText}\n\nPara cada passo:\n- Melhore a clareza da descriÃ§Ã£o\n- Adicione pontos de atenÃ§Ã£o se relevante\n- Sugira se algum passo deve ser dividido\n- Corrija o portuguÃªs\n\nRetorne os passos melhorados no mesmo formato numerado.`
  } else if (mode === 'generate-checklist') {
    const pt = processType || doc.process || doc.title
    prompt = `Gere um checklist completo e detalhado para o processo: **${pt}** (Departamento Pessoal/RH).\n\nContexto adicional: ${docContext}\n\nFormate cada item como:\nâ˜ [DescriÃ§Ã£o do item] | ObrigatÃ³rio: [Sim/NÃ£o]\n\nOrganize por etapas do processo. Inclua documentos necessÃ¡rios, prazos legais, verificaÃ§Ãµes obrigatÃ³rias e conferÃªncias finais.`
  } else if (mode === 'improve-checklist') {
    const itemsText = doc.checklistItems.map((c, i) => `${i + 1}. ${c.description} (${c.required ? 'ObrigatÃ³rio' : 'Opcional'})`).join('\n')
    prompt = `Melhore e complete o seguinte checklist de "${doc.title}":\n\n${itemsText}\n\nSugira itens que estejam faltando, melhore as descriÃ§Ãµes e indique corretamente quais sÃ£o obrigatÃ³rios.`
  } else if (mode === 'it-to-checklist') {
    const stepsText = doc.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description || ''}`).join('\n')
    prompt = `Converta a seguinte InstruÃ§Ã£o de Trabalho em um CHECKLIST de conferÃªncia:\n\nIT: ${doc.title}\n\nPassos:\n${stepsText}\n\nGere um checklist com â€¢ para cada item verificÃ¡vel. Inclua documentos, confirmaÃ§Ãµes e conferÃªncias finais.`
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
  const tag = '*(IA nÃ£o configurada â€” resultado simulado)*'
  if (mode === 'generate-pop' || mode === 'improve-pop') {
    return `**POP â€” ${title.toUpperCase()}**\n\n${tag}\n\n**OBJETIVO**\nDescrever o procedimento para execuÃ§Ã£o correta e padronizada do processo "${process || title}".\n\n**APLICAÃ‡ÃƒO**\nAplica-se aos colaboradores do Departamento Pessoal responsÃ¡veis pela execuÃ§Ã£o deste processo.\n\n**RESPONSÃVEIS**\nâ€¢ Analista de DP â€” execuÃ§Ã£o\nâ€¢ Supervisor de DP â€” revisÃ£o e aprovaÃ§Ã£o\n\n**DESCRIÃ‡ÃƒO DO PROCEDIMENTO**\n1. Receber a solicitaÃ§Ã£o ou documento de entrada\n2. Verificar a completude da documentaÃ§Ã£o\n3. Registrar no sistema competente\n4. Realizar os cÃ¡lculos e lanÃ§amentos necessÃ¡rios\n5. Conferir os valores calculados\n6. Obter aprovaÃ§Ã£o do responsÃ¡vel\n7. Comunicar ao colaborador/Ã¡rea envolvida\n8. Arquivar documentaÃ§Ã£o\n\n**PONTOS DE ATENÃ‡ÃƒO**\nâ€¢ Observar os prazos legais\nâ€¢ Conferir a legislaÃ§Ã£o vigente antes de executar\nâ€¢ Validar todos os documentos antes do processamento\n\n**RESULTADO ESPERADO**\nProcesso executado dentro do prazo, sem erros e com a documentaÃ§Ã£o arquivada corretamente.\n\nAdicione OPENAI_API_KEY no .env para geraÃ§Ã£o completa com IA real.`
  }
  if (mode === 'attention-points') {
    return `**PONTOS DE ATENÃ‡ÃƒO â€” ${title.toUpperCase()}**\n\n${tag}\n\nâ€¢ Observar os prazos legais estabelecidos em lei\nâ€¢ Conferir a documentaÃ§Ã£o antes de iniciar o processo\nâ€¢ Verificar se hÃ¡ pendÃªncias do colaborador no sistema\nâ€¢ AtenÃ§Ã£o ao cÃ¡lculo de mÃ©dias variÃ¡veis\nâ€¢ Confirmar dados antes do envio ao eSocial\nâ€¢ Verificar se o processo estÃ¡ dentro da validade\nâ€¢ Conferir assinaturas obrigatÃ³rias\n\nAdicione OPENAI_API_KEY para pontos de atenÃ§Ã£o especÃ­ficos.`
  }
  if (mode === 'risks') {
    return `**RISCOS E CONTROLES â€” ${title.toUpperCase()}**\n\n${tag}\n\nâ€¢ **Risco:** Atraso no processo â†’ **Controle:** Definir responsÃ¡vel e prazo interno com antecedÃªncia de 2 dias\nâ€¢ **Risco:** Erro no cÃ¡lculo â†’ **Controle:** ConferÃªncia dupla antes da geraÃ§Ã£o do documento final\nâ€¢ **Risco:** DocumentaÃ§Ã£o incompleta â†’ **Controle:** Checklist de documentos obrigatÃ³rios na entrada\nâ€¢ **Risco:** Descumprimento legal â†’ **Controle:** Consultar legislaÃ§Ã£o vigente a cada processo\nâ€¢ **Risco:** Falha no sistema â†’ **Controle:** Backup manual e protocolo de contingÃªncia\n\nAdicione OPENAI_API_KEY para anÃ¡lise de riscos personalizada.`
  }
  if (mode === 'generate-steps') {
    return `**PASSO A PASSO â€” ${title.toUpperCase()}**\n\n${tag}\n\n**Passo 1 â€” Receber a solicitaÃ§Ã£o**\nReceber e protocolar a solicitaÃ§Ã£o do processo. Verificar se estÃ¡ assinada e completa.\nâš ï¸ Ponto de atenÃ§Ã£o: NÃ£o iniciar sem a solicitaÃ§Ã£o formal.\n\n**Passo 2 â€” Verificar documentaÃ§Ã£o**\nConferir todos os documentos necessÃ¡rios conforme checklist padrÃ£o.\n\n**Passo 3 â€” Acessar o sistema**\nAcessar o sistema de gestÃ£o e localizar o cadastro do colaborador.\nâš ï¸ Ponto de atenÃ§Ã£o: Confirmar CPF e matrÃ­cula antes de qualquer lanÃ§amento.\n\n**Passo 4 â€” Realizar os lanÃ§amentos**\nInserir os dados conforme formulÃ¡rio de entrada. Conferir valores calculados.\n\n**Passo 5 â€” Gerar o documento**\nGerar o documento ou relatÃ³rio do processo. Conferir os dados impressos.\n\n**Passo 6 â€” Obter assinatura**\nColher assinatura do responsÃ¡vel e do colaborador, quando aplicÃ¡vel.\n\n**Passo 7 â€” Arquivar**\nArquivar via digital e fÃ­sica conforme padrÃ£o do departamento.\n\nAdicione OPENAI_API_KEY para passo a passo personalizado.`
  }
  if (mode === 'generate-checklist' || mode === 'it-to-checklist') {
    const proc = processType || process || title
    return `**CHECKLIST â€” ${proc.toUpperCase()}**\n\n${tag}\n\nâ˜ Receber solicitaÃ§Ã£o/documentaÃ§Ã£o | ObrigatÃ³rio: Sim\nâ˜ Conferir dados do colaborador no sistema | ObrigatÃ³rio: Sim\nâ˜ Verificar prazo legal do processo | ObrigatÃ³rio: Sim\nâ˜ Conferir documentos obrigatÃ³rios | ObrigatÃ³rio: Sim\nâ˜ Realizar lanÃ§amentos no sistema | ObrigatÃ³rio: Sim\nâ˜ Conferir valores calculados | ObrigatÃ³rio: Sim\nâ˜ Obter assinatura do responsÃ¡vel | ObrigatÃ³rio: Sim\nâ˜ Comunicar ao colaborador | ObrigatÃ³rio: Sim\nâ˜ Enviar ao financeiro, se aplicÃ¡vel | ObrigatÃ³rio: NÃ£o\nâ˜ Arquivar documentaÃ§Ã£o | ObrigatÃ³rio: Sim\nâ˜ Registrar conclusÃ£o do processo | ObrigatÃ³rio: Sim\n\nAdicione OPENAI_API_KEY para checklist personalizado.`
  }
  return `**RESULTADO â€” ${title.toUpperCase()}**\n\n${tag}\n\nAdicione OPENAI_API_KEY no .env para usar a IA real.`
}
