"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  CheckSquare,
  Sparkles,
  Bot,
  FolderKanban,
  ShieldCheck,
  Users,
  PenLine,
  Presentation,
  Workflow,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/",             label: "Dashboard",          icon: LayoutDashboard },
  { href: "/inbox",        label: "Central de Entrada", icon: Inbox },
  { href: "/agenda",       label: "Calendário",         icon: CalendarDays },
  { href: "/tasks",        label: "Tarefas",            icon: CheckSquare },
  { href: "/anotacoes",    label: "Anotações",          icon: PenLine },
  { href: "/especialistas", label: "Especialistas",        icon: Sparkles },
  { href: "/projetos",     label: "Projetos",           icon: FolderKanban },
  { href: "/conferencia",  label: "Conferência",        icon: ShieldCheck },
  { href: "/processos",    label: "Processos",          icon: Workflow },
  { href: "/gestao-equipe",   label: "Gestão de Equipe",  icon: Users },
  { href: "/apresentacoes",   label: "Apresentações",     icon: Presentation },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  const sidebar = (
    <aside
      className={cn(
        "flex h-full w-72 max-w-[85vw] shrink-0 flex-col bg-slate-900 text-white shadow-2xl transition-transform duration-200 lg:w-64 lg:shadow-none",
        "fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
      aria-label="Navegação principal"
    >
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
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          // "Tarefas" fica ativo em /tasks e qualquer sub-rota
          const active = href === "/tasks"
            ? pathname.startsWith("/tasks") || pathname === "/pendencias" || pathname === "/historico"
            : href === "/anotacoes"
            ? pathname.startsWith("/anotacoes")
            : href === "/especialistas"
            ? pathname.startsWith("/especialistas")
            : href === "/apresentacoes"
            ? pathname.startsWith("/apresentacoes")
            : href === "/processos"
            ? pathname.startsWith("/processos")
            : pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
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

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-label="Fechar menu"
        />
      )}
      {sidebar}
    </>
  )
}
