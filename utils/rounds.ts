import type { Country, Difficulty, GameMode, Round, RoundType } from '~/types/game'
import { MIXED_ROUND_TYPES } from '~/config/game'

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j   = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i]      = a[j]!
    a[j]      = tmp
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

// For region rounds: pick one representative country from each of 3 other regions.
// Returns the 4 options (answer + 3 region reps) already shuffled.
function pickRegionOptions(answer: Country, allCountries: Country[]): Country[] {
  const otherRegions = [...new Set(allCountries.map((c) => c.region))].filter(
    (r) => r !== answer.region,
  )
  const reps = shuffle(otherRegions)
    .slice(0, 3)
    .map((region) => shuffle(allCountries.filter((c) => c.region === region))[0]!)
  return shuffle([answer, ...reps])
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
    let roundType: RoundType = mode as RoundType
    if (mode === 'mixed') {
      const types = MIXED_ROUND_TYPES[difficulty]
      roundType = types[i % types.length]!
    }
    const options =
      roundType === 'region'
        ? pickRegionOptions(answer, countries)
        : shuffle([answer, ...pickDistractors(answer, widerPool, 3)])
    return { type: roundType, answer, options }
  })
}
