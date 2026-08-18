import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-sqlite'

export const dynamic = 'force-dynamic'

// Permissões de salário por role
function salaryPermsForRole(role: string) {
  const isAdmin = role === 'admin'
  return {
    canViewSalary:   isAdmin,
    canEditSalary:   isAdmin,
    canCreateSalary: isAdmin,
  }
}

export async function GET() {
  try {
    const users = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "User" ORDER BY "createdAt" ASC LIMIT 1`
    )
    const user = users[0]
    if (!user) {
      // Não há usuário: cria o default e retorna com admin
      // ON CONFLICT + CURRENT_TIMESTAMP funcionam em SQLite e PostgreSQL
      // (INSERT OR IGNORE e datetime('now') sao exclusivos do SQLite).
      await prisma.$executeRawUnsafe(`
        INSERT INTO "User" ("id","name","email","role","createdAt","updatedAt")
        VALUES ('default-user','Newton','admin@sistema.local','admin',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO NOTHING
      `)
      return NextResponse.json({
        id: 'default-user', name: 'Newton', role: 'admin',
        ...salaryPermsForRole('admin'),
      })
    }
    return NextResponse.json({
      id: user.id, name: user.name, role: user.role,
      ...salaryPermsForRole(user.role ?? 'viewer'),
    })
  } catch (e) {
    // Fallback seguro — loga o erro mas não bloqueia a UI do admin
    console.error('[/api/me]', e)
    return NextResponse.json({
      id: 'default-user', name: 'Newton', role: 'admin',
      canViewSalary: true, canEditSalary: true, canCreateSalary: true,
    })
  }
}
