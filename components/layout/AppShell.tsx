"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-6">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
