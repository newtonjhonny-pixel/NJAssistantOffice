import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('▶ Fase 3 — migration iniciada')

  // 1. Novos campos em ProcedureDocument
  const docFields = [
    `ALTER TABLE "ProcedureDocument" ADD COLUMN "code"       TEXT`,
    `ALTER TABLE "ProcedureDocument" ADD COLUMN "version"    TEXT DEFAULT '1.0'`,
    `ALTER TABLE "ProcedureDocument" ADD COLUMN "docStatus"  TEXT DEFAULT 'RASCUNHO'`,
    `ALTER TABLE "ProcedureDocument" ADD COLUMN "nextReview" TEXT`,
    `ALTER TABLE "ProcedureDocument" ADD COLUMN "reviewer"   TEXT`,
    `ALTER TABLE "ProcedureDocument" ADD COLUMN "approver"   TEXT`,
  ]

  for (const sql of docFields) {
    try {
      await prisma.$executeRawUnsafe(sql)
      const col = sql.match(/"(\w+)"\s+TEXT/)[1]
      console.log(`  ✅ ProcedureDocument.${col} adicionado`)
    } catch (e) {
      if (e.message?.includes('duplicate column')) {
        const col = sql.match(/"(\w+)"\s+TEXT/)[1]
        console.log(`  ⏭  ProcedureDocument.${col} já existe — ignorado`)
      } else {
        throw e
      }
    }
  }

  // 2. Tabela Process
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Process" (
      "id"          TEXT PRIMARY KEY,
      "code"        TEXT,
      "name"        TEXT NOT NULL,
      "description" TEXT,
      "objective"   TEXT,
      "owner"       TEXT,
      "department"  TEXT,
      "category"    TEXT,
      "status"      TEXT DEFAULT 'ATIVO',
      "sla"         TEXT,
      "frequency"   TEXT,
      "inputs"      TEXT,
      "outputs"     TEXT,
      "tools"       TEXT,
      "risks"       TEXT,
      "notes"       TEXT,
      "createdAt"   TEXT DEFAULT (datetime('now')),
      "updatedAt"   TEXT DEFAULT (datetime('now'))
    )
  `)
  console.log('  ✅ Tabela Process criada (ou já existia)')

  console.log('✅ Migration Fase 3 concluída com sucesso')
}

main()
  .catch(e => { console.error('❌ Erro:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
