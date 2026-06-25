"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import {
  cn, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS,
  formatDate, isOverdue
} from "@/lib/utils"

interface Task {
  id: string
  title: string
  priority: string
  status: string
  person: string | null
  dueDate: string | null
  observations: string | null
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export function AgendaClient() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [today] = useState(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then(setTasks)
  }, [])

  function prevMonth() {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function getTasksForDay(day: number) {
    const date = new Date(year, month, day)
    return tasks.filter(t => {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  const selectedDayTasks = getTasksForDay(selectedDay.getDate())
  const overdueTasks = tasks.filter(
    t => t.dueDate && isOverdue(t.dueDate) && t.status !== 'CONCLUIDA' && t.status !== 'CANCELADA'
  )
  const waitingTasks = tasks.filter(t => t.status === 'AGUARDANDO_RETORNO')

  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

  const isSelected = (day: number) =>
    selectedDay.getDate() === day && selectedDay.getMonth() === month && selectedDay.getFullYear() === year

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Agenda de Trabalho</h2>
        <Link href="/tasks/new">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Nova Atividade
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-500" />
              </button>
              <CardTitle className="text-base">
                {MONTHS[month]} {year}
              </CardTitle>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dayTasks = getTasksForDay(day)
                  const hasOverdue = dayTasks.some(t => isOverdue(t.dueDate) && t.status !== 'CONCLUIDA')
                  const hasUrgent = dayTasks.some(t => t.priority === 'URGENTE')
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(new Date(year, month, day))}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-start pt-1.5 rounded-lg text-sm transition-all relative",
                        isSelected(day) && "bg-blue-600 text-white shadow-md",
                        isToday(day) && !isSelected(day) && "ring-2 ring-blue-400 ring-offset-1",
                        !isSelected(day) && "hover:bg-slate-100 text-slate-700",
                        dayTasks.length > 0 && !isSelected(day) && "bg-slate-50"
                      )}
                    >
                      <span className="font-medium text-xs">{day}</span>
                      {dayTasks.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                          {hasOverdue && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected(day) ? "bg-red-300" : "bg-red-500")} />}
                          {hasUrgent && !hasOverdue && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected(day) ? "bg-orange-300" : "bg-orange-500")} />}
                          {dayTasks.length > 0 && !hasOverdue && !hasUrgent && (
                            <span className={cn("w-1.5 h-1.5 rounded-full", isSelected(day) ? "bg-blue-200" : "bg-blue-400")} />
                          )}
                          {dayTasks.length > 1 && (
                            <span className={cn("text-[9px] leading-none", isSelected(day) ? "text-blue-100" : "text-slate-400")}>
                              {dayTasks.length}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Atrasada</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Urgente</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Tarefa</div>
              </div>
            </CardContent>
          </Card>

          {/* Tarefas do dia selecionado */}
          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm">
                📅 {selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </CardTitle>
              <Link href={`/tasks/new`}>
                <Button size="sm" variant="outline">
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedDayTasks.length ? (
                <p className="px-5 py-6 text-sm text-slate-400 text-center">
                  Nenhuma atividade para este dia.
                </p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {selectedDayTasks.map(task => (
                    <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600">{task.title}</p>
                        {task.person && <p className="text-xs text-slate-400 mt-0.5">{task.person}</p>}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <span className={cn("text-xs border rounded-full px-2 py-0.5", PRIORITY_COLORS[task.priority])}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className={cn("text-xs border rounded-full px-2 py-0.5", STATUS_COLORS[task.status])}>
                          {STATUS_LABELS[task.status]}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          {/* Atrasadas */}
          <Card className="border-red-200">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-red-600">⚠️ Atividades Atrasadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!overdueTasks.length ? (
                <p className="px-4 py-4 text-xs text-slate-400">Nenhuma atividade atrasada. ✅</p>
              ) : (
                <div className="divide-y divide-red-50">
                  {overdueTasks.slice(0, 5).map(t => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="block px-4 py-2.5 hover:bg-red-50 transition-colors">
                      <p className="text-xs font-medium text-slate-700 truncate">{t.title}</p>
                      <p className="text-xs text-red-500 mt-0.5">{formatDate(t.dueDate)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aguardando retorno */}
          <Card className="border-purple-200">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-purple-600">⏳ Aguardando Retorno</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!waitingTasks.length ? (
                <p className="px-4 py-4 text-xs text-slate-400">Nenhuma atividade aguardando. ✅</p>
              ) : (
                <div className="divide-y divide-purple-50">
                  {waitingTasks.slice(0, 5).map(t => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="block px-4 py-2.5 hover:bg-purple-50 transition-colors">
                      <p className="text-xs font-medium text-slate-700 truncate">{t.title}</p>
                      {t.person && <p className="text-xs text-slate-400 mt-0.5">{t.person}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações do dia */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">📝 Observações do dia</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Anote aqui observações, recados, lembretes do dia..."
                rows={5}
                className="w-full text-sm text-slate-700 placeholder-slate-400 resize-none focus:outline-none"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
