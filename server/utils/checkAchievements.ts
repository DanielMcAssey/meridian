import type { Difficulty, GameMode } from '~/types/game'

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

  return earned
}
