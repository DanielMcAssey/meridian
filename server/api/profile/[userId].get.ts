import { desc, eq } from 'drizzle-orm'
import { scores, userStats, users } from '~/server/db/schema'
import { createRateLimiter } from '~/server/utils/rateLimit'
import { getClientIp } from '~/server/utils/getClientIp'
import { z } from 'zod'

const isRateLimited = createRateLimiter(60)

const paramsSchema = z.object({ userId: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  if (isRateLimited(ip)) {
    throw createError({ statusCode: 429, message: 'Too many requests' })
  }

  const { userId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const db = await getDb()

  const [user] = await db.select({
    name:        users.name,
    bio:         users.bio,
    countryCode: users.countryCode,
    firstSeen:   users.firstSeen,
  }).from(users).where(eq(users.id, userId))

  if (!user) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const [stats] = await db.select({
    totalGames:         userStats.totalGames,
    totalCorrect:       userStats.totalCorrect,
    totalRounds:        userStats.totalRounds,
    bestScore:          userStats.bestScore,
    favoriteMode:       userStats.favoriteMode,
    favoriteDifficulty: userStats.favoriteDifficulty,
  }).from(userStats).where(eq(userStats.userId, userId))

  const recentScores = await db.select({
    score:      scores.score,
    correct:    scores.correct,
    total:      scores.total,
    mode:       scores.mode,
    difficulty: scores.difficulty,
    createdAt:  scores.createdAt,
  }).from(scores)
    .where(eq(scores.userId, userId))
    .orderBy(desc(scores.createdAt))
    .limit(10)

  return {
    name:         user.name,
    bio:          user.bio ?? null,
    countryCode:  user.countryCode ?? null,
    firstSeen:    user.firstSeen,
    stats:        stats ?? null,
    recentScores,
  }
})
