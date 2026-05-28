import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../db/schema'

// Embed migration SQL at build time via Vite's glob import so the content is
// bundled into the server chunk. useStorage('assets:db_migrations') is
// unreliable in serverless environments (Vercel + Turso) — getKeys() can
// silently return [] leaving all tables uncreated.
const rawMigrations = import.meta.glob<string>('../db/migrations/**/migration.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// Splits a SQL file into individual statements, correctly handling single/double/
// backtick-quoted strings, -- line comments, and /* */ block comments.
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

    if (c === '-' && c2 === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      continue
    }

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
      if (stmt) out.push(stmt)
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

  // Prefer the Turso URL when set; fall back to a local SQLite file.
  const tursoUrl   = config.tursoDatabaseUrl as string | undefined
  const authToken  = config.tursoAuthToken as string | undefined
  const isRemote   = !!tursoUrl

  let url: string
  if (isRemote) {
    url = tursoUrl!
  } else {
    const dbPath = resolve(config.dbPath as string)
    try {
      mkdirSync(dirname(dbPath), { recursive: true })
    } catch {
      throw new Error(
        `[db] Cannot create local database directory at "${dirname(dbPath)}". ` +
        'On Vercel or other read-only hosts set NUXT_TURSO_DATABASE_URL and NUXT_TURSO_AUTH_TOKEN.',
      )
    }
    url = `file:${dbPath}`
  }

  const client = createClient({ url, authToken: authToken || undefined })

  // WAL mode and foreign-key enforcement only apply to local SQLite files.
  if (!isRemote) {
    await client.execute('PRAGMA journal_mode = WAL')
    await client.execute('PRAGMA foreign_keys = ON')
  }

  const db = drizzle({ client, schema })

  // Migration-tracking table.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _meridian_migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `)

  // Sort by directory name (timestamp-prefixed → lexicographic = chronological).
  const migrations = Object.entries(rawMigrations)
    .map(([path, sql]) => ({ name: path.split('/').at(-2)!, sql: sql as string }))
    .sort((a, b) => a.name.localeCompare(b.name))

  for (const { name, sql } of migrations) {
    const existing = await client.execute({
      sql:  'SELECT 1 FROM _meridian_migrations WHERE name = ?',
      args: [name],
    })
    if (existing.rows.length > 0) continue

    // Run all statements from the migration file plus the tracking INSERT as a
    // single batch so the migration is never partially applied.
    const stmts = splitSqlStatements(sql).map((s) => ({ sql: s, args: [] as never[] }))
    stmts.push({ sql: `INSERT OR IGNORE INTO _meridian_migrations (name) VALUES ('${name}')`, args: [] })

    await client.batch(stmts, 'write')

    console.log(`[db] Applied migration: ${name}`)
  }

  globalThis.__meridianDb = db
  console.log(`[db] Database ready — ${isRemote ? url.replace(/\?.*/, '') : url}`)
})
