import { PrismaClient } from '@prisma/client'
import type { PrismaClient as PrismaClientType } from '@prisma/client'

type PrismaClientConstructor = new (opts?: { log?: string[] }) => PrismaClientType

function resolvePrismaClient(): PrismaClientConstructor {
  if (process.env.NODE_ENV === 'production') return PrismaClient as PrismaClientConstructor

  try {
    // Use the SQLite-compiled client in local development when available.
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
  prismaSqlite: PrismaClientType | undefined
}

export const prisma: PrismaClientType =
  globalForPrisma.prismaSqlite ??
  new (resolvePrismaClient())({ log: ['error'] })

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

export const prismaSqlite = prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaSqlite = prisma
