import type { Difficulty } from '~/types/game'
import { BASE_PTS, DIFFICULTY_MULTIPLIER, TIMER_PTS } from '~/config/game'

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
  remaining:    number,
  timerSecs:    number,
  difficulty:   Difficulty,
): number {
  const bonus = timerEnabled && timerSecs > 0
    ? Math.round((Math.max(0, remaining) / timerSecs) * TIMER_PTS)
    : 0
  return Math.round((BASE_PTS + bonus) * DIFFICULTY_MULTIPLIER[difficulty])
}

/**
 * Maximum achievable score for a single correct round at the given difficulty
 * (timer enabled, full time remaining).  Used server-side for plausibility checks.
 */
export function maxPointsPerRound(difficulty: Difficulty): number {
  return Math.round((BASE_PTS + TIMER_PTS) * DIFFICULTY_MULTIPLIER[difficulty])
}
