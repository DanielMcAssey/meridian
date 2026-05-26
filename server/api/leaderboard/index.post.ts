import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(28).trim(),
  score: z.number().int().min(0),
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
  mode: z.enum(['flag', 'pin', 'cart', 'mixed']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)
  const db = getDb()

  const insert = db.prepare(`
    INSERT INTO scores (name, score, correct, total, mode, difficulty)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  insert.run(body.name, body.score, body.correct, body.total, body.mode, body.difficulty)

  // Rank = number of scores strictly higher than this one, + 1
  const { rank } = db
    .prepare('SELECT COUNT(*) AS rank FROM scores WHERE score > ?')
    .get(body.score) as { rank: number }

  const { total } = db
    .prepare('SELECT COUNT(*) AS total FROM scores')
    .get() as { total: number }

  return { rank: rank + 1, total }
})
