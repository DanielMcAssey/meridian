import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite'
import type * as schema from '../db/schema'

export type DB = NodeSQLiteDatabase<typeof schema>

declare global {
  // eslint-disable-next-line no-var
  var __meridianDb: DB | undefined
}

export function getDb(): DB {
  const db = globalThis.__meridianDb
  if (!db) throw new Error('[db] Database not initialised — Nitro plugin may not have run yet')
  return db
}
