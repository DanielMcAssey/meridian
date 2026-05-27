import type { Difficulty } from '~/types/game'

// ── Difficulty multipliers ────────────────────────────────────────────────────
// Adjust these to tune how much harder difficulties are rewarded.
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy:   1.0,
  medium: 1.5,
  hard:   2.0,
  expert: 3.0,
}

const BASE_PTS  = 100
const TIMER_PTS = 50   // max bonus on top of BASE_PTS when timer is enabled

/**
 * Points for a single correct answer.
 *
 * @param timerEnabled - whether the countdown was running this game
 * @param remaining    - seconds left when the answer was locked (0 if timer off/expired)
 * @param timerSecs    - total seconds per round (used to proportion the bonus)
 * @param difficulty   - current game difficulty
 */
export function calcPoints(
  timerEnabled: boolean,
  remaining: number,
  timerSecs: number,
  difficulty: Difficulty,
): number {
  const bonus = timerEnabled && timerSecs > 0
    ? Math.round((Math.max(0, remaining) / timerSecs) * TIMER_PTS)
    : 0
  return Math.round((BASE_PTS + bonus) * DIFFICULTY_MULTIPLIER[difficulty])
}

/**
 * Maximum achievable score for a single correct round at the given difficulty
 * (i.e. timer enabled with full time remaining).
 * Used server-side for plausibility checks.
 */
export function maxPointsPerRound(difficulty: Difficulty): number {
  return Math.round((BASE_PTS + TIMER_PTS) * DIFFICULTY_MULTIPLIER[difficulty])
}
