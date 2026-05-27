import { and, count, desc, eq, gt } from 'drizzle-orm'
import type { Difficulty, GameMode, LeaderboardEntry } from '~/types/game'
import { scores } from '~/server/db/schema'

const VALID_DIFFICULTIES = new Set<string>(['easy', 'medium', 'hard', 'expert'])
const VALID_MODES        = new Set<string>(['flag', 'pin', 'cart', 'mixed'])

export default defineEventHandler((event): LeaderboardEntry[] => {
  const query = getQuery(event)

  const limit      = Math.min(Math.abs(Number(query.limit) || 50), 100)
  const difficulty = VALID_DIFFICULTIES.has(query.difficulty as string) ? query.difficulty as Difficulty   : undefined
  const mode       = VALID_MODES.has(query.mode as string)              ? query.mode       as GameMode     : undefined
  const totalRaw   = typeof query.total === 'string'                    ? Number(query.total)              : NaN
  const total      = !isNaN(totalRaw) && totalRaw > 0                   ? totalRaw                        : undefined

  const db = getDb()

  return db
    .select()
    .from(scores)
    .where(and(
      difficulty !== undefined ? eq(scores.difficulty, difficulty) : undefined,
      mode       !== undefined ? eq(scores.mode,       mode)       : undefined,
      total      !== undefined ? eq(scores.total,      total)      : undefined,
    ))
    .orderBy(desc(scores.score), desc(scores.created_at))
    .limit(limit)
    .all() as unknown as LeaderboardEntry[]
})
