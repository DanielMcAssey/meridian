import type { Country, Difficulty, GameMode, Round, RoundType } from '~/types/game'
import { DIFFICULTY_TIER_WEIGHTS, DISTRACTOR_NEARNESS, MIXED_ROUND_TYPES } from '~/config/game'

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
  return countries.filter((c) => c.tier >= 2) // expert: excludes tier-1 (easy) countries
}

// Cheap equirectangular distance proxy — good enough for ranking neighbours.
function geoDist(a: Country, b: Country): number {
  const dLat = a.lat - b.lat
  const dLng = (a.lng - b.lng) * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180)
  return dLat * dLat + dLng * dLng   // squared; ordering is all that matters
}

// Distractors are sampled from the K geographically nearest candidates to the
// answer (K = DISTRACTOR_NEARNESS[difficulty]). Smaller K → closer (harder)
// options. This keeps wrong answers confusable and scales that by difficulty.
function pickDistractors(
  answer: Country, pool: Country[], n: number, difficulty: Difficulty,
): Country[] {
  const ranked = pool
    .filter((c) => c.code !== answer.code)
    .sort((a, b) => geoDist(answer, a) - geoDist(answer, b))
  const k = Math.max(n, DISTRACTOR_NEARNESS[difficulty])
  const picked = shuffle(ranked.slice(0, k)).slice(0, n)
  // Safety net for tiny pools: top up from the remaining ranked candidates.
  if (picked.length < n) picked.push(...ranked.slice(k, k + (n - picked.length)))
  return picked
}

// For language rounds: randomly select one of the answer country's official
// languages, then pick 3 distractor language names from the wider pool,
// excluding all of the answer country's languages so none appear as a wrong option.
function pickLanguageOptions(
  answer: Country,
  pool: Country[],
  languageNames: Record<string, string>,
  difficulty: Difficulty,
): { langOptions: string[]; answerLang: string } | null {
  const validCodes = answer.langs.filter((l) => languageNames[l])
  if (!validCodes.length) return null

  const answerCode = validCodes[Math.floor(Math.random() * validCodes.length)]!
  const answerLang = languageNames[answerCode]!
  const excluded   = new Set(answer.langs)

  // Rank candidate languages by the distance of the nearest pool country that
  // speaks them, then keep only the nearest K so distractors come from nearby
  // countries — tighter (nearer) at higher difficulties, matching pickDistractors.
  const nearestDist = new Map<string, number>()
  for (const c of pool) {
    if (c.code === answer.code) continue
    const d = geoDist(answer, c)
    for (const l of c.langs) {
      if (excluded.has(l) || !languageNames[l]) continue
      const prev = nearestDist.get(l)
      if (prev === undefined || d < prev) nearestDist.set(l, d)
    }
  }
  const k = Math.max(3, DISTRACTOR_NEARNESS[difficulty])
  const candidateCodes = [...nearestDist.keys()]
    .sort((a, b) => nearestDist.get(a)! - nearestDist.get(b)!)
    .slice(0, k)

  const distractors: string[] = []
  const usedNames = new Set([answerLang])
  for (const code of shuffle(candidateCodes)) {
    const name = languageNames[code]!
    if (!usedNames.has(name)) {
      distractors.push(name)
      usedNames.add(name)
      if (distractors.length === 3) break
    }
  }
  if (distractors.length < 3) return null

  return { langOptions: shuffle([answerLang, ...distractors]), answerLang }
}

// All continents that count as correct for a country — its primary region plus
// any extra accepted continents for transcontinental countries (e.g. Cyprus).
export function acceptedRegions(c: Country): string[] {
  return c.altRegions?.length ? [c.region, ...c.altRegions] : [c.region]
}

// For region rounds: pick one representative country from each of 3 other regions.
// Returns the 4 options (answer + 3 region reps) already shuffled. Every continent
// the answer accepts is excluded from the distractor pool, so exactly one option
// (the answer itself, labelled with its primary region) is ever correct.
function pickRegionOptions(answer: Country, allCountries: Country[]): Country[] {
  const accepted = new Set(acceptedRegions(answer))
  const otherRegions = [...new Set(allCountries.map((c) => c.region))].filter(
    (r) => !accepted.has(r),
  )
  const reps = shuffle(otherRegions)
    .slice(0, 3)
    .map((region) => shuffle(allCountries.filter((c) => c.region === region))[0]!)
  return shuffle([answer, ...reps])
}

