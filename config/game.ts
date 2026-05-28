/**
 * Central game configuration.
 * All tunable constants live here — scoring, modes, difficulties, round counts,
 * and timer presets.  Both client pages and server routes import from this file
 * so there is a single source of truth.
 */

import type { Difficulty, GameMode, RoundType } from '~/types/game'

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
  icon:  'flag' | 'map' | 'cart' | 'compass' | 'shape' | 'capital' | 'region' | 'language'
  /** Intrinsic difficulty of this mode — undefined for Grand Tour (mixed). */
  modeDiff?: Difficulty
}

export const MODES: ModeConfig[] = [
  { id: 'mixed',   title: 'The Grand Tour',     label: 'Grand Tour',   sub: 'Flags, maps, capitals, languages and more — matched to your difficulty.',  note: 'Mixed itinerary', icon: 'compass' },
  { id: 'region',  title: 'The Continental',    label: 'Continental',  sub: 'Pick which continent each country belongs to.',                   note: 'Geography',       icon: 'region',  modeDiff: 'easy'   },
  { id: 'flag',    title: 'The Banner Game',    label: 'Banners',      sub: 'Identify the flag.',                                              note: 'Vexillology',     icon: 'flag',    modeDiff: 'medium' },
  { id: 'pin',     title: 'The Pin Drop',       label: 'Pin Drop',     sub: "Find a pin's country on the map.",                                note: 'Cartography',     icon: 'map',     modeDiff: 'medium' },
  { id: 'cart',    title: 'The Cartographer',   label: 'Cartographer', sub: 'Pinpoint a country on the world map.',                            note: 'Charting',        icon: 'cart',    modeDiff: 'hard'   },
  { id: 'capital',  title: 'The Capital Cities', label: 'Capitals',  sub: 'Name the capital city of each country.',              note: 'Civics',      icon: 'capital',  modeDiff: 'hard'   },
  { id: 'shape',   title: 'The Silhouette',     label: 'Silhouette', sub: 'Name the country from its outline.',                  note: 'Topography',  icon: 'shape',    modeDiff: 'expert' },
  { id: 'language', title: 'The Linguist',      label: 'Linguist',   sub: 'Name an official language spoken in each country.',   note: 'Linguistics', icon: 'language', modeDiff: 'expert' },
]

/** Returns the short display name for a mode id (falls back to the raw string). */
export function modeName(mode: GameMode | string): string {
  return MODES.find((m) => m.id === mode)?.label ?? String(mode)
}

// ── Round counts ──────────────────────────────────────────────────────────────

export const ROUND_COUNTS = [5, 8, 12, 20] as const
export type  RoundCount   = typeof ROUND_COUNTS[number]

// ── Timer duration per difficulty ─────────────────────────────────────────────
// Timer is on/off only; duration is set automatically by difficulty.

export const DIFFICULTY_TIMER_SECS: Record<Difficulty, number> = {
  easy:   60,
  medium: 30,
  hard:   20,
  expert: 10,
}

// ── Server-side validation sets ───────────────────────────────────────────────
// Derived from the arrays above so they never drift.

export const VALID_MODES        = new Set<string>(MODES.map((m) => m.id))
export const VALID_DIFFICULTIES = new Set<string>(DIFFICULTIES.map((d) => d.id))
export const VALID_ROUND_COUNTS = new Set<number>(ROUND_COUNTS)

// ── Answer-selection tier weights ────────────────────────────────────────────
// Controls how likely each tier of country is to be selected as a round answer.
// Higher weights at higher difficulties push the pool toward obscure countries.
// Keys are tier numbers; missing tiers fall back to weight 1.
export const DIFFICULTY_TIER_WEIGHTS: Record<Difficulty, Record<number, number>> = {
  easy:   { 1: 1 },            // single tier anyway — weight is a no-op
  medium: { 1: 1, 2: 3 },      // tier-2 countries ~3× more likely than tier-1
  hard:   { 1: 1, 2: 2, 3: 4 },
  expert: { 1: 1, 2: 2, 3: 3, 4: 5 },
}

// ── Grand Tour round-type gates ───────────────────────────────────────────────
// Defines which round types are included in 'mixed' mode at each difficulty.
// Higher difficulties include all lower-tier types plus their own.
export const MIXED_ROUND_TYPES: Record<Difficulty, RoundType[]> = {
  easy:   ['region'],
  medium: ['region', 'flag', 'pin'],
  hard:   ['region', 'flag', 'pin', 'cart', 'capital'],
  expert: ['region', 'flag', 'pin', 'cart', 'capital', 'shape', 'language'],
}
