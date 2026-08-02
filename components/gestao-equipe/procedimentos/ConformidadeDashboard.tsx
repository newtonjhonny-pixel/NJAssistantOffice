"use client"

import { useState, useEffect, useCallback } from "react"
import { ShieldCheck, AlertTriangle, BookOpen, GraduationCap, Clock, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConformidadeData {
  total: number
  vigente: number
  revisao: number
  rascunho: number
  obsoleto: number
  score: number
  semLeituraTotal: number
  treinamentosPendentesTotal: number
  alertas: {
    abandonados:            { id: string; title: string; type: string; updatedAt: string }[]
    riscosCriticos:         { docId: string; docTitle: string; risco: string }[]
    semLeitura:             { id: string; title: string; type: string; ultimaLeitura: string | null }[]
    treiamentosPendentes:   { docId: string; docTitle: string; count: number }[]
  }
}

function ScoreRing({ score }: { score: number }) {
  const r  = 36
  const cx = 44
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444"

  return (
    <svg width={cx * 2} height={cx * 2} viewBox={`0 0 ${cx * 2} ${cx * 2}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} />
      <text x={cx} y={cx + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="15" fontWeight="700" fill={color}>{score}%</text>
    </svg>
  )
}

export function ConformidadeDashboard() {
  const [data,    setData]    = useState<ConformidadeData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/procedures/conformidade')
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
    </div>
  )

  if (!data) return null

  const scoreColor = data.score >= 80 ? "text-green-600" : data.score >= 50 ? "text-amber-500" : "text-red-500"
  const totalAlertas = data.alertas.abandonados.length + data.alertas.riscosCriticos.length +
    data.alertas.semLeitura.length + data.alertas.treiamentosPendentes.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Painel de Conformidade</p>
        <button onClick={load} type="button" className="p-1 text-slate-400 hover:text-slate-600 rounded">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Linha de métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Score */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4">
          <ScoreRing score={data.score} />
          <div>
            <p className="text-xs text-slate-500">Score Geral</p>
            <p className={cn("text-lg font-bold", scoreColor)}>{data.score}%</p>
            <p className="text-xs text-slate-400">{data.vigente} vigentes</p>
          </div>
        </div>

        {/* Sem leitura */}
        <div className={cn(
          "rounded-2xl border p-4 flex items-center gap-3",
          data.semLeituraTotal > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
        )}>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            data.semLeituraTotal > 0 ? "bg-amber-100" : "bg-slate-100")}>
            <BookOpen className={cn("w-4 h-4", data.semLeituraTotal > 0 ? "text-amber-600" : "text-slate-400")} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Sem leitura (90d)</p>
            <p className={cn("text-xl font-bold", data.semLeituraTotal > 0 ? "text-amber-700" : "text-slate-600")}>
              {data.semLeituraTotal}
            </p>
          </div>
        </div>

        {/* Treinamentos pendentes */}
        <div className={cn(
          "rounded-2xl border p-4 flex items-center gap-3",
          data.treinamentosPendentesTotal > 0 ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
        )}>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            data.treinamentosPendentesTotal > 0 ? "bg-blue-100" : "bg-slate-100")}>
            <GraduationCap className={cn("w-4 h-4", data.treinamentosPendentesTotal > 0 ? "text-blue-600" : "text-slate-400")} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Trein. pendentes</p>
            <p className={cn("text-xl font-bold", data.treinamentosPendentesTotal > 0 ? "text-blue-700" : "text-slate-600")}>
              {data.treinamentosPendentesTotal}
            </p>
          </div>
        </div>

        {/* Riscos críticos */}
        <div className={cn(
          "rounded-2xl border p-4 flex items-center gap-3",
          data.alertas.riscosCriticos.length > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
        )}>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            data.alertas.riscosCriticos.length > 0 ? "bg-red-100" : "bg-slate-100")}>
            <AlertTriangle className={cn("w-4 h-4", data.alertas.riscosCriticos.length > 0 ? "text-red-600" : "text-slate-400")} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Riscos críticos</p>
            <p className={cn("text-xl font-bold", data.alertas.riscosCriticos.length > 0 ? "text-red-700" : "text-slate-600")}>
              {data.alertas.riscosCriticos.length}
            </p>
          </div>
        </div>
      </div>

      {/* Alertas detalhados */}
      {totalAlertas > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          <div className="px-4 py-2.5 flex items-center gap-2 bg-slate-50">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs font-semibold text-slate-600">Alertas de conformidade</p>
          </div>

          {data.alertas.riscosCriticos.map((a, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-700">{a.docTitle}</p>
                <p className="text-xs text-red-600">Risco crítico sem controle: {a.risco}</p>
              </div>
            </div>
          ))}

          {data.alertas.semLeitura.map(a => (
            <div key={a.id as string} className="flex items-start gap-3 px-4 py-3">
              <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-700">{a.title as string}</p>
                <p className="text-xs text-amber-600">
                  {a.ultimaLeitura ? `Última leitura em ${new Date(a.ultimaLeitura).toLocaleDateString("pt-BR")} — mais de 90 dias` : "Sem nenhum registro de leitura"}
                </p>
              </div>
            </div>
          ))}

          {data.alertas.treiamentosPendentes.map(a => (
            <div key={a.docId} className="flex items-start gap-3 px-4 py-3">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-700">{a.docTitle}</p>
                <p className="text-xs text-blue-600">{a.count} treinamento{a.count > 1 ? "s" : ""} pendente{a.count > 1 ? "s" : ""}</p>
              </div>
            </div>
          ))}

          {data.alertas.abandonados.map(a => (
            <div key={a.id as string} className="flex items-start gap-3 px-4 py-3">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-700">{a.title as string}</p>
                <p className="text-xs text-slate-500">
                  Rascunho sem atualização desde {new Date(a.updatedAt as string).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalAlertas === 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700 font-medium">Todos os documentos estão em conformidade. Nenhum alerta ativo.</p>
        </div>
      )}
    </div>
  )
}
