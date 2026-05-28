import { and, desc, eq } from 'drizzle-orm'
import type { Difficulty, GameMode, LeaderboardResponse, LeaderboardRow } from '~/types/game'
import { VALID_DIFFICULTIES, VALID_MODES } from '~/config/game'
import { scores } from '~/server/db/schema'
import { createRateLimiter } from '~/server/utils/rateLimit'

// ── Rate limiting ─────────────────────────────────────────────────────────────
// 60 reads per IP per minute — generous enough for normal browsing.
// NOTE: reads x-forwarded-for which can be spoofed if not behind a trusted
// reverse proxy (Nginx, Cloudflare, etc.) that strips and re-adds the header.

const isRateLimited = createRateLimiter(60)

// ── Type-safe filter helpers ──────────────────────────────────────────────────

function validDifficulty(v: unknown): Difficulty | undefined {
  return typeof v === 'string' && VALID_DIFFICULTIES.has(v) ? (v as Difficulty) : undefined
}

function validMode(v: unknown): GameMode | undefined {
  return typeof v === 'string' && VALID_MODES.has(v) ? (v as GameMode) : undefined
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event): Promise<LeaderboardResponse> => {
  const ip = (getRequestHeader(event, 'x-forwarded-for') ?? '').split(',')[0]?.trim()
           || event.node.req.socket?.remoteAddress
           || 'unknown'

  if (isRateLimited(ip)) {
    throw createError({ statusCode: 429, message: 'Too many requests — please wait a moment' })
  }

  const query      = getQuery(event)
  const limit      = Math.min(Math.abs(Number(query.limit) || 50), 100)
  const difficulty = validDifficulty(query.difficulty)
  const mode       = validMode(query.mode)
  const totalRaw   = typeof query.total === 'string' ? Number(query.total) : NaN
  const total      = !isNaN(totalRaw) && totalRaw > 0 ? totalRaw : undefined

  const db = getDb()

  // Fetch one extra row to detect truncation without a separate COUNT query.
  const raw = await db
    .select({
      id:         scores.id,
      name:       scores.name,
      score:      scores.score,
      correct:    scores.correct,
      total:      scores.total,
      mode:       scores.mode,
      difficulty: scores.difficulty,
      userId:     scores.userId,
      createdAt:  scores.createdAt,
    })
    .from(scores)
    .where(and(
      difficulty !== undefined ? eq(scores.difficulty, difficulty) : undefined,
      mode       !== undefined ? eq(scores.mode,       mode)       : undefined,
      total      !== undefined ? eq(scores.total,      total)      : undefined,
    ))
    .orderBy(desc(scores.score), desc(scores.createdAt))
    .limit(limit + 1) satisfies LeaderboardRow[]

  return {
    rows:    raw.slice(0, limit),
    hasMore: raw.length > limit,
  }
})
