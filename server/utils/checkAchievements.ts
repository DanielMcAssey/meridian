import type { Difficulty, GameMode } from '~/types/game'
import { ACHIEVEMENTS } from '~/config/achievements'
import { BASE_PTS, DIFFICULTY_MULTIPLIER } from '~/config/game'

interface Submission {
  score:      number
  correct:    number
  total:      number
  mode:       GameMode
  difficulty: Difficulty
}

interface Stats {
  totalGames:   number
  totalCorrect: number
  totalRounds:  number
}

interface ScoreRow {
  mode:       string
  difficulty: string
  correct:    number
  total:      number
}

const ALL_MODES = new Set(['flag', 'pin', 'cart', 'shape', 'capital', 'region', 'language', 'province', 'mixed'])

// Points per correct answer on Expert without a timer — used to detect timer use.
// If the total score exceeds correct × EXPERT_BASE_PER_ROUND, a time bonus was earned,
// proving the timer was active. (Timer off and timer on at time=0 both yield exactly
// BASE_PTS × multiplier per round, so we require any bonus above that baseline.)
const EXPERT_BASE_PER_ROUND = BASE_PTS * DIFFICULTY_MULTIPLIER['expert']

const PERFECT_MODE_IDS = [
  'perfect_banner', 'perfect_pin',  'perfect_cart',     'perfect_shape',
  'perfect_capital', 'perfect_region', 'perfect_language', 'perfect_province',
] as const

// All achievement IDs except 'true_meridian' itself — used to gate the all-achievements unlock.
// Includes 'meridian_conqueror' so 'true_meridian' requires that prestige achievement too.
const ALL_EXCEPT_TRUE_MERIDIAN = ACHIEVEMENTS
  .filter((a) => a.id !== 'true_meridian')
  .map((a) => a.id)

export function checkAchievements(
  sub:             Submission,
  stats:           Stats,
  alreadyUnlocked: Set<string>,
  allScores:       ScoreRow[],
): string[] {
  const earned: string[] = []

  function check(id: string, condition: boolean) {
    if (!alreadyUnlocked.has(id) && condition) earned.push(id)
  }

  const perfectGame   = sub.correct === sub.total
  const expertScores  = allScores.filter((s) => s.difficulty === 'expert').length
  const perfectScores = allScores.filter((s) => s.correct === s.total && s.total >= 5).length
  const modesPlayed   = new Set(allScores.map((s) => s.mode))
  const modesCount    = modesPlayed.size

  // ── Milestone ────────────────────────────────────────────────────────────────
  check('first_voyage',      stats.totalGames >= 1)
  check('seasoned_traveler', stats.totalGames >= 10)
  check('veteran_explorer',  stats.totalGames >= 50)
  check('world_wanderer',    stats.totalGames >= 100)

  // ── Accuracy ─────────────────────────────────────────────────────────────────
  check('sharpshooter',  perfectGame && sub.total >= 5)
  check('marathon_ace',  perfectGame && sub.total === 20)
  check('perfectionist', perfectScores >= 5)

  // ── Score ────────────────────────────────────────────────────────────────────
  check('high_achiever', sub.score >= 1_000)
  check('elite_scorer',  sub.score >= 3_000)
  check('legend',        sub.score >= 5_000)

  // ── Difficulty ───────────────────────────────────────────────────────────────
  check('expert_initiate', sub.difficulty === 'expert')
  check('expert_veteran',  expertScores >= 10)
  check('no_easy_roads',   expertScores >= 25)

  // ── Mode ─────────────────────────────────────────────────────────────────────
  check('grand_tourist', sub.mode === 'mixed')
  check('globe_trotter', ALL_MODES.size === modesCount)

  // ── Career ───────────────────────────────────────────────────────────────────
  const overallAccuracy = stats.totalRounds > 0 ? stats.totalCorrect / stats.totalRounds : 0
  check('consistent_adventurer', stats.totalGames >= 20 && overallAccuracy >= 0.8)
  check('master_navigator',      stats.totalGames >= 10 && overallAccuracy >= 0.9)

  // ── Combined ─────────────────────────────────────────────────────────────────
  check('expert_marksman', sub.difficulty === 'expert' && perfectGame)
  check('hard_carry',      sub.difficulty === 'hard'   && perfectGame)
  check('globe_scholar',   stats.totalGames >= 10 && modesCount >= 5)

  // ── Mastery — Expert (Obscure pool), 20 rounds, timer proven by score bonus ──
  // Timer detection: score must exceed what's achievable without a timer, i.e.
  // any time bonus was earned on at least one round.
  const timerProven = sub.score > sub.correct * EXPERT_BASE_PER_ROUND
  const isMastery = (mode: GameMode) =>
    sub.mode === mode &&
    sub.difficulty === 'expert' &&
    sub.total === 20 &&
    sub.correct === 20 &&
    timerProven

  check('perfect_banner',   isMastery('flag'))
  check('perfect_pin',      isMastery('pin'))
  check('perfect_cart',     isMastery('cart'))
  check('perfect_shape',    isMastery('shape'))
  check('perfect_capital',  isMastery('capital'))
  check('perfect_region',   isMastery('region'))
  check('perfect_language', isMastery('language'))
  check('perfect_province', isMastery('province'))

  // ── Prestige — awarded after checking all non-prestige achievements ───────────
  const earnedSet = new Set(earned)
  const has = (id: string) => alreadyUnlocked.has(id) || earnedSet.has(id)

  check('meridian_conqueror', PERFECT_MODE_IDS.every(has))
  earnedSet.add('meridian_conqueror') // update set in case it was just earned, before the next check
  check('true_meridian', ALL_EXCEPT_TRUE_MERIDIAN.every(has))

  return earned
}
