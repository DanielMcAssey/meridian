import type { LeaderboardEntry } from '~/types/game'

export default defineEventHandler((event): LeaderboardEntry[] => {
  const query = getQuery(event)
  const limit = Math.min(Math.abs(Number(query.limit) || 50), 100)
  const difficulty = typeof query.difficulty === 'string' ? query.difficulty : undefined
  const mode = typeof query.mode === 'string' ? query.mode : undefined

  const db = getDb()

  const conditions: string[] = []
  const params: (string | number)[] = []

  if (difficulty) {
    conditions.push('difficulty = ?')
    params.push(difficulty)
  }
  if (mode) {
    conditions.push('mode = ?')
    params.push(mode)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const sql = `
    SELECT id, name, score, correct, total, mode, difficulty, created_at
    FROM scores
    ${where}
    ORDER BY score DESC, created_at DESC
    LIMIT ?
  `
  params.push(limit)

  return db.prepare(sql).all(...params) as LeaderboardEntry[]
})
