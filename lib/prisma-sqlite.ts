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

export const prismaSqlite = prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaSqlite = prisma
