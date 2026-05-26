import type { Accent, Difficulty, Theme } from '~/types/game'

export const ACCENTS: Record<Accent, { hue: number; name: string }> = {
  terracotta: { hue: 30, name: 'Terracotta' },
  teal: { hue: 200, name: 'Teal' },
  olive: { hue: 130, name: 'Olive' },
  plum: { hue: 330, name: 'Plum' },
}

export const DIFFICULTIES: { id: Difficulty; label: string; note: string; est: number }[] = [
  { id: 'easy', label: 'Easy', note: 'Flagship countries', est: 70 },
  { id: 'medium', label: 'Medium', note: 'Well-known', est: 125 },
  { id: 'hard', label: 'Hard', note: 'Most of the world', est: 157 },
  { id: 'expert', label: 'Expert', note: 'Every country we have', est: 179 },
]

/**
 * Persistent per-device game settings, backed by localStorage.
 * Returns reactive refs — mutate them directly to update and persist.
 */
export function useGameSettings() {
  const difficulty = useLocalStorage<Difficulty>('geo.difficulty', 'medium')
  const rounds = useLocalStorage<number>('geo.rounds', 8)
  const timer = useLocalStorage<boolean>('geo.timer', true)
  const timerSecs = useLocalStorage<number>('geo.timerSecs', 20)
  const theme = useLocalStorage<Theme>('geo.theme', 'auto')
  const accent = useLocalStorage<Accent>('geo.accent', 'terracotta')

  return { difficulty, rounds, timer, timerSecs, theme, accent }
}
