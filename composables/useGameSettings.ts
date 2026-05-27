import type { Difficulty } from '~/types/game'

/**
 * Persistent per-device game settings, backed by localStorage.
 * Returns reactive refs — mutate them directly to update and persist.
 *
 * Static game data (DIFFICULTIES, MODES, etc.) lives in ~/config/game.ts.
 */
export function useGameSettings() {
  const difficulty = useLocalStorage<Difficulty>('geo.difficulty', 'medium')
  const rounds     = useLocalStorage<number>('geo.rounds', 8)
  const timer      = useLocalStorage<boolean>('geo.timer', true)
  const timerSecs  = useLocalStorage<number>('geo.timerSecs', 20)

  return { difficulty, rounds, timer, timerSecs }
}
