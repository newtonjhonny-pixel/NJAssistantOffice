import { DatabaseSync } from 'node:sqlite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = resolve(__dirname, '../prisma/dev.db')
const db = new DatabaseSync(dbPath)

console.log('▶ Fase 4 — migration iniciada')

const cols = db.prepare(`PRAGMA table_info("ProcedureDocument")`).all()
const hasProcessId = cols.some(c => c.name === 'processId')

if (hasProcessId) {
  console.log('  ⏭  ProcedureDocument.processId já existe — ignorado')
} else {
  db.prepare(`ALTER TABLE "ProcedureDocument" ADD COLUMN "processId" TEXT`).run()
  console.log('  ✅ ProcedureDocument.processId adicionado')
}

db.close()
console.log('✅ Migration Fase 4 concluída')
