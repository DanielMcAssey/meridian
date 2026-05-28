import { z } from 'zod'
import { and, count, eq, gt } from 'drizzle-orm'
import { VALID_DIFFICULTY_IDS, VALID_MODE_IDS, VALID_ROUND_COUNTS } from '~/config/game'
import { maxPointsPerRound } from '~/utils/scoring'
import { scores, users } from '~/server/db/schema'

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Simple in-memory sliding window: max 10 submissions per IP per minute.
// Resets per entry on window expiry rather than a global sweep.

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT     = 10

const ipWindow = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()

  // Sweep expired entries when the map gets large to prevent unbounded growth.
  if (ipWindow.size > 5_000) {
    for (const [key, val] of ipWindow) {
      if (val.resetAt < now) ipWindow.delete(key)
    }
  }

  const entry = ipWindow.get(ip)
  if (!entry || entry.resetAt < now) {
    ipWindow.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

// ── Validation ────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  name:       z.string().min(1).max(28).trim(),
  score:      z.number().int().min(0),
  correct:    z.number().int().min(0),
  total:      z.number().int().min(1),
  mode:       z.enum(VALID_MODE_IDS),
  difficulty: z.enum(VALID_DIFFICULTY_IDS),
  userId:    z.string().uuid(),
  gameToken: z.string().uuid(),
}).refine(
  (b) => VALID_ROUND_COUNTS.has(b.total),
  { message: 'total must be a valid round count', path: ['total'] },
).refine(
  (b) => b.correct <= b.total,
  { message: 'correct cannot exceed total rounds', path: ['correct'] },
).refine(
  (b) => b.score <= b.correct * maxPointsPerRound(b.difficulty),
  { message: 'score exceeds the maximum achievable for these settings', path: ['score'] },
)

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const ip = (getRequestHeader(event, 'x-forwarded-for') ?? '').split(',')[0]?.trim()
           || event.node.req.socket?.remoteAddress
           || 'unknown'

  if (isRateLimited(ip)) {
    throw createError({ statusCode: 429, message: 'Too many submissions — please wait a moment' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)
  const db   = getDb()
  const now  = Math.floor(Date.now() / 1000)

  // ── Idempotency check ───────────────────────────────────────────────────────
  // If this game token has already been recorded (offline retry, double-submit),
  // skip the insert and return the rank for the already-stored score.
  const existing = db.select({ id: scores.id })
    .from(scores)
    .where(eq(scores.gameToken, body.gameToken))
    .all()[0]

  if (existing) {
    const filter = and(eq(scores.mode, body.mode), eq(scores.difficulty, body.difficulty), eq(scores.total, body.total))
    const rank  = db.select({ rank:  count() }).from(scores).where(and(filter, gt(scores.score, body.score))).all()[0]?.rank  ?? 0
    const total = db.select({ total: count() }).from(scores).where(filter).all()[0]?.total ?? 0
    return { rank: rank + 1, total }
  }

  // ── Upsert user row ─────────────────────────────────────────────────────────
  db.insert(users)
    .values({ id: body.userId, name: body.name, firstSeen: now, lastSeen: now })
    .onConflictDoUpdate({ target: users.id, set: { name: body.name, lastSeen: now } })
    .run()

  // ── Insert score ────────────────────────────────────────────────────────────
  const { userId, gameToken, ...scoreFields } = body
  db.insert(scores).values({ ...scoreFields, userId, gameToken }).run()

  const filter = and(eq(scores.mode, body.mode), eq(scores.difficulty, body.difficulty), eq(scores.total, body.total))
  const rank  = db.select({ rank:  count() }).from(scores).where(and(filter, gt(scores.score, body.score))).all()[0]?.rank  ?? 0
  const total = db.select({ total: count() }).from(scores).where(filter).all()[0]?.total ?? 0

  return { rank: rank + 1, total }
})
