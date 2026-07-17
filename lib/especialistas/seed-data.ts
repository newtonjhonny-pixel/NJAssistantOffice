// Conteúdo legislativo real para seed inicial da Base de Conhecimento
import { DP_EXTRA_DOCS } from "./seed-dp-extra"
import { JURIDICO_EXTRA_DOCS } from "./seed-juridico-extra"
import { SEGURANCA_EXTRA_DOCS } from "./seed-seguranca-extra"
import { MEDICINA_EXTRA_DOCS } from "./seed-medicina-extra"
import { RECRUTAMENTO_EXTRA_DOCS } from "./seed-recrutamento-extra"
import { PROCESSOS_EXTRA_DOCS } from "./seed-processos-extra"
import { QUALIDADE_EXTRA_DOCS } from "./seed-qualidade-extra"
import { COMPORTAMENTO_EXTRA_DOCS } from "./seed-comportamento-extra"

export interface SeedDoc {
  title: string
  category: string
  source: string
  version: string
  tags: string
  content: string
}

export const SEED_DOCUMENTS: Record<string, SeedDoc[]> = {

  // ──────────────────────────────────────────────────────────────────────────
  departamento_pessoal: [
    {
      title: "Férias — Cálculo, Direitos e Prazo de Concessão (CLT Arts. 129–145)",
      category: "legislacao",
      source: "CLT — Decreto-Lei 5.452/1943",
      version: "2024",
      tags: "ferias,calculo,direito,concessao,abono,pecuniario,terceiro,aquisitivo,art130,art131,art134,art142,art143",
      content: `FÉRIAS — REGIME JURÍDICO E CÁLCULO

DIREITO AO GOZO (Art. 129 e 130 CLT)
Todo empregado adquire o direito a férias de 30 dias corridos após completar 12 meses de vigência do contrato (período aquisitivo).

PROPORCIONALIDADE POR FALTAS INJUSTIFICADAS (Art. 130 CLT):
- Até 5 faltas: 30 dias
- 6 a 14 faltas: 24 dias
- 15 a 23 faltas: 18 dias
- 24 a 32 faltas: 12 dias
- Acima de 32 faltas: perde o direito

PERÍODO CONCESSIVO (Art. 134 CLT)
As férias devem ser concedidas nos 12 meses seguintes ao fim do período aquisitivo. O empregador define o período, mas deve comunicar o empregado com antecedência mínima de 30 dias.

FRACIONAMENTO (Art. 134 §1º CLT — Reforma 13.467/2017)
Podem ser divididas em até 3 períodos, desde que um deles não seja inferior a 14 dias corridos e os demais não inferiores a 5 dias corridos cada.

REMUNERAÇÃO DAS FÉRIAS (Art. 142 CLT)
= Salário mensal + 1/3 constitucional (Art. 7º, XVII, CF/88)

Cálculo para salário fixo mensal:
1. Salário mensal ÷ 30 × dias de férias = valor base
2. Valor base × 1/3 = terço constitucional
3. Total = valor base + terço constitucional

Cálculo para horistas:
Média das horas trabalhadas nos últimos 12 meses × valor hora × dias de férias / 8

ABONO PECUNIÁRIO (Art. 143 CLT)
O empregado pode converter 1/3 das férias em abono (vender até 10 dias de 30 dias).
- Deve ser requerido no prazo de 15 dias antes do término do período aquisitivo
- Não é obrigação do empregador conceder — é faculdade do empregado

PAGAMENTO (Art. 145 CLT)
O pagamento deve ocorrer até 2 dias antes do início das férias.
Inclui: remuneração + 1/3 constitucional + eventual abono pecuniário.

FÉRIAS COLETIVAS (Arts. 139–141 CLT)
Podem abranger toda a empresa ou setores. Exigem:
- Comunicação ao Ministério do Trabalho (via eSocial S-1280)
- Comunicação ao sindicato
- Afixação em local visível
- Mínimo 30 dias de antecedência

PRESCRIÇÃO
O prazo de prescrição das férias não gozadas é de 5 anos (Súmula 308 TST).
Férias prescritas: trabalhou-se dois anos sem usufruir das férias — as mais antigas prescrevem.

FONTES: CLT Arts. 129-145; Art. 7º, XVII da CF/88; Súmula 7 TST; Súmula 308 TST; OJ 386 SDI-1 TST`,
    },
    {
      title: "FGTS — Fundo de Garantia por Tempo de Serviço — Regras e Recolhimento",
      category: "legislacao",
      source: "Lei 8.036/1990; Decreto 99.684/1990",
      version: "2024",
      tags: "fgts,recolhimento,aliquota,oito,por,cento,deposito,multa,rescisao,saque,grrf",
      content: `FGTS — FUNDO DE GARANTIA POR TEMPO DE SERVIÇO

BASE LEGAL: Lei 8.036/1990 e Decreto 99.684/1990

ALÍQUOTA E BASE DE CÁLCULO (Art. 15 Lei 8.036/90)
- Alíquota padrão: 8% da remuneração mensal bruta
- Aprendizes: 2% da remuneração
- Base de cálculo: salário + horas extras + adicionais (noturno, insalubridade, periculosidade) + comissões + gorjetas + 13º proporcional + férias + 1/3 + aviso prévio indenizado

PRAZO DE RECOLHIMENTO
- Até o dia 20 do mês seguinte ao da competência
- Pelo FGTS Digital (a partir de 01/03/2023 para empresas com mais de 50 empregados)

FGTS DIGITAL (Portaria MTP 671/2021)
- Substituiu o SEFIP/GRF e o GFIP
- Geração automática de guias pelo sistema gov.br/fgtsdigital
- Competências a partir de 01/2023
- O recolhimento é por vínculo empregatício

MULTA RESCISÓRIA (Art. 18 Lei 8.036/90)
- Dispensa sem justa causa: 40% sobre o saldo do FGTS
- Culpa recíproca ou força maior: 20%
- Pedido de demissão: não há multa

GRRF — GUIA DE RECOLHIMENTO RESCISÓRIO DO FGTS
- Emitida pelo FGTS Digital para rescisões
- Inclui: saldo das competências em atraso + multa rescisória

HIPÓTESES DE SAQUE (Art. 20 Lei 8.036/90)
- Dispensa sem justa causa
- Término de contrato por prazo determinado
- Aposentadoria
- Falecimento do trabalhador
- Doença grave (neoplasia maligna, HIV, cardiopatia grave — IN SIT 15/2010)
- Habilitação da casa própria (primeiro imóvel)
- Desemprego por 3 anos ou mais (saque por inatividade)
- Conta inativa há mais de 3 anos (Lei 13.446/2017)

CONTA VINCULADA
Uma conta FGTS por vínculo. O trabalhador pode ter múltiplas contas simultâneas (um por empregador).

FONTES: Lei 8.036/1990; Decreto 99.684/1990; Portaria MTP 671/2021; FGTS Digital — Documentação Oficial`,
    },
    {
      title: "INSS — Tabela de Contribuição 2024 e Regras de Retenção",
      category: "legislacao",
      source: "IN RFB 2.142/2023; Portaria MPS 1.202/2022",
      version: "2024",
      tags: "inss,tabela,aliquota,contribuicao,2024,progressiva,retencao,empregado,empregador",
      content: `INSS — PREVIDÊNCIA SOCIAL — TABELA 2024

BASE LEGAL: Art. 28 Lei 8.212/91; Portaria MPS (vigente)

TABELA PROGRESSIVA DO EMPREGADO (2024)
Vigente a partir de 01/01/2024 (alíquotas progressivas desde Jan/2020):

| Faixa de salário            | Alíquota |
|-----------------------------|----------|
| Até R$ 1.412,00             | 7,5%     |
| R$ 1.412,01 a R$ 2.666,68  | 9%       |
| R$ 2.666,69 a R$ 4.000,03  | 12%      |
| R$ 4.000,04 a R$ 7.786,02  | 14%      |

Acima do teto (R$ 7.786,02): teto máximo de contribuição.
O desconto é progressivo (como o IR) — cada faixa incide apenas sobre a parcela nela contida.

CÁLCULO DO DESCONTO (MÉTODO PROGRESSIVO)
Salário R$ 5.000,00:
- 7,5% sobre R$ 1.412,00 = R$ 105,90
- 9% sobre R$ 1.254,68 = R$ 112,92
- 12% sobre R$ 1.333,35 = R$ 160,00
- 14% sobre R$ 999,97 = R$ 140,00
Total: R$ 518,82

CONTRIBUIÇÃO DO EMPREGADOR (CPRB / RAT)
- CPP (Cota Patronal Previdenciária): 20% sobre a folha
- RAT (Risco Ambiental do Trabalho): 1%, 2% ou 3% conforme CNAE
- FAP (Fator Acidentário de Prevenção): multiplica o RAT (0,5 a 2,0)
- Contribuições a terceiros: 5,8% (SESI/SENAI + SEBRAE + INCRA + FNDE)

GPS — GUIA DA PREVIDÊNCIA SOCIAL
- Código de pagamento conforme tipo de empresa e regime tributário
- Prazo: até dia 20 do mês seguinte (ou dia 15 para Simples Nacional)

FONTES: Lei 8.212/1991; Art. 20 e 22; IN RFB 2.142/2023; Portaria MPS (vigente 2024)`,
    },
    {
      title: "IRRF — Tabela Progressiva 2024 e Cálculo na Folha",
      category: "legislacao",
      source: "IN RFB 2.142/2023; Lei 9.250/1995",
      version: "2024",
      tags: "irrf,tabela,ir,imposto,renda,2024,retencao,deducao,dependente,base,calculo,folha",
      content: `IRRF — IMPOSTO DE RENDA RETIDO NA FONTE — FOLHA DE PAGAMENTO 2024

BASE LEGAL: Lei 7.713/1988; Lei 9.250/1995; IN RFB 2.142/2023

TABELA PROGRESSIVA MENSAL 2024 (vigente desde Maio/2023 — MP 1.206/2024)

| Base de cálculo             | Alíquota | Parcela a deduzir |
|-----------------------------|----------|-------------------|
| Até R$ 2.824,00             | Isento   | —                 |
| R$ 2.824,01 a R$ 3.751,05  | 7,5%     | R$ 211,80         |
| R$ 3.751,06 a R$ 4.664,68  | 15%      | R$ 492,89         |
| R$ 4.664,69 a R$ 6.200,00  | 22,5%    | R$ 842,40         |
| Acima de R$ 6.200,00        | 27,5%    | R$ 1.152,40       |

DEDUÇÕES PERMITIDAS NA FONTE
- Dependentes: R$ 226,01/dependente/mês
- INSS retido do empregado (desconto integral)
- Contribuição a previdência privada (limite 12% da renda bruta — PGBL)
- Pensão alimentícia judicial (valor integral)

CÁLCULO IRRF NA FOLHA
1. Salário bruto
2. (-) INSS empregado
3. (-) Dependentes (× R$ 226,01)
4. (-) Pensão alimentícia
5. = Base de cálculo IR
6. × alíquota da tabela
7. (-) Parcela a deduzir
8. = IRRF do mês

DEDUÇÕES DE SAÚDE (Declaração Anual)
Médicos, dentistas, plano de saúde — sem limite na declaração anual, mas não deduz na fonte.

EMPREGADOS ISENTOS NA FONTE
- Aposentados e pensionistas com mais de 65 anos: isenção até R$ 2.824,00 + parcela isenta de R$ 2.824,00 (total R$ 5.648,00)

INFORME DE RENDIMENTOS (DIRF)
- Empregador deve emitir anualmente (prazo: último dia útil de fevereiro)
- Contém: rendimentos tributáveis, deduções, IR retido

FONTES: Lei 7.713/1988; Lei 9.250/1995; IN RFB 2.142/2023; MP 1.206/2024`,
    },
    {
      title: "Rescisão Contratual — Tipos, Verbas e Procedimentos",
      category: "legislacao",
      source: "CLT Arts. 477–508; Lei 13.467/2017",
      version: "2024",
      tags: "rescisao,dispensa,demissao,justa,causa,aviso,previo,verbas,trct,homologacao,multa,fgts",
      content: `RESCISÃO CONTRATUAL — MODALIDADES E VERBAS DEVIDAS

MODALIDADES DE RESCISÃO (CLT e Lei 13.467/2017)

1. DISPENSA SEM JUSTA CAUSA (Arts. 477, 478 CLT)
Verbas devidas:
- Saldo de salário
- Férias vencidas + 1/3
- Férias proporcionais + 1/3
- 13º proporcional
- Aviso prévio (trabalhado ou indenizado)
- Multa FGTS: 40% sobre o saldo
- Liberação do FGTS (GRRF)
- Seguro-desemprego (se tiver direito)

2. PEDIDO DE DEMISSÃO (Art. 477 CLT)
- Saldo de salário
- Férias vencidas + 1/3
- Férias proporcionais + 1/3
- 13º proporcional
- Não tem direito: aviso prévio indenizado (paga ao empregador se não cumprir), multa FGTS, seguro-desemprego

3. RESCISÃO POR JUSTA CAUSA DO EMPREGADO (Art. 482 CLT)
Motivos: improbidade, incontinência, abandono de emprego (30+ dias), ato lesivo, desídia, embriaguez, etc.
Verbas:
- Saldo de salário
- Férias vencidas + 1/3
- Sem: aviso prévio, férias proporcionais, 13º proporcional, multa FGTS, GRRF

4. RESCISÃO INDIRETA (Art. 483 CLT)
Quando o empregador descumpre obrigações contratuais. Gera os mesmos direitos da dispensa sem justa causa.

5. DISTRATO (Art. 484-A CLT — Reforma Trabalhista)
Acordo entre as partes:
- 50% do aviso prévio
- 80% da multa do FGTS (20% sobre saldo)
- Demais verbas em valor integral
- Não tem direito ao seguro-desemprego

AVISO PRÉVIO PROPORCIONAL (Lei 12.506/2011)
- Até 1 ano: 30 dias
- A cada ano adicional: +3 dias
- Máximo: 90 dias

HOMOLOGAÇÃO (Art. 477 §1º CLT)
Com a Reforma Trabalhista, a homologação no sindicato ou MTE não é mais obrigatória. O TRCT (Termo de Rescisão) deve ser assinado em 2 vias.

PRAZO DE PAGAMENTO (Art. 477 §6º CLT)
- Aviso prévio trabalhado: 1 dia após o término
- Aviso prévio indenizado ou dispensa imediata: 10 dias após a notificação

FONTES: CLT Arts. 477-508; Lei 13.467/2017 (Reforma Trabalhista); Lei 12.506/2011 (Aviso Prévio Proporcional)`,
    },
    {
      title: "13º Salário — Cálculo, Prazos e Regras (Lei 4.090/1962)",
      category: "legislacao",
      source: "Lei 4.090/1962; Decreto 57.155/1965",
      version: "2024",
      tags: "decimo,terceiro,13,salario,gratificacao,natal,prazo,calculo,primeira,parcela,segunda,proporcional",
      content: `13º SALÁRIO (GRATIFICAÇÃO NATALINA) — LEI 4.090/1962

QUEM TEM DIREITO
Todo empregado celetista, inclusive domésticos, mensalistas, horistas, comissionistas, rurais e trabalhadores temporários.

CÁLCULO
13º = Salário de dezembro ÷ 12 × meses trabalhados no ano

Meses trabalhados: conta-se como mês completo quando o empregado trabalhou 15 dias ou mais naquele mês.

PRIMEIRA PARCELA (Antecipação)
- Entre 1º de fevereiro e 30 de novembro
- Valor: 50% do salário do mês anterior (bruto, sem descontos)
- Empregado pode solicitar por ocasião das férias

SEGUNDA PARCELA
- Até 20 de dezembro
- Valor: total do 13º menos a primeira parcela
- Incide INSS e IRRF (cálculo separado da folha mensal)
- Não incide FGTS na segunda parcela (Súmula 787 TST — o FGTS incide sobre ambas as parcelas)

NOTA: O FGTS incide sobre as duas parcelas do 13º (Lei 8.036/90, Art. 15).

RESCISÃO — 13º PROPORCIONAL
- Dispensa sem justa causa: 13º proporcional pelos meses trabalhados no ano
- Pedido de demissão: 13º proporcional
- Rescisão por justa causa: não tem direito ao 13º proporcional

IRRF SOBRE O 13º (Art. 16 Lei 9.250/95)
Calculado separadamente da folha mensal. A alíquota incide sobre o valor bruto do 13º menos INSS do 13º, usando a tabela progressiva no mês de dezembro. Não se somam ao salário mensal para fins de tributação.

FONTES: Lei 4.090/1962; Decreto 57.155/1965; Súmula 787 TST; Art. 15 Lei 8.036/90`,
    },
    {
      title: "Jornada de Trabalho — Limites, Horas Extras e Banco de Horas",
      category: "legislacao",
      source: "CLT Arts. 58–75; Lei 13.467/2017",
      version: "2024",
      tags: "jornada,horas,extras,adicional,banco,horas,compensacao,limite,diario,semanal,turno,escala",
      content: `JORNADA DE TRABALHO — LIMITES LEGAIS E HORAS EXTRAS

JORNADA NORMAL (Art. 58 CLT)
- Máximo: 8 horas diárias e 44 horas semanais
- Empregados com CCT podem ter jornada 12×36 (legalizada pela Reforma)

HORAS EXTRAS (Art. 59 CLT)
- Máximo de 2 horas extras por dia
- Exige acordo escrito individual, coletivo ou CCT
- Adicional mínimo: 50% sobre a hora normal (Art. 7º, XVI CF/88)
- Em jornada 12×36 o adicional pode ser negociado em CCT

ADICIONAL NOTURNO (Art. 73 CLT)
- Horário noturno: 22h às 5h (urbano); 21h às 5h (rural pecuária); 20h às 4h (rural agricultura)
- Adicional: mínimo 20% sobre a hora diurna
- Hora noturna reduzida: 52min30seg vale como 1 hora

BANCO DE HORAS (Art. 59 §2º CLT)
Modalidade A — Acordo coletivo ou CCT:
- Compensação pode ser feita em até 1 ano
- Excedente pago com adicional de 50%

Modalidade B — Acordo individual escrito (Reforma Trabalhista):
- Compensação em até 6 meses
- Somente horas extras comuns (não urgência)

INTERVALO INTRAJORNADA (Art. 71 CLT)
- Jornada acima de 6h: mínimo 1h, máximo 2h de almoço
- Jornada de 4h a 6h: 15 minutos
- Jornada inferior a 4h: sem intervalo obrigatório
- Não concessão: pagar período integral + 50% (hora extra)
- Pode ser reduzido até 30 minutos por CCT

INTERVALO INTERJORNADA (Art. 66 CLT)
- Mínimo de 11 horas consecutivas entre dois turnos
- Não respeitado: pagamento como hora extra

ESCALA 12×36 (Art. 59-A CLT)
- 12 horas de trabalho seguidas de 36 de descanso
- Legalizada pela Reforma para qualquer atividade
- Pode ser ajustada individualmente por acordo escrito
- Já inclui DSR (descanso semanal remunerado)

FONTES: CLT Arts. 58-75; Art. 7º XVI CF/88; Lei 13.467/2017; Súmula 110, 437 TST`,
    },
    {
      title: "Admissão — Documentos Obrigatórios e Procedimentos",
      category: "procedimentos",
      source: "CLT Arts. 29, 41; Portaria MTE 41/2007",
      version: "2024",
      tags: "admissao,documentos,ctps,ficha,registro,esocial,s2200,integracao,exame,admissional",
      content: `ADMISSÃO DE EMPREGADOS — DOCUMENTOS E PROCEDIMENTOS

DOCUMENTOS EXIGIDOS DO CANDIDATO
- Carteira de Trabalho e Previdência Social (CTPS) — física ou digital
- CPF
- RG (documento de identidade com foto)
- Comprovante de residência atualizado
- PIS/PASEP (número de inscrição)
- Título de eleitor (obrigatório para maior de 18 anos)
- Certificado de reservista (homens maiores de 18 anos)
- Certidão de nascimento ou casamento
- CPF de dependentes (para IR e benefícios)
- Foto 3×4
- Dados bancários para pagamento
- CTPS: o empregador deve registrar em até 5 dias úteis após a admissão (Art. 29 CLT)

EXAME MÉDICO ADMISSIONAL (NR-7 / PCMSO)
- Obrigatório antes de iniciar as atividades
- Emissão do ASO (Atestado de Saúde Ocupacional)
- ASO deve conter: nome do empregado, cargo, riscos, exames realizados, conclusão (apto/inapto)

FICHA DE REGISTRO DE EMPREGADOS (Art. 41 CLT)
- Obrigatória: nome, filiação, data nascimento, CPF, CTPS, cargo, salário, jornada, data admissão
- Pode ser eletrônica (Portaria MTE 41/2007)

ESOCIAL — EVENTO S-2200 (Admissão)
- Transmitir ANTES do início das atividades ou no dia da admissão
- Informações: dados pessoais, vínculo, cargo, salário, jornada, categoria
- Categoria mais comum: código 101 (Empregado geral)

COMUNICAÇÃO AO CAGED
- Com o eSocial, o CAGED é gerado automaticamente via evento S-2200
- Prazo: até o dia 7 do mês seguinte

CONTRATO DE TRABALHO
- Pode ser por prazo indeterminado ou determinado (Art. 443 CLT)
- Contrato por prazo determinado: máximo 2 anos, prorrogável uma vez
- Cláusula de experiência: máximo 90 dias (Art. 445 CLT)

FONTES: CLT Arts. 29, 41, 443-445; NR-7; Portaria MTE 41/2007; Manual eSocial`,
    },
    ...DP_EXTRA_DOCS,
  ],

  // ──────────────────────────────────────────────────────────────────────────
  juridico_trabalhista: [
    {
      title: "Reforma Trabalhista — Lei 13.467/2017 — Principais Mudanças",
      category: "legislacao",
      source: "Lei 13.467/2017 — Reforma Trabalhista",
      version: "2017",
      tags: "reforma,trabalhista,13467,2017,negociado,legislado,terceirizacao,teletrabalho,jornada,ferias",
      content: `REFORMA TRABALHISTA — LEI 13.467/2017 — PRINCIPAIS ALTERAÇÕES

VIGÊNCIA: 11 de novembro de 2017

PRINCÍPIO DO NEGOCIADO SOBRE O LEGISLADO (Art. 611-A CLT)
Convenções e acordos coletivos podem prevalecer sobre a lei em temas como:
- Jornada de trabalho (desde que respeite o máximo constitucional de 44h semanais)
- Banco de horas
- Intervalo intrajornada (redução até 30min)
- Plano de cargos e salários
- Representante dos trabalhadores
- Teletrabalho
- Participação nos lucros
- Seguro-desemprego em caso de paralisação

LIMITES DO NEGOCIADO (Art. 611-B CLT)
Não podem ser negociados para menor:
- Salário mínimo
- Adicional noturno (mínimo 20%)
- Proteção à maternidade
- Segurança e saúde do trabalhador (NRs)
- FGTS
- 13º salário

TERCEIRIZAÇÃO (Lei 13.429/2017 e 13.467/2017)
- Permitida para qualquer atividade, inclusive atividade-fim
- Empresa tomadora responde subsidiariamente

TELETRABALHO (Arts. 75-A a 75-E CLT)
- Prestação fora das dependências do empregador usando TICs
- Exige contrato escrito
- Empregador fornece equipamentos ou paga pelo uso do particular
- Controle de jornada não obrigatório (se acordo)

CONTRATO INTERMITENTE (Arts. 443, 452-A CLT)
- Trabalho alternado com períodos de inatividade
- Convocação com 3 dias de antecedência
- Pagamento imediato de férias+1/3, 13º proporcional, INSS, FGTS

FRACIONAMENTO DE FÉRIAS (Art. 134 §1º CLT)
Até 3 períodos (antes só 2), com mínimo de 14 dias para o maior período.

DISTRATO (Art. 484-A CLT)
Acordo mútuo de rescisão: 50% aviso prévio + 20% multa FGTS + outras verbas proporcionais.

FONTES: Lei 13.467/2017; CLT Arts. 611-A, 611-B, 75-A, 443, 452-A, 484-A`,
    },
    {
      title: "Súmulas TST — Principais Enunciados de Direito do Trabalho",
      category: "jurisprudencia",
      source: "TST — Súmulas e OJs (compilação 2024)",
      version: "2024",
      tags: "sumula,tst,jurisprudencia,tribunal,superior,trabalho,enunciado,orientacao",
      content: `SÚMULAS DO TST — PRINCIPAIS ENUNCIADOS

SÚMULA 51 — NORMA MAIS BENÉFICA
As cláusulas regulamentares vigoram enquanto o contrato perdurar, sendo que qualquer alteração posterior ao contrato somente aplica-se quando mais favorável ao empregado.

SÚMULA 85 — COMPENSAÇÃO DE JORNADA
Inválido o acordo de compensação de jornada em atividade insalubre sem licença prévia do MTE. Banco de horas inválido sem CCT ou acordo coletivo (exceto modalidade individual da Lei 13.467).

SÚMULA 200 — AVISO PRÉVIO
A contagem do prazo do aviso prévio começa no primeiro dia útil após sua comunicação, excluído o dia da notificação.

SÚMULA 212 — ÔNUS DA PROVA DA DISPENSA
O ônus de provar o término do contrato de trabalho, quando negados a prestação de serviço e o despedimento, é do empregador, pois o princípio da continuidade da relação de emprego constitui presunção favorável ao empregado.

SÚMULA 277 — ULTRATIVIDADE DAS NORMAS COLETIVAS
As cláusulas normativas dos acordos coletivos ou convenções coletivas integram os contratos individuais de trabalho e somente poderão ser modificadas ou suprimidas mediante negociação coletiva de trabalho.

SÚMULA 291 — HORAS EXTRAS — HABITUALIDADE
A supressão, pelo empregador, do serviço suplementar prestado com habitualidade durante pelo menos 1 (um) ano, assegura ao empregado o direito à indenização correspondente ao valor de 1 (um) mês das horas suprimidas para cada ano ou fração igual ou superior a seis meses de prestação de serviço acima da jornada normal.

SÚMULA 308 — PRESCRIÇÃO BIENAL — FÉRIAS
A prescrição das férias não gozadas inicia-se 2 (dois) anos após o término do período aquisitivo.

SÚMULA 331 — TERCEIRIZAÇÃO
A contratação de trabalhadores por empresa interposta é ilegal, formando-se o vínculo diretamente com o tomador, exceto no caso de trabalho temporário, vigilância, conservação e limpeza, serviços especializados. A tomadora responde subsidiariamente.

SÚMULA 369 — DIRIGENTE SINDICAL — ESTABILIDADE
O empregado de categoria diferenciada eleito dirigente sindical só goza de estabilidade se exercer na empresa atividade pertinente à categoria profissional do sindicato para o qual foi eleito dirigente.

SÚMULA 437 — INTERVALO INTRAJORNADA
É inválida cláusula de CCT/ACT que suprima ou reduza o intervalo intrajornada porque este constitui medida de higiene, saúde e segurança do trabalho.

OJ 394 SDI-1 — CONTRIBUIÇÃO SINDICAL
Após a Reforma Trabalhista (Lei 13.467/2017), o recolhimento da contribuição sindical passou a ser facultativo, exigindo autorização prévia e expressa do trabalhador.

FONTES: TST — Súmulas e OJs atualizadas; Resolução TST 209/2016`,
    },
    {
      title: "CLT — Artigos Fundamentais — Contrato de Trabalho e Princípios",
      category: "legislacao",
      source: "CLT — Decreto-Lei 5.452/1943 (atualizado até 2024)",
      version: "2024",
      tags: "clt,artigo,contrato,trabalho,principio,empregado,empregador,subordinacao,alteracao",
      content: `CLT — ARTIGOS FUNDAMENTAIS DO CONTRATO DE TRABALHO

DEFINIÇÃO DE EMPREGADO (Art. 3º CLT)
"Considera-se empregado toda pessoa física que prestar serviços de natureza não eventual a empregador, sob a dependência deste e mediante salário."
Requisitos: pessoalidade, não eventualidade, onerosidade, subordinação jurídica.

DEFINIÇÃO DE EMPREGADOR (Art. 2º CLT)
"Considera-se empregador a empresa, individual ou coletiva, que, assumindo os riscos da atividade econômica, admite, assalaria e dirige a prestação pessoal de serviços."

CONTRATO DE TRABALHO (Arts. 442-445 CLT)
- Pode ser verbal ou escrito, por prazo determinado ou indeterminado
- Prazo determinado: máximo 2 anos + 1 prorrogação
- Contrato de experiência: máximo 90 dias, prorrogável uma vez

ALTERAÇÃO DO CONTRATO (Art. 468 CLT)
"Nos contratos individuais de trabalho só é lícita a alteração das respectivas condições por mútuo consentimento, e ainda assim desde que não resultem, direta ou indiretamente, prejuízos ao empregado."
Princípio da inalterabilidade lesiva.

SALÁRIO MÍNIMO (Art. 7º IV CF/88)
Fixado nacionalmente. Em 2024: R$ 1.412,00 (Portaria MTE 3.784/2024).
Pisos estaduais podem ser maiores que o nacional.

EQUIPARAÇÃO SALARIAL (Art. 461 CLT)
Empregados que exercem as mesmas funções, com mesma produtividade, mesma perfeição técnica, no mesmo estabelecimento, sem diferença de tempo no cargo superior a 4 anos, e mesma pessoa como paradigma.

ESTABILIDADE DA GESTANTE (Art. 10 II "b" ADCT)
A empregada grávida tem estabilidade provisória desde a confirmação da gravidez até 5 meses após o parto, mesmo sem comunicar o empregador.

LICENÇA-MATERNIDADE (Art. 392 CLT)
- 120 dias de afastamento pago pelo INSS (reembolsado pelo empregador)
- Empresas cidadãs (Programa Empresa Cidadã): 180 dias

FONTES: CLT Decreto-Lei 5.452/1943; CF/88 Art. 7º e ADCT; Portaria MTE 2024`,
    },
    ...JURIDICO_EXTRA_DOCS,
  ],

  // ──────────────────────────────────────────────────────────────────────────
  esocial: [
    {
      title: "eSocial — Tabela de Eventos e Leiautes (versão S-1.3)",
      category: "norma_tecnica",
      source: "MOS — Manual de Orientação do eSocial v1.3; Portal gov.br/esocial",
      version: "S-1.3",
      tags: "esocial,eventos,leiautes,s2200,s2299,s1200,s1300,s2210,s1000,tabela,mos,versao,s13",
      content: `ESOCIAL — TABELA COMPLETA DE EVENTOS (versão S-1.3)

EVENTOS DE TABELA (enviados pelo empregador)
S-1000 — Informações do Empregador/Contribuinte/Órgão Público
S-1005 — Tabela de Estabelecimentos e Obras
S-1010 — Tabela de Rubricas
S-1020 — Tabela de Lotações Tributárias
S-1070 — Tabela de Processos Administrativos/Judiciais
S-1080 — Tabela de Operadores Portuários

EVENTOS NÃO PERIÓDICOS (Trabalhistas)
S-2190 — Registro Preliminar de Trabalhador
S-2200 — Cadastramento Inicial do Vínculo e Admissão/Ingresso de Trabalhador
S-2205 — Alteração de Dados Cadastrais do Trabalhador
S-2206 — Alteração de Contrato de Trabalho
S-2210 — Comunicação de Acidente de Trabalho (CAT)
S-2220 — Monitoramento da Saúde do Trabalhador
S-2221 — Exame Toxicológico do Motorista Profissional
S-2230 — Afastamento Temporário
S-2240 — Condições Ambientais do Trabalho — Agentes Nocivos
S-2245 — Treinamentos, Capacitações, Exercícios Simulados e Outras Anotações
S-2250 — Aviso Prévio
S-2298 — Reintegração/Outros Provimentos de Volta ao Trabalho
S-2299 — Desligamento
S-2300 — Trabalhador Sem Vínculo de Emprego/Estatutário — Início
S-2399 — Trabalhador Sem Vínculo de Emprego/Estatutário — Término
S-2400 — Cadastro de Beneficiário — Plano de Saúde Coletivo Empresarial
S-2405 — Abertura/Reabertura de Processo de Reabilitação Profissional
S-2500 — Processo Trabalhista
S-2501 — Informações de Processo Trabalhista

EVENTOS PERIÓDICOS
S-1200 — Remuneração de Trabalhador Vinculado ao Regime Geral de Prev. Social
S-1202 — Remuneração de Servidor Vinculado a Regime Próprio de Prev. Social
S-1207 — Benefícios Previdenciários e Assistenciais — INSS
S-1210 — Pagamentos de Rendimentos do Trabalho
S-1260 — Comercialização da Produção Rural
S-1270 — Contratação de Trabalhadores Avulsos Não Portuários
S-1280 — Informações Complementares aos Eventos Periódicos
S-1295 — Solicitação de Totalização para Pagamento em Atraso
S-1298 — Solicitação de Totalização para Pagamento em Contingência
S-1299 — Fechamento dos Eventos Periódicos
S-1300 — Contribuição Patronal Rural
S-2299 — Desligamento

EVENTOS DE TOTALIZADORES (gerados pelo sistema)
S-5001 — Informações das Contribuições Sociais por Trabalhador
S-5002 — Imposto de Renda Retido na Fonte por Trabalhador
S-5003 — Informações do FGTS por Trabalhador
S-5011 — Informações das Contribuições Sociais Consolidadas por Contribuinte
S-5012 — Informações do IRRF Consolidadas por Contribuinte
S-5013 — Informações do FGTS Consolidadas por Contribuinte

EVENTOS DE COMUNICAÇÃO
S-3000 — Exclusão de Eventos

FONTES: MOS eSocial v1.3; Portal gov.br/esocial; Nota Técnica 2024`,
    },
    {
      title: "eSocial S-2200 — Admissão: Campos, Regras e Prazos",
      category: "norma_tecnica",
      source: "MOS eSocial v1.3 — S-2200",
      version: "S-1.3",
      tags: "s2200,admissao,prazo,transmissao,campos,vínculo,categoria,empregado,esocial",
      content: `ESOCIAL S-2200 — ADMISSÃO DE TRABALHADOR

FINALIDADE: Registrar o início do vínculo empregatício no eSocial.

PRAZO DE TRANSMISSÃO
- Deve ser enviado antes do início das atividades do empregado
- Caso haja trabalho no dia da admissão: enviar até o final do expediente do empregador
- Não pode ser enviado retroativamente (salvo durante implantação)

CAMPOS OBRIGATÓRIOS
infoTrabalhador:
- cpfTrab: CPF do trabalhador
- nmTrab: nome completo
- sexo: masculino/feminino
- racaCor: autodeclaração
- estCiv: estado civil
- grauInstr: escolaridade
- dtNascto: data de nascimento

infoVinculo:
- tpRegPrev: tipo de regime (1-RGPS / 2-RPPS)
- tpRegJor: tipo de jornada (1-Submetido 44h/semana; 3-12x36; 4-Superior 44h; etc.)
- nrReib: número do RIB (conta bancária)
- dtAdm: data de admissão
- codCateg: código da categoria (101=Empregado geral; 103=Empregado doméstico; etc.)
- salFx: salário fixo com unidade (mensal, diário, horário)
- undSalFixo: 5=mensal; 6=diário; 7=horário
- dscSalVar: descrição do salário variável (se aplicável)

CATEGORIAS MAIS USADAS
101 — Empregado geral
102 — Empregado doméstico
103 — Trabalhador avulso portuário
104 — Trabalhador avulso não portuário
105 — Aprendiz
201 — Servidor público estatutário
202 — Servidor público contratado
714 — Trainee
721 — Médico residente

INFORMAÇÕES DA JORNADA (detJornada)
- Duração da jornada semanal
- Horas no sábado/domingo (se aplicável)
- Tipo de jornada (fixa/variável/livre)

VALIDAÇÕES COMUNS (VRPL)
- Data de admissão não pode ser futura (exceto próximo período)
- CPF deve ser válido e não estar no Cadastro de Óbitos
- O evento S-1005 deve ter o estabelecimento informado

FONTES: MOS eSocial v1.3 — Evento S-2200; Portaria MTP 671/2021`,
    },
    {
      title: "eSocial S-1200 — Remuneração: Estrutura e Rubricas",
      category: "norma_tecnica",
      source: "MOS eSocial v1.3 — S-1200",
      version: "S-1.3",
      tags: "s1200,remuneracao,rubrica,s1010,competencia,folha,pagamento,esocial",
      content: `ESOCIAL S-1200 — REMUNERAÇÃO DO TRABALHADOR

FINALIDADE: Informar a remuneração de trabalhadores vinculados ao RGPS (INSS).

PRAZO DE TRANSMISSÃO
- Até o dia 15 do mês seguinte ao da competência (para a maioria das empresas)
- Grupos 1 e 2: dia 15
- Grupo 3 e 4: verificar cronograma específico

ESTRUTURA DO EVENTO
Identificação: empId (competência), CPF do trabalhador
dmDev: demonstrativo de valores devidos
  - codRubr: código da rubrica (deve estar na tabela S-1010)
  - ideTabRubr: identificador da tabela de rubricas
  - qtdRubr: quantidade (horas, dias)
  - vrRubr: valor da rubrica
  - indApurIR: indicativo de apuração para IR

RUBRICAS MAIS USADAS
- Natureza 1000 a 1999: BASE (Salário, horas extras, adicionais)
- Natureza 9000 a 9999: Informativas
- Natureza 5000 a 5999: INSS (descontos)
- Natureza 4000 a 4999: IRRF (descontos)

TABELA S-1010 — RUBRICAS
Antes de usar uma rubrica no S-1200, ela deve estar cadastrada no evento S-1010.
Campos: codRubr, ideTabRubr, dscRubr (descrição), natRubr (natureza), tpRubr (provento/desconto/informativa).

FECHAMENTO — S-1299
Após transmitir todos os S-1200 da competência, é necessário enviar o S-1299 (Fechamento).
Sem o fechamento, a DCTFWeb não é gerada.

FGTS DIGITAL
Com o eSocial, o FGTS é recolhido via FGTS Digital com base nos dados do S-1200.
Guias são geradas automaticamente pelo sistema.

FONTES: MOS eSocial v1.3 — S-1200, S-1010, S-1299; Portal FGTS Digital`,
    },
    {
      title: "FGTS Digital — Guias, Prazos e Recolhimento",
      category: "norma_tecnica",
      source: "FGTS Digital — Documentação Oficial; Portaria MTP 671/2021",
      version: "2024",
      tags: "fgts,digital,guia,recolhimento,prazo,competencia,grrf,rescisao,vinculo",
      content: `FGTS DIGITAL — RECOLHIMENTO ELETRÔNICO

IMPLANTAÇÃO
- Obrigatório a partir de 01/03/2023 para grupos 1 e 2 do eSocial
- Substitui o SEFIP/GRF e o GFIP definitivamente

PRAZO DE RECOLHIMENTO
- Competência mensal: até o dia 20 do mês seguinte
- GRRF (rescisão): 10 dias após rescisão sem justa causa (Art. 477 CLT)

GERAÇÃO DAS GUIAS
1. O empregador transmite o S-1200 (remuneração) no eSocial
2. O FGTS Digital totaliza os valores por competência
3. O empregador acessa gov.br/fgtsdigital e gera a guia
4. Pagamento via Pix (chave do FGTS Digital) ou débito bancário

GRRF — GUIA DE RECOLHIMENTO RESCISÓRIO
Gerada automaticamente após envio do S-2299 (desligamento).
Contém: FGTS da competência + meses anteriores em aberto + multa rescisória.

RECOLHIMENTO POR VÍNCULO
Diferente do SEFIP (que era por competência global), o FGTS Digital gera guias individualizadas por trabalhador.

PARCELAMENTO
Em caso de dívida, o empregador pode solicitar parcelamento diretamente no portal FGTS Digital.

FONTES: Portaria MTP 671/2021; Instrução Normativa FGTS Digital; Portal gov.br/fgtsdigital`,
    },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  seguranca: [
    {
      title: "NR-1 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais (GRO/PGR)",
      category: "norma",
      source: "NR-1 — Portaria MTE 1.419/2024",
      version: "2024",
      tags: "nr1,disposicoes,gerais,gro,pgr,risco,ocupacional,gerenciamento,programa",
      content: `NR-1 — DISPOSIÇÕES GERAIS E GERENCIAMENTO DE RISCOS OCUPACIONAIS

VIGÊNCIA: NR-1 atualizada pela Portaria MTE 1.419/2024.

OBJETIVO
Estabelecer o campo de aplicação de todas as Normas Regulamentadoras, definindo os direitos e obrigações de empregadores e trabalhadores em SST, e instituindo o Gerenciamento de Riscos Ocupacionais (GRO).

OBRIGAÇÕES DO EMPREGADOR (Item 1.4)
- Cumprir as NRs
- Elaborar ordens de serviço
- Informar sobre riscos à saúde e segurança
- Adotar medidas de prevenção
- Manter as instalações em condições de uso seguro
- Investigar acidentes e doenças relacionadas ao trabalho

OBRIGAÇÕES DO TRABALHADOR (Item 1.5)
- Seguir as NRs e ordens de serviço
- Usar EPI adequadamente
- Comunicar riscos ao empregador
- Não eliminar ou danificar dispositivos de segurança

GRO — GERENCIAMENTO DE RISCOS OCUPACIONAIS (Item 1.5 NR-1)
Processo sistemático para identificação, avaliação e controle de riscos no ambiente de trabalho.
Etapas:
1. Identificação de perigos e aspectos ambientais
2. Avaliação dos riscos e exposições
3. Definição de medidas de prevenção e proteção
4. Implementação das medidas
5. Monitoramento e revisão

PGR — PROGRAMA DE GERENCIAMENTO DE RISCOS (Item 1.5.1 NR-1)
- Obrigatório para todos os empregadores que admitam trabalhadores como empregados
- Substitui o PPRA (NR-9 — programa encerrado em 03/01/2022)
- Deve ser elaborado por profissional legalmente habilitado (Eng. de Segurança, Técnico de Segurança)
- Documentos obrigatórios: Inventário de Riscos + Plano de Ação

INVENTÁRIO DE RISCOS
- Identifica todos os riscos: físicos, químicos, biológicos, ergonômicos, de acidentes
- Para cada risco: fonte, trajetória, probabilidade, severidade, nível de risco, medidas de controle

PLANO DE AÇÃO
- Descreve as medidas de prevenção a serem implementadas
- Contém responsável, prazo e recurso para cada ação

FONTES: NR-1 — Portaria MTE 1.419/2024; Portaria SEPRT 6.734/2020 (extinção PPRA)`,
    },
    {
      title: "NR-15 — Insalubridade — Caracterização, Graus e Adicional",
      category: "norma",
      source: "NR-15 — Portaria MTE 3.214/1978 (atualizada)",
      version: "2024",
      tags: "nr15,insalubridade,adicional,grau,maximo,medio,minimo,agente,quimico,fisico,biologico,laudo",
      content: `NR-15 — ATIVIDADES E OPERAÇÕES INSALUBRES

DEFINIÇÃO
São consideradas insalubres as atividades que, por sua natureza, condições ou métodos de trabalho, exponham os empregados a agentes nocivos à saúde, acima dos limites de tolerância fixados em razão da natureza e da intensidade do agente e do tempo de exposição aos seus efeitos.

GRAUS DE INSALUBRIDADE E ADICIONAIS
| Grau    | Adicional sobre salário mínimo |
|---------|---------------------------------|
| Máximo  | 40%                             |
| Médio   | 20%                             |
| Mínimo  | 10%                             |

BASE DE CÁLCULO
Art. 192 CLT: o adicional incide sobre o salário mínimo nacional, salvo CCT que estabeleça base diferente.
Súmula 17 TST: quando o salário for pago por peça ou tarefa, o adicional incide sobre o salário mínimo do mês, e não sobre o salário efetivo.

PRINCIPAIS ANEXOS DA NR-15
- Anexo 1: Limites de tolerância para ruído contínuo/intermitente
- Anexo 2: Limites para ruído de impacto
- Anexo 3: Calor (IBUTG)
- Anexo 4: Iluminação (revogado)
- Anexo 5: Radiações ionizantes
- Anexo 6: Trabalho sob condições hiperbáricas
- Anexo 7: Radiações não-ionizantes
- Anexo 8: Vibração
- Anexo 9: Frio
- Anexo 10: Umidade
- Anexo 11: Agentes químicos (limites de tolerância)
- Anexo 12: Poeira mineral
- Anexo 13: Agentes químicos (uso restrito)
- Anexo 13A: Benzeno
- Anexo 14: Agentes biológicos

ELIMINAÇÃO DO ADICIONAL (Art. 194 CLT)
O adicional é extinto quando eliminada a insalubridade por:
- Adoção de medidas de ordem geral (EPC)
- Fornecimento de EPI adequado

LTCAT — LAUDO TÉCNICO DAS CONDIÇÕES AMBIENTAIS DO TRABALHO
Elaborado por médico do trabalho ou engenheiro de segurança.
Necessário para PPP e aposentadoria especial do INSS.

FONTES: NR-15 — Portaria MTE 3.214/1978; CLT Arts. 189-197; Súmulas TST 17, 289, 448`,
    },
    {
      title: "NR-6 — EPI — Equipamento de Proteção Individual",
      category: "norma",
      source: "NR-6 — Portaria MTE 3.214/1978 (atualizada)",
      version: "2024",
      tags: "nr6,epi,equipamento,protecao,individual,ca,certificado,aprovacao,fornecimento,treinamento",
      content: `NR-6 — EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)

DEFINIÇÃO
Dispositivo ou produto, de uso individual, destinado à proteção de riscos suscetíveis de ameaçar a segurança e a saúde do trabalhador.

OBRIGAÇÕES DO EMPREGADOR (Item 6.3 NR-6)
- Fornecer EPI adequado ao risco, gratuitamente
- Exigir seu uso
- Fornecer treinamento de uso, guarda e conservação
- Substituir imediatamente quando danificado ou extraviado
- Responsabilizar-se pela higienização e manutenção periódica
- Registrar o fornecimento em ficha com assinatura do empregado

OBRIGAÇÕES DO EMPREGADO (Item 6.4 NR-6)
- Usar o EPI apenas para a finalidade destinada
- Responsabilizar-se pela guarda e conservação
- Comunicar qualquer alteração que o torne impróprio
- Cumprir as determinações do empregador sobre uso

CERTIFICADO DE APROVAÇÃO (CA)
- Todo EPI deve ter CA emitido pelo MTE (ex-SINMETRO)
- Sem CA: EPI não pode ser utilizado
- CA tem validade de 5 anos (renovável)
- Lista de EPI com CA: Portaria SDST 26/2021 (atualizada)

CLASSIFICAÇÃO DOS EPIs
Proteção da cabeça: capacete
Proteção dos olhos e face: óculos, viseira, máscara de solda
Proteção auditiva: protetor auricular (plugue, concha)
Proteção respiratória: respirador purificador de ar
Proteção do tronco: colete, avental
Proteção de membros superiores: luvas, mangote, braçadeira
Proteção de membros inferiores: botina, bota, perneira
Proteção do corpo inteiro: macacão, conjunto
Proteção contra quedas: cinto de segurança, talabarte (NR-35)

FALTA DE FORNECIMENTO — RESPONSABILIDADE
Súmula 289 TST: O simples fornecimento do EPI pelo empregador não o exime do pagamento do adicional de insalubridade. É necessário que o EPI elimine efetivamente o risco.

FONTES: NR-6 — Portaria MTE 3.214/1978; Portaria SDST 26/2021; Súmula 289 TST`,
    },
    ...SEGURANCA_EXTRA_DOCS,
  ],

  // ──────────────────────────────────────────────────────────────────────────
  medicina: [
    {
      title: "ASO — Atestado de Saúde Ocupacional — Tipos, Requisitos e Validade (NR-7)",
      category: "norma",
      source: "NR-7 — PCMSO; CLT Art. 168",
      version: "2024",
      tags: "aso,atestado,saude,ocupacional,admissional,periodico,retorno,demissional,mudanca,funcao,nr7",
      content: `ASO — ATESTADO DE SAÚDE OCUPACIONAL (NR-7)

BASE LEGAL: NR-7 (PCMSO); CLT Art. 168

TIPOS DE ASO
1. ADMISSIONAL — antes de o empregado assumir suas atividades
2. PERIÓDICO — conforme periodicidade do PCMSO (geralmente anual)
3. RETORNO AO TRABALHO — após afastamento superior a 30 dias por doença ou acidente
4. MUDANÇA DE FUNÇÃO — quando a nova função implica em novos riscos
5. DEMISSIONAL — até a data do desligamento (ou em até 135 dias anteriores ao desligamento, dependendo do risco)

REQUISITOS DO ASO (Item 7.4.4.5 NR-7)
Deve conter:
- Nome completo do trabalhador
- Número do RG
- Função e os riscos ocupacionais específicos (ou ausência de risco)
- Indicação dos procedimentos médicos realizados (exames clínicos e complementares)
- Nome do médico coordenador (com CRM)
- Nome, CRM e assinatura do médico que realizou o exame
- Data do exame
- Definição de apto ou inapto

EXAMES COMPLEMENTARES
Definidos pelo médico do trabalho no PCMSO conforme os riscos do cargo.
Exemplos:
- Ruído: audiometria
- Poeira sílica: RX de tórax + espirometria
- Produtos químicos: hemograma + bioquímica específica
- Trabalho em altura: eletrocardiograma

VALIDADE DO ASO DEMISSIONAL (Item 7.4.4.4 NR-7)
Dispensa o exame demissional quando o exame periódico foi realizado:
- Há menos de 135 dias: atividades sem risco grave ou iminente
- Há menos de 90 dias: atividades com risco grave ou iminente

APTO / INAPTO
- APTO: trabalhador pode exercer a função
- APTO COM RESTRIÇÕES: pode exercer função com limitações
- INAPTO: não pode assumir ou continuar na função específica

NEXO CAUSAL E NEXO TÉCNICO EPIDEMIOLÓGICO (NTEP)
O NTEP é estabelecido pelo INSS relacionando CID com CNAE.
Se a doença consta no cruzamento CID-CNAE: há presunção de nexo causal, invertendo o ônus da prova.

FONTES: NR-7 (PCMSO); CLT Art. 168; IN INSS 77/2015; Decreto 3.048/1999`,
    },
    {
      title: "Afastamentos INSS — Auxílio-Doença, Acidente de Trabalho e Prazos",
      category: "legislacao",
      source: "Lei 8.213/1991; Decreto 3.048/1999",
      version: "2024",
      tags: "afastamento,inss,auxilio,doenca,acidente,trabalho,b31,b91,prazo,cid,estabilidade,art118",
      content: `AFASTAMENTOS POR DOENÇA E ACIDENTE — INSS

TIPOS DE BENEFÍCIO

AUXÍLIO-DOENÇA PREVIDENCIÁRIO (Espécie B-31 — Lei 8.213/91 Art. 59)
- Incapacidade temporária não relacionada ao trabalho
- Carência: 12 contribuições mensais (exceto acidente de qualquer natureza)
- Primeiros 15 dias: pagamento pelo empregador (salário integral)
- A partir do 16º dia: INSS assume o pagamento (91% do salário de contribuição)

AUXÍLIO-DOENÇA ACIDENTÁRIO (Espécie B-91 — Lei 8.213/91 Art. 61)
- Incapacidade temporária por acidente do trabalho ou doença ocupacional
- Sem carência
- Primeiros 15 dias: empregador paga
- A partir do 16º dia: INSS paga (100% do salário de contribuição)
- ESTABILIDADE: 12 meses após cessação do benefício B-91 (Art. 118 Lei 8.213/91)

ESTABILIDADE DO ACIDENTADO (Art. 118 Lei 8.213/91)
"O segurado que sofreu acidente do trabalho tem garantida, pelo prazo mínimo de doze meses, a manutenção do seu contrato de trabalho na empresa, após a cessação do auxílio-doença acidentário."

NEXO TÉCNICO EPIDEMIOLÓGICO (NTEP)
Quando a doença (CID) está relacionada à atividade (CNAE) na tabela NTEP, o INSS presume nexo causal.
Empregador pode contestar em até 15 dias com laudo técnico.

CAT — COMUNICAÇÃO DE ACIDENTE DO TRABALHO (NR-1 / Lei 8.213/91 Art. 22)
- Deve ser emitida até o 1º dia útil após o acidente
- Em caso de morte: imediatamente
- Enviada via eSocial (evento S-2210)
- Cópias para: INSS, trabalhador, sindicato, empregado
- Falta de emissão: multa administrativa (Art. 22 §3º Lei 8.213/91)

PERÍCIA MÉDICA INSS
- Médico perito avalia a incapacidade
- Agendamento: Meu INSS (gov.br/meu-inss)
- Prazo de concessão: até 60 dias após o pedido

PPP — PERFIL PROFISSIOGRÁFICO PREVIDENCIÁRIO (Art. 58 Lei 8.213/91)
- Documento que registra o histórico laboral e exposições
- Obrigatório para aposentadoria especial e conversão de benefício por acidente
- Emitido pelo empregador com base no LTCAT e PCMSO

FONTES: Lei 8.213/1991; Decreto 3.048/1999; IN INSS 77/2015; NR-7 (PCMSO)`,
    },
    ...MEDICINA_EXTRA_DOCS,
  ],

  // ──────────────────────────────────────────────────────────────────────────
  recrutamento: [
    {
      title: "Entrevista por Competências — Método STAR e Boas Práticas",
      category: "metodologia",
      source: "SHRM — Society for Human Resource Management; Metodologia STAR",
      version: "2024",
      tags: "entrevista,competencias,star,situacao,tarefa,acao,resultado,comportamental,perguntas",
      content: `ENTREVISTA POR COMPETÊNCIAS — MÉTODO STAR

FUNDAMENTAÇÃO
A entrevista comportamental baseia-se no princípio de que o comportamento passado é o melhor preditor do comportamento futuro.

MÉTODO STAR
- S — Situação: contexto específico em que o candidato se encontrava
- T — Tarefa: responsabilidade ou desafio enfrentado
- A — Ação: ações específicas tomadas pelo candidato
- R — Resultado: desfecho obtido (mensurável quando possível)

PERGUNTAS STAR PARA COMPETÊNCIAS ESSENCIAIS

Liderança:
"Descreva uma situação em que você liderou um time em um projeto desafiador. Qual foi sua estratégia, como conduziu a equipe e qual foi o resultado?"

Resolução de Problemas:
"Conte sobre um problema complexo que você enfrentou profissionalmente. Como identificou a causa, quais alternativas considerou e como resolveu?"

Trabalho em equipe:
"Descreva uma situação em que você precisou colaborar com pessoas de diferentes áreas. Como gerenciou os conflitos e qual foi o resultado?"

Comunicação:
"Relate uma situação em que precisou explicar algo técnico para um público não especialista. Como adaptou sua comunicação?"

MAPEAMENTO DE COMPETÊNCIAS — CHA
Conhecimento (saber), Habilidade (saber fazer), Atitude (querer fazer).
Antes da entrevista: mapear quais CHA são essenciais para o cargo.

ROTEIRO DE AVALIAÇÃO
1. Abertura e rapport (5min)
2. Apresentação do candidato (10min)
3. Perguntas comportamentais — 3 a 5 competências (30min)
4. Perguntas técnicas (15min)
5. Apresentação da vaga e empresa (10min)
6. Perguntas do candidato (10min)

SINAIS POSITIVOS
- Respostas específicas, com exemplos concretos
- Foco no "eu" nas ações, não no "nós"
- Resultados mensuráveis
- Reflexão sobre aprendizados

SINAIS DE ATENÇÃO
- Respostas vagas ou genéricas
- Culpabiliza terceiros por resultados negativos
- Evita responsabilidade pessoal

LGPD NO PROCESSO SELETIVO (Lei 13.709/2018)
- Dados dos candidatos são dados pessoais — protegidos pela LGPD
- Base legal: legítimo interesse do empregador + execução de contrato
- Dados sensíveis (saúde, origem racial) exigem consentimento explícito
- Prazo de retenção de currículos: definir política interna
- Comunicar ao candidato a destinação dos dados

FONTES: SHRM; Competências Comportamentais — Leme; Lei 13.709/2018 (LGPD)`,
    },
    ...RECRUTAMENTO_EXTRA_DOCS,
  ],

  // ──────────────────────────────────────────────────────────────────────────
  processos: [
    {
      title: "PDCA — Ciclo de Melhoria Contínua e Aplicação Prática",
      category: "metodologia",
      source: "ABPMP BPM CBOK v4.0; Deming, W.E. — Out of the Crisis",
      version: "2024",
      tags: "pdca,plan,do,check,act,melhoria,continua,ciclo,kaizen,qualidade,processo",
      content: `PDCA — CICLO DE MELHORIA CONTÍNUA

ORIGEM
Desenvolvido por Walter Shewhart e popularizado por W. Edwards Deming na reconstrução industrial japonesa (1950s).

FASES DO PDCA

P — PLAN (Planejar)
1. Identificar o problema ou oportunidade de melhoria
2. Analisar as causas raiz (Ishikawa, 5 Porquês, Pareto)
3. Definir a meta e indicador de sucesso (SMART)
4. Elaborar o plano de ação (5W2H: O quê, Quem, Quando, Onde, Por quê, Como, Quanto custa)

D — DO (Executar)
1. Treinar e capacitar os envolvidos
2. Executar o plano de ação conforme planejado
3. Coletar dados durante a execução
4. Documentar o que foi realizado (desvios, obstáculos)

C — CHECK (Verificar)
1. Comparar resultados com as metas definidas
2. Analisar os dados coletados
3. Identificar discrepâncias entre planejado e executado
4. Avaliar se a solução foi eficaz

A — ACT (Agir)
Se bem-sucedido:
- Padronizar a solução (criar ou atualizar POP/IT)
- Treinar a equipe no novo padrão
- Comunicar os resultados
Se não atingiu a meta:
- Reiniciar o ciclo com novas hipóteses

5 PORQUÊS — ANÁLISE DE CAUSA RAIZ
Técnica de pergunta iterativa: para cada problema, perguntar "por quê?" cinco vezes para chegar à causa raiz.
Exemplo:
- Problema: Máquina parou
- Por quê? Fusível queimou
- Por quê? Sobrecarga
- Por quê? Rolamento falhou
- Por quê? Falta de lubrificação
- Por quê? Manutenção não realizada (CAUSA RAIZ)

DIAGRAMA DE ISHIKAWA (Espinha de Peixe)
Categorias de causa: Máquina, Método, Mão de obra, Matéria-prima, Meio ambiente, Medição (6Ms).

FONTES: ABPMP BPM CBOK v4.0; Deming, W.E. — Out of the Crisis; Lean Institute Brasil`,
    },
    ...PROCESSOS_EXTRA_DOCS,
  ],

  // ──────────────────────────────────────────────────────────────────────────
  qualidade: [
    {
      title: "ISO 9001:2015 — Requisitos do Sistema de Gestão da Qualidade",
      category: "norma",
      source: "ISO 9001:2015 — ABNT NBR ISO 9001:2015",
      version: "2015",
      tags: "iso,9001,2015,sgq,requisitos,clausula,sistema,gestao,qualidade,auditoria,certificacao",
      content: `ISO 9001:2015 — SISTEMA DE GESTÃO DA QUALIDADE

ESTRUTURA (High Level Structure — HLS)
Baseada na Estrutura de Alto Nível — compatível com ISO 14001, ISO 45001.

SEÇÕES NORMATIVAS

Seção 4 — Contexto da Organização
4.1 Entendendo a organização e seu contexto (análise SWOT, PEST)
4.2 Entendendo necessidades e expectativas de partes interessadas
4.3 Escopo do SGQ
4.4 SGQ e seus processos

Seção 5 — Liderança
5.1 Liderança e comprometimento da Alta Direção
5.2 Política da Qualidade (comunicada, documentada, mantida)
5.3 Funções, responsabilidades e autoridades

Seção 6 — Planejamento
6.1 Riscos e oportunidades (análise de riscos)
6.2 Objetivos da qualidade (mensuráveis, monitorados)
6.3 Planejamento de mudanças

Seção 7 — Apoio
7.1 Recursos (pessoas, infraestrutura, ambiente, rastreabilidade)
7.2 Competência
7.3 Conscientização
7.4 Comunicação
7.5 Informação documentada (documentos e registros)

Seção 8 — Operação
8.1 Planejamento e controle operacional
8.2 Requisitos para produtos e serviços
8.3 Projeto e desenvolvimento
8.4 Controle de processos, produtos e serviços providos externamente
8.5 Produção e provisão de serviço
8.6 Liberação de produtos e serviços
8.7 Controle de saídas não conformes

Seção 9 — Avaliação de Desempenho
9.1 Monitoramento, medição, análise e avaliação
9.2 Auditoria interna
9.3 Análise crítica pela direção

Seção 10 — Melhoria
10.1 Generalidades
10.2 Não conformidade e ação corretiva
10.3 Melhoria contínua

PENSAMENTO BASEADO EM RISCO
Nova abordagem da ISO 9001:2015: ações preventivas são substituídas pela análise sistemática de riscos e oportunidades.

FONTES: ABNT NBR ISO 9001:2015; ABNT NBR ISO 9000:2015 (vocabulário)`,
    },
    ...QUALIDADE_EXTRA_DOCS,
  ],

  // ──────────────────────────────────────────────────────────────────────────
  juridico: [
    {
      title: "LGPD — Lei Geral de Proteção de Dados — Lei 13.709/2018",
      category: "legislacao",
      source: "Lei 13.709/2018 — LGPD; ANPD — Guia de Boas Práticas",
      version: "2020",
      tags: "lgpd,protecao,dados,pessoais,sensivel,titular,controlador,operador,anpd,dpo,base,legal",
      content: `LGPD — LEI GERAL DE PROTEÇÃO DE DADOS PESSOAIS — LEI 13.709/2018

VIGÊNCIA: Setembro de 2020 (sanções a partir de Agosto de 2021)
AUTORIDADE: ANPD — Autoridade Nacional de Proteção de Dados

CONCEITOS FUNDAMENTAIS

DADO PESSOAL (Art. 5º I)
Qualquer informação relacionada à pessoa natural identificada ou identificável.

DADO PESSOAL SENSÍVEL (Art. 5º II)
Dado sobre origem racial/étnica, convicção religiosa, opinião política, filiação sindical, saúde, vida sexual, dado genético ou biométrico.

CONTROLADOR (Art. 5º VI)
Quem determina as finalidades e os meios de tratamento dos dados.

OPERADOR (Art. 5º VII)
Quem realiza o tratamento em nome do controlador.

TITULAR (Art. 5º V)
Pessoa natural a quem se referem os dados pessoais.

BASES LEGAIS PARA TRATAMENTO (Art. 7º LGPD)
1. Consentimento do titular
2. Cumprimento de obrigação legal/regulatória
3. Políticas públicas
4. Estudos por órgão de pesquisa
5. Execução de contrato
6. Exercício regular de direitos em processo judicial/administrativo
7. Proteção da vida
8. Tutela da saúde
9. Legítimo interesse do controlador
10. Proteção do crédito

DIREITOS DO TITULAR (Art. 18 LGPD)
- Confirmação da existência do tratamento
- Acesso aos dados
- Correção de dados incompletos/incorretos
- Anonimização, bloqueio ou eliminação
- Portabilidade
- Eliminação dos dados tratados com consentimento
- Revogação do consentimento

DPO — ENCARREGADO DE DADOS (Art. 41 LGPD)
- Indicado pelo controlador (obrigatório para grandes volumes de dados sensíveis)
- Ponto de contato com titulares e ANPD
- Pode ser pessoa física ou jurídica

PENALIDADES (Art. 52 LGPD)
- Advertência
- Multa simples: até 2% do faturamento, limitado a R$ 50 milhões por infração
- Multa diária
- Publicização da infração
- Bloqueio/eliminação dos dados

TRATAMENTO DE DADOS DE FUNCIONÁRIOS
Base legal: execução de contrato de trabalho (Art. 7º V) + obrigação legal (Art. 7º II).
Dados sensíveis de saúde: base legal do Art. 11 II (obrigação legal ou proteção da vida).

FONTES: Lei 13.709/2018; Resolução ANPD CD/ANPD n° 2/2022; Guia de Boas Práticas ANPD`,
    },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  financeiro: [
    {
      title: "Fluxo de Caixa — Elaboração, Análise e Gestão",
      category: "metodologia",
      source: "CFC — Conselho Federal de Contabilidade; SEBRAE — Gestão Financeira",
      version: "2024",
      tags: "fluxo,caixa,elaboracao,projecao,receita,despesa,saldo,liquidez,gestao,financeira",
      content: `FLUXO DE CAIXA — ELABORAÇÃO E GESTÃO

DEFINIÇÃO
Demonstrativo que registra todas as entradas e saídas de recursos financeiros de uma empresa em um período determinado.

TIPOS DE FLUXO DE CAIXA

FLUXO OPERACIONAL
Entradas: receitas de vendas, recebimento de duplicatas, outros recebimentos operacionais
Saídas: fornecedores, folha de pagamento, encargos, aluguel, energia, impostos sobre receita

FLUXO DE INVESTIMENTOS
Entradas: venda de ativos, recebimento de dividendos
Saídas: compra de máquinas, equipamentos, imóveis, participações

FLUXO DE FINANCIAMENTOS
Entradas: empréstimos captados, aumento de capital
Saídas: amortização de dívidas, pagamento de juros, distribuição de lucros

ELABORAÇÃO DO FLUXO DE CAIXA

Passo 1: Definir o período (diário, semanal, mensal)
Passo 2: Listar todas as receitas previstas com datas
Passo 3: Listar todas as despesas previstas com datas
Passo 4: Calcular o saldo: Entradas - Saídas = Saldo do período
Passo 5: Saldo acumulado: saldo anterior + saldo do período atual

INDICADORES DE ANÁLISE

PONTO DE EQUILÍBRIO FINANCEIRO
= Gastos fixos ÷ (1 - Custos variáveis / Receita total)
Receita mínima para cobrir todos os custos, sem lucro.

LIQUIDEZ CORRENTE
= Ativo Circulante ÷ Passivo Circulante
> 1: solvente | < 1: risco de insolvência

CAPITAL DE GIRO NECESSÁRIO
= Ciclo financeiro × Receita diária média
Quanto a empresa precisa para financiar suas operações.

GESTÃO DO CAPITAL DE GIRO
- Reduzi o prazo de recebimento (antecipação, descontos)
- Ampliar prazo de pagamento com fornecedores
- Reduzir estoque ao mínimo necessário

DIFERENÇA ENTRE LUCRO E CAIXA
Uma empresa pode ser lucrável e ter caixa negativo (regime de competência vs. caixa).
Controlar as duas dimensões é fundamental.

FONTES: CFC — Normas Contábeis Brasileiras; SEBRAE — Gestão Financeira; CPC 03 (DFC)`,
    },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  comportamento: [
    {
      title: "Procrastinação — Causas, Técnicas de Superação e Plano de Ação",
      category: "metodologia",
      source: "Atomic Habits — James Clear; Psicologia Positiva — Martin Seligman",
      version: "2024",
      tags: "procrastinacao,adiamento,tarefas,gestao,tempo,produtividade,habito,foco,disciplina,tecnicas",
      content: `PROCRASTINAÇÃO — COMPREENDENDO E SUPERANDO

DEFINIÇÃO
Procrastinação é o adiamento voluntário de tarefas necessárias, mesmo sabendo das consequências negativas. Não é preguiça — é uma resposta emocional a tarefas percebidas como difíceis, chatas, ambíguas ou geradoras de ansiedade.

CAUSAS COMUNS
1. Medo do fracasso ou perfeccionismo ("só faço quando estiver perfeito")
2. Tarefa muito grande e mal definida (onde começo?)
3. Falta de conexão com o propósito da tarefa
4. Gestão do tempo ineficiente
5. Distrações ambientais (celular, redes sociais)
6. Baixa tolerância à frustração

TÉCNICAS DE SUPERAÇÃO

1. DIVISÃO EM MICRO-TAREFAS
Fragmentar a tarefa em passos de 15-30 minutos.
Exemplo: Em vez de "Elaborar relatório", dividir em:
- Definir estrutura do relatório (15min)
- Coletar dados da seção 1 (20min)
- Escrever introdução (25min)

2. TÉCNICA POMODORO
- 25 minutos de foco total (sem distrações)
- 5 minutos de pausa
- A cada 4 pomodoros: 15-30 minutos de descanso
- Aumenta o foco e reduz a resistência inicial

3. REGRA DOS 2 MINUTOS (David Allen — GTD)
Se a tarefa leva menos de 2 minutos: faça AGORA.
Evita o acúmulo de pequenas pendências.

4. "EAT THE FROG" (Brian Tracy)
Comece o dia pela tarefa mais difícil ou que mais procrastina.
Ao concluí-la, o resto do dia fica mais fácil.

5. MATRIZ DE EISENHOWER
Priorize por urgência e importância:
- Q1: Urgente e importante → FAZ AGORA
- Q2: Não urgente e importante → AGENDA (aqui mora o crescimento)
- Q3: Urgente e não importante → DELEGA
- Q4: Não urgente e não importante → ELIMINA

6. COMPROMETIMENTO PÚBLICO
Anunciar a meta para alguém gera responsabilidade externa.
Variação: body doubling (trabalhar na presença de alguém).

PLANO DE AÇÃO PARA PROCRASTINADORES

Semana 1: Identificar os 3 padrões de procrastinação recorrentes
Semana 2: Aplicar Pomodoro nas tarefas problemáticas por 5 dias seguidos
Semana 3: Revisar o ambiente: eliminar distrações (celular em modo silencioso, abas do navegador fechadas)
Semana 4: Instalar rotina matinal de 10 minutos para planejar o dia

REFERÊNCIAS
- Atomic Habits — James Clear (formação de hábitos)
- Getting Things Done — David Allen (GTD)
- The Now Habit — Neil Fiore (procrastinação)
- Psicologia Positiva — Martin Seligman (bem-estar e florescimento)

FONTES: Atomic Habits — James Clear; GTD — David Allen; Psicologia Positiva — Seligman`,
    },
    {
      title: "PDI — Plano de Desenvolvimento Individual — Estrutura e Elaboração",
      category: "metodologia",
      source: "Psicologia Organizacional; RH Estratégico — Gramigna, Maria Rita",
      version: "2024",
      tags: "pdi,plano,desenvolvimento,individual,competencias,metas,smart,acoes,prazo,avaliacao",
      content: `PDI — PLANO DE DESENVOLVIMENTO INDIVIDUAL

DEFINIÇÃO
Ferramenta de autodesenvolvimento que organiza ações concretas para o desenvolvimento de competências, habilidades e comportamentos profissionais e pessoais.

ESTRUTURA DO PDI

1. AUTOCONHECIMENTO — Diagnóstico Atual
- Quais são meus pontos fortes? (o que faço bem)
- Quais são meus pontos de melhoria? (o que preciso desenvolver)
- Quais feedbacks recebo com frequência?
- O que me impede de avançar?

2. VISÃO DE FUTURO — Onde quero chegar?
- Meta de carreira (1, 3, 5 anos)
- Qual papel quero exercer?
- Que tipo de profissional quero ser?

3. GAP ANALYSIS — Distância entre o atual e o desejado
- Competências exigidas para o cargo/papel alvo
- Competências que já possuo (nível atual)
- Lacunas a desenvolver (GAP)

4. PLANO DE AÇÃO — Metas SMART
Específica (S), Mensurável (M), Atingível (A), Relevante (R), Temporal (T)

Para cada competência a desenvolver:
- O que vou aprender?
- Como vou aprender? (curso, livro, projeto, mentoria, prática)
- Quando? (prazo definido)
- Como saberei que aprendi? (indicador de sucesso)
- Quem me apoia? (parceiro de accountability)

5. EXECUÇÃO E ACOMPANHAMENTO
- Revisão mensal do PDI (check-in)
- Registro de aprendizados e progressos
- Ajuste de metas quando necessário

6. AVALIAÇÃO — A cada 6 meses
- O que consegui desenvolver?
- O que não avancei (por quê)?
- O que precisa ser revisto?

MODELO SIMPLIFICADO DE PDI

| Competência | Situação Atual | Meta | Ação | Prazo | Indicador |
|-------------|---------------|------|------|-------|-----------|
| Comunicação | Dificuldade em apresentações | Fazer 2 apresentações por mês com confiança | Curso de oratória + praticar em reuniões | 3 meses | Feedback positivo da liderança |

70-20-10 MODELO DE APRENDIZAGEM
- 70%: aprendizagem na prática (on the job)
- 20%: aprendizagem social (feedbacks, mentoria, observação)
- 10%: treinamento formal (cursos, livros)

FONTES: Gramigna, Maria Rita — Modelo de Competências; Lombardo & Eichinger — FYI for Your Improvement; Harvard Business Review`,
    },
    ...COMPORTAMENTO_EXTRA_DOCS,
  ],
}
