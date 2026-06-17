import { and, desc, eq, gte } from 'drizzle-orm'
import type { Difficulty, GameMode, LeaderboardResponse, LeaderboardRow } from '~/types/game'
import type { LeaderboardPeriod } from '~/config/game'
import { VALID_DIFFICULTIES, VALID_MODES, VALID_PERIODS, periodCutoff } from '~/config/game'
import { scores, users } from '~/server/db/schema'
import { createRateLimiter } from '~/server/utils/rateLimit'
import { getClientIp } from '~/server/utils/getClientIp'

const isRateLimited = createRateLimiter(60)

// ── Type-safe filter helpers ──────────────────────────────────────────────────

function validDifficulty(v: unknown): Difficulty | undefined {
  return typeof v === 'string' && VALID_DIFFICULTIES.has(v) ? (v as Difficulty) : undefined
}

function validMode(v: unknown): GameMode | undefined {
  return typeof v === 'string' && VALID_MODES.has(v) ? (v as GameMode) : undefined
}

function validPeriod(v: unknown): LeaderboardPeriod {
  return typeof v === 'string' && VALID_PERIODS.has(v) ? (v as LeaderboardPeriod) : 'all'
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event): Promise<LeaderboardResponse> => {
  const ip = getClientIp(event)

  if (isRateLimited(ip)) {
    throw createError({ statusCode: 429, message: 'Too many requests — please wait a moment' })
  }

  const query      = getQuery(event)
  const limit      = Math.min(Math.abs(Number(query.limit) || 50), 100)
  const difficulty = validDifficulty(query.difficulty)
  const mode       = validMode(query.mode)
  const totalRaw   = typeof query.total === 'string' ? Number(query.total) : NaN
  const total      = !isNaN(totalRaw) && totalRaw > 0 ? totalRaw : undefined
  const cutoff     = periodCutoff(validPeriod(query.period))

  const db = await getDb()

  // Fetch one extra row to detect truncation without a separate COUNT query.
  const raw = await db
    .select({
      id:          scores.id,
      name:        users.name,
      score:       scores.score,
      correct:     scores.correct,
      total:       scores.total,
      mode:        scores.mode,
      difficulty:  scores.difficulty,
      userId:      scores.userId,
      createdAt:   scores.createdAt,
      countryCode: users.countryCode,
    })
    .from(scores)
    .innerJoin(users, eq(scores.userId, users.id))
    .where(and(
      difficulty !== undefined ? eq(scores.difficulty, difficulty) : undefined,
      mode       !== undefined ? eq(scores.mode,       mode)       : undefined,
      total      !== undefined ? eq(scores.total,      total)      : undefined,
      cutoff     !== undefined ? gte(scores.createdAt,  cutoff)     : undefined,
    ))
    .orderBy(desc(scores.score), desc(scores.createdAt))
    .limit(limit + 1) satisfies LeaderboardRow[]

  return {
    rows:    raw.slice(0, limit),
    hasMore: raw.length > limit,
  }
})
