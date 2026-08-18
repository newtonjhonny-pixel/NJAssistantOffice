import { DatabaseSync } from 'node:sqlite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new DatabaseSync(resolve(__dirname, '../prisma/dev.db'))

console.log('▶ Fase 5 — migration iniciada')

db.prepare(`
  CREATE TABLE IF NOT EXISTS "RaciMatrix" (
    "id"          TEXT PRIMARY KEY,
    "processId"   TEXT,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "activities"  TEXT NOT NULL DEFAULT '[]',
    "roles"       TEXT NOT NULL DEFAULT '[]',
    "entries"     TEXT NOT NULL DEFAULT '{}',
    "notes"       TEXT,
    "createdAt"   TEXT DEFAULT (datetime('now')),
    "updatedAt"   TEXT DEFAULT (datetime('now'))
  )
`).run()
console.log('  ✅ Tabela RaciMatrix criada (ou já existia)')

db.close()
console.log('✅ Migration Fase 5 concluída')
