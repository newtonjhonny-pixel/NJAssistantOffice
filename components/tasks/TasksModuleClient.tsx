"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { CheckSquare, AlertCircle, History, ChevronRight, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { TasksClient } from "./TasksClient"
import { PendenciasClient } from "@/components/pendencias/PendenciasClient"
import { HistoricoClient } from "@/components/historico/HistoricoClient"
import { DailyTasksClient } from "./DailyTasksClient"

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  {
    key:   "lista",
    param: "",
    label: "Lista de Tarefas",
    icon:  CheckSquare,
  },
  {
    key:   "diarias",
    param: "diarias",
    label: "Tarefa Diária",
    icon:  CalendarDays,
  },
  {
    key:   "pendencias",
    param: "pendencias",
    label: "Central de Pendências",
    icon:  AlertCircle,
  },
  {
    key:   "historico",
    param: "historico",
    label: "Histórico Geral",
    icon:  History,
  },
] as const

type TabKey = (typeof TABS)[number]["key"]

// ─── Component ────────────────────────────────────────────────────────────────

export function TasksModuleClient() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const tabParam  = searchParams.get("tab") ?? ""
  const activeTab = TABS.find(t => t.param === tabParam) ?? TABS[0]

  function goTab(param: string) {
    router.push(param === "" ? "/tasks" : `/tasks?tab=${param}`)
  }

  const showBreadcrumb = activeTab.key !== "lista"

  return (
    <div className="space-y-0">

      {/* Breadcrumb */}
      {showBreadcrumb && (
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <button
            onClick={() => goTab("")}
            className="hover:text-blue-600 transition-colors font-medium"
          >
            Tarefas
          </button>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-slate-600 font-semibold">{activeTab.label}</span>
        </nav>
      )}

      {/* Tab bar */}
      <div className="-mx-4 mb-5 flex items-end gap-0 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
        {TABS.map(tab => {
          const Icon   = tab.icon
          const active = activeTab.key === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => goTab(tab.param)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-all -mb-[1px]",
                active
                  ? "border-blue-600 text-blue-600 bg-blue-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50/60",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab.key === "lista"      && <TasksClient />}
      {activeTab.key === "diarias"    && <DailyTasksClient />}
      {activeTab.key === "pendencias" && <PendenciasClient />}
      {activeTab.key === "historico"  && <HistoricoClient />}
    </div>
  )
}