function weightedSample(pool: Country[], count: number, difficulty: Difficulty): Country[] {
  const tw = DIFFICULTY_TIER_WEIGHTS[difficulty]
  const candidates = pool.map((c) => ({ country: c, weight: tw[c.tier] ?? 1 }))
  const result: Country[] = []
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const total = candidates.reduce((s, c) => s + c.weight, 0)
    let r = Math.random() * total
    let idx = 0
    while (idx < candidates.length - 1 && (r -= candidates[idx]!.weight) > 0) idx++
    result.push(candidates[idx]!.country)
    candidates.splice(idx, 1)
  }
  return result
}

export function buildRounds(
  countries: Country[],
  mode: GameMode,
  count: number,
  difficulty: Difficulty,
  languageNames: Record<string, string>,
): Round[] {
  const pool = pickPool(countries, difficulty)
  // Wider pool for distractors (slightly harder distractors on easy)
  const widerPool = pickPool(countries, difficulty === 'easy' ? 'medium' : difficulty)

  // Mode-specific answer pools — exclude countries missing the required data.
  const langPool     = pool.filter((c) => c.langs.length > 0 && c.langs.some((l) => languageNames[l]))
  const provincePool = pool.filter((c) => c.subdivisions.length > 0)
  const shapePool    = pool.filter((c) => c.hasShape)
  const mapPool      = pool.filter((c) => c.hasMapPath)
  const flagPool     = pool.filter((c) => c.hasFlag)
  const capitalPool  = pool.filter((c) => !!c.capital)
  const answerPool   = mode === 'language' ? langPool
                     : mode === 'province' ? provincePool
                     : mode === 'shape'    ? shapePool
                     : mode === 'pin'      ? mapPool
                     : mode === 'cart'     ? mapPool
                     : mode === 'flag'     ? flagPool
                     : mode === 'capital'  ? capitalPool
                     : pool
  const answers = weightedSample(answerPool, count, difficulty)

  // Universal fallback when a country lacks the data for its assigned round
  // type. Prefer 'flag', but a territory that borrows another country's flag
  // (hasFlag === false) would make a banner round ambiguous, so fall back to
  // 'capital' (or 'region' as a last resort) instead.
  const flagFallback = (answer: Country): RoundType =>
    answer.hasFlag ? 'flag' : answer.capital ? 'capital' : 'region'

  const rounds = answers.map((answer, i) => {
    let roundType: RoundType = mode as RoundType
    if (mode === 'mixed') {
      const types = MIXED_ROUND_TYPES[difficulty]
      roundType = types[i % types.length]!
    }

    if (roundType === 'shape' && !answer.hasShape) {
      roundType = flagFallback(answer)  // fallback for countries without a silhouette SVG
    }
    if ((roundType === 'pin' || roundType === 'cart') && !answer.hasMapPath) {
      roundType = flagFallback(answer)  // fallback for countries not visible on the world map
    }

    if (roundType === 'language') {
      const lang = pickLanguageOptions(answer, widerPool, languageNames, difficulty)
      if (lang) return { type: roundType, answer, options: [], ...lang }
      roundType = flagFallback(answer)  // fallback for countries without language data
    }

    if (roundType === 'province') {
      const subs = answer.subdivisions
      if (subs.length > 0) {
        const sub = subs[Math.floor(Math.random() * subs.length)]!
        const options = shuffle([answer, ...pickDistractors(answer, widerPool, 3, difficulty)])
        return { type: roundType, answer, options, subdivisionName: sub.name, subdivisionCat: sub.cat }
      }
      roundType = flagFallback(answer)  // fallback for countries without subdivision data
    }

    const options =
      roundType === 'region'
        ? pickRegionOptions(answer, countries)
        : shuffle([answer, ...pickDistractors(
            answer,
            roundType === 'capital' ? widerPool.filter((c) => !!c.capital) : widerPool,
            3,
            difficulty,
          )])
    return { type: roundType, answer, options }
  })

  if (import.meta.dev) {
    for (const round of rounds) {
      const ok = round.type === 'language'
        ? (round.langOptions?.includes(round.answerLang!) ?? false)
        : round.options.some((o) => o.code === round.answer.code)
      if (!ok) console.warn('[rounds] answer not in options:', round)
    }
  }

  return rounds
}
