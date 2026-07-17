// Documentos adicionais — Segurança do Trabalho
import type { SeedDoc } from "./seed-data"

export const SEGURANCA_EXTRA_DOCS: SeedDoc[] = [
  {
    title: "NR-4 — SESMT — Serviços Especializados em Engenharia de Segurança e Medicina do Trabalho",
    category: "norma",
    source: "NR-4 — Portaria MTE 3.214/1978; Portaria MTE 247/2011",
    version: "2025",
    tags: "sesmt,nr4,dimensionamento,engenheiro,segurança,tecnico,medico,trabalho,grau,risco,obrigatoriedade",
    content: `NR-4 — SESMT — DIMENSIONAMENTO E OBRIGATORIEDADE

BASE LEGAL: CLT Art. 162; NR-4 (Portaria MTE 3.214/1978)

OBRIGATORIEDADE
Empresas privadas e públicas que admitam trabalhadores como empregados. O dimensionamento depende do GRAU DE RISCO (GR) e do número de empregados.

GRAUS DE RISCO (Quadro I NR-4)
GR 1 a 4, conforme atividade econômica (CNAE):
- GR 1: menor risco (ex.: comércio, educação)
- GR 4: maior risco (ex.: indústria química, construção civil, mineração)

TABELA DE DIMENSIONAMENTO (Quadro II NR-4) — exemplos:
| Nº empregados | GR 3 e 4     | GR 1 e 2     |
|----------------|--------------|--------------|
| 51 a 100       | Técnico ST   | —            |
| 101 a 250      | Técnico ST   | Técnico ST   |
| 251 a 500      | Eng. ST + TS | Técnico ST   |
| 501 a 1.000    | Eng. ST + TS | Eng. ST + TS |
| 1.001 a 2.000  | Eng. ST × 2  | Eng. ST + TS |
(verificar quadro completo da NR-4 atualizada)

PROFISSIONAIS DO SESMT
- Médico do Trabalho: MT
- Engenheiro de Segurança do Trabalho: EST
- Enfermeiro do Trabalho: ET
- Técnico de Segurança do Trabalho: TST
- Auxiliar de Enfermagem do Trabalho: AET

ATRIBUIÇÕES DO SESMT (Item 4.12 NR-4)
- Aplicar os conhecimentos de engenharia de segurança e de medicina do trabalho ao ambiente de trabalho
- Determinar, quando esgotados todos os meios técnicos de eliminação do risco, a utilização de EPI
- Colaborar com o PCMSO, PGR e treinamentos de SST
- Investigar acidentes
- Comunicar ao empregador sobre riscos passíveis de causar lesões ou doenças

SERVIÇOS COMUNS (TERCEIRIZAÇÃO DO SESMT)
Empresas com menos de 50 empregados podem contratar serviços comuns (SESMT terceirizado), desde que o profissional atenda ao mínimo legal de horas mensais na empresa.

FONTES: CLT Art. 162; NR-4; Portaria MTE 3.214/1978; Portaria MTE 247/2011`,
  },
  {
    title: "NR-5 — CIPA — Comissão Interna de Prevenção de Acidentes",
    category: "norma",
    source: "NR-5 — Portaria MTE 3.214/1978; Portaria MTE 247/2011",
    version: "2025",
    tags: "cipa,nr5,eleicao,mandato,designado,empregador,presidente,secretario,reunião,ata,sipat,treinamento",
    content: `NR-5 — CIPA — COMISSÃO INTERNA DE PREVENÇÃO DE ACIDENTES

BASE LEGAL: CLT Art. 163-165; NR-5 (Portaria MTE 3.214/1978)

OBRIGATORIEDADE E DIMENSIONAMENTO
Empresas com determinado número de empregados por CNAE (Quadro I NR-5) devem constituir CIPA. Para empresas abaixo do mínimo: designar responsável pelo cumprimento das NRs.

COMPOSIÇÃO
- Representantes indicados pelo EMPREGADOR (designados)
- Representantes eleitos pelos EMPREGADOS

A proporção é igual (ou próxima) entre eleitos e designados, conforme Quadro I.

ELEIÇÃO DOS REPRESENTANTES DOS EMPREGADOS
- Processo eleitoral: convocação com antecedência de 60 dias
- Votação secreta
- Mandato: 1 ano (com direito a 1 reeleição)

PRESIDENTE: indicado pelo empregador (dentre os designados)
VICE-PRESIDENTE: eleito pelos empregados (dentre os eleitos)
SECRETÁRIO: pode ser de qualquer representação

ATRIBUIÇÕES DA CIPA (Item 5.16 NR-5)
- Identificar riscos do processo de trabalho
- Elaborar plano de trabalho para implementar ações preventivas
- Participar da implementação e controle de qualidade das medidas de prevenção
- Realizar inspeções de segurança periódicas
- Divulgar e promover a SIPAT (Semana Interna de Prevenção de Acidentes do Trabalho)
- Participar da investigação de acidentes

REUNIÕES ORDINÁRIAS
Mensais, na metade do expediente, em local adequado. Lavrar ata de cada reunião.

TREINAMENTO (Item 5.32 NR-5)
Obrigatório para todos os membros titulares e suplentes.
- Carga horária mínima: 20 horas (empresas > GR 3) ou conforme cronograma
- Realizado durante o horário normal de trabalho ou com anuência dos empregados

ESTABILIDADE CIPISTA (ADCT Art. 10 II a)
Desde o registro da candidatura até 1 ano após o mandato — para membros eleitos e suplentes.

FONTES: CLT Arts. 163-165; NR-5; Portaria MTE 3.214/1978; ADCT Art. 10 II a`,
  },
  {
    title: "NR-9 — Programa de Prevenção de Riscos Ambientais (substituída pelo PGR)",
    category: "norma",
    source: "NR-9 — Portaria MTE 915/2019; NR-1 — Portaria MTE 6.730/2020",
    version: "2025",
    tags: "nr9,pgr,ppra,avaliacao,riscos,agentes,fisicos,quimicos,biologicos,quantitativo,qualitativo,limite,tolerancia",
    content: `NR-9 / PGR — AVALIAÇÃO E CONTROLE DE RISCOS AMBIENTAIS

HISTÓRICO
Até 2021: o PPRA (Programa de Prevenção de Riscos Ambientais — NR-9) era obrigatório.
A partir de 2021: a NR-1 foi reformulada para incluir o GRO (Gerenciamento de Riscos Ocupacionais) e o PGR (Programa de Gerenciamento de Riscos) passou a ser exigido, tornando-se mais abrangente que o antigo PPRA.

PGR — PROGRAMA DE GERENCIAMENTO DE RISCOS (NR-1 — Portaria MTE 6.730/2020)
Obrigatório para todas as empresas com empregados. Substitui o PPRA.

ESTRUTURA DO PGR
1. Inventário de riscos: identificação e classificação de todos os riscos ocupacionais (físicos, químicos, biológicos, ergonômicos, mecânicos/acidentais, psicossociais)
2. Plano de ação: medidas de prevenção e controle, prazos e responsáveis
3. Evidências das ações implementadas

AGENTES FÍSICOS (NR-9 / PGR)
- Ruído (avaliação quantitativa — NHo dose/nível, TLV-TWA)
- Calor (IBUTG — Índice de Bulbo Úmido e Termômetro de Globo)
- Radiações ionizantes e não ionizantes
- Vibrações (corpo inteiro ou mãos/braços)
- Pressões anormais (hipobáricas e hiperbáricas)
- Frio

AGENTES QUÍMICOS
- Avaliação quantitativa por coleta de ar (inalação) ou via dérmica
- Limites de tolerância: NR-15 Anexo 11 (concentrações máximas permissíveis no ar dos locais de trabalho)

AGENTES BIOLÓGICOS
- Microrganismos, parasitas, vetores
- Avaliação qualitativa (risco de exposição)
- Medidas: vacinação, EPC, treinamento

HIERARQUIA DAS MEDIDAS DE CONTROLE (NR-1)
1. Eliminação do risco
2. Substituição (agente/processo/material)
3. Controles de engenharia (enclosure, ventilação local exaustora)
4. Controles administrativos (rodízio, procedimentos seguros)
5. EPI (último recurso)

FONTES: NR-1 (Portaria MTE 6.730/2020); NR-9 (vigente para referências); NR-15 Anexos`,
  },
  {
    title: "NR-10 — Segurança em Instalações e Serviços em Eletricidade",
    category: "norma",
    source: "NR-10 — Portaria MTE 598/2004 e atualizações",
    version: "2025",
    tags: "nr10,eletricidade,instalacoes,eletricas,prontuario,habilitado,qualificado,capacitado,carga,risco,trabalho,energia",
    content: `NR-10 — SEGURANÇA EM INSTALAÇÕES ELÉTRICAS

BASE LEGAL: NR-10 (Portaria MTE 598/2004)

OBJETIVO
Garantir a segurança e saúde dos trabalhadores que interagem com instalações elétricas e serviços com eletricidade, bem como proteção de terceiros.

CLASSIFICAÇÃO DOS TRABALHADORES (Item 10.8 NR-10)
- Trabalhador HABILITADO: treinamento NR-10 Básico (40h) + NR-10 SEP (quando aplicável)
- Trabalhador QUALIFICADO: curso técnico em eletrotécnica
- Trabalhador CAPACITADO: orientado por profissional habilitado/qualificado para tarefas específicas

TREINAMENTO NR-10
- Básico: mínimo 40 horas — para todos que trabalham em instalações elétricas
- SEP (Sistema Elétrico de Potência): mínimo 40 horas adicionais — para trabalho em alta tensão
- Periodicidade de reciclagem: 2 anos

MEDIDAS DE CONTROLE (Item 10.2 NR-10)
1. Desenergização: desligar, isolar, bloquear, sinalizar, verificar ausência de tensão, aterrar
2. Distâncias de segurança (zona controlada e zona livre)
3. EPC: isoladores, ferramentas isoladas, barreiras
4. EPI: luvas isolantes, capacete com jugular, óculos, calçado de segurança dielétrico, protetor facial

PRONTUÁRIO DAS INSTALAÇÕES ELÉTRICAS (Item 3.7 NR-10)
O empregador deve manter prontuário com: projetos elétricos atualizados, diagramas unifilares, especificações de equipamentos, histórico de manutenção.

TRABALHO EM TENSÃO (AT e BT)
- Baixa tensão (BT): até 1.000 V
- Alta tensão (AT): acima de 1.000 V
- Trabalho em tensão: exige habilitação específica + procedimento escrito + supervisor

INSPEÇÕES PERIÓDICAS
Manutenção preventiva e preditiva com registro documentado (laudo de termografia, teste de isolação, etc.).

FONTES: NR-10 (Portaria MTE 598/2004 e atualizações); ABNT NBR 5.410; ABNT NBR 14.039`,
  },
  {
    title: "NR-12 — Segurança no Trabalho em Máquinas e Equipamentos",
    category: "norma",
    source: "NR-12 — Portaria MTE 197/2010 e atualizações; ABNT NBR ISO 12.100",
    version: "2025",
    tags: "nr12,maquinas,equipamentos,zona,perigo,protecao,fixa,movel,intertravamento,parada,emergencia,inventario",
    content: `NR-12 — SEGURANÇA EM MÁQUINAS E EQUIPAMENTOS

BASE LEGAL: NR-12 (Portaria MTE 197/2010; atualizada por portarias subsequentes)

OBJETIVO
Definir referências técnicas, princípios fundamentais e medidas de proteção para garantir saúde e integridade física dos trabalhadores que trabalham no ciclo de vida de máquinas e equipamentos.

INVENTÁRIO DE MÁQUINAS
Toda empresa deve manter inventário atualizado de todas as máquinas e equipamentos, contendo: identificação, localização, estado de conservação, data de instalação.

APRECIAÇÃO DE RISCO (Item 12.6 NR-12)
Obrigatória: avaliação de risco de cada máquina conforme ABNT NBR ISO 12.100 ou metodologia equivalente.

PROTEÇÕES DAS ZONAS DE PERIGO
Tipos de proteção (Item 12.38 NR-12):
a) Proteção FIXA: remove somente com ferramentas — sem intertravamento necessário
b) Proteção MÓVEL com intertravamento: impede o acionamento da máquina com proteção aberta
c) Proteção MÓVEL com intertravamento e bloqueio: paralisa o movimento antes da abertura

DISPOSITIVOS DE PARADA DE EMERGÊNCIA
- Botão de emergência (tipo cogumelo): cor vermelha com fundo amarelo
- Acessível pelo operador sem risco
- Após acionamento: máquina fica em estado seguro até intervenção manual deliberada

DISTÂNCIAS DE SEGURANÇA (Item 12.38 NR-12)
Calculadas conforme velocidade de aproximação e tempo de parada da máquina (ISO 13.857).

ESPAÇOS EM TORNO DAS MÁQUINAS (Item 12.12 NR-12)
- 0,60m de espaço frontal para operação
- 1,20m para manutenção

TREINAMENTO (Item 12.115 NR-12)
Operadores devem receber treinamento específico antes de operar a máquina. Registro documentado.

MANUTENÇÃO
- Realizada com máquina desligada, travada e sinalizada (LOTO — Lock Out Tag Out)
- Registro de manutenção preventiva e corretiva

FONTES: NR-12 (Portaria MTE 197/2010); ABNT NBR ISO 12.100; ABNT NBR 14.153; ABNT NBR ISO 13.849`,
  },
  {
    title: "NR-16 — Atividades e Operações Perigosas — Adicional de Periculosidade",
    category: "norma",
    source: "NR-16 — Portaria MTE 3.214/1978; CLT Art. 193; Lei 12.740/2012",
    version: "2025",
    tags: "nr16,periculosidade,adicional,30,por,cento,explosivos,inflamaveis,eletricidade,seguranca,pessoal,laudo,tecnico",
    content: `NR-16 — ATIVIDADES E OPERAÇÕES PERIGOSAS

BASE LEGAL: CLT Art. 193; NR-16 (Portaria MTE 3.214/1978); Lei 12.740/2012

ADICIONAL DE PERICULOSIDADE (Art. 193 CLT)
Percentual: 30% sobre o SALÁRIO SEM ACRÉSCIMOS (salário-base, sem DSR, sem adicionais, sem horas extras)
Trabalhador recebe APENAS UM adicional (insalubridade OU periculosidade — art. 193 §2º CLT).

ATIVIDADES PERIGOSAS (NR-16)
1. Explosivos: armazenamento, manuseio, transporte
2. Inflamáveis: trabalho em postos de combustíveis, refinarias, oleodutos, depósitos com volumes superiores ao limite do Quadro 2 do Anexo 2 NR-16
3. Energia elétrica: trabalhadores em sistema elétrico de potência (SEP) ou sistema de baixa tensão com risco de choque
4. Radiações ionizantes ou substâncias radioativas
5. SEGURANÇA PESSOAL (Lei 12.740/2012): vigilantes e seguranças
6. Motociclistas: motofrete, motoboi, mensageiro em motocicleta (Decreto 8.726/2016)

LAUDO DE PERICULOSIDADE
Elaborado por Engenheiro de Segurança do Trabalho ou Médico do Trabalho para atestar se as condições geram periculosidade.
- O laudo técnico fundamenta o pagamento ou não do adicional
- Deve descrever as condições, os equipamentos, processos e os EPIs utilizados

ELIMINAÇÃO DO ADICIONAL
Se as condições perigosas forem eliminadas (EPC, engenharia de controle), o adicional pode ser extinto — com negociação ou laudo contrário.

CUMULAÇÃO COM INSALUBRIDADE
O empregado NÃO pode receber ambos simultaneamente — deve optar pelo mais favorável (art. 193 §2º CLT; Súmula 364 TST).

REFLEXOS
O adicional de periculosidade integra o salário para férias, 13º, aviso prévio, FGTS, contribuições previdenciárias.

FONTES: CLT Art. 193; NR-16; Lei 12.740/2012; Decreto 8.726/2016; Súmula 364 TST`,
  },
  {
    title: "NR-17 — Ergonomia — Avaliação e Adaptação das Condições de Trabalho",
    category: "norma",
    source: "NR-17 — Portaria MTE 3.214/1978; Portaria MTE 1.293/2023 (nova NR-17)",
    version: "2025",
    tags: "nr17,ergonomia,mobiliario,equipamentos,ambiente,organização,trabalho,levantamento,cargas,informacao,apreciacao",
    content: `NR-17 — ERGONOMIA

BASE LEGAL: NR-17 (Portaria MTE 3.214/1978; totalmente revisada pela Portaria MTE 1.293/2023)

OBJETIVO
Estabelecer parâmetros que permitam a adaptação das condições de trabalho às características psicofisiológicas dos trabalhadores, de modo a proporcionar máximo conforto, segurança e desempenho eficiente.

APRECIAÇÃO ERGONÔMICA DO RISCO (AER)
Obrigatória desde 2023 (nova NR-17): empresas devem realizar AER para identificar situações de risco ergonômico e implementar medidas de controle.

LEVANTAMENTO, TRANSPORTE E DESCARGA DE CARGAS (Item 17.3 NR-17)
- Peso máximo sem estudo ergonômico: recomendação de até 25 kg (homens) — mas a nova NR-17 exige avaliação individualizada
- NIOSH (equação de levantamento): ferramenta para calcular peso limite recomendado
- Cargas acima do limite: devem ser realizadas por 2 ou mais pessoas ou com equipamento

MOBILIÁRIO DOS POSTOS DE TRABALHO (Item 17.5 NR-17)
- Altura regulável para mesa de trabalho
- Espaço adequado para pernas e pés
- Cadeira com ajuste de altura, apoio lombar, braços reguláveis (trabalho sedentário)

EQUIPAMENTOS DE TRABALHO (Item 17.6 NR-17)
- Monitores de computador: posicionamento na altura dos olhos
- Teclado com apoio de pulso quando necessário
- Iluminação adequada (níveis conforme ABNT NBR 5413)

CONDIÇÕES AMBIENTAIS (Item 17.7 NR-17)
- Temperatura: 20°C a 23°C (trabalho sedentário em ambientes fechados)
- Umidade relativa: entre 40% e 80%
- Iluminação: nível de iluminância conforme tarefa
- Ruído: conforme NR-15 (máx. 85 dB(A) por 8h)

ORGANIZAÇÃO DO TRABALHO (Item 17.9 NR-17)
- Ritmo imposto ao trabalhador não deve submeter à situação de sobrecarga
- Trabalho em teleatendimento/callcenter: norma específica (Anexo II NR-17)

FONTES: NR-17 (Portaria MTE 1.293/2023); NR-15; ABNT NBR 9.241; NIOSH Lifting Equation`,
  },
  {
    title: "NR-33 — Segurança e Saúde nos Trabalhos em Espaços Confinados",
    category: "norma",
    source: "NR-33 — Portaria MTE 202/2006 e atualizações",
    version: "2025",
    tags: "nr33,espaco,confinado,permissao,trabalho,pet,atmosfera,deficiente,oxigenio,vigilante,entrada,pulmao",
    content: `NR-33 — TRABALHO EM ESPAÇOS CONFINADOS

BASE LEGAL: NR-33 (Portaria MTE 202/2006)

DEFINIÇÃO DE ESPAÇO CONFINADO
Local não projetado para ocupação humana contínua, que possui meios limitados de entrada e saída, e que pode conter ou desenvolver atmosfera perigosa.
Exemplos: caixas d'água, tanques, cisternas, silos, dutos, galerias, poços, câmaras frigoríficas.

CLASSIFICAÇÃO
- Espaço confinado PERMITIDO: pode ser trabalhado com medidas de controle (PET)
- Espaço confinado PROIBIDO: não pode ser acessado até que riscos sejam eliminados

PERMISSÃO DE ENTRADA E TRABALHO (PET)
Documento emitido antes de cada entrada em espaço confinado. Contém:
- Data, hora e local
- Autorização do responsável
- Avaliação atmosférica (% O₂, gases tóxicos, explosivos)
- EPI/EPC a ser utilizado
- Procedimento de emergência e resgate
- Assinatura dos trabalhadores envolvidos

PAPÉIS E RESPONSABILIDADES
- VIGIA: monitora externamente o espaço confinado e os trabalhadores. Não pode entrar. Comunica emergências e aciona resgate.
- SUPERVISOR DE ENTRADA: emite a PET, verifica medidas de controle
- TRABALHADOR AUTORIZADO: entra após treinamento e com PET válida

ATMOSFERAS PERIGOSAS
- Deficiente em oxigênio: < 19,5% de O₂
- Enriquecida em oxigênio: > 23,5% de O₂
- Inflamável: > 10% do LEL (Limite Inferior de Explosividade)
- Tóxica: concentração acima dos limites de tolerância da NR-15

MONITORAMENTO ATMOSFÉRICO
Realizado antes da entrada e continuamente durante o trabalho com detector multigas portátil (O₂, LEL, CO, H₂S no mínimo).

RESGATE E EMERGÊNCIA
Equipe de resgate e EPC de resgate (terno de resgate, tripé, lifeline) devem estar prontos antes da entrada do trabalhador.

FONTES: NR-33 (Portaria MTE 202/2006); OSHA 29 CFR 1910.146 (referência internacional)`,
  },
  {
    title: "NR-35 — Trabalho em Altura — Procedimentos e Autorização",
    category: "norma",
    source: "NR-35 — Portaria MTE 313/2012 e atualizações",
    version: "2025",
    tags: "nr35,altura,acima,1,80m,apf,analise,permissao,cinto,absorvedor,ancoragem,treinamento,queda,sistema",
    content: `NR-35 — TRABALHO EM ALTURA

BASE LEGAL: NR-35 (Portaria MTE 313/2012)

DEFINIÇÃO
Considera-se trabalho em altura toda atividade executada acima de 1,80 m do nível inferior, onde haja risco de queda.

ANÁLISE DE RISCO (AR) e PERMISSÃO DE TRABALHO (PT)
- AR: obrigatória para toda atividade em altura — identifica riscos e define controles
- PT: obrigatória em trabalhos de não-rotina, de maior risco ou conforme critério definido pelo empregador

TREINAMENTO OBRIGATÓRIO (Item 35.3 NR-35)
- Carga horária mínima: 8 horas teóricas + 8 horas práticas (total 16h)
- Periodicidade de reciclagem: a cada 2 anos ou quando houver mudança de condições
- Conteúdo: riscos de queda, EPI, ancoragem, procedimentos de emergência e resgate

SISTEMAS DE PROTEÇÃO CONTRA QUEDAS
1. Proteção COLETIVA (prioritária): guarda-corpo, redes, andaimes
2. Proteção INDIVIDUAL: cinto de segurança tipo paraquedista + absorvedor de energia + trava-quedas + linha de vida

EPI OBRIGATÓRIO (Item 35.5 NR-35)
- Cinto tipo paraquedista (CA aprovado pelo MTE)
- Talabarte de posicionamento ou absorvedor de impacto
- Capacete com jugular
- Calçado de segurança

ANCORAGEM (Item 35.6 NR-35)
- Ponto de ancoragem com resistência mínima de 15 kN ou com fator de segurança adequado
- Nunca abaixo do nível dos quadris (queda livre máxima)

EQUIPE DE RESGATE
Sempre disponível antes do início do trabalho em altura. Pode ser interno ou contratado.

TRABALHO EM ALTURA EM TELHADOS
Exige análise de resistência da cobertura e proteção contra quedas pelo bordo e abertura.

FONTES: NR-35 (Portaria MTE 313/2012 e atualizações); NR-6; ABNT NBR 15.475`,
  },
  {
    title: "PGR — Programa de Gerenciamento de Riscos Ocupacionais (NR-1)",
    category: "norma",
    source: "NR-1 — Portaria MTE 6.730/2020; Portaria MTE 1.419/2024",
    version: "2025",
    tags: "pgr,gro,gerenciamento,riscos,ocupacionais,nr1,inventario,plano,acao,perigos,2024,2025,obrigatorio",
    content: `PGR — PROGRAMA DE GERENCIAMENTO DE RISCOS OCUPACIONAIS

BASE LEGAL: NR-1 — Portaria MTE 6.730/2020 (com modificações pela Portaria MTE 1.419/2024)

O QUE É
O PGR é o documento que reúne os conjuntos de ações que a empresa toma para gerenciar os riscos ocupacionais dos trabalhadores. Substitui o PPRA (NR-9) na função de programa obrigatório de SST.

OBRIGATORIEDADE
Todas as empresas com empregados CLT. MEIs sem empregados estão dispensados. Microempresas e EPPs: simplificação permitida.

GRO — GERENCIAMENTO DE RISCOS OCUPACIONAIS (NR-1 Item 1.5)
Conjunto de ações para identificar, avaliar, controlar e monitorar os riscos ocupacionais.

ESTRUTURA DO PGR
1. INVENTÁRIO DE RISCOS
Identificação e avaliação de todos os riscos:
- Físicos (ruído, calor, frio, radiações, vibrações)
- Químicos (agentes químicos, gases, poeiras)
- Biológicos (vírus, bactérias, parasitas)
- Ergonômicos (esforço repetitivo, postura, ritmo excessivo)
- Mecânicos e acidentais (máquinas, quedas, eletricidade)
- Psicossociais (violência, assédio, trabalho em turnos)

2. PLANO DE AÇÃO
Para cada risco identificado acima do nível de ação:
- Medidas de prevenção (hierarquia: eliminação → substituição → engenharia → administrativo → EPI)
- Responsável pela implementação
- Prazo
- Indicador de monitoramento

REVISÃO DO PGR
- Mínimo a cada 2 anos
- Sempre que houver mudança nas condições de trabalho, processos, materiais
- Após acidentes ou doenças ocupacionais

PRAZOS DE IMPLEMENTAÇÃO (Portaria MTE 1.419/2024)
Microempresas e EPPs: prazos diferenciados
Empresas com grau de risco 1 e 2: simplificação

INTEGRAÇÃO COM PCMSO, LTCAT E PPP
O PGR alimenta diretamente o PCMSO (médico do trabalho), o LTCAT (aposentadoria especial) e o PPP (histórico do trabalhador).

FONTES: NR-1 (Portaria MTE 6.730/2020); Portaria MTE 1.419/2024; NR-15; NR-17`,
  },
  {
    title: "PPP — Perfil Profissiográfico Previdenciário — Dados e Emissão",
    category: "norma",
    source: "Lei 8.213/1991 Art. 58; Instrução Normativa INSS/PRES 77/2015",
    version: "2025",
    tags: "ppp,perfil,profissiografico,previdenciario,aposentadoria,especial,dados,emissao,responsavel,tecnico",
    content: `PPP — PERFIL PROFISSIOGRÁFICO PREVIDENCIÁRIO

BASE LEGAL: Lei 8.213/1991 Art. 58; Decreto 3.048/1999; IN INSS/PRES 77/2015

O QUE É
Documento histórico-laboral que registra as condições ambientais de trabalho a que o trabalhador foi exposto ao longo do contrato. Vincula o empregado à possibilidade de aposentadoria especial e outros benefícios.

QUEM DEVE EMITIR
Todo empregador que tenha trabalhadores expostos a agentes nocivos (físicos, químicos, biológicos) previstos no Anexo IV do Decreto 3.048/1999.

QUANDO EMITIR
- Na rescisão do contrato de trabalho (todo trabalhador exposto)
- Quando solicitado pelo trabalhador para requerimento de aposentadoria especial

INFORMAÇÕES OBRIGATÓRIAS DO PPP (Formulário INSS)
1. Dados do empregador (CNPJ, razão social, CNAE)
2. Dados do trabalhador (CPF, NIT/PIS, nome, cargo, função, CBO)
3. Histórico de exposição por período:
   - Agente nocivo (código e descrição)
   - Intensidade ou concentração
   - Técnica de avaliação
   - Resultado (EPC e EPI utilizados)
4. Resultado das avaliações ambientais (data, método, valor, limite de tolerância)
5. Responsável pelas informações de SST (nome, assinatura, número do registro profissional)

AGENTES NOCIVOS MAIS COMUNS
- Ruído: avaliado em dB(A) — limite para aposentadoria especial: 85 dB(A) para 25 anos
- Calor (IBUTG): conforme atividade e limites do Decreto 3.048/99 Anexo IV
- Agentes químicos: conforme LT publicados pelo MTE

EPC E EPI NO PPP
A utilização efetiva de EPC e EPI adequados PODE neutralizar os efeitos dos agentes e excluir o direito à aposentadoria especial (exceção: ruído — jurisprudência sedimentou que EPI não neutraliza ruído para fins de AP especial).

RESPONSÁVEL TÉCNICO
Médico do Trabalho ou Engenheiro de Segurança, com registro profissional. Assina o PPP e responsabiliza-se pela veracidade.

FONTES: Lei 8.213/1991; Decreto 3.048/1999; IN INSS/PRES 77/2015; IN INSS 128/2022`,
  },
  {
    title: "LTCAT — Laudo Técnico de Condições Ambientais do Trabalho",
    category: "norma",
    source: "Lei 8.213/1991 Art. 58 §1º; Decreto 3.048/1999; IN INSS/PRES 77/2015",
    version: "2025",
    tags: "ltcat,laudo,tecnico,condicoes,ambientais,trabalho,aposentadoria,especial,agentes,nocivos,vigência,atualização",
    content: `LTCAT — LAUDO TÉCNICO DE CONDIÇÕES AMBIENTAIS DO TRABALHO

BASE LEGAL: Lei 8.213/1991 Art. 58 §1º; Decreto 3.048/1999; IN INSS/PRES 77/2015

DEFINIÇÃO
O LTCAT é o laudo técnico elaborado por Médico do Trabalho ou Engenheiro de Segurança do Trabalho que documenta as condições ambientais do trabalho e comprova a exposição dos trabalhadores a agentes nocivos.

DIFERENÇA LTCAT × PPP
- LTCAT: documento da EMPRESA — descreve as condições do ambiente
- PPP: documento do TRABALHADOR — registra a exposição individual do empregado ao longo do tempo

QUEM ELABORA
- Engenheiro de Segurança do Trabalho (habilitado conforme resolução federal)
- Médico do Trabalho
Ambos com registro nos respectivos conselhos profissionais.

CONTEÚDO OBRIGATÓRIO DO LTCAT
1. Identificação da empresa e do estabelecimento
2. Descrição das atividades, setores e cargos avaliados
3. Identificação dos agentes nocivos presentes
4. Resultados quantitativos das avaliações ambientais (quando aplicável)
5. Técnica e metodologia utilizadas
6. Período de vigência do laudo
7. Assinatura do responsável técnico

PERIODICIDADE DE ATUALIZAÇÃO
O LTCAT deve ser atualizado sempre que ocorrer:
- Modificação nos processos produtivos
- Modificação na organização do trabalho
- Mudança nos agentes utilizados ou nas concentrações
- Substituição de máquinas ou equipamentos

VINCULAÇÃO COM O PPP
O LTCAT é a base técnica que o responsável usa para preencher o PPP. Ambos devem ser coerentes.

GUARDA DO LTCAT
Prazo mínimo de 20 anos após a rescisão do contrato do trabalhador exposto (ou pelo prazo prescricional das ações previdenciárias).

FONTES: Lei 8.213/1991 Art. 58; Decreto 3.048/1999 Anexo IV; IN INSS/PRES 77/2015`,
  },
  {
    title: "Acidente de Trabalho — Investigação, CAT e Estatísticas",
    category: "procedimentos",
    source: "Lei 8.213/1991; NR-1 (GRO); OIT — Metodologia ICAM",
    version: "2025",
    tags: "investigacao,acidente,trabalho,cat,causas,arvore,falhas,icam,bowtie,5porques,prevencao,recorrencia",
    content: `INVESTIGAÇÃO DE ACIDENTES DE TRABALHO

BASE LEGAL: NR-1 (GRO — NR-1 item 1.5.5); Lei 8.213/1991

OBRIGATORIEDADE DE INVESTIGAÇÃO
A NR-1 (PGR/GRO) exige que todo acidente de trabalho — inclusive os sem afastamento — seja investigado para identificar causas e implementar ações preventivas.

ETAPAS DA INVESTIGAÇÃO

1. PRESERVAÇÃO DA CENA
Fotografar, coletar evidências físicas, entrevistar testemunhas enquanto a memória é recente. Não alterar o local até documentar.

2. COLETA DE DADOS
- Depoimento do acidentado (quando possível)
- Depoimento de testemunhas (separadamente)
- Documentação técnica (procedimentos, certificados de treinamento, laudos, manutenção)

3. ANÁLISE DE CAUSAS — METODOLOGIAS
a) 5 PORQUÊS (5 Whys): questionar repetidamente "por quê" até chegar à causa raiz
b) ÁRVORE DE CAUSAS: diagrama lógico de causas e condições antecedentes
c) ICAM (Incident Cause Analysis Method): modelo da Shell — causas imediatas, contribuintes, deficiências do sistema
d) BOW-TIE: análise de risco — barreiras antes e após o evento

4. RELATÓRIO DE INVESTIGAÇÃO
- Descrição do acidente
- Causas imediatas, contribuintes e raízes
- Ações corretivas e preventivas (o quê, quem, quando)
- Plano de acompanhamento

COMUNICAÇÃO DO ACIDENTE (CAT)
Obrigatória até o 1º dia útil após o acidente. Emitida pelo empregador. Cópia para: empregado, INSS, sindicato.

INDICADORES DE ACIDENTE (ABNT NBR 14.280)
- Taxa de Frequência (TF): (Nº acidentes × 1.000.000) ÷ Horas exposição risco
- Taxa de Gravidade (TG): (Nº dias perdidos + Nº dias debitados) × 1.000.000 ÷ HER

FONTES: NR-1; Lei 8.213/1991; ABNT NBR 14.280; OIT — Diretrizes de investigação`,
  },
  {
    title: "EPI — Equipamento de Proteção Individual — NR-6 e Certificado de Aprovação",
    category: "norma",
    source: "NR-6 — Portaria MTE 3.214/1978; Portaria MTE 452/2014",
    version: "2025",
    tags: "epi,nr6,ca,certificado,aprovacao,fornecimento,treinamento,higienizacao,recusa,penalidade,tipos",
    content: `EPI — EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL — NR-6

BASE LEGAL: CLT Art. 166-167; NR-6 (Portaria MTE 3.214/1978)

OBRIGAÇÕES DO EMPREGADOR (Art. 166 CLT + NR-6)
- Fornecer EPI adequado ao risco e em perfeito estado de conservação e funcionamento
- Fornecer GRATUITAMENTE
- Garantir que o EPI tenha CA (Certificado de Aprovação) válido
- Treinar o trabalhador sobre uso correto e limitações do EPI
- Registrar entrega do EPI (ficha de controle assinada)
- Exigir o uso do EPI

OBRIGAÇÕES DO TRABALHADOR (NR-6 item 6.7)
- Usar o EPI fornecido
- Guardar e conservar adequadamente
- Comunicar ao empregador qualquer alteração que impossibilite o uso
- Respeitar determinações do empregador quanto ao uso

CERTIFICADO DE APROVAÇÃO (CA)
O CA é obrigatório para todo EPI comercializado no Brasil. Emitido pelo MTE após ensaios de conformidade. O empregador deve verificar a validade e adequação do CA ao risco específico.
→ CA vencido ou inválido: EPI não está aprovado; sua exigência não isenta o empregador de responsabilidade.

PRINCIPAIS EPIs E NORMAS ABNT
- Capacete: ABNT NBR 8.221 — proteção da cabeça
- Luvas: ABNT NBR (conforme material) — proteção das mãos
- Calçado de segurança: ABNT NBR 20.282 — proteção dos pés
- Protetor auricular: ABNT NBR 10.005/10.006 — atenuação de ruído
- Respirador: ABNT NBR — filtros conforme agente
- Cinto de segurança: ABNT NBR 15.475 — trabalho em altura

RECUSA DO EMPREGADO EM USAR EPI
- Advertência → suspensão → justa causa (art. 482 h CLT — ato de indisciplina)
- O empregador deve registrar as tentativas de conscientização

EPC SOBRE EPI (Hierarquia NR-1)
O EPC (proteção coletiva — enclausuramento, ventilação, barreiras) tem prioridade sobre o EPI. O EPI é complementar ou último recurso.

FONTES: CLT Arts. 166-167; NR-6; Portaria MTE 452/2014; NR-1 (hierarquia de controles)`,
  },
  {
    title: "SST no eSocial — Eventos S-2210, S-2220 e S-2240",
    category: "procedimentos",
    source: "Manual de Orientação do eSocial (MOS) — versão 3.1; NR-1",
    version: "2025",
    tags: "esocial,sst,s2210,s2220,s2240,acidente,monitoramento,exposicao,cat,condicoes,obrigatorio,2023",
    content: `SST NO ESOCIAL — EVENTOS DE SAÚDE E SEGURANÇA DO TRABALHO

BASE LEGAL: MOS eSocial; RN CGESIS; Portaria MTE (cronograma)

EVENTOS SST NO ESOCIAL
Com a implantação do eSocial para SST (iniciada em 2023 para empresas dos grupos 1 e 2, 2024 para demais), as informações de SST são transmitidas eletronicamente:

S-2210 — COMUNICAÇÃO DE ACIDENTE DE TRABALHO (CAT)
Substitui o formulário físico da CAT para fins de comunicação ao INSS.
- Prazo: até o 1º dia útil após o acidente (imediato em caso de óbito)
- Informações: dados do acidentado, data/hora/local do acidente, agente causador, CID, tipo de CAT (inicial, reabertura, comunicação de óbito)
- A CAT via eSocial tem validade legal plena

S-2220 — MONITORAMENTO DA SAÚDE DO TRABALHADOR
Registra os exames médicos ocupacionais (ASO):
- Tipo de exame: admissional, periódico, retorno ao trabalho, mudança de risco, demissional
- Data do exame, médico responsável, resultado (apto/apto com restrições/inapto)
- Prazo: até o dia 15 do mês subsequente ao exame
- Histórico dos ASOs de cada empregado fica disponível no portal

S-2240 — CONDIÇÕES AMBIENTAIS DO TRABALHO — FATORES DE RISCO
Registra os riscos ambientais a que cada trabalhador está exposto:
- Por vínculo empregatício e por lotação/cargo
- Agente nocivo (tabela 24 do eSocial), intensidade, EPC utilizado, EPI utilizado
- Data de início e fim da exposição
- Vinculado ao PGR e ao PCMSO
- Substituirá parcialmente o LTCAT no registro individual

CRONOGRAMA (verificar MOS e portarias vigentes para 2025-2026)
- Grupos 1 e 2: desde 2023
- Grupos 3 e 4: 2024-2025

FONTES: MOS eSocial v3.1; Portaria MTE (cronograma SST eSocial); RN CGESIS n. 16/2021`,
  },
  {
    title: "Mapa de Riscos — Elaboração e Atualização",
    category: "procedimentos",
    source: "NR-5 (Portaria MTE); Portaria MTE 25/1994",
    version: "2025",
    tags: "mapa,riscos,elaboracao,cipa,setores,agentes,fisicos,quimicos,biologicos,ergonomicos,mecanicos,cores",
    content: `MAPA DE RISCOS — ELABORAÇÃO E ATUALIZAÇÃO

BASE LEGAL: Portaria MTE 25/1994; NR-5

DEFINIÇÃO
Representação gráfica dos riscos existentes no ambiente de trabalho, elaborada a partir do levantamento dos riscos em cada setor/posto de trabalho.

RESPONSABILIDADE DE ELABORAÇÃO
A CIPA é responsável pela elaboração do Mapa de Riscos, com apoio dos trabalhadores dos setores, do SESMT e dos técnicos de segurança.

CORES DOS RISCOS (Portaria MTE 25/1994)
- VERDE: riscos físicos (ruído, calor, frio, vibração, pressão, radiação)
- VERMELHO: riscos químicos (poeiras, fumos, gases, vapores, névoas, neblinas)
- MARROM: riscos biológicos (vírus, bactérias, fungos, parasitas)
- AMARELO: riscos ergonômicos (esforço físico, postura inadequada, monotonia, estresse)
- AZUL: riscos mecânicos/acidentais (máquinas desprotegidas, arranjo físico, iluminação, eletricidade)

TAMANHO DOS CÍRCULOS
- Círculo PEQUENO: risco de pequena magnitude
- Círculo MÉDIO: risco de média magnitude
- Círculo GRANDE: risco de grande magnitude

ETAPAS DE ELABORAÇÃO
1. Levantamento preliminar (CIPA + trabalhadores)
2. Identificação dos riscos por setor e posto de trabalho
3. Classificação do risco (tipo e magnitude)
4. Plotagem no plano da empresa (ou setor)
5. Discussão e validação com os trabalhadores
6. Fixação em local visível de cada setor

ATUALIZAÇÃO
- A cada eleição da CIPA (anualmente)
- Quando houver mudanças significativas nos processos ou ambientes

PUBLICAÇÃO
O Mapa de Riscos deve ser afixado em local de fácil acesso e visualização pelos trabalhadores.

FONTES: Portaria MTE 25/1994; NR-5; NR-1 (PGR — integração)`,
  },
  {
    title: "DDS — Diálogo Diário de Segurança — Metodologia e Temas",
    category: "procedimentos",
    source: "NR-1 (boas práticas); Manuais SESMT",
    version: "2025",
    tags: "dds,dialogo,diario,segurança,reuniao,curta,temas,abordagem,registro,frequencia,trabalhadores,prevenção",
    content: `DDS — DIÁLOGO DIÁRIO DE SEGURANÇA

BASE LEGAL: NR-1 (treinamentos periódicos em SST); NR-5 (CIPA); NR-7 (PCMSO)

O QUE É
O DDS é uma ferramenta de comunicação em segurança do trabalho — uma reunião breve (5 a 15 minutos) realizada no início do turno de trabalho para conscientizar os trabalhadores sobre riscos, comportamentos seguros e procedimentos.

OBJETIVO
- Reforçar comportamentos seguros
- Alertar sobre riscos específicos do dia
- Divulgar ocorrências de segurança (acidentes, quase-acidentes)
- Criar cultura de prevenção

CARACTERÍSTICAS DO DDS
- Duração: 5 a 15 minutos
- Periodicidade: diária (ou conforme programa da empresa)
- Local: próximo ao posto de trabalho ou em sala de reunião
- Participantes: todos os trabalhadores do turno ou setor
- Responsável: técnico de segurança, encarregado ou líder treinado

ESTRUTURA DO DDS
1. Tema do dia (escolhido com antecedência — ligado ao risco real do setor)
2. Apresentação breve (oral, visual — cartaz, vídeo, ilustração)
3. Discussão aberta com os trabalhadores (perguntas e respostas)
4. Assinatura da lista de presença

TEMAS FREQUENTES
- Uso correto de EPI
- Prevenção de quedas
- Segurança no trânsito e em trajeto
- Eletricidade e choque elétrico
- Ergonomia e postura
- Trabalho em altura
- Materiais inflamáveis
- Primeiros socorros
- Análise de acidentes ocorridos

REGISTRO DO DDS
Manter arquivo com: data, tema, lista de presença assinada. Evidência para auditorias de SST.

FONTES: NR-1; Manual do SESMT; OHSAS 18.001 / ISO 45.001 (boas práticas de comunicação SST)`,
  },
  {
    title: "Aposentadoria Especial — Critérios, Agentes e Período de Carência",
    category: "legislacao",
    source: "Lei 8.213/1991 Arts. 57-58; Decreto 3.048/1999; EC 103/2019 (parcial)",
    version: "2025",
    tags: "aposentadoria,especial,25,20,15,anos,agente,nocivo,carencia,ppp,ltcat,inss,beneficio,B46",
    content: `APOSENTADORIA ESPECIAL — REGIME JURÍDICO

BASE LEGAL: Lei 8.213/1991 Arts. 57-58; Decreto 3.048/1999; EC 103/2019

CONCEITO
Benefício previdenciário (código B-46 no INSS) concedido ao segurado que tenha trabalhado durante determinado número de anos sujeito a agentes nocivos prejudiciais à saúde ou à integridade física.

PRAZOS DE CARÊNCIA (Art. 57 Lei 8.213/91)
| Tempo de exposição ao agente nocivo | Benefício         |
|--------------------------------------|-------------------|
| 15 anos                              | Aposentadoria especial |
| 20 anos                              | Aposentadoria especial |
| 25 anos                              | Aposentadoria especial |

O prazo varia conforme o agente:
- 15 anos: agentes mais nocivos (ASBESTOS — amianto, radiação ionizante > limite)
- 20 anos: agentes como silício livre
- 25 anos: ruído > 85 dB(A), calor, agentes químicos (lista Anexo IV Decreto 3.048)

EC 103/2019 — REFORMA PREVIDENCIÁRIA
A EC 103/2019 não eliminou a aposentadoria especial, mas aumentou a carência mínima para 180 contribuições mensais e adicionou requisito de PONTOS (para casos de transição). Verificar regulamentação específica.

DOCUMENTAÇÃO EXIGIDA PELO INSS
- PPP (Perfil Profissiográfico Previdenciário) emitido pelo empregador
- LTCAT atualizado (ou integração via eSocial S-2240)
- Laudos de exposição históricos quando necessário
- CTPS ou documentos de vínculo

AGENTES MAIS COMUNS PARA CADA PRAZO
25 anos: ruído (85+ dB), calor (IBUTG acima do limite), poeira de sílica < limite de 15 anos, mangânio, chumbo, mercúrio
20 anos: silício livre em determinadas concentrações
15 anos: asbesto (amianto), radiações ionizantes

EPI E APOSENTADORIA ESPECIAL
Ruído: o STJ (REsp 1.306.113) e o TST entenderam que mesmo com uso de protetor auricular, o ruído conta para fins de aposentadoria especial. Para outros agentes, o EPC eficaz pode neutralizar o agente.

FONTES: Lei 8.213/1991; Decreto 3.048/1999; EC 103/2019; STJ REsp 1.306.113`,
  },
  {
    title: "Nexo Causal em SST — NTEP e Responsabilidade Previdenciária",
    category: "legislacao",
    source: "Decreto 6.042/2007; IN INSS/PRES 77/2015; Lei 8.213/1991",
    version: "2025",
    tags: "nexo,causal,ntep,epidemiologico,cnae,cid,doença,profissional,fat,inss,responsabilidade,empresa",
    content: `NEXO CAUSAL EM SST — NTEP (NEXO TÉCNICO EPIDEMIOLÓGICO)

BASE LEGAL: Decreto 6.042/2007; Lei 8.213/1991 Arts. 19-23; IN INSS/PRES 77/2015

NEXO CAUSAL CLÁSSICO (Art. 21-A Lei 8.213/91)
O nexo causal entre doença e trabalho era demonstrado caso a caso por perícia médica do INSS. Dependia de comprovação individual.

NTEP — NEXO TÉCNICO EPIDEMIOLÓGICO (Decreto 6.042/2007)
Presunção legal de nexo causal com base em dados estatísticos. Quando o CID da doença do empregado corresponde estatisticamente ao CNAE da empresa (conforme tabela do INSS), o INSS presume que a doença tem nexo com o trabalho.

EFEITOS DO NTEP
- A doença é classificada automaticamente como B-91 (acidentária) em vez de B-31 (comum)
- O empregador pode CONTESTAR o NTEP por meio de Comunicado de Decisão de NTEP (Formulário próprio no INSS)
- Prazo para contestação: 15 dias após a ciência

IMPACTO NO FAP E RAT
- Benefícios acidentários (B-91) aumentam o FAP (Fator Acidentário de Prevenção) da empresa
- O FAP multiplica o RAT (1%, 2% ou 3% conforme GR do CNAE) podendo chegar a 2× o RAT
- FAP alto aumenta o custo previdenciário da empresa

FAP — FATOR ACIDENTÁRIO DE PREVENÇÃO (Decreto 6.042/2007)
- Calculado pelo INSS com base nos 2 anos anteriores (acidentes, doenças, afastamentos)
- Empresa com bom histórico de SST: FAP < 1 (reduz o RAT)
- Empresa com alto índice de acidentes: FAP > 1 (aumenta o RAT)
- Publicado anualmente (novembro) no site do MTE

CONTESTAÇÃO DO FAP
A empresa pode contestar o FAP até o prazo publicado (geralmente 30 dias após publicação) no sítio da Previdência Social.

FONTES: Decreto 6.042/2007; Decreto 3.048/1999; Lei 8.213/1991; Resolução CNPS 1.316/2010`,
  },
]
