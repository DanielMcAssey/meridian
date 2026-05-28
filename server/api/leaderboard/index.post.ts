import { z } from 'zod'
import { count, gt } from 'drizzle-orm'
import { VALID_ROUND_COUNTS } from '~/config/game'
import { maxPointsPerRound } from '~/utils/scoring'
import { scores, users } from '~/server/db/schema'

const bodySchema = z.object({
  name:       z.string().min(1).max(28).trim(),
  score:      z.number().int().min(0),
  correct:    z.number().int().min(0),
  total:      z.number().int().min(1),
  mode:       z.enum(['flag', 'pin', 'cart', 'shape', 'capital', 'region', 'language', 'province', 'mixed']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  userId:     z.string().uuid().optional(),
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

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const db   = getDb()

  const now = Math.floor(Date.now() / 1000)

  if (body.userId) {
    db.insert(users)
      .values({ id: body.userId, name: body.name, firstSeen: now, lastSeen: now })
      .onConflictDoUpdate({ target: users.id, set: { name: body.name, lastSeen: now } })
      .run()
  }

  const { userId, ...scoreFields } = body
  db.insert(scores).values({ ...scoreFields, userId: userId ?? null }).run()

  const rank  = db.select({ rank:  count() }).from(scores).where(gt(scores.score, body.score)).all()[0]?.rank  ?? 0
  const total = db.select({ total: count() }).from(scores).all()[0]?.total ?? 0

  return { rank: rank + 1, total }
})
