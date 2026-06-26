"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  CheckSquare,
  MessageSquare,
  Bot,
  Plug,
  FolderKanban,
  ShieldCheck,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/",             label: "Dashboard",       icon: LayoutDashboard },
  { href: "/inbox",        label: "Caixa de Entrada", icon: Inbox },
  { href: "/agenda",       label: "Calendário",       icon: CalendarDays },
  { href: "/tasks",        label: "Tarefas",          icon: CheckSquare },
  { href: "/assistente",   label: "Assistente NJ",    icon: MessageSquare },
  { href: "/projetos",     label: "Projetos",         icon: FolderKanban },
  { href: "/conferencia",  label: "Conferência",      icon: ShieldCheck },
  { href: "/gestao-equipe",label: "Gestão de Equipe", icon: Users },
  { href: "/integracoes",  label: "Integrações",      icon: Plug },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">NJ Assistant</h1>
            <p className="text-xs text-slate-400 leading-tight">Office</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          // "Tarefas" fica ativo em /tasks e qualquer sub-rota
          const active = href === "/tasks"
            ? pathname.startsWith("/tasks") || pathname === "/pendencias" || pathname === "/historico"
            : pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-bold">
            N
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Newton</p>
            <p className="text-xs text-slate-400 truncate">Administrador</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
