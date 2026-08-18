import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ProcedureFlow (
      id         TEXT NOT NULL PRIMARY KEY,
      documentId TEXT NOT NULL,
      type       TEXT NOT NULL,
      content    TEXT NOT NULL,
      createdAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (documentId) REFERENCES ProcedureDocument(id) ON DELETE CASCADE,
      UNIQUE(documentId, type)
    )
  `)
  console.log("ProcedureFlow table created (or already exists).")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
