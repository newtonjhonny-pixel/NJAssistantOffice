// Documentos adicionais — Medicina do Trabalho
import type { SeedDoc } from "./seed-data"

export const MEDICINA_EXTRA_DOCS: SeedDoc[] = [
  {
    title: "PCMSO — Programa de Controle Médico de Saúde Ocupacional — NR-7",
    category: "norma",
    source: "NR-7 — Portaria MTE 1.129/2017; CLT Art. 168",
    version: "2025",
    tags: "pcmso,nr7,medico,coordenador,exames,aso,obrigatório,anual,cronograma,metas,riscos,prevenção",
    content: `PCMSO — PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL

BASE LEGAL: CLT Art. 168; NR-7 (Portaria MTE 1.129/2017)

OBRIGATORIEDADE
Todos os empregadores com trabalhadores celetistas (independente do número). Exceções permitidas apenas para MEI sem empregados.

COORDENADOR DO PCMSO
Médico do Trabalho ou médico com formação em medicina ocupacional, registrado no CRM e com especialização reconhecida pelo CFM.

Responsabilidades:
- Elaborar o PCMSO anualmente
- Definir os exames complementares necessários
- Analisar as informações do PGR (riscos identificados)
- Emitir os ASOs
- Elaborar relatório anual com resultados

CONTEÚDO DO PCMSO (NR-7 item 7.3)
1. Reconhecimento dos riscos e prioridades (integrado ao PGR)
2. Exames médicos obrigatórios por risco e cargo
3. Procedimentos e condutas médicas em caso de diagnóstico
4. Cronograma de exames
5. Metas de saúde

TIPOS DE EXAMES MÉDICOS (Art. 168 CLT + NR-7)
a) ADMISSIONAL: antes do início do trabalho
b) PERIÓDICO: conforme cronograma baseado no risco (anual para a maioria; intervalos menores para riscos graves)
c) RETORNO AO TRABALHO: após afastamento > 30 dias por doença ou acidente
d) MUDANÇA DE RISCO: quando há alteração da função ou ambiente com mudança de exposição
e) DEMISSIONAL: até a data da homologação da rescisão (no prazo máximo de 135 dias para riscos leves, 90 dias para riscos moderados, 60 para riscos graves — após último exame periódico)

ASO — ATESTADO DE SAÚDE OCUPACIONAL
Conclusão: APTO, APTO COM RESTRIÇÕES ou INAPTO para a função.
Deve conter: nome, função, riscos, exames realizados, data, assinatura do médico.

RELATÓRIO ANUAL (NR-7 item 7.4.6)
Indica: número de funcionários examinados por tipo de exame, doenças detectadas, afastamentos, conclusões e recomendações.

FONTES: CLT Art. 168; NR-7 (Portaria MTE 1.129/2017); CFM Resolução 1.488/1998`,
  },
  {
    title: "Audiometria Ocupacional — Procedimento, PAIR e Controle",
    category: "norma",
    source: "NR-7 Anexo I; Portaria MTE 19/1998; CFM; CFF",
    version: "2025",
    tags: "audiometria,pair,perda,auditiva,ruido,dbhl,frequencias,portaria19,baseline,monitoramento,fonoaudiologo",
    content: `AUDIOMETRIA OCUPACIONAL — PAIR E CONTROLE

BASE LEGAL: NR-7 Anexo I; Portaria MTE 19/1998

OBRIGATORIEDADE
Empresas cujos empregados são expostos ao ruído acima de 80 dB(A) devem incluir audiometria no PCMSO.

PAIR — PERDA AUDITIVA INDUZIDA POR RUÍDO
Perda de audição gradual, progressiva e bilateral causada pela exposição crônica a ruído intenso. Caráter ocupacional quando relacionada ao trabalho.

LIMITES DE TOLERÂNCIA (NR-15 Anexo 1)
- Exposição a ruído contínuo: máximo 85 dB(A) por 8 horas/dia (acima disso, tempo de exposição permitido diminui progressivamente)
- Acima de 115 dB(A): proibida qualquer exposição sem proteção adequada

AUDIOMETRIA TONAL (PROCEDIMENTO)
- Frequências avaliadas: 500, 1.000, 2.000, 3.000, 4.000, 6.000 e 8.000 Hz
- Realizada por fonoaudiólogo ou médico treinado em audiometria
- Ambiente: cabine audiométrica ou sala com isolamento acústico adequado (NC-30 ou menos)
- Após 14h sem exposição ao ruído (ou com protetor auricular) — período de "descanso auditivo"

CLASSIFICAÇÃO DA AUDIOMETRIA (Portaria MTE 19/1998)
- Normal: limiares até 25 dBHL em todas as frequências
- Perda auditiva: > 25 dBHL em pelo menos uma frequência, bilateralmente
- Tipo "PAIR": entalhe nas frequências 4.000-6.000 Hz com recuperação em 8.000 Hz

CRONOGRAMA DE AUDIOMETRIA (Portaria 19/1998 e NR-7)
- Admissional: antes de iniciar atividades com ruído (baseline)
- Sequencial: anual para exposição > 85 dB; bienal para 80-85 dB
- Retorno ao trabalho e demissional: conforme NR-7

MEDIDAS DE CONTROLE DE RUÍDO
1. EPC: enclausuramento, isolamento acústico, absorção sonora
2. EPI: protetor auricular tipo concha ou inserção (ver atenuação real — NRRsf)

FONTES: NR-7 Anexo I; Portaria MTE 19/1998; PAIR — Comitê Nacional de Ruído e Conservação Auditiva`,
  },
  {
    title: "LER/DORT — Lesão por Esforço Repetitivo — Prevenção e Nexo",
    category: "norma",
    source: "DORT — Instrução Normativa INSS 98/2003; NR-17; OIT",
    version: "2025",
    tags: "ler,dort,lesao,esforco,repetitivo,digitadores,bancarios,assembly,ergonomia,nexo,cid,afastamento,prevenção",
    content: `LER/DORT — LESÕES POR ESFORÇOS REPETITIVOS / DISTÚRBIOS OSTEOMUSCULARES

BASE LEGAL: IN INSS 98/2003; NR-17; Decreto 6.042/2007 (NTEP)

TERMINOLOGIA
- LER (Lesão por Esforço Repetitivo): termo mais antigo
- DORT (Distúrbios Osteomusculares Relacionados ao Trabalho): terminologia atual mais abrangente

CONCEITO
Síndrome de origem ocupacional que representa um conjunto de afecções que podem acometer músculos, tendões, nervos e ligamentos. Relacionados a condições inadequadas de trabalho: repetitividade, força excessiva, posturas inadequadas, estresse mecânico.

PRINCIPAIS DIAGNÓSTICOS
- Tendinite (inflamação do tendão): manguito rotador, bíceps, Aquiles
- Tenossinovite (inflamação da bainha do tendão): dedos, punho
- Síndrome do túnel do carpo (compressão do nervo mediano no punho)
- Epicondilite (cotovelo de tenista / golfe)
- Cervicalgia, lombalgia, dorsalgia (origem ocupacional)
- Bursite (bolsas sinoviais)
- Síndrome do impacto (ombro)

GRAUS DA DORT (IN INSS 98/2003)
- Grau I: Sensação de peso e desconforto. Sem limitação. Passa com repouso.
- Grau II: Dor persistente, tolerável. Produtividade reduzida. Melhora com repouso.
- Grau III: Dor intensa, frequente. Limitação funcional. Interfere no sono.
- Grau IV: Dor constante, incapacitante. Incapacidade para trabalho e atividades da vida diária.

NEXO CAUSAL E NTEP
O INSS pode reconhecer o nexo via NTEP (Decreto 6.042/2007) para categorias profissionais com alta incidência (bancários, digitadores, operadores de linha de montagem).

PREVENÇÃO (NR-17)
- Rodízio de tarefas
- Pausas regulares
- Adequação ergonômica do posto de trabalho
- Limitação de carga de trabalho
- Treinamento de posturas corretas

FONTES: IN INSS 98/2003; NR-17; Decreto 6.042/2007; CFM Resolução 1.488/1998`,
  },
  {
    title: "Burnout — Síndrome de Esgotamento Profissional — CID-11 e Ações",
    category: "norma",
    source: "OMS CID-11 (2022); Portaria MTE 1.129/2017; IN INSS 128/2022",
    version: "2025",
    tags: "burnout,esgotamento,cid11,2022,inss,beneficio,afastamento,saude,mental,trabalho,nexo,prevencao",
    content: `BURNOUT — SÍNDROME DE ESGOTAMENTO PROFISSIONAL

BASE LEGAL: CID-11 (OMS — 2022); IN INSS 128/2022; NR-1 (riscos psicossociais)

DEFINIÇÃO (OMS — CID-11)
A Síndrome de Burnout é um fenômeno ocupacional incluída na CID-11 (código QD85) — não classificada como doença, mas como FATOR QUE INFLUENCIA O ESTADO DE SAÚDE.
Caracterizada por:
1. Sentimentos de esgotamento ou falta de energia
2. Distanciamento mental do trabalho ou sentimentos negativos em relação ao trabalho
3. Redução da eficácia profissional

DIFERENÇA DO ESTRESSE COMUM
Burnout é específico ao contexto laboral e difere de transtornos adaptativos ou depressão — embora possam coexistir.

IN INSS 128/2022 — IMPACTO PREVIDENCIÁRIO
A IN INSS 128/2022 orientou os peritos a analisar o nexo causal entre o trabalho e os transtornos mentais, incluindo burnout. Quando há nexo, o benefício é B-91 (acidentário), gerando estabilidade e FAP.

FATORES DE RISCO ORGANIZACIONAIS
- Excesso de carga de trabalho (horas extras sistemáticas)
- Falta de controle sobre o trabalho
- Recompensa insuficiente (salário, reconhecimento)
- Conflitos de valores (missão × prática)
- Ausência de comunidade/apoio social
- Injustiça percebida

PREVENÇÃO (NR-1 — Riscos Psicossociais)
A NR-1 revisada inclui riscos psicossociais no GRO/PGR. Medidas:
- Limitar horas extras
- Garantir pausas e férias
- Programas de saúde mental
- Canais de escuta e suporte psicológico
- Cultura organizacional de reconhecimento

DIAGNÓSTICO E TRATAMENTO
- Diagnóstico: médico psiquiatra ou clínico geral
- Escalas: MBI (Maslach Burnout Inventory)
- Tratamento: afastamento, psicoterapia, ajuste de condições de trabalho

FONTES: OMS CID-11 (2022); IN INSS 128/2022; NR-1 (Portaria MTE 6.730/2020); Lei 14.457/2022`,
  },
  {
    title: "FAP — Fator Acidentário de Prevenção — Cálculo e Impacto",
    category: "legislacao",
    source: "Decreto 6.042/2007; Resolução CNPS 1.316/2010; Decreto 3.048/1999",
    version: "2025",
    tags: "fap,fator,acidentario,prevencao,rat,gilrat,calculo,bonus,malus,empresa,acidentes,beneficios,ntep",
    content: `FAP — FATOR ACIDENTÁRIO DE PREVENÇÃO

BASE LEGAL: Decreto 6.042/2007; Resolução CNPS 1.316/2010

CONCEITO
O FAP é um multiplicador aplicado às alíquotas do RAT (Risco Ambiental do Trabalho — 1%, 2% ou 3% conforme CNAE), que varia de 0,5 a 2,0 conforme o desempenho da empresa em saúde e segurança do trabalho.

COMO É CALCULADO
O FAP é calculado pelo INSS com base nos dados de:
- Frequência (taxa de frequência de acidentes acidentários)
- Gravidade (taxa de gravidade dos acidentes)
- Custo (custo dos benefícios B-91 pagos)
O cálculo compara a empresa com todas as do mesmo CNAE.

RESULTADO DO FAP
- FAP < 1,0 (até 0,5): empresa melhor que a média do setor → BÔNUS (reduz o RAT)
- FAP = 1,0: empresa na média
- FAP > 1,0 (até 2,0): empresa pior que a média → MALUS (aumenta o RAT)

IMPACTO FINANCEIRO (exemplo)
Empresa com RAT = 2% e folha = R$ 1.000.000/mês:
- FAP 0,5: paga RAT de 1% = R$ 10.000/mês
- FAP 2,0: paga RAT de 4% = R$ 40.000/mês
Diferença anual: R$ 360.000

PUBLICAÇÃO E CONTESTAÇÃO
- Publicado anualmente no portal do MTE (normalmente novembro)
- Prazo de contestação: 30 dias após publicação
- Contestação via Formulário FAP no portal gov.br/fap

COMO MELHORAR O FAP
1. Reduzir acidentes e doenças ocupacionais (investimento em SST)
2. Contestar NTEPs indevidos
3. Garantir que acidentes de trajeto não sejam classificados como típicos
4. Manter documentação de EPI entregue e treinamentos realizados

FONTES: Decreto 6.042/2007; Resolução CNPS 1.316/2010; Manual FAP (MTE)`,
  },
  {
    title: "Reabilitação Profissional — Programa INSS e Retorno ao Trabalho",
    category: "legislacao",
    source: "Lei 8.213/1991 Arts. 89-93; IN INSS/PRES 77/2015",
    version: "2025",
    tags: "reabilitacao,profissional,inss,beneficio,retorno,funcao,compativel,certificado,empresa,obrigacao,contratacao",
    content: `REABILITAÇÃO PROFISSIONAL — INSS

BASE LEGAL: Lei 8.213/1991 Arts. 89-93; Decreto 3.048/1999; IN INSS/PRES 77/2015

CONCEITO (Art. 89 Lei 8.213/91)
A habilitação e reabilitação profissional visa proporcionar ao beneficiário incapacitado parcialmente os meios adequados ao reencaminhamento ao mercado de trabalho.

BENEFICIÁRIOS
- Segurados com redução da capacidade de trabalho por acidente, doença ou deficiência
- Empregados em gozo de benefício por incapacidade (B-31 ou B-91) com capacidade residual

OBRIGAÇÕES DO INSS
- Orientação e acompanhamento profissional
- Reciclagem ou formação profissional (cursos)
- Provisão de órteses, próteses e outros recursos
- Reavaliação da capacidade laboral ao final

OBRIGAÇÕES DA EMPRESA (Art. 93 Lei 8.213/91 — reabilitados)
Os reabilitados profissionais pelo INSS contam para a COTA de PcD (art. 93), desde que tenham certificado de conclusão do programa.

CERTIFICADO DE CONCLUSÃO DE REABILITAÇÃO
Emitido pelo INSS ao final do programa. Habilita o reabilitado para o mercado de trabalho e comprova apto para nova função.

RETORNO AO TRABALHO APÓS REABILITAÇÃO
- A empresa deve adaptação razoável do posto (mudança de função compatível com limitação)
- A dispensa do reabilitado SÓ é autorizada após contratação de substituto em condição semelhante (art. 93 §1º)

PROCESSO PRÁTICO
1. Segurado encaminhado pela perícia médica do INSS
2. Avaliação da capacidade residual por equipe multidisciplinar
3. Plano individualizado de reabilitação
4. Treinamento e adaptação
5. Emissão do certificado
6. Retorno ao mercado — empresa informada

FONTES: Lei 8.213/1991 Arts. 89-93; Decreto 3.048/1999; IN INSS/PRES 77/2015`,
  },
  {
    title: "CAT — Comunicação de Acidente de Trabalho — Procedimento Completo",
    category: "procedimentos",
    source: "Lei 8.213/1991 Art. 22; Decreto 3.048/1999; IN INSS 77/2015",
    version: "2025",
    tags: "cat,comunicacao,acidente,trabalho,prazo,emissao,tipos,inicial,reabertura,obito,multa,inss,esocial",
    content: `CAT — COMUNICAÇÃO DE ACIDENTE DE TRABALHO

BASE LEGAL: Lei 8.213/1991 Art. 22; Decreto 3.048/1999 Art. 336; IN INSS 77/2015

OBRIGATORIEDADE (Art. 22 Lei 8.213/91)
A empresa é obrigada a comunicar ao INSS o acidente de trabalho ocorrido com seu segurado:
- Acidente com lesão: até o 1º dia útil seguinte
- Em caso de ÓBITO: imediato (sem aguardar dia útil)

TIPOS DE CAT
1. CAT INICIAL: primeira comunicação do acidente ou doença
2. CAT DE REABERTURA: quando há agravamento de acidente/doença já comunicado
3. CAT DE COMUNICAÇÃO DE ÓBITO: para óbito decorrente de acidente já comunicado anteriormente

QUEM PODE EMITIR A CAT (Art. 22 §2º)
Na omissão do empregador:
- O próprio acidentado
- Seus dependentes
- A entidade sindical
- O médico que assistiu o acidentado
- A autoridade pública (delegado, juiz, etc.)

PREENCHIMENTO DA CAT
Disponível no portal gov.br (INSS) ou via eSocial (evento S-2210):
- Dados do empregado: nome, CPF, NIT/PIS, data nascimento, cargo, CBO
- Dados do acidente: data, hora, local, tipo, parte atingida, agente causador
- Dados do atendimento médico: CID, diagnóstico, médico
- Dados do empregador: CNPJ, CNAE, responsável

DISTRIBUIÇÃO DAS VIAS
Pelo menos 4 vias: INSS, empregado, sindicato, empresa (arquivo)
Via do eSocial: transmissão eletrônica gera confirmação automática

MULTA POR NÃO-EMISSÃO (Art. 22 §3º)
Entre R$ 636,17 e R$ 63.611,01 (valores reajustados anualmente), podendo dobrar em caso de reincidência.

IMPACTO NO BENEFÍCIO
Com CAT: INSS reconhece automaticamente o nexo — benefício B-91 (acidentário)
Sem CAT: trabalhador pode requerer B-31 (comum) + solicitar nexo — mais burocrático

FONTES: Lei 8.213/1991 Art. 22; Decreto 3.048/1999; MOS eSocial (S-2210)`,
  },
  {
    title: "Saúde Mental e Trabalho — Riscos Psicossociais e NR-1",
    category: "norma",
    source: "NR-1 (Portaria MTE 6.730/2020); OMS; OIT; CID-11",
    version: "2025",
    tags: "saude,mental,trabalho,psicossocial,nr1,gro,pgr,ansiedade,depressao,estresse,prevencao,nexo,cid",
    content: `SAÚDE MENTAL E TRABALHO — RISCOS PSICOSSOCIAIS

BASE LEGAL: NR-1 (Portaria MTE 6.730/2020); OIT; OMS; CID-11

RISCOS PSICOSSOCIAIS NO GRO/PGR (NR-1)
A nova NR-1 (2020) incluiu os riscos psicossociais como categoria de risco ocupacional a ser identificada, avaliada e controlada no PGR:
- Excesso de pressão e demandas de trabalho
- Falta de autonomia e controle sobre o trabalho
- Conflito de papéis e ambiguidade
- Insegurança no emprego
- Violência e assédio no trabalho
- Desequilíbrio trabalho-vida pessoal
- Falta de suporte social

TRANSTORNOS MENTAIS MAIS COMUNS COM NEXO OCUPACIONAL
- Transtornos de ansiedade (F41 CID-10; F41 CID-11)
- Depressão (F32-F33 CID-10)
- TEPT — Transtorno de Estresse Pós-Traumático (F43.1 CID-10)
- Burnout (QD85 CID-11)
- Transtornos de adaptação (F43.2 CID-10)

NTEP PARA TRANSTORNOS MENTAIS (Decreto 6.042/2007)
O INSS pode aplicar o NTEP para categorias profissionais com alta incidência de transtornos mentais (ex.: bancários com F41.0 — transtorno de pânico; F32 — episódio depressivo).

OBRIGAÇÕES DO EMPREGADOR (NR-1 + Lei 14.457/2022)
1. Incluir riscos psicossociais no PGR
2. Implementar medidas de prevenção (ajuste de carga, pausas, suporte psicológico)
3. Canal de denúncias para assédio moral e sexual (Lei 14.457/2022)
4. Programa de Prevenção do Assédio

AFASTAMENTO E BENEFÍCIO
- Transtorno mental com nexo ocupacional: B-91 (acidentário) com estabilidade de 12 meses
- Sem nexo: B-31 (comum) sem estabilidade

FONTES: NR-1 (Portaria MTE 6.730/2020); OMS CID-11; Lei 14.457/2022; OIT Convenção 190`,
  },
  {
    title: "Exame Demissional — Prazo, Dispensa e Responsabilidade",
    category: "procedimentos",
    source: "NR-7 — Portaria MTE 1.129/2017; CLT Art. 168",
    version: "2025",
    tags: "exame,demissional,prazo,dispensa,aso,ultimo,periodico,135,90,60,dias,prazo,responsabilidade,medico",
    content: `EXAME DEMISSIONAL — REGRAS E PRAZOS

BASE LEGAL: CLT Art. 168; NR-7 item 7.3.1 e 7.3.3; Portaria MTE 1.129/2017

OBRIGATORIEDADE
O exame demissional é obrigatório e deve ser realizado antes da rescisão do contrato de trabalho.

PRAZO MÁXIMO ENTRE O ÚLTIMO PERIÓDICO E O DEMISSIONAL (NR-7 item 7.3.3)
Se o último exame periódico foi realizado dentro dos seguintes prazos antes da rescisão, o demissional pode ser dispensado:
- Grau de risco 1 e 2: 135 dias (≈ 4,5 meses)
- Grau de risco 3 e 4: 90 dias

Ou seja: se o periódico está recente (dentro desses prazos), o demissional é facultativo por acordo coletivo.

DISPENSA DO DEMISSIONAL POR CCT OU ACT
A NR-7 permite que convênio coletivo dispense o exame demissional, desde que o último exame esteja dentro do prazo acima. A dispensa deve estar prevista expressamente no CCT.

RESPONSABILIDADE DO EMPREGADOR
Se não realizar o exame demissional quando obrigatório, o empregador responde por:
- Doenças ou lesões detectadas como ocupacionais que não foram identificadas no demissional
- Autuação do MTE
- Responsabilidade em ação trabalhista (dano moral e material)

CONTEÚDO DO ASO DEMISSIONAL
- Conclusão: APTO ou INAPTO
- Exames complementares baseados nos riscos da função
- Comparação com histórico de exames anteriores (detectar deterioração da saúde)

ENCAMINHAMENTO EM CASO DE DOENÇA DETECTADA
Se o médico detectar doença ocupacional no demissional:
- Emitir CAT (se doença decorrente do trabalho)
- Comunicar ao INSS antes da rescisão
- O empregado pode ter direito à estabilidade acidentária (art. 118 Lei 8.213)

FONTES: CLT Art. 168; NR-7 item 7.3; Portaria MTE 1.129/2017`,
  },
  {
    title: "Exame Toxicológico para Motoristas Profissionais — Lei 13.103/2015",
    category: "norma",
    source: "Lei 13.103/2015; Resolução CONTRAN 784/2020; CLT Art. 168",
    version: "2025",
    tags: "toxicologico,motorista,profissional,cnh,categoria,c,d,e,drogas,admissional,periodico,prazo,lab",
    content: `EXAME TOXICOLÓGICO PARA MOTORISTAS PROFISSIONAIS

BASE LEGAL: Lei 13.103/2015 (Lei do Caminhoneiro); Resolução CONTRAN 784/2020; CTB Art. 148-A

OBRIGATORIEDADE
Todo condutor profissional (CNH categorias C, D ou E) deve realizar exame toxicológico:
- Para obtenção da CNH C, D ou E (habilitação)
- Para renovação da CNH (a cada 5 anos)
- Nas relações trabalhistas (emprego celetista com motorista profissional)

CONTEXTO TRABALHISTA (Lei 13.103/2015)
Para motoristas empregados:
- ADMISSIONAL: exame toxicológico antes de admitir
- PERIÓDICO: a cada 2 anos e 6 meses (ou conforme laudo médico)
- DEMISSIONAL: no desligamento

SUBSTÂNCIAS RASTREADAS (Resolução CONTRAN 784/2020)
No mínimo: cocaína e metabólitos, maconha (THC), anfetaminas, opiáceos, benzodiazepínicos
Janela de detecção: pelo menos 90 dias (exame em cabelo/pelo)

LABORATÓRIOS AUTORIZADOS
Apenas laboratórios credenciados pelo DENATRAN (SENATRAN) podem emitir laudos válidos.

RESULTADO POSITIVO
- Resultado positivo confirmado: impedimento de dirigir profissionalmente
- O empregador NÃO pode demitir por justa causa com base somente no resultado positivo (há entendimento no TST de que a dependência química é doença, não falta grave)
- Ação obrigatória: encaminhamento para tratamento e reabilitação

RECUSA DO MOTORISTA AO EXAME
Pode configurar falta grave (ato de insubordinação) dependendo das circunstâncias — análise caso a caso.

CUSTEIO
O empregador arca com o custo do exame toxicológico.

FONTES: Lei 13.103/2015; Resolução CONTRAN 784/2020; CTB; CLT Art. 168`,
  },
  {
    title: "Monitoramento Biológico — IBMP e Avaliação de Exposição Química",
    category: "norma",
    source: "NR-7 Anexo II; NHo 01 (FUNDACENTRO); ACGIH BEI",
    version: "2025",
    tags: "biologico,monitoramento,ibmp,indicador,chumbo,benzeno,mercurio,solvente,sangue,urina,avaliação,tóxico",
    content: `MONITORAMENTO BIOLÓGICO — IBMP

BASE LEGAL: NR-7 Anexo II; NHo 01 (FUNDACENTRO)

DEFINIÇÃO
O monitoramento biológico avalia a exposição de trabalhadores a agentes químicos por meio de análises de amostras biológicas (sangue, urina, ar expirado). Complementa a avaliação ambiental.

IBMP — ÍNDICE BIOLÓGICO MÁXIMO PERMITIDO
Valor-limite definido para os indicadores biológicos, acima dos quais pode haver risco de dano à saúde.

AGENTES COM IBMP DEFINIDOS NO BRASIL (NR-7 Anexo II — exemplos)
| Agente         | Indicador Biológico     | IBMP                  |
|----------------|-------------------------|------------------------|
| Benzeno        | Ácido trans-trans mucônico na urina | 500 μg/g Cr |
| Chumbo         | Chumbo no sangue        | 40 μg/dL               |
| Mercúrio inorgânico | Mercúrio na urina  | 35 μg/g Cr             |
| Tolueno        | Ácido hipúrico na urina | 1,6 g/g Cr             |
| Pentaclorofenol| Pentaclorofenol na urina| 2 mg/g Cr              |

QUANDO REALIZAR
- Sempre que houver exposição a agente químico com IBMP definido na NR-7
- Periodicidade conforme o PCMSO e a intensidade de exposição

COLETA DE AMOSTRAS
- Deve ser realizada no final do turno de trabalho (para exposição aguda) ou no final da semana de trabalho (para exposição cumulativa)
- Médico do trabalho define momento e tipo de amostra

RESULTADO ACIMA DO IBMP
1. Afastamento imediato ou redução da exposição
2. Investigação das causas (EPC, EPI, procedimentos)
3. Rastreamento dos demais trabalhadores expostos

FONTES: NR-7 Anexo II; NHo 01 FUNDACENTRO; ACGIH BEI (referência internacional); NR-15`,
  },
  {
    title: "Programa de Vacinação Ocupacional — NR-7 e Riscos Biológicos",
    category: "procedimentos",
    source: "NR-7; NR-32 (saúde); MS — PNI; Portaria MS 597/2004",
    version: "2025",
    tags: "vacinacao,ocupacional,hepatite,b,tetano,gripe,profissionais,saude,agente,biologico,pcmso,custeio",
    content: `PROGRAMA DE VACINAÇÃO OCUPACIONAL

BASE LEGAL: NR-7 (PCMSO); NR-32 (saúde — riscos biológicos); Portaria MS 597/2004

OBRIGATORIEDADE DE VACINAÇÃO PELO EMPREGADOR
O PCMSO deve incluir imunização de trabalhadores expostos a riscos biológicos. O empregador arca com os custos.

PRINCIPAIS VACINAS OCUPACIONAIS E INDICAÇÕES

HEPATITE B
- Obrigatória: profissionais da saúde, trabalhadores expostos a sangue e secreções, coletor de lixo
- Esquema: 3 doses (0, 1, 6 meses)
- Confirmação por sorologia (anti-HBs ≥ 10 mUI/mL = imune)

FEBRE AMARELA
- Indicada: trabalhadores em áreas endêmicas, agricultores, trabalhadores rurais
- Dose única (reforço conforme orientação do MS)

TÉTANO/DIFTERIA (dT)
- Indicada: trabalhadores expostos a solo, animais, ferimentos
- Esquema: primovacina 3 doses + reforço a cada 10 anos

INFLUENZA (Gripe)
- Indicada: profissionais da saúde, idosos (acima de 60), gestantes, trabalhadores com comorbidades
- Dose anual (sazonalmente)

FEBRE TIFOIDE
- Indicada: trabalhadores em contato com alimentos, saneamento, esgoto

HEPATITE A
- Indicada: manipuladores de alimentos, trabalhadores em saneamento

RAIVA
- Indicada: veterinários, trabalhadores rurais com exposição a animais

GESTANTES E VACINAÇÃO
As gestantes devem ser orientadas pelo médico do trabalho — algumas vacinas são contraindicadas na gravidez (febre amarela, varicela — vírus vivo atenuado).

REGISTRO DE VACINAÇÃO
O PCMSO deve registrar o status vacinal de cada empregado e as doses aplicadas.

FONTES: NR-7; NR-32; Portaria MS 597/2004; PNI — Programa Nacional de Imunização`,
  },
  {
    title: "Retorno ao Trabalho Gradual — Programa de Reintegração Funcional",
    category: "procedimentos",
    source: "NR-7; CLT Art. 168; IN INSS/PRES 77/2015",
    version: "2025",
    tags: "retorno,trabalho,gradual,reintegracao,afastamento,alta,medica,adaptacao,funcao,carga,horaria,progressão",
    content: `RETORNO AO TRABALHO GRADUAL — PROGRAMA DE REINTEGRAÇÃO

BASE LEGAL: NR-7; CLT Art. 168; IN INSS 128/2022

O QUE É
Programa estruturado de reintegração ao trabalho após afastamento prolongado (acidente, doença grave, transtorno mental), onde o retorno ocorre de forma progressiva — com carga horária reduzida ou função adaptada — até a plena capacidade.

QUANDO INDICADO
- Afastamentos por doença mental (burnout, depressão, ansiedade)
- Afastamentos por DORT/LER com limitação funcional
- Afastamentos por cirurgia ortopédica com limitação temporária
- Pós-acidente com sequelas parciais

ETAPAS DO PROGRAMA DE RETORNO GRADUAL

1. AVALIAÇÃO MÉDICA (Médico do Trabalho — ASO de Retorno)
- Avaliação da capacidade funcional
- Definição das restrições de atividade
- Emissão de ASO de "Retorno ao Trabalho com Restrições"

2. ADAPTAÇÃO DO POSTO DE TRABALHO
- Redução da jornada (progressiva)
- Remoção de tarefas de maior demanda
- Ajustes ergonômicos

3. ACOMPANHAMENTO PERIÓDICO
- Consultas semanais/quinzenais com médico do trabalho
- Avaliação de sintomas e adaptação
- Ajuste progressivo das atividades

4. RETORNO PLENO
- Quando o trabalhador atingir plena capacidade funcional
- Novo ASO: "Apto" sem restrições

BENEFÍCIOS DO PROGRAMA
- Reduz recidivas
- Reduz absenteísmo
- Demonstra responsabilidade social da empresa
- Pode reduzir afastamentos futuros

DOCUMENTAÇÃO
Toda a progressão deve ser documentada nos prontuários médicos e nos registros do eSocial (S-2220 — monitoramento de saúde).

FONTES: NR-7; IN INSS 128/2022; OIT — Diretrizes de retorno ao trabalho; Manual de Medicina do Trabalho`,
  },
  {
    title: "Trabalho em Condições de Calor — IBUTG e Limites de Tolerância",
    category: "norma",
    source: "NR-15 Anexo 3; ACGIH TLV-TWA; NR-7",
    version: "2025",
    tags: "calor,ibutg,nr15,anexo3,limite,tolerancia,atividade,fisica,leve,moderada,pesada,intervalo,exposicao",
    content: `TRABALHO EM CALOR — IBUTG E LIMITES DE TOLERÂNCIA

BASE LEGAL: NR-15 Anexo 3; Portaria MTE 3.214/1978

IBUTG — ÍNDICE DE BULBO ÚMIDO E TERMÔMETRO DE GLOBO
Índice que combina temperatura de bulbo seco, temperatura de bulbo úmido e temperatura de globo para estimar a carga térmica real sobre o trabalhador.

Fórmula (ambientes externos):
IBUTG = 0,7 × Tnbu + 0,1 × Tbs + 0,2 × Tg

Fórmula (ambientes internos ou sombra):
IBUTG = 0,7 × Tnbu + 0,3 × Tg

LIMITES DE TOLERÂNCIA (NR-15 Anexo 3)

Tipo de atividade e metabolismo:
| Atividade     | Metabolismo (W) | Limite IBUTG |
|---------------|-----------------|--------------|
| Leve          | 175 W           | 30,0 °C      |
| Moderada      | 350 W           | 26,7 °C      |
| Pesada        | 500 W           | 25,0 °C      |
| Muito pesada  | > 500 W         | 25,0 °C      |

Quando o IBUTG SUPERA o limite: deve-se adotar regime de trabalho-descanso para manter exposição dentro do limite.

REGIMES DE TRABALHO-DESCANSO (NR-15 Quadro 2)
Quando o IBUTG excede o limite para a atividade, o trabalhador deve ter descanso periódico em local mais fresco:
- IBUTG até 5 acima do limite: regime 45 min trabalho / 15 min descanso
- IBUTG até 10 acima: 30/30 min
- Acima de 10 °C: não permitido (sem EPC adequado)

ADICIONAL DE INSALUBRIDADE (NR-15)
Calor acima dos limites de tolerância → Insalubridade de GRAU MÉDIO (20% do salário mínimo).

MEDIDAS DE CONTROLE
1. Ventilação e circulação do ar
2. Isolamento de fontes de calor (fornos, caldeiras)
3. Hidratação (água fresca — NR-24)
4. Pausas obrigatórias

FONTES: NR-15 Anexo 3; ACGIH TLV-TWA (referência internacional); FUNDACENTRO`,
  },
  {
    title: "Doenças Profissionais e do Trabalho — Lista B Decreto 3.048/1999",
    category: "legislacao",
    source: "Decreto 3.048/1999 Anexo II; Lei 8.213/1991 Art. 20",
    version: "2025",
    tags: "doenca,profissional,trabalho,lista,b,decreto3048,nexo,CID,previdencia,reconhecimento,inss,equiparado",
    content: `DOENÇAS PROFISSIONAIS E DO TRABALHO — LISTA B

BASE LEGAL: Decreto 3.048/1999 Anexo II; Lei 8.213/1991 Art. 20

TIPOS (Art. 20 Lei 8.213/91)

DOENÇA PROFISSIONAL (Art. 20 I)
Produzida ou desencadeada pelo exercício do trabalho peculiar a determinada atividade.
Ex.: Silicose (mineradores), Mesotelioma (amianto), PAIR (metalúrgicos).
→ O nexo causal é PRESUMIDO por lei.

DOENÇA DO TRABALHO (Art. 20 II)
Adquirida ou desencadeada em função de condições especiais em que o trabalho é realizado.
Ex.: LER/DORT (digitadores), PAIR (trabalhadores em ruído), intoxicação por agente químico.
→ O nexo causal deve ser comprovado.

LISTA B — DECRETO 3.048/1999 ANEXO II
O Decreto 3.048/1999 lista as doenças relacionadas ao trabalho com os respectivos CIDs:

Exemplos (Grupo IX — Transtornos mentais):
- F09: Trabalho sob pressão/conflito organizacional → demência, delirium
- F32-F33: Depressão → conforme nexo ocupacional

Exemplos (Grupo XIII — Sistema musculoesquelético):
- M65-M65.1: Sinovite/Tenossinovite → trabalho de movimentos repetitivos
- M75: Síndrome do impacto ombro → trabalho com membros superiores elevados

Exemplos (Grupo VI — Doenças do sistema nervoso):
- G54.2: Lesão do plexo lombar → posições forçadas
- G56.0: Síndrome do túnel do carpo → trabalho com vibração ou esforço repetitivo

EXCLUSÕES (Art. 20 §1º)
NÃO são consideradas doenças do trabalho:
- Degenerativas (artrite, artrose — exceto com nexo)
- Doenças endêmicas (exceto com exposição específica do trabalho)
- Doenças ligadas ao envelhecimento natural

NEXO TÉCNICO EPIDEMIOLÓGICO (NTEP)
O INSS pode presumir o nexo via NTEP conforme CNAE × CID — Decreto 6.042/2007.

FONTES: Decreto 3.048/1999 Anexo II; Lei 8.213/1991 Art. 20; Decreto 6.042/2007`,
  },
]
