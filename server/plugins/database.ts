import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

declare global {
  // eslint-disable-next-line no-var
  var __meridianDb: DatabaseSync | undefined
}

const SCHEMA = `
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
  const config = useRuntimeConfig()
  const dbPath = resolve(config.dbPath as string)

  mkdirSync(dirname(dbPath), { recursive: true })

  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)

  globalThis.__meridianDb = db

  console.log(`[db] SQLite ready at ${dbPath}`)
})
