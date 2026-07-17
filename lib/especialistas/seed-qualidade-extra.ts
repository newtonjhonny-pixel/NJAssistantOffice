// Documentos adicionais — Qualidade
import type { SeedDoc } from "./seed-data"

export const QUALIDADE_EXTRA_DOCS: SeedDoc[] = [
  {
    title: "ISO 9001:2015 — Estrutura de Alto Nível e Requisitos por Cláusula",
    category: "norma",
    source: "ABNT NBR ISO 9001:2015; ISO 9001:2015 (EN)",
    version: "2025",
    tags: "iso,9001,2015,clausulas,4,5,6,7,8,9,10,sgq,sistema,gestao,qualidade,requisitos,contexto,liderança",
    content: `ISO 9001:2015 — ESTRUTURA DE ALTO NÍVEL (HLS) E REQUISITOS

BASE: ABNT NBR ISO 9001:2015 (segunda revisão — atualizada em 2015)

ESTRUTURA HLS (High Level Structure) — 10 CLÁUSULAS

CLÁUSULA 1: ESCOPO
Define o propósito da norma e as bases para o SGQ.

CLÁUSULA 2: REFERÊNCIAS NORMATIVAS
ISO 9000:2015 (vocabulário e fundamentos).

CLÁUSULA 3: TERMOS E DEFINIÇÕES

CLÁUSULA 4: CONTEXTO DA ORGANIZAÇÃO
4.1: Compreensão da organização e seu contexto (SWOT, PESTLE)
4.2: Compreensão das partes interessadas (stakeholders) e suas necessidades
4.3: Determinação do escopo do SGQ
4.4: SGQ e seus processos (mapeamento de processos, interações)

CLÁUSULA 5: LIDERANÇA
5.1: Liderança e comprometimento (Alta Direção responsável)
5.2: Política da Qualidade (declaração, comunicação)
5.3: Papéis, responsabilidades e autoridades (organograma + RACI do SGQ)

CLÁUSULA 6: PLANEJAMENTO
6.1: Ações para abordar riscos e oportunidades (Risk-based thinking)
6.2: Objetivos da qualidade e planejamento (SMART)
6.3: Planejamento de mudanças

CLÁUSULA 7: APOIO
7.1: Recursos (humanos, infraestrutura, ambiente para os processos)
7.2: Competência (identificar, treinar, evidenciar)
7.3: Conscientização
7.4: Comunicação (interna e externa)
7.5: Informação documentada (controle de documentos e registros)

CLÁUSULA 8: OPERAÇÃO
8.1: Planejamento e controle operacional
8.2: Requisitos de produtos e serviços
8.3: Projeto e desenvolvimento
8.4: Controle de processos, produtos e serviços providos externamente (fornecedores)
8.5: Produção e provisão de serviço
8.6: Liberação de produtos e serviços (inspeção final)
8.7: Controle de saídas não conformes

CLÁUSULA 9: AVALIAÇÃO DE DESEMPENHO
9.1: Monitoramento, medição, análise e avaliação (indicadores, satisfação do cliente)
9.2: Auditoria interna (programa anual)
9.3: Análise crítica pela direção (reunião anual)

CLÁUSULA 10: MELHORIA
10.1: Generalidades
10.2: Não conformidade e ação corretiva (CAPA)
10.3: Melhoria contínua

FONTES: ABNT NBR ISO 9001:2015; ABNT NBR ISO 9000:2015; IAF — Guias de implementação`,
  },
  {
    title: "ISO 14001:2015 — Sistema de Gestão Ambiental",
    category: "norma",
    source: "ABNT NBR ISO 14001:2015; CONAMA; IBAMA",
    version: "2025",
    tags: "iso,14001,2015,ambiental,sga,aspectos,impactos,legais,conformidade,ciclo,vida,emergencia,melhoria",
    content: `ISO 14001:2015 — SISTEMA DE GESTÃO AMBIENTAL (SGA)

BASE: ABNT NBR ISO 14001:2015

OBJETIVO
A ISO 14001 fornece uma estrutura para que a organização gerencie seus impactos ambientais de forma sistemática, melhore o desempenho ambiental e cumpra os requisitos legais.

DIFERENÇA ISO 9001 × ISO 14001
- ISO 9001: foco em qualidade de produtos e serviços para o cliente
- ISO 14001: foco em impactos ambientais e conformidade legal ambiental
- Estrutura HLS idêntica (mesmo framework de cláusulas)

REQUISITOS ESPECÍFICOS DA ISO 14001

4.1 e 4.2: Contexto e Partes Interessadas
Incluir aspectos ambientais como parte do contexto organizacional.

6.1.2: ASPECTOS E IMPACTOS AMBIENTAIS
- Identificar atividades, produtos e serviços que interagem com o meio ambiente
- Avaliar impactos: positivos e negativos, potenciais e reais
- Determinar aspectos significativos (base para controles e objetivos)

Exemplos de aspectos: consumo de energia, geração de resíduos, emissões atmosféricas, descarte de efluentes, uso de recursos naturais.

6.1.3: OBRIGAÇÕES DE CONFORMIDADE (REQUISITOS LEGAIS)
- Legislação federal (PNMA — Lei 6.938/81, PNRS — Lei 12.305/10)
- Legislação estadual e municipal (CONAMA, CETESB, etc.)
- Licenças e autorizações ambientais

PNRS — POLÍTICA NACIONAL DE RESÍDUOS SÓLIDOS (Lei 12.305/2010)
Aspectos para o SGA:
- Plano de Gerenciamento de Resíduos Sólidos (obrigatório para determinados geradores)
- Logística reversa para produtos específicos (embalagens, eletrônicos, pilhas, pneus)

8.2: SITUAÇÕES DE EMERGÊNCIA
- Identificar situações de emergência ambiental (derramamento, incêndio, vazamento)
- Plano de resposta e treinamento periódico

FONTES: ABNT NBR ISO 14001:2015; Lei 6.938/1981; Lei 12.305/2010; CONAMA; ISO 14001:2015 (EN)`,
  },
  {
    title: "ISO 45001:2018 — Sistema de Gestão de SST",
    category: "norma",
    source: "ABNT NBR ISO 45001:2018; ILO OSH 2001",
    version: "2025",
    tags: "iso,45001,2018,saude,segurança,trabalho,sgsst,ohsas,18001,riscos,consulta,participação,trabalhadores",
    content: `ISO 45001:2018 — SISTEMA DE GESTÃO DE SST

BASE: ABNT NBR ISO 45001:2018 (substitui OHSAS 18001)

CONTEXTO
A ISO 45001 é o padrão internacional para Sistemas de Gestão de Saúde e Segurança do Trabalho (SGSST). Substituiu a OHSAS 18001 em 2018, com prazo de transição até março/2021 (já encerrado).

REQUISITOS ESPECÍFICOS DA ISO 45001

4.2: TRABALHADORES E PARTES INTERESSADAS
A ISO 45001 enfatiza a PARTICIPAÇÃO DOS TRABALHADORES como elemento central — eles devem ser consultados e envolvidos nas decisões de SST.

5.3 e 5.4: CONSULTA E PARTICIPAÇÃO
A organização deve estabelecer, implementar e manter processo para consulta e participação dos trabalhadores (e representantes) em:
- Identificação de perigos e avaliação de riscos
- Elaboração de políticas e objetivos de SST
- Planejamento de ações de controle

6.1.1: IDENTIFICAÇÃO DE PERIGOS (diferença da ISO 9001)
- Identificar perigos em todas as atividades e situações
- Considerar: humanos (comportamento, capacidade), fatores psicossociais, mudanças de rotina, situações de emergência

8.1.3: GESTÃO DA MUDANÇA
Avaliar os riscos de SST antes de implementar mudanças em processos, produtos, equipamentos, legislação.

8.1.4: AQUISIÇÃO E CONTRATADOS
- Controlar os riscos de SST gerados por contratados e terceiros
- Comunicar os requisitos de SST aos fornecedores

10.3: MELHORIA CONTÍNUA
Deve incluir ações para melhorar o desempenho em SST — não apenas manter.

INTEGRAÇÃO ISO 9001 + ISO 14001 + ISO 45001 = SISTEMA INTEGRADO DE GESTÃO (SIG)
A mesma estrutura HLS facilita auditorias integradas e documentação unificada.

FONTES: ABNT NBR ISO 45001:2018; ILO OSH 2001; OHSAS 18001 (histórico); ISO 45001:2018 (EN)`,
  },
  {
    title: "POP — Procedimento Operacional Padrão — Como Estruturar",
    category: "procedimentos",
    source: "ABNT NBR ISO 9001:2015 Cláusula 7.5; ANVISA; Práticas de SGQ",
    version: "2025",
    tags: "pop,procedimento,operacional,padrao,it,instrucao,trabalho,estrutura,revisao,controle,documentos,informacao",
    content: `POP — PROCEDIMENTO OPERACIONAL PADRÃO

BASE: ABNT NBR ISO 9001:2015 Cláusula 7.5 (Informação Documentada)

DEFINIÇÃO
O POP é o documento que descreve de forma padronizada como uma atividade deve ser realizada, assegurando consistência, qualidade e rastreabilidade.

DIFERENÇA POP × IT (Instrução de Trabalho)
- POP: descreve o processo ou conjunto de atividades (visão macro de um fluxo)
- IT: descreve passo a passo uma atividade específica (mais detalhada, nível operacional)

ESTRUTURA RECOMENDADA DO POP

1. CABEÇALHO
- Título do documento
- Código (ex.: POP-RH-001)
- Revisão (ex.: Rev. 02)
- Data de emissão e vigência
- Responsável pela elaboração e aprovação
- Setor / Área

2. OBJETIVO
Descrever sucintamente o que o procedimento visa garantir.
Ex.: "Garantir o recrutamento de candidatos adequados às vagas disponíveis."

3. APLICAÇÃO (ESCOPO)
Onde e para quem o procedimento se aplica.

4. DEFINIÇÕES E ABREVIAÇÕES
Glossário de termos técnicos usados.

5. REFERÊNCIAS
Normas, leis e documentos relacionados.

6. RESPONSABILIDADES
RACI simplificado — quem executa, quem aprova, quem é informado.

7. DESCRIÇÃO DO PROCEDIMENTO
Passo a passo claro, numerado, com evidências necessárias.
Incluir: fluxograma quando o processo é complexo.

8. INDICADORES
Métricas associadas ao cumprimento do procedimento.

9. REGISTROS E EVIDÊNCIAS
Quais formulários, registros ou dados devem ser gerados.

10. HISTÓRICO DE REVISÕES
| Revisão | Data | Descrição da alteração | Responsável |

CONTROLE DE DOCUMENTOS (ISO 9001 Cláusula 7.5.3)
- Identificação única (código + versão)
- Aprovação formal antes da distribuição
- Controle de acesso às versões vigentes
- Retirada imediata de documentos obsoletos

FONTES: ABNT NBR ISO 9001:2015; ANVISA — Manual de Boas Práticas; SGQ — Templates de POP`,
  },
  {
    title: "Auditoria Interna — Programa, Execução e Relatório (ISO 9001 Cláusula 9.2)",
    category: "procedimentos",
    source: "ABNT NBR ISO 9001:2015 Cláusula 9.2; ABNT NBR ISO 19011:2018",
    version: "2025",
    tags: "auditoria,interna,programa,plano,evidencias,criterios,nc,conformidade,relatorio,auditores,qualificacao",
    content: `AUDITORIA INTERNA — PROGRAMA E EXECUÇÃO

BASE: ABNT NBR ISO 9001:2015 Cláusula 9.2; ABNT NBR ISO 19011:2018

REQUISITO ISO 9001 (Cláusula 9.2)
A organização deve conduzir auditorias internas em intervalos planejados para determinar se o SGQ:
a) Está em conformidade com os requisitos da própria organização e da norma
b) Está implementado e mantido eficazmente

PROGRAMA DE AUDITORIA ANUAL
Deve incluir:
- Frequência de auditorias por processo/área
- Escopo de cada auditoria
- Métodos utilizados
- Competências necessárias dos auditores
- Critérios de avaliação

PLANEJAMENTO DA AUDITORIA (PLANO DE AUDITORIA)
Para cada auditoria específica:
- Data, local, duração
- Processos e cláusulas a serem auditados
- Auditores designados (independentes do processo auditado)
- Documentos de referência (POP, ISO, procedimentos)

EXECUÇÃO DA AUDITORIA

Abertura (reunião inicial):
- Apresentar os objetivos e escopo
- Confirmar disponibilidade de auditados

Coleta de evidências:
- Entrevistas com responsáveis
- Observação in loco
- Análise de registros (documentos, dados, logs)
- Evidências objetivas = demonstráveis, verificáveis

Tipos de constatações:
- CONFORME: o requisito está atendido com evidência
- NÃO CONFORMIDADE (NC): requisito não atendido — grave
- OBSERVAÇÃO: potencial de NC ou oportunidade de melhoria
- PONTO FORTE: destaque positivo

Reunião de encerramento:
- Apresentar as constatações
- Confirmar acordos sobre prazo de resposta

RELATÓRIO DE AUDITORIA
Deve conter:
- Objetivos, escopo e critérios
- Auditores e auditados
- Data e local
- Constatações detalhadas (com evidências)
- Conclusão sobre eficácia do SGQ

QUALIFICAÇÃO DE AUDITORES INTERNOS
- Treinamento em ISO 9001 e técnicas de auditoria (ABNT NBR ISO 19011)
- Prática supervisionada em auditorias
- Imparcialidade: auditor não audita seu próprio trabalho

FONTES: ABNT NBR ISO 9001:2015; ABNT NBR ISO 19011:2018; IAF MD 5`,
  },
  {
    title: "CAPA — Ação Corretiva e Preventiva — ISO 9001 Cláusula 10.2",
    category: "procedimentos",
    source: "ABNT NBR ISO 9001:2015 Cláusula 10.2; FDA 21 CFR 820; ICH Q10",
    version: "2025",
    tags: "capa,acao,corretiva,preventiva,nc,nao,conformidade,causa,raiz,eficacia,verificacao,fechamento,prazo",
    content: `CAPA — AÇÃO CORRETIVA E PREVENTIVA

BASE: ABNT NBR ISO 9001:2015 Cláusula 10.2; FDA 21 CFR 820 (regulatório)

DEFINIÇÕES
- NÃO CONFORMIDADE (NC): não atendimento de um requisito
- AÇÃO CORRETIVA: elimina a CAUSA de uma NC real para evitar recorrência
- AÇÃO PREVENTIVA (ISO 9001:2015 — incluída nos riscos): elimina causas de NC potenciais

PROCESSO CAPA (8 ETAPAS)

1. DETECÇÃO E NOTIFICAÇÃO
Fontes: auditoria interna, reclamação de cliente, avaliação de desempenho, análise crítica

2. CONTENÇÃO (AÇÃO IMEDIATA)
Medida para conter o problema imediato — não elimina a causa raiz.
Ex.: segregar produtos não-conformes, notificar clientes afetados

3. DESCRIÇÃO DA NÃO CONFORMIDADE
- Responder: O quê? Quando? Onde? Quantas ocorrências? Quem identificou?
- Evidências objetivas

4. ANÁLISE DE CAUSA RAIZ
- 5 Porquês
- Diagrama de Ishikawa
- FMEA (se sistêmico)

5. PLANO DE AÇÃO CORRETIVA
Para cada causa raiz: ação + responsável + prazo.
Tipo de ação: eliminação da causa, proteção contra o efeito, ou ambos.

6. IMPLEMENTAÇÃO DAS AÇÕES
Executar as ações conforme plano. Evidenciar (registros de treinamento, atualização de POP, etc.).

7. VERIFICAÇÃO DE EFICÁCIA
Após o prazo: verificar se a NC não recorreu.
Métodos: auditoria pontual, monitoramento de indicadores, inspeção.

8. FECHAMENTO
Se a ação foi eficaz: fechar o CAPA com evidências.
Se não foi eficaz: reabrir e refazer a análise de causa raiz.

INDICADORES DO PROCESSO CAPA
- Prazo médio de fechamento de NC
- Taxa de recorrência de NC fechadas
- % de CAPAs com análise de causa raiz completa
- % de CAPAs eficazes na verificação

FONTES: ABNT NBR ISO 9001:2015; FDA 21 CFR 820.100; ICH Q10; ABNT NBR ISO 9000:2015`,
  },
  {
    title: "8D — Metodologia de Resolução de Problemas em 8 Disciplinas",
    category: "metodologia",
    source: "Ford Motor Company — Team Oriented Problem Solving (TOPS); AIAG",
    version: "2025",
    tags: "8d,oito,disciplinas,ford,tops,problema,causa,raiz,acao,corretiva,equipe,comunicacao,cliente,automotive",
    content: `8D — RESOLUÇÃO DE PROBLEMAS EM 8 DISCIPLINAS

ORIGEM: Ford Motor Company — TOPS (Team Oriented Problem Solving). Amplamente adotado no setor automotivo (AIAG, OEM).

QUANDO USAR O 8D
- Problemas recorrentes com causa raiz desconhecida
- Reclamações de clientes graves
- Falhas de produto/processo com impacto significativo
- Situações que exigem resposta formal ao cliente

AS 8 DISCIPLINAS

D0: PREPARAÇÃO DO 8D
- Verificar se o problema justifica o uso do 8D
- Designar o líder do time

D1: FORMAÇÃO DA EQUIPE
- Equipe multidisciplinar com competências relevantes
- 4-8 pessoas (incluindo quem executa o processo)
- Designar líder e documentar membros

D2: DESCRIÇÃO DO PROBLEMA
- Responder: O quê? Quando? Onde? Quem? Quantos? Como? Por quê? (5W1H + 1H)
- Dados quantitativos
- É / Não É (distinções que limitam o escopo do problema)

D3: AÇÃO DE CONTENÇÃO (Interim Containment Action — ICA)
- Ação imediata para proteger o cliente enquanto a causa raiz é investigada
- Deve ser verificada quanto à eficácia
- Ex.: inspeção 100%, segregação de produto, comunicado ao cliente

D4: ANÁLISE DE CAUSA RAIZ (Root Cause Analysis)
- Identificar a causa raiz do PROBLEMA (causa do sintoma)
- Identificar o ponto de escape (por que o controle não detectou)
- Ferramentas: 5 Porquês, Ishikawa, DOE, correlação

D5: AÇÃO CORRETIVA PERMANENTE (PCA)
- Ação que elimina a causa raiz definitivamente
- Verificar se a PCA resolverá o problema (simulação)
- Plano de ação com responsáveis e prazos

D6: IMPLEMENTAÇÃO E VALIDAÇÃO DA PCA
- Implementar a ação corretiva permanente
- Remover a ação de contenção
- Verificar eficácia com dados

D7: PREVENÇÃO DE RECORRÊNCIA
- Atualizar procedimentos, treinamentos, controles
- Disseminar para produtos/processos similares (lessons learned)
- Atualizar FMEA, plano de controle, POP

D8: RECONHECIMENTO DA EQUIPE
- Fechar o 8D formalmente
- Reconhecer o esforço coletivo
- Enviar relatório ao cliente (se aplicável)

FONTES: Ford TOPS/8D Manual; AIAG 8D Reference; VDA 8D-Bericht (versão alemã)`,
  },
  {
    title: "Controle Estatístico de Processo — Cartas de Controle e CEP",
    category: "metodologia",
    source: "Shewhart; Deming; ABNT NBR ISO 7870; ASQ",
    version: "2025",
    tags: "cep,spc,carta,controle,limites,xbar,r,p,np,shewhart,variabilidade,causas,comuns,especiais,cpk,cp",
    content: `CONTROLE ESTATÍSTICO DE PROCESSO (CEP / SPC)

BASE: Walter A. Shewhart (Bell Labs, 1924); popularizado por W. Edwards Deming

OBJETIVO DO CEP
Monitorar continuamente o processo para distinguir variação por causas comuns (naturais — aceitável) de causas especiais (anomalias — requere investigação).

TIPOS DE VARIAÇÃO
- CAUSAS COMUNS: variação inerente ao processo (random, aleatória). O processo está sob controle estatístico.
- CAUSAS ESPECIAIS: variação anormal, identificável. Sinal de alarme — investigar e eliminar.

CARTAS DE CONTROLE — TIPOS PRINCIPAIS

CARTA X̄-R (Média e Amplitude)
Para variáveis contínuas com amostras pequenas (2-10)
- Carta X̄: monitora a média do processo
- Carta R: monitora a amplitude (variabilidade)

CARTA X̄-S (Média e Desvio Padrão)
Para amostras maiores (n > 10)

CARTA I-MR (Individual e Amplitude Móvel)
Para amostras de n=1 (uma medição por ponto)

CARTAS DE ATRIBUTOS
- Carta p: proporção de não-conformes (tamanho de amostra variável)
- Carta np: número de não-conformes (tamanho de amostra fixo)
- Carta c: número de defeitos por unidade (tamanho fixo)
- Carta u: número de defeitos por unidade (tamanho variável)

LIMITES DE CONTROLE
- LCS (Limite de Controle Superior): X̄ + 3σ
- LC (Linha Central): X̄
- LCI (Limite de Controle Inferior): X̄ - 3σ
→ Calculados a partir dos dados do processo (não são especificações do cliente!)

SINAIS DE CAUSAS ESPECIAIS (Regras de Shewhart / Nelson)
1. Um ponto fora dos limites de controle
2. 2 de 3 pontos consecutivos na mesma zona além de 2σ
3. 4 de 5 pontos consecutivos além de 1σ
4. 8 pontos consecutivos do mesmo lado da linha central

ÍNDICES DE CAPACIDADE
Cp = (LSE - LIE) ÷ (6σ)
Cpk = min[(X̄ - LIE) ÷ (3σ), (LSE - X̄) ÷ (3σ)]
→ Cp ≥ 1,33 (meta) e Cpk ≥ 1,33: processo capaz e centrado

FONTES: Shewhart — Economic Control of Quality (1931); Deming — Out of the Crisis; ABNT NBR ISO 7870; Montgomery — Introduction to Statistical Quality Control`,
  },
  {
    title: "NPS — Net Promoter Score — Implementação e Análise",
    category: "procedimentos",
    source: "Fred Reichheld — The Ultimate Question; Bain & Company",
    version: "2025",
    tags: "nps,net,promoter,score,pergunta,detratores,neutros,promotores,calculo,zona,excelencia,pesquisa,cliente",
    content: `NPS — NET PROMOTER SCORE

ORIGEM: Fred Reichheld (Bain & Company) — "The One Number You Need to Grow" (HBR, 2003)

A PERGUNTA ÚNICA DO NPS
"Em uma escala de 0 a 10, qual a probabilidade de você recomendar [empresa/produto/serviço] para um amigo ou colega?"

CLASSIFICAÇÃO DOS RESPONDENTES
- PROMOTORES (notas 9-10): clientes entusiastas, leais, recomendam ativamente
- NEUTROS/PASSIVOS (notas 7-8): satisfeitos mas não entusiastas — vulneráveis à concorrência
- DETRATORES (notas 0-6): insatisfeitos, podem prejudicar a marca com word-of-mouth negativo

CÁLCULO DO NPS
NPS = % Promotores - % Detratores (os Neutros não entram na conta)

Exemplo: 100 respondentes → 50 promotores, 30 neutros, 20 detratores
NPS = 50% - 20% = +30

ESCALA DE REFERÊNCIA (NPS Zones)
- Excelência: 75 a 100
- Ótimo: 50 a 74
- Bom: 25 a 49
- Aprimoramento: 0 a 24
- Ruim: -100 a -1
(benchmarks variam por setor — sempre comparar com referências do mesmo segmento)

BOAS PRÁTICAS DE IMPLEMENTAÇÃO

FREQUÊNCIA
- Transacional NPS: enviado após interação específica (compra, atendimento)
- Relacional NPS: enviado periodicamente (trimestral ou semestral) para medir o relacionamento geral

PERGUNTA COMPLEMENTAR (FOLLOW-UP)
"Por que você deu essa nota?" → coleta qualitativa — essencial para ação

PROCESSO DE CLOSE THE LOOP
- Detratores: contato em até 24h — entender o problema e propor solução
- Promotores: agradecer e convidar para cases, indicações, avaliações

ARMADILHAS DO NPS
- Confundir NPS com satisfação: NPS mede lealdade, não satisfação momentânea
- Pesquisar apenas os clientes que querem responder (viés)
- Não agir sobre os resultados (medir sem melhorar)

FONTES: Fred Reichheld — The Ultimate Question; Bain & Company NPS Guide; Satmetrix`,
  },
  {
    title: "Controle de Documentos e Registros — ISO 9001 Cláusula 7.5",
    category: "procedimentos",
    source: "ABNT NBR ISO 9001:2015 Cláusula 7.5; ABNT NBR ISO 9000:2015",
    version: "2025",
    tags: "controle,documentos,registros,informacao,documentada,versao,aprovacao,acesso,retencao,descarte,lista,mestra",
    content: `CONTROLE DE DOCUMENTOS E REGISTROS — ISO 9001 CLÁUSULA 7.5

BASE: ABNT NBR ISO 9001:2015 Cláusula 7.5 (Informação Documentada)

TERMINOLOGIA ISO 9001:2015
A norma usa o termo "INFORMAÇÃO DOCUMENTADA" para englobar tanto:
- DOCUMENTOS: informações que descrevem como fazer (POPs, ITs, formulários)
- REGISTROS: evidências de que algo foi feito (relatórios, atas, dados medidos)

CRIAÇÃO E ATUALIZAÇÃO (7.5.2)
A organização deve assegurar identificação e descrição, formato e mídia, análise crítica e aprovação quanto à adequação e suficiência.

Elementos de controle mínimos:
- Código de identificação único
- Título
- Versão/Revisão
- Data de emissão
- Aprovador (assinatura ou aprovação eletrônica)

CONTROLE DE INFORMAÇÃO DOCUMENTADA (7.5.3)
A organização deve abordar:
- DISTRIBUIÇÃO e ACESSO: quem pode acessar, ler, alterar?
- ARMAZENAMENTO e PRESERVAÇÃO: onde fica e como é protegido?
- CONTROLE DE ALTERAÇÕES: rastreabilidade de versões
- RETENÇÃO: por quanto tempo manter registros?
- DESCARTE: como eliminar documentos obsoletos de forma segura?

LISTA MESTRA DE DOCUMENTOS
Registro de todos os documentos do SGQ com:
- Código, título, versão atual, data de vigência, local/mídia de armazenamento
- Status: vigente, em revisão, obsoleto
- Responsável por cada documento

DOCUMENTOS OBSOLETOS
- Retirar imediatamente da circulação
- Marcar claramente como "OBSOLETO" antes de arquivar (se mantido por histórico)
- Versão digital: remover do sistema de gestão e mover para pasta de obsoletos

REGISTROS DE QUALIDADE — PRAZO DE RETENÇÃO
ISO 9001 não especifica prazo — a organização define conforme:
- Requisitos legais (mínimo 5 anos para registros trabalhistas; 10-20 anos para registros de segurança)
- Requisitos de clientes (contratos podem exigir retenção específica)
- Risco operacional (histórico de calibração, qualificação de fornecedores)

FONTES: ABNT NBR ISO 9001:2015; ABNT NBR ISO 9000:2015; ISO TC/176 — FAQs`,
  },
  {
    title: "Análise Crítica pela Direção — ISO 9001 Cláusula 9.3",
    category: "procedimentos",
    source: "ABNT NBR ISO 9001:2015 Cláusula 9.3",
    version: "2025",
    tags: "analise,critica,direção,alta,gestao,reuniao,inputs,outputs,ata,decisoes,melhoria,objetivos,SGQ",
    content: `ANÁLISE CRÍTICA PELA DIREÇÃO — ISO 9001 CLÁUSULA 9.3

BASE: ABNT NBR ISO 9001:2015 Cláusula 9.3

OBRIGATORIEDADE
A Alta Direção deve conduzir análises críticas do SGQ em intervalos planejados para assegurar conveniência, adequação, eficácia e alinhamento com a direção estratégica.

FREQUÊNCIA RECOMENDADA
Mínimo anual — empresas com processos dinâmicos: semestral ou trimestral.

ENTRADAS OBRIGATÓRIAS (ISO 9001 Cláusula 9.3.2)
A reunião de análise deve contemplar:
a) Status das ações de análises anteriores
b) Mudanças no contexto externo e interno
c) Informações sobre desempenho e eficácia do SGQ:
   - Satisfação de clientes e feedback (NPS, reclamações)
   - Grau de alcance dos objetivos da qualidade
   - Desempenho de processos e conformidade de produtos/serviços
   - Não conformidades e ações corretivas
   - Resultados de monitoramento e medição
   - Resultados de auditorias internas
   - Desempenho de fornecedores externos
d) Adequação de recursos
e) Eficácia de ações para abordar riscos e oportunidades
f) Oportunidades de melhoria

SAÍDAS OBRIGATÓRIAS (ISO 9001 Cláusula 9.3.3)
A análise deve resultar em decisões sobre:
- Oportunidades de melhoria
- Necessidade de mudanças no SGQ (processos, políticas, objetivos)
- Necessidades de recursos

ATA DE ANÁLISE CRÍTICA
Documento obrigatório. Deve registrar:
- Data, participantes, pauta
- Resultados das análises por tópico
- Decisões e ações aprovadas (com responsável e prazo)
- Conclusão sobre a eficácia do SGQ

AUDITOR: O QUE VERIFICAR
- Existência de atas de análises anteriores
- Se as entradas listadas foram realmente analisadas
- Se as saídas geraram ações monitoradas
- Participação da Alta Direção (não delegar completamente)

FONTES: ABNT NBR ISO 9001:2015; ISO 9001 Auditing Practices Group — Guidance Papers`,
  },
  {
    title: "Gestão de Fornecedores Qualificados — ISO 9001 Cláusula 8.4",
    category: "procedimentos",
    source: "ABNT NBR ISO 9001:2015 Cláusula 8.4; APQP; PPAP",
    version: "2025",
    tags: "fornecedores,qualificacao,avaliacao,homologacao,risco,desempenho,SQI,auditoria,criterios,externo,critico",
    content: `GESTÃO DE FORNECEDORES QUALIFICADOS — ISO 9001 CLÁUSULA 8.4

BASE: ABNT NBR ISO 9001:2015 Cláusula 8.4 (Controle de Processos, Produtos e Serviços Providos Externamente)

ESCOPO DO 8.4
Aplica-se a:
- Produtos e serviços incorporados ao produto/serviço final
- Processos externalizados (terceirizados)
- Produtos fornecidos diretamente ao cliente pelo fornecedor (em nome da empresa)

CRITÉRIOS DE SELEÇÃO DE FORNECEDORES (8.4.1)
A organização deve definir e aplicar critérios para:
- Avaliação (antes da contratação)
- Seleção entre alternativas
- Monitoramento contínuo do desempenho
- Reavaliação periódica

CRITÉRIOS COMUNS
- Capacidade técnica (certificações, equipamentos, capacidade produtiva)
- Qualidade (histórico de NC, taxa de devolução)
- Pontualidade de entrega
- Situação financeira (risco de descontinuidade)
- Conformidade legal e ambiental
- Certificação ISO 9001 (ou equivalente)

LISTA DE FORNECEDORES QUALIFICADOS
Documento formal (Lista de Fornecedores Aprovados — LFA):
- Razão social, CNPJ, produto/serviço fornecido
- Data de qualificação, data de validade, responsável pela qualificação
- Status: aprovado, aprovado condicionalmente, suspenso, bloqueado

AVALIAÇÃO DE DESEMPENHO DE FORNECEDORES (Scorecard)
Indicadores: Qualidade (% itens conformes), Prazo (% entregas no prazo), Documentação, Responsividade
Periodicidade: mensal (críticos), trimestral ou semestral (demais)
Nota de corte: fornecedores abaixo da nota mínima → plano de desenvolvimento ou substituição

AUDITORIA EM FORNECEDORES
- Para fornecedores críticos: auditoria in loco anual
- Checklist baseado nos requisitos do contrato + ISO 9001 (quando exigido)

FONTES: ABNT NBR ISO 9001:2015; AIAG APQP; PPAP (Production Part Approval Process)`,
  },
  {
    title: "Poka-Yoke — Prevenção de Erros em Processos (Error Proofing)",
    category: "metodologia",
    source: "Shigeo Shingo — Zero Quality Control; Toyota Production System",
    version: "2025",
    tags: "poka,yoke,prova,erro,mistake,proofing,prevenção,detecção,alarme,controle,dispositivo,inadimissivel",
    content: `POKA-YOKE — DISPOSITIVOS À PROVA DE ERRO

ORIGEM: Shigeo Shingo (Toyota) — anos 1960. "Poka" = erro inadvertido; "Yoke" = prevenção.

CONCEITO
Poka-Yoke é qualquer mecanismo que impede ou detecta um erro antes que ele se torne um defeito — tornando o processo "à prova de falha humana".

TIPOS DE POKA-YOKE

1. PREVENÇÃO (Control Poka-Yoke)
O erro é IMPOSSÍVEL de ocorrer.
Exemplos:
- Conector USB-C reversível (não tem lado errado)
- Pino de orientação em peças: só monta em uma posição
- Campo de formulário com validação de CPF (rejeita número inválido)
- Bico de gasolina incompatível com entrada de diesel (automóvel flex)

2. DETECÇÃO (Warning Poka-Yoke)
O erro é IDENTIFICADO imediatamente após ocorrer.
Exemplos:
- Alarme sonoro quando porta do carro está aberta
- Sensor de falta de parafuso em linha de montagem
- Validação de e-mail antes de enviar formulário
- Código de barras que não lê produto errado

HIERARQUIA DE EFICÁCIA
1. Poka-Yoke de prevenção total (mais eficaz)
2. Poka-Yoke de detecção com parada automática
3. Poka-Yoke de detecção com alarme
4. Inspeção 100% (menos eficaz — custo alto e falha humana)
5. Inspeção por amostragem (menos eficaz)

APLICAÇÃO EM PROCESSOS ADMINISTRATIVOS
- Workflow de aprovação no sistema (não avança sem aprovação)
- Alerta de campos obrigatórios em formulário digital
- Checklists digitais com bloqueio de avanço sem preenchimento
- Dupla assinatura para pagamentos acima de um valor
- Automação: script que valida dados antes de importar ao sistema

IMPLEMENTAÇÃO DE POKA-YOKE
1. Identificar onde os erros ocorrem (histórico de NC, observação)
2. Analisar a causa do erro (5 Porquês)
3. Projetar o dispositivo (físico ou digital)
4. Testar e validar
5. Documentar no POP / FMEA atualizado

FONTES: Shigeo Shingo — Zero Quality Control; Shingo Prize; ASQ — Mistake-Proofing`,
  },
  {
    title: "Indicadores de Qualidade — KPIs Essenciais para o SGQ",
    category: "procedimentos",
    source: "ABNT NBR ISO 9001:2015 Cláusula 9.1; ABPMP; ASQ",
    version: "2025",
    tags: "indicadores,qualidade,kpi,sgq,nao,conformidade,satisfacao,eficacia,processo,meta,tendencia,monitoramento",
    content: `INDICADORES DE QUALIDADE — KPIs DO SGQ

BASE: ABNT NBR ISO 9001:2015 Cláusula 9.1 (Monitoramento, Medição, Análise e Avaliação)

A ISO 9001 exige que a organização determine:
- O que precisa ser monitorado e medido
- Os métodos de análise e avaliação
- Quando os resultados devem ser analisados e reportados

PRINCIPAIS INDICADORES DE QUALIDADE

QUALIDADE DE PRODUTO/SERVIÇO
- Taxa de NCs internas: (NCs internas ÷ total de unidades produzidas) × 100
- Taxa de NCs externas (reclamações de clientes): (reclamações ÷ entregas) × 100
- Taxa de retrabalho: (horas retrabalho ÷ horas totais produção) × 100
- Taxa de devolução: (unidades devolvidas ÷ total entregue) × 100
- PPM (partes por milhão de defeitos): (defeitos ÷ total produzido) × 1.000.000

SATISFAÇÃO DO CLIENTE
- NPS (Net Promoter Score)
- CSAT (Customer Satisfaction Score): % clientes satisfeitos ou muito satisfeitos
- Taxa de reclamações resolvidas no prazo
- Tempo médio de resolução de reclamações

EFICÁCIA DO SGQ
- % de auditorias realizadas conforme programa
- Prazo médio de fechamento de NCs
- % de CAPAs eficazes na verificação
- % de objetivos da qualidade alcançados no período

FORNECEDORES
- Índice de Qualidade de Fornecedores (IQF)
- % entregas no prazo
- % itens não-conformes recebidos

ESTRUTURA DO PAINEL DE INDICADORES (Dashboard Qualidade)
| KPI                    | Meta    | Resultado | Status    | Tendência |
|------------------------|---------|-----------|-----------|-----------|
| Taxa de NC interna     | < 2%    | 1,8%      | 🟢 OK     | ↘ Melhora  |
| NPS clientes           | > 50    | 47        | 🟡 Atenção| → Estável  |
| % CAPA eficazes        | > 85%   | 78%       | 🟡 Atenção| ↗ Melhora  |

FONTES: ABNT NBR ISO 9001:2015; ASQ Quality Management; ABPMP; Juran — Juran's Quality Handbook`,
  },
]
