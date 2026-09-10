import { PrismaClient } from '@prisma/client'
import type { PrismaClient as PrismaClientType } from '@prisma/client'

type PrismaClientConstructor = new (opts?: { log?: string[] }) => PrismaClientType

/**
 * `@prisma/client` é gerado a partir de schema.production.prisma (PostgreSQL),
 * que é o alvo do build de produção. Em desenvolvimento o DATABASE_URL aponta
 * para SQLite, então é preciso usar o client compilado para SQLite —
 * mesma resolução já aplicada em lib/prisma-sqlite.ts.
 *
 * Sem isso, toda query feita por este módulo falha em dev com
 * "Invalid `prisma.*` invocation" (provider incompatível com a URL).
 */
function resolvePrismaClient(): PrismaClientConstructor {
  if (process.env.NODE_ENV === 'production') return PrismaClient as PrismaClientConstructor

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqliteClient = require('../node_modules/.prisma/client-sqlite') as {
      PrismaClient: PrismaClientConstructor
    }
    return sqliteClient.PrismaClient
  } catch {
    return PrismaClient as PrismaClientConstructor
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
}

export const prisma: PrismaClientType =
  globalForPrisma.prisma ??
  new (resolvePrismaClient())({
    log: ['error'],
  })

const prismaWithRawCompat = prisma as unknown as {
  __rawCompatPatched?: boolean
  $queryRawUnsafe: (...args: unknown[]) => unknown
  $executeRawUnsafe: (...args: unknown[]) => unknown
}

function shouldUsePostgresPlaceholders() {
  return (process.env.DATABASE_URL ?? '').startsWith('postgresql://')
    || (process.env.DATABASE_URL ?? '').startsWith('postgres://')
}

function convertQuestionPlaceholders(sql: string) {
  let index = 0
  return sql.replace(/\?/g, () => `$${++index}`)
}

if (!prismaWithRawCompat.__rawCompatPatched) {
  const queryRawUnsafe = prismaWithRawCompat.$queryRawUnsafe.bind(prisma)
  const executeRawUnsafe = prismaWithRawCompat.$executeRawUnsafe.bind(prisma)

  prismaWithRawCompat.$queryRawUnsafe = (sql: unknown, ...params: unknown[]) => {
    if (typeof sql === 'string' && params.length > 0 && shouldUsePostgresPlaceholders() && !/\$\d+/.test(sql)) {
      return queryRawUnsafe(convertQuestionPlaceholders(sql), ...params)
    }
    return queryRawUnsafe(sql, ...params)
  }

  prismaWithRawCompat.$executeRawUnsafe = (sql: unknown, ...params: unknown[]) => {
    if (typeof sql === 'string' && params.length > 0 && shouldUsePostgresPlaceholders() && !/\$\d+/.test(sql)) {
      return executeRawUnsafe(convertQuestionPlaceholders(sql), ...params)
    }
    return executeRawUnsafe(sql, ...params)
  }

  prismaWithRawCompat.__rawCompatPatched = true
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
