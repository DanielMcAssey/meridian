import { z } from 'zod'
import { count, gt } from 'drizzle-orm'
import { scores } from '~/server/db/schema'

const bodySchema = z.object({
  name:       z.string().min(1).max(28).trim(),
  score:      z.number().int().min(0),
  correct:    z.number().int().min(0),
  total:      z.number().int().min(1),
  mode:       z.enum(['flag', 'pin', 'cart', 'mixed']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const db   = getDb()

  db.insert(scores).values(body).run()

  const [{ rank  }] = db.select({ rank:  count() }).from(scores).where(gt(scores.score, body.score)).all()
  const [{ total }] = db.select({ total: count() }).from(scores).all()

  return { rank: rank + 1, total }
})
