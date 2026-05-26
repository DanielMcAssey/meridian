import type { Country, Difficulty, GameMode, Round, RoundType } from '~/types/game'

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickPool(countries: Country[], difficulty: Difficulty): Country[] {
  if (difficulty === 'easy') return countries.filter((c) => c.tier <= 1)
  if (difficulty === 'medium') return countries.filter((c) => c.tier <= 2)
  if (difficulty === 'hard') return countries.filter((c) => c.tier <= 3)
  return countries // expert: all tiers
}

function pickDistractors(answer: Country, pool: Country[], n: number): Country[] {
  const sameRegion = pool.filter((c) => c.code !== answer.code && c.region === answer.region)
  const others = pool.filter((c) => c.code !== answer.code && c.region !== answer.region)
  const picked = shuffle(sameRegion).slice(0, n)
  if (picked.length < n) picked.push(...shuffle(others).slice(0, n - picked.length))
  return picked
}

export function buildRounds(
  countries: Country[],
  mode: GameMode,
  count: number,
  difficulty: Difficulty,
): Round[] {
  const pool = pickPool(countries, difficulty)
  // Wider pool for distractors (slightly harder distractors on easy)
  const widerPool = pickPool(countries, difficulty === 'easy' ? 'medium' : difficulty)
  const answers = shuffle(pool).slice(0, count)

  return answers.map((answer, i) => {
    const distractors = pickDistractors(answer, widerPool, 3)
    const options = shuffle([answer, ...distractors])
    let roundType: RoundType = mode as RoundType
    if (mode === 'mixed') {
      roundType = (['flag', 'pin', 'cart'] as const)[i % 3]
    }
    return { type: roundType, answer, options }
  })
}
