import type { DatabaseSync } from 'node:sqlite'

export function getDb(): DatabaseSync {
  const db = globalThis.__meridianDb
  if (!db) throw new Error('[db] Database not initialised — Nitro plugin may not have run yet')
  return db
}
