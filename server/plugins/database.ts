import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-sqlite'
import * as schema from '../db/schema'

// Splits a SQL file into individual statements, correctly handling single/double/
// backtick-quoted strings, -- line comments, and /* */ block comments.
// Modelled after NuxtHub's splitSqlQueries utility.
function splitSqlStatements(sql: string): string[] {
  const out: string[] = []
  let buf = ''
  let inStr = false
  let strChar = ''
  let i = 0

  while (i < sql.length) {
    const c  = sql[i]!
    const c2 = sql[i + 1]

    if (inStr) {
      buf += c
      if (c === strChar) inStr = false
      i++; continue
    }

    // Line comment — skip to end of line
    if (c === '-' && c2 === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      continue
    }

    // Block comment — skip to closing */
    if (c === '/' && c2 === '*') {
      i += 2
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2; continue
    }

    if (c === "'" || c === '"' || c === '`') {
      inStr = true; strChar = c
      buf += c; i++; continue
    }

    if (c === ';') {
      const stmt = buf.trim()
      if (stmt) out.push(stmt + ';')
      buf = ''; i++; continue
    }

    buf += c; i++
  }

  const last = buf.trim()
  if (last) out.push(last)
  return out
}

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const dbPath = resolve(config.dbPath as string)

  mkdirSync(dirname(dbPath), { recursive: true })

  const sqlite = new DatabaseSync(dbPath)
  sqlite.exec('PRAGMA journal_mode = WAL')
  sqlite.exec('PRAGMA foreign_keys = ON')

  const db = drizzle({ client: sqlite, schema })

  // Tracking table — matches NuxtHub's _hub_migrations convention so tooling stays compatible.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _hub_migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `)

  // useStorage('assets:db_migrations') works in dev (FS driver) and production
  // (bundled via Nitro serverAssets) without any manual path resolution.
  // Drizzle-kit v1 generates: <timestamp_name>/migration.sql — unstorage normalises
  // path separators to ':' so keys look like "<timestamp_name>:migration.sql".
  const store = useStorage('assets:db_migrations')
  const keys  = (await store.getKeys())
    .filter((k) => k.split(/[:/]/).pop() === 'migration.sql')
    .sort()

  for (const key of keys) {
    // Strip the trailing separator + "migration.sql" to get the folder name.
    const name = key.replace(/[:/]migration\.sql$/, '')

    if (sqlite.prepare('SELECT 1 FROM _hub_migrations WHERE name = ?').get(name)) continue

    const sql = await store.getItem<string>(key)
    if (!sql) continue

    // Append the tracking INSERT before splitting so it runs in the same batch —
    // if any earlier statement fails the migration is never marked as applied.
    const full = sql + `\nINSERT OR IGNORE INTO _hub_migrations (name) VALUES ('${name}');`
    for (const stmt of splitSqlStatements(full)) {
      sqlite.exec(stmt)
    }

    console.log(`[db] Applied migration: ${name}`)
  }

  globalThis.__meridianDb = db
  console.log(`[db] SQLite ready at ${dbPath}`)
})
