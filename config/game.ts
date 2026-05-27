/**
 * Central game configuration.
 * All tunable constants live here — scoring, modes, difficulties, round counts,
 * and timer presets.  Both client pages and server routes import from this file
 * so there is a single source of truth.
 */

import type { Difficulty, GameMode } from '~/types/game'

// ── Scoring ───────────────────────────────────────────────────────────────────

/** Points awarded for a correct answer before the difficulty multiplier. */
export const BASE_PTS = 100

/** Maximum time-bonus points added on top of BASE_PTS when the timer is on. */
export const TIMER_PTS = 50

// ── Difficulties ──────────────────────────────────────────────────────────────

export interface DifficultyConfig {
  id:         Difficulty
  label:      string
  note:       string
  /** Approximate country pool size shown in the menu tooltip. */
  est:        number
  /** Score multiplier applied to every correct answer at this difficulty. */
  multiplier: number
}

export const DIFFICULTIES: DifficultyConfig[] = [
  { id: 'easy',   label: 'Easy',   note: 'Flagship countries',    est: 70,  multiplier: 1.0 },
  { id: 'medium', label: 'Medium', note: 'Well-known',            est: 125, multiplier: 1.5 },
  { id: 'hard',   label: 'Hard',   note: 'Most of the world',     est: 157, multiplier: 2.0 },
  { id: 'expert', label: 'Expert', note: 'Every country we have', est: 179, multiplier: 3.0 },
]

/** Pre-computed Record for O(1) lookup in scoring functions. */
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.id, d.multiplier]),
) as Record<Difficulty, number>

// ── Game modes ────────────────────────────────────────────────────────────────

export interface ModeConfig {
  id:    GameMode
  /** Long name used on menu cards. */
  title: string
  /** Short name used in leaderboard tables and display helpers. */
  label: string
  /** Subtitle on menu card. */
  sub:   string
  /** Category tag on menu card. */
  note:  string
  icon:  'flag' | 'map' | 'cart' | 'compass'
}

export const MODES: ModeConfig[] = [
  { id: 'flag',  title: 'The Banner Game',  label: 'Banners',      sub: 'Identify the flag.',                   note: 'Vexillology',     icon: 'flag'    },
  { id: 'pin',   title: 'The Pin Drop',     label: 'Pin Drop',     sub: "Find a pin's country on the map.",     note: 'Cartography',     icon: 'map'     },
  { id: 'cart',  title: 'The Cartographer', label: 'Cartographer', sub: 'Pinpoint a country on the world map.', note: 'Charting',        icon: 'cart'    },
  { id: 'mixed', title: 'The Grand Tour',   label: 'Grand Tour',   sub: 'A little of everything.',              note: 'Mixed itinerary', icon: 'compass' },
]

/** Returns the short display name for a mode id (falls back to the raw string). */
export function modeName(mode: GameMode | string): string {
  return MODES.find((m) => m.id === mode)?.label ?? String(mode)
}

// ── Round counts ──────────────────────────────────────────────────────────────

export const ROUND_COUNTS = [5, 8, 12, 20] as const
export type  RoundCount   = typeof ROUND_COUNTS[number]

// ── Timer presets ─────────────────────────────────────────────────────────────

export interface TimerOption {
  label: string
  on:    boolean
  secs:  number
}

export const TIMER_OPTIONS: TimerOption[] = [
  { label: 'Off', on: false, secs: 20 },
  { label: '10s', on: true,  secs: 10 },
  { label: '20s', on: true,  secs: 20 },
  { label: '30s', on: true,  secs: 30 },
  { label: '60s', on: true,  secs: 60 },
]

// ── Server-side validation sets ───────────────────────────────────────────────
// Derived from the arrays above so they never drift.

export const VALID_MODES        = new Set<string>(MODES.map((m) => m.id))
export const VALID_DIFFICULTIES = new Set<string>(DIFFICULTIES.map((d) => d.id))
export const VALID_ROUND_COUNTS = new Set<number>(ROUND_COUNTS)
