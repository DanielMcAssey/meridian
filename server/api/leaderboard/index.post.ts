import { z } from 'zod'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { VALID_DIFFICULTY_IDS, VALID_MODE_IDS, VALID_ROUND_COUNTS } from '~/config/game'
import { maxPointsPerRound } from '~/utils/scoring'
import { sanitizeName } from '~/utils/sanitizeName'
import { scores, userStats, users } from '~/server/db/schema'
import { createRateLimiter } from '~/server/utils/rateLimit'
import { getClientIp } from '~/server/utils/getClientIp'

const isRateLimited = createRateLimiter(10)

// ── Validation ────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  name:         z.string().min(1).max(28).trim()
                  .transform(sanitizeName)
                  .refine((n) => n.length > 0, { message: 'name is empty after sanitisation' }),
  score:        z.number().int().min(0),
  correct:      z.number().int().min(0),
  total:        z.number().int().min(1),
  mode:         z.enum(VALID_MODE_IDS),
  difficulty:   z.enum(VALID_DIFFICULTY_IDS),
  userId:       z.string().uuid(),
  gameToken:    z.string().uuid(),
  recoveryCode: z.string().uuid().optional(),
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

async function rankResponse(db: DB, filter: SQL | undefined, score: number) {
  const rows = await db.select({
    scoresAhead: sql<number>`count(case when ${scores.score} > ${score} then 1 end)`,
    total:       count(),
  }).from(scores).where(filter)
  const row = rows[0]
  return { rank: (row?.scoresAhead ?? 0) + 1, total: row?.total ?? 0 }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)

  if (isRateLimited(ip)) {
    throw createError({ statusCode: 429, message: 'Too many submissions — please wait a moment' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)
  const db   = await getDb()
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
  const existing = await db.select({ id: scores.id })
    .from(scores)
    .where(eq(scores.gameToken, body.gameToken))

  if (existing[0]) return rankResponse(db, filter, body.score)

  // ── Recovery code check ─────────────────────────────────────────────────────
  // If the user exists and has a recovery code, the submission must include the
  // correct code to prevent someone else submitting scores for a known userId.
  // New users (no DB row yet) are allowed through — they have no code to check.
  const existingUser = await db.select({ recoveryCode: users.recoveryCode })
    .from(users)
    .where(eq(users.id, body.userId))

  if (existingUser[0]?.recoveryCode) {
    if (body.recoveryCode !== existingUser[0].recoveryCode) {
      throw createError({ statusCode: 403, message: 'Invalid recovery code' })
    }
  }

  // ── Upsert user row ─────────────────────────────────────────────────────────
  await db.insert(users)
    .values({ id: body.userId, name: body.name, firstSeen: now, lastSeen: now })
    .onConflictDoUpdate({ target: users.id, set: { name: body.name, lastSeen: now } })

  // ── Insert score ────────────────────────────────────────────────────────────
  const { userId, gameToken, recoveryCode: _rc, name: _name, ...scoreFields } = body
  await db.insert(scores).values({ ...scoreFields, userId, gameToken })

  // ── Upsert cached user stats ────────────────────────────────────────────────
  // Recompute from all scores for this user so the cache stays accurate.
  const [aggregate] = await db.select({
    totalGames:   count(),
    totalCorrect: sql<number>`sum(${scores.correct})`,
    totalRounds:  sql<number>`sum(${scores.total})`,
    bestScore:    sql<number>`max(${scores.score})`,
  }).from(scores).where(eq(scores.userId, userId))

  const [topMode] = await db.select({ mode: scores.mode })
    .from(scores)
    .where(eq(scores.userId, userId))
    .groupBy(scores.mode)
    .orderBy(desc(count()))
    .limit(1)

  const [topDiff] = await db.select({ difficulty: scores.difficulty })
    .from(scores)
    .where(eq(scores.userId, userId))
    .groupBy(scores.difficulty)
    .orderBy(desc(count()))
    .limit(1)

  const statsValues = {
    userId,
    totalGames:         aggregate?.totalGames         ?? 0,
    totalCorrect:       aggregate?.totalCorrect        ?? 0,
    totalRounds:        aggregate?.totalRounds         ?? 0,
    bestScore:          aggregate?.bestScore           ?? 0,
    favoriteMode:       topMode?.mode                 ?? null,
    favoriteDifficulty: topDiff?.difficulty           ?? null,
    updatedAt:          now,
  }

  await db.insert(userStats)
    .values(statsValues)
    .onConflictDoUpdate({ target: userStats.userId, set: statsValues })

  return rankResponse(db, filter, body.score)
})
