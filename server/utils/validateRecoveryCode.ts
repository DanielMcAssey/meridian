import { timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { DB } from './db'
import { users } from '../db/schema'

const MAX_FAILURES = 10
const LOCKOUT_SECS = 60 * 60 // 1 hour

/**
 * Validates a recovery code for `userId`, enforcing a per-user brute-force
 * lockout.  Throws an H3 error on failure; returns void on success.
 * The same `linkFailCount` / `linkLockedUntil` columns are shared across
 * all endpoints that accept a recovery code.
 */
export async function validateRecoveryCode(
  db:           DB,
  userId:       string,
  recoveryCode: string,
  ip:           string,
  ctx:          string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000)

  const [user] = await db
    .select({
      recoveryCode:    users.recoveryCode,
      linkFailCount:   users.linkFailCount,
      linkLockedUntil: users.linkLockedUntil,
    })
    .from(users)
    .where(eq(users.id, userId))

  if (!user) {
    console.warn(`[${ctx}] unknown userId`, { ip })
    throw createError({ statusCode: 401, message: 'Invalid recovery code' })
  }

  if (user.linkLockedUntil !== null && user.linkLockedUntil > now) {
    console.warn(`[${ctx}] account locked`, { userId, ip, remainingSecs: user.linkLockedUntil - now })
    throw createError({ statusCode: 429, message: 'Too many failed attempts — try again later' })
  }

  if (user.linkLockedUntil !== null && user.linkLockedUntil <= now) {
    await db.update(users).set({ linkFailCount: 0, linkLockedUntil: null }).where(eq(users.id, userId))
    user.linkFailCount   = 0
    user.linkLockedUntil = null
  }

  const stored = user.recoveryCode
  const valid  = stored !== null
    && stored.length === recoveryCode.length
    && timingSafeEqual(Buffer.from(stored), Buffer.from(recoveryCode))

  if (!valid) {
    const newCount  = user.linkFailCount + 1
    const lockUntil = newCount >= MAX_FAILURES ? now + LOCKOUT_SECS : null
    await db.update(users)
      .set({ linkFailCount: newCount, linkLockedUntil: lockUntil })
      .where(eq(users.id, userId))
    console.warn(`[${ctx}] invalid code`, { userId, ip, failCount: newCount, locked: lockUntil !== null })
    throw createError({ statusCode: 401, message: 'Invalid recovery code' })
  }

  await db.update(users).set({ linkFailCount: 0, linkLockedUntil: null }).where(eq(users.id, userId))
  console.log(`[${ctx}] success`, { userId, ip })
}
