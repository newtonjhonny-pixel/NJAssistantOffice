"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, FileText, Mail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { cn, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, formatDate, isOverdue } from "@/lib/utils"

interface Task {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  person: string | null
  dueDate: string | null
}

interface InboxItem {
  id: string
  sender: string
  subject: string
  summary: string | null
  receivedAt: string
}

export function BuscaClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [results, setResults] = useState<{ tasks: Task[]; inbox: InboxItem[] } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = searchParams.get("q")
    if (q) {
      setQuery(q)
      search(q)
    }
  }, [searchParams])

  async function search(q: string) {
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/busca?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const total = (results?.tasks.length || 0) + (results?.inbox.length || 0)

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Busca Global</h2>
        <p className="text-sm text-slate-500">Pesquise tarefas, mensagens, responsáveis e mais</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Digite para buscar..."
            autoFocus
            className="w-full pl-12 pr-4 py-4 text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
        </div>
      </form>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!loading && results && (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">
            <strong>{total}</strong> resultado(s) para "{searchParams.get("q")}"
          </p>

          {/* Tarefas */}
          {results.tasks.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Tarefas ({results.tasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {results.tasks.map(task => (
                    <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {task.person && <span className="text-xs text-slate-400">👤 {task.person}</span>}
                          {task.dueDate && (
                            <span className={cn("text-xs", isOverdue(task.dueDate) && task.status !== 'CONCLUIDA' ? "text-red-500" : "text-slate-400")}>
                              📅 {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
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
              </CardContent>
            </Card>
          )}

          {/* Inbox */}
          {results.inbox.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-green-500" />
                  Caixa de Entrada ({results.inbox.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {results.inbox.map(item => (
                    <Link key={item.id} href="/inbox" className="block px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 truncate">{item.subject}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.sender}</p>
                          {item.summary && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.summary}</p>}
                        </div>
                        <p className="text-xs text-slate-400 shrink-0">{formatDate(item.receivedAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {total === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum resultado encontrado</p>
              <p className="text-sm mt-1">Tente palavras-chave diferentes.</p>
            </div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="text-center py-16 text-slate-300">
          <Search className="w-16 h-16 mx-auto mb-4" />
          <p className="text-slate-400">Digite algo para começar a busca</p>
        </div>
      )}
    </div>
  )
}
