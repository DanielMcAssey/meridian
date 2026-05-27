import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-sqlite'
import * as schema from '../db/schema'

// Keeps the table and index in sync with the Drizzle schema definition.
// Drizzle Kit (drizzle-kit generate / migrate) can take over this if the
// schema ever grows to multiple tables or needs alter-column migrations.
const BOOTSTRAP_SQL = `
  CREATE TABLE IF NOT EXISTS scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    score      INTEGER NOT NULL,
    correct    INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    mode       TEXT    NOT NULL,
    difficulty TEXT    NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
`

export default defineNitroPlugin(() => {
  const config  = useRuntimeConfig()
  const dbPath  = resolve(config.dbPath as string)

  mkdirSync(dirname(dbPath), { recursive: true })

  const sqlite = new DatabaseSync(dbPath)
  sqlite.exec('PRAGMA journal_mode = WAL')
  sqlite.exec('PRAGMA foreign_keys = ON')
  sqlite.exec(BOOTSTRAP_SQL)

  globalThis.__meridianDb = drizzle({ client: sqlite, schema })

  console.log(`[db] SQLite ready at ${dbPath}`)
})
