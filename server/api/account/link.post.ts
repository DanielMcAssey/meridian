import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '~/server/db/schema'
import { createRateLimiter } from '~/server/utils/rateLimit'
import { getClientIp } from '~/server/utils/getClientIp'

const isRateLimited = createRateLimiter(5)

// Maximum failures before a userId is locked out for LOCKOUT_SECS.
const MAX_FAILURES  = 10
const LOCKOUT_SECS  = 60 * 60 // 1 hour

const bodySchema = z.object({
  userId:       z.string().uuid(),
  recoveryCode: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)

  if (isRateLimited(ip)) {
    console.warn('[account:link] rate limited', { ip })
    throw createError({ statusCode: 429, message: 'Too many requests — please wait a moment' })
  }

  const { userId, recoveryCode } = await readValidatedBody(event, bodySchema.parse)
  const db  = await getDb()
  const now = Math.floor(Date.now() / 1000)

  const row = await db.select({
    name:            users.name,
    recoveryCode:    users.recoveryCode,
    linkFailCount:   users.linkFailCount,
    linkLockedUntil: users.linkLockedUntil,
  }).from(users).where(eq(users.id, userId))

  if (!row[0]) {
    // userId not in DB — no counter to update; don't reveal whether userId exists
    console.warn('[account:link] unknown userId', { ip })
    throw createError({ statusCode: 401, message: 'Invalid recovery code' })
  }

  const user = row[0]

  // ── Per-userId lockout check ─────────────────────────────────────────────────
  if (user.linkLockedUntil !== null && user.linkLockedUntil > now) {
    const remaining = user.linkLockedUntil - now
    console.warn('[account:link] account locked', { userId, ip, remainingSecs: remaining })
    throw createError({ statusCode: 429, message: 'Too many failed attempts — try again later' })
  }

  // Reset counter if a previous lockout has expired
  if (user.linkLockedUntil !== null && user.linkLockedUntil <= now) {
    await db.update(users)
      .set({ linkFailCount: 0, linkLockedUntil: null })
      .where(eq(users.id, userId))
    user.linkFailCount   = 0
    user.linkLockedUntil = null
  }

  // ── Timing-safe recovery code comparison ─────────────────────────────────────
  const storedCode = user.recoveryCode
  const valid = storedCode !== null
    && storedCode.length === recoveryCode.length
    && timingSafeEqual(Buffer.from(storedCode), Buffer.from(recoveryCode))

  if (!valid) {
    const newFailCount   = user.linkFailCount + 1
    const lockUntil      = newFailCount >= MAX_FAILURES ? now + LOCKOUT_SECS : null
    await db.update(users)
      .set({ linkFailCount: newFailCount, linkLockedUntil: lockUntil })
      .where(eq(users.id, userId))
    console.warn('[account:link] invalid code', { userId, ip, failCount: newFailCount, locked: lockUntil !== null })
    throw createError({ statusCode: 401, message: 'Invalid recovery code' })
  }

  // ── Success — reset lockout state ─────────────────────────────────────────────
  await db.update(users)
    .set({ linkFailCount: 0, linkLockedUntil: null })
    .where(eq(users.id, userId))

  console.log('[account:link] success', { userId, ip })
  return { name: user.name }
})
