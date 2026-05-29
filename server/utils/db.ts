import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from '../db/schema'
import { MIGRATIONS } from '../db/migrations/list'

export type DB = LibSQLDatabase<typeof schema>

// Stored on globalThis so it survives Nitro hot-module re-evaluations in dev.
// A plain module-level variable resets to null on every HMR reload, causing
// createDb() to run again and opening a second client against the same file.
declare global {
  // eslint-disable-next-line no-var
  var __meridianDbInit: Promise<DB> | undefined
}

// Splits a SQL file into individual statements, handling quoted strings and comments.
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

async function createDb(): Promise<DB> {
  const config   = useRuntimeConfig()
  const tursoUrl = config.tursoDatabaseUrl as string | undefined
  const authToken = config.tursoAuthToken as string | undefined
  const isRemote  = !!tursoUrl

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

  if (!isRemote) {
    await client.execute('PRAGMA journal_mode = WAL')
    await client.execute('PRAGMA foreign_keys = ON')
  }

  const db = drizzle({ client, schema })

  await client.execute(`
    CREATE TABLE IF NOT EXISTS _meridian_migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `)

  for (const { name, sql } of MIGRATIONS) {
    const existing = await client.execute({
      sql:  'SELECT 1 FROM _meridian_migrations WHERE name = ?',
      args: [name],
    })
    if (existing.rows.length > 0) continue

    const stmts = splitSqlStatements(sql).map((s) => ({ sql: s, args: [] as never[] }))
    stmts.push({ sql: 'INSERT OR IGNORE INTO _meridian_migrations (name) VALUES (?)', args: [name] as never[] })
    await client.batch(stmts, 'write')

    console.log(`[db] Applied migration: ${name}`)
  }

  console.log(`[db] Ready — ${isRemote ? url.replace(/\?.*/, '') : url}`)
  return db
}

/**
 * Returns the shared DB instance, initialising it on first call.
 * Safe to call from plugins (pre-warm) and request handlers (fallback).
 * Clears the cached promise on failure so the next request can retry.
 */
export function getDb(): Promise<DB> {
  if (!globalThis.__meridianDbInit) {
    globalThis.__meridianDbInit = createDb().catch((e) => {
      globalThis.__meridianDbInit = undefined
      throw e
    })
  }
  return globalThis.__meridianDbInit
}
