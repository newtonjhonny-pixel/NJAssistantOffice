"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PenLine, CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotesClient } from "@/components/notes/NotesClient"
import { MeetingsClient } from "@/components/meetings/MeetingsClient"

type TabId = "anotacoes" | "reunioes"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "anotacoes", label: "Anotações",          icon: PenLine },
  { id: "reunioes",  label: "Pautas de Reuniões", icon: CalendarClock },
]

/**
 * Wrapper do módulo Anotações com navegação secundária.
 * Não cria item novo no menu lateral — as duas áreas vivem sob /anotacoes.
 */
export function AnotacoesModuleClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const [active, setActive] = useState<TabId>(tabParam === "reunioes" ? "reunioes" : "anotacoes")

  useEffect(() => {
    setActive(tabParam === "reunioes" ? "reunioes" : "anotacoes")
  }, [tabParam])

  const go = useCallback((id: TabId) => {
    setActive(id)
    const qs = new URLSearchParams(Array.from(searchParams.entries()))
    if (id === "anotacoes") qs.delete("tab")
    else qs.set("tab", id)
    const s = qs.toString()
    router.replace(s ? `/anotacoes?${s}` : "/anotacoes", { scroll: false })
  }, [router, searchParams])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Navegação secundária */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 shrink-0">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                active === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 min-h-0">
        {active === "anotacoes" ? <NotesClient /> : <MeetingsClient />}
      </div>
    </div>
  )
}
