import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import * as schema from '../db/schema'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const dbPath = resolve(config.dbPath as string)

  mkdirSync(dirname(dbPath), { recursive: true })

  const sqlite = new DatabaseSync(dbPath)
  sqlite.exec('PRAGMA journal_mode = WAL')
  sqlite.exec('PRAGMA foreign_keys = ON')

  const db = drizzle({ client: sqlite, schema })

  // In dev, read migrations from source. In production, Nitro copies them to
  // assets/db_migrations/ alongside the server bundle entry point.
  const migrationsFolder = import.meta.dev
    ? resolve(process.cwd(), 'server/db/migrations')
    : join(dirname(process.argv[1]!), 'assets/db_migrations')

  migrate(db, { migrationsFolder })

  globalThis.__meridianDb = db

  console.log(`[db] SQLite ready at ${dbPath}`)
})
