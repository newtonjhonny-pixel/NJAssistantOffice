import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
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
