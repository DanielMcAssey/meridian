import { z } from 'zod'
import { and, count, eq, sql } from 'drizzle-orm'
import { VALID_DIFFICULTY_IDS, VALID_MODE_IDS, VALID_ROUND_COUNTS } from '~/config/game'
import { maxPointsPerRound } from '~/utils/scoring'
import { scores, users } from '~/server/db/schema'
import { createRateLimiter } from '~/server/utils/rateLimit'

// ── Rate limiting ─────────────────────────────────────────────────────────────
// 10 submissions per IP per minute.
// NOTE: reads x-forwarded-for which can be spoofed if not behind a trusted
// reverse proxy (Nginx, Cloudflare, etc.) that strips and re-adds the header.

const isRateLimited = createRateLimiter(10)

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

// ── Rank helper ───────────────────────────────────────────────────────────────
// Single query: counts scores ahead of `score` (for rank) and total scores
// matching the filter, using a conditional aggregate to avoid two round-trips.

import type { DB } from '~/server/utils/db'
import type { SQL } from 'drizzle-orm'

function rankResponse(db: DB, filter: SQL | undefined, score: number) {
  const [row] = db.select({
    scoresAhead: sql<number>`count(case when ${scores.score} > ${score} then 1 end)`,
    total:       count(),
  }).from(scores).where(filter).all()
  return { rank: (row?.scoresAhead ?? 0) + 1, total: row?.total ?? 0 }
}

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

  // Shared filter for rank/total queries — same in both branches.
  const filter = and(
    eq(scores.mode,       body.mode),
    eq(scores.difficulty, body.difficulty),
    eq(scores.total,      body.total),
  )

  // ── Idempotency check ───────────────────────────────────────────────────────
  // If this game token has already been recorded (offline retry, double-submit),
  // skip the insert and return the rank for the already-stored score.
  const existing = db.select({ id: scores.id })
    .from(scores)
    .where(eq(scores.gameToken, body.gameToken))
    .all()[0]

  if (existing) return rankResponse(db, filter, body.score)

  // ── Upsert user row ─────────────────────────────────────────────────────────
  db.insert(users)
    .values({ id: body.userId, name: body.name, firstSeen: now, lastSeen: now })
    .onConflictDoUpdate({ target: users.id, set: { name: body.name, lastSeen: now } })
    .run()

  // ── Insert score ────────────────────────────────────────────────────────────
  const { userId, gameToken, ...scoreFields } = body
  db.insert(scores).values({ ...scoreFields, userId, gameToken }).run()

  return rankResponse(db, filter, body.score)
})
