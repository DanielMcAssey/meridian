import { and, desc, eq } from 'drizzle-orm'
import type { Difficulty, GameMode, LeaderboardRow } from '~/types/game'
import { VALID_DIFFICULTIES, VALID_MODES } from '~/config/game'
import { scores } from '~/server/db/schema'

export default defineEventHandler((event): LeaderboardRow[] => {
  const query = getQuery(event)

  const limit      = Math.min(Math.abs(Number(query.limit) || 50), 100)
  const difficulty = VALID_DIFFICULTIES.has(query.difficulty as string) ? query.difficulty as Difficulty : undefined
  const mode       = VALID_MODES.has(query.mode as string)              ? query.mode       as GameMode   : undefined
  const totalRaw   = typeof query.total === 'string'                    ? Number(query.total)            : NaN
  const total      = !isNaN(totalRaw) && totalRaw > 0                   ? totalRaw                      : undefined

  const db = getDb()

  return db
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
    .limit(limit)
    .all() as LeaderboardRow[]
})
