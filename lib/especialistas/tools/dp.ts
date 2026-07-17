// ─── Ferramentas · Departamento Pessoal ──────────────────────────────────────

import type { ChatCompletionTool } from "openai/resources/chat"

// ─── Definições OpenAI ────────────────────────────────────────────────────────

export const DP_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calcular_ferias",
      description: "Calcula o valor das férias de um empregado conforme CLT (Arts. 129-145). Inclui terço constitucional, abono pecuniário opcional e INSS/IRRF.",
      parameters: {
        type: "object",
        properties: {
          salario_base: { type: "number", description: "Salário base mensal em R$" },
          dias_ferias: { type: "number", description: "Dias de férias a usufruir (máx 30)", default: 30 },
          abono_pecuniario: { type: "boolean", description: "Vender 10 dias de férias?", default: false },
          outras_verbas: { type: "number", description: "Médias de horas extras, comissões, adicionais (R$)", default: 0 },
        },
        required: ["salario_base"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_rescisao",
      description: "Calcula as verbas rescisórias conforme o tipo de rescisão (demissão sem justa causa, pedido de demissão, justa causa, acordo mútuo). Inclui aviso prévio, saldo de salário, férias + 1/3, 13º proporcional, FGTS + multa.",
      parameters: {
        type: "object",
        properties: {
          salario_base: { type: "number", description: "Salário base mensal em R$" },
          tipo_rescisao: {
            type: "string",
            enum: ["sem_justa_causa", "pedido_demissao", "justa_causa", "acordo_mutuo", "culpa_reciproca"],
            description: "Modalidade de rescisão contratual",
          },
          data_admissao: { type: "string", description: "Data de admissão (YYYY-MM-DD)" },
          data_rescisao: { type: "string", description: "Data de rescisão (YYYY-MM-DD)" },
          aviso_previo_trabalhado: { type: "boolean", description: "Aviso prévio trabalhado?", default: false },
          ferias_vencidas: { type: "number", description: "Períodos de férias vencidas pendentes", default: 0 },
          saldo_fgts: { type: "number", description: "Saldo do FGTS em R$ (opcional)", default: 0 },
        },
        required: ["salario_base", "tipo_rescisao", "data_admissao", "data_rescisao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_13_salario",
      description: "Calcula o 13º salário proporcional ou integral, com deduções de INSS e IRRF.",
      parameters: {
        type: "object",
        properties: {
          salario_base: { type: "number", description: "Salário base mensal em R$" },
          meses_trabalhados: { type: "number", description: "Meses trabalhados no ano (1-12)" },
          outras_verbas: { type: "number", description: "Médias de horas extras, comissões, adicionais (R$)", default: 0 },
          parcela: { type: "string", enum: ["primeira", "segunda", "integral"], description: "Qual parcela calcular", default: "segunda" },
        },
        required: ["salario_base", "meses_trabalhados"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_aviso_previo",
      description: "Calcula o aviso prévio proporcional ao tempo de serviço conforme Lei 12.506/2011.",
      parameters: {
        type: "object",
        properties: {
          data_admissao: { type: "string", description: "Data de admissão (YYYY-MM-DD)" },
          data_rescisao: { type: "string", description: "Data de rescisão (YYYY-MM-DD)" },
          salario_base: { type: "number", description: "Salário base mensal em R$" },
        },
        required: ["data_admissao", "data_rescisao", "salario_base"],
      },
    },
  },
]

// ─── Implementações ───────────────────────────────────────────────────────────

const INSS_2024 = [
  { ate: 1412.00, aliquota: 0.075 },
  { ate: 2666.68, aliquota: 0.09 },
  { ate: 4000.03, aliquota: 0.12 },
  { ate: 7786.02, aliquota: 0.14 },
]

function calcularINSS(base: number): number {
  let inss = 0
  let baseRestante = base
  let limiteAnterior = 0

  for (const faixa of INSS_2024) {
    if (baseRestante <= 0) break
    const faixaValor = Math.min(base, faixa.ate) - limiteAnterior
    if (faixaValor <= 0) continue
    inss += faixaValor * faixa.aliquota
    baseRestante -= faixaValor
    limiteAnterior = faixa.ate
  }
  return Math.round(inss * 100) / 100
}

function calcularIRRF(baseCalculo: number): number {
  // Tabela progressiva IRRF 2024
  if (baseCalculo <= 2259.20) return 0
  if (baseCalculo <= 2826.65) return Math.round((baseCalculo * 0.075 - 169.44) * 100) / 100
  if (baseCalculo <= 3751.05) return Math.round((baseCalculo * 0.15 - 381.44) * 100) / 100
  if (baseCalculo <= 4664.68) return Math.round((baseCalculo * 0.225 - 662.77) * 100) / 100
  return Math.round((baseCalculo * 0.275 - 896.00) * 100) / 100
}

function calcularAnosServico(dataAdm: string, dataRes: string): number {
  const adm = new Date(dataAdm)
  const res = new Date(dataRes)
  return (res.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
}

function calcularMesesServico(dataAdm: string, dataRes: string): number {
  const adm = new Date(dataAdm)
  const res = new Date(dataRes)
  let meses = (res.getFullYear() - adm.getFullYear()) * 12 + (res.getMonth() - adm.getMonth())
  if (res.getDate() >= 15) meses++
  return meses
}

// ─── calcular_ferias ──────────────────────────────────────────────────────────

export function executarCalcularFerias(args: {
  salario_base: number
  dias_ferias?: number
  abono_pecuniario?: boolean
  outras_verbas?: number
}): object {
  const { salario_base, dias_ferias = 30, abono_pecuniario = false, outras_verbas = 0 } = args
  const baseCalculo = salario_base + outras_verbas

  const diasUsufruidos = abono_pecuniario ? Math.min(dias_ferias, 20) : dias_ferias
  const diasAbono = abono_pecuniario ? 10 : 0

  const valorFerias = (baseCalculo / 30) * diasUsufruidos
  const tercoConst = valorFerias / 3
  const valorAbono = abono_pecuniario ? (baseCalculo / 30) * diasAbono : 0
  const tercoAbono = abono_pecuniario ? valorAbono / 3 : 0

  const bruto = valorFerias + tercoConst + valorAbono + tercoAbono
  const inss = calcularINSS(baseCalculo)
  const baseIRRF = bruto - inss
  const irrf = calcularIRRF(baseIRRF)
  const liquido = bruto - inss - irrf

  return {
    resultado: {
      salario_base,
      dias_usufruidos: diasUsufruidos,
      dias_abono: diasAbono,
      valor_ferias: +valorFerias.toFixed(2),
      tercio_constitucional: +tercoConst.toFixed(2),
      valor_abono_pecuniario: +valorAbono.toFixed(2),
      tercio_abono: +tercoAbono.toFixed(2),
      total_bruto: +bruto.toFixed(2),
      desconto_inss: +inss.toFixed(2),
      desconto_irrf: +irrf.toFixed(2),
      total_liquido: +liquido.toFixed(2),
    },
    fundamentacao: "CLT Arts. 129-145, Art. 7º CF/88 (terço constitucional), Lei 8.212/1991 (INSS)",
  }
}

// ─── calcular_rescisao ────────────────────────────────────────────────────────

export function executarCalcularRescisao(args: {
  salario_base: number
  tipo_rescisao: string
  data_admissao: string
  data_rescisao: string
  aviso_previo_trabalhado?: boolean
  ferias_vencidas?: number
  saldo_fgts?: number
}): object {
  const { salario_base, tipo_rescisao, data_admissao, data_rescisao, aviso_previo_trabalhado = false, ferias_vencidas = 0, saldo_fgts = 0 } = args

  const anosServico = calcularAnosServico(data_admissao, data_rescisao)
  const mesesServico = calcularMesesServico(data_admissao, data_rescisao)

  // Aviso prévio (Lei 12.506/2011: 30 dias + 3 dias por ano acima do 1º)
  const diasAviso = Math.min(30 + Math.floor(Math.max(0, anosServico - 1)) * 3, 90)
  const valorAviso = aviso_previo_trabalhado ? 0 : (salario_base / 30) * diasAviso

  // Saldo de salário
  const diaRescisao = new Date(data_rescisao).getDate()
  const saldoSalario = (salario_base / 30) * diaRescisao

  // 13º proporcional
  const mesAtual = new Date(data_rescisao).getMonth() + 1
  const decimo3 = (salario_base / 12) * mesAtual

  // Férias proporcionais
  const mesesFerias = mesesServico % 12
  const feriasProporcionais = (salario_base / 12) * mesesFerias
  const tercoFerias = feriasProporcionais / 3
  const feriasPropTotal = feriasProporcionais + tercoFerias

  // Férias vencidas
  const ferVenc = (salario_base + salario_base / 3) * ferias_vencidas

  // Multa FGTS
  let multaFGTS = 0
  let depositoFGTS = 0
  const mesBase = salario_base * 0.08
  if (tipo_rescisao === "sem_justa_causa" || tipo_rescisao === "acordo_mutuo") {
    const multa = tipo_rescisao === "sem_justa_causa" ? 0.40 : 0.20
    multaFGTS = saldo_fgts > 0 ? saldo_fgts * multa : mesBase * mesesServico * multa
    depositoFGTS = mesBase
  }

  // Montar verbas por tipo
  const verbas: Record<string, number> = {}
  let total = 0

  const add = (nome: string, valor: number) => {
    if (valor > 0) { verbas[nome] = +valor.toFixed(2); total += valor }
  }

  const temDireito = (verba: string) => {
    if (tipo_rescisao === "justa_causa") return ["saldo_salario"].includes(verba)
    if (tipo_rescisao === "pedido_demissao") return !["aviso_previo_indenizado", "multa_fgts"].includes(verba)
    return true
  }

  add("saldo_salario", saldoSalario)
  if (temDireito("aviso_previo_indenizado")) add("aviso_previo_indenizado", valorAviso)
  if (temDireito("decimo_terceiro_proporcional")) add("decimo_terceiro_proporcional", decimo3)
  if (temDireito("ferias_proporcionais_mais_tercio")) add("ferias_proporcionais_mais_tercio", feriasPropTotal)
  if (ferias_vencidas > 0) add("ferias_vencidas_mais_tercio", ferVenc)
  if (temDireito("multa_fgts")) add("multa_fgts_40_pct", multaFGTS)
  if (depositoFGTS > 0) add("deposito_fgts_mes_rescisao", depositoFGTS)

  return {
    resultado: {
      tipo_rescisao,
      anos_servico: +anosServico.toFixed(1),
      meses_servico: mesesServico,
      dias_aviso_previo: diasAviso,
      verbas,
      total_bruto: +total.toFixed(2),
    },
    observacao: tipo_rescisao === "justa_causa"
      ? "Rescisão por justa causa: empregado perde aviso prévio, 13º prop., férias prop. e multa do FGTS (CLT Art. 482)."
      : tipo_rescisao === "acordo_mutuo"
      ? "Acordo mútuo (CLT Art. 484-A): multa FGTS de 20%, saque de 80% do saldo, seguro-desemprego vedado."
      : "",
    fundamentacao: "CLT Arts. 477-484, Lei 12.506/2011 (aviso prévio), Lei 8.036/1990 (FGTS), CF Art. 7º",
  }
}

// ─── calcular_13_salario ──────────────────────────────────────────────────────

export function executarCalcular13(args: {
  salario_base: number
  meses_trabalhados: number
  outras_verbas?: number
  parcela?: string
}): object {
  const { salario_base, meses_trabalhados, outras_verbas = 0, parcela = "segunda" } = args
  const base = salario_base + outras_verbas
  const bruto = (base / 12) * Math.min(meses_trabalhados, 12)
  const inss = parcela === "segunda" ? calcularINSS(bruto) : 0
  const irrf = parcela === "segunda" ? calcularIRRF(bruto - inss) : 0
  return {
    resultado: {
      salario_base,
      meses_trabalhados: Math.min(meses_trabalhados, 12),
      bruto: +bruto.toFixed(2),
      inss: +inss.toFixed(2),
      irrf: +irrf.toFixed(2),
      liquido: +(bruto - inss - irrf).toFixed(2),
      parcela,
    },
    fundamentacao: "CLT Art. 7º-VIII CF/88, Lei 4.090/1962, Lei 4.749/1965",
  }
}

// ─── calcular_aviso_previo ────────────────────────────────────────────────────

export function executarCalcularAviso(args: {
  data_admissao: string
  data_rescisao: string
  salario_base: number
}): object {
  const anos = calcularAnosServico(args.data_admissao, args.data_rescisao)
  const dias = Math.min(30 + Math.floor(Math.max(0, anos - 1)) * 3, 90)
  const valor = (args.salario_base / 30) * dias
  return {
    resultado: {
      anos_servico: +anos.toFixed(1),
      dias_aviso: dias,
      valor_indenizado: +valor.toFixed(2),
    },
    fundamentacao: "Lei 12.506/2011 — 30 dias + 3 dias/ano a partir do 2º ano, máximo 90 dias",
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function executarFerramentaDP(nome: string, args: Record<string, unknown>): object {
  switch (nome) {
    case "calcular_ferias":    return executarCalcularFerias(args as Parameters<typeof executarCalcularFerias>[0])
    case "calcular_rescisao":  return executarCalcularRescisao(args as Parameters<typeof executarCalcularRescisao>[0])
    case "calcular_13_salario": return executarCalcular13(args as Parameters<typeof executarCalcular13>[0])
    case "calcular_aviso_previo": return executarCalcularAviso(args as Parameters<typeof executarCalcularAviso>[0])
    default: return { erro: `Ferramenta desconhecida: ${nome}` }
  }
}
