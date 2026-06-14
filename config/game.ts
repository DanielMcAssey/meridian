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
  /** Score multiplier applied to every correct answer at this difficulty. */
  multiplier: number
}

export const DIFFICULTIES: DifficultyConfig[] = [
  { id: 'easy',   label: 'Easy',   note: 'Flagship countries',    multiplier: 1.0 },
  { id: 'medium', label: 'Medium', note: 'Well-known',            multiplier: 1.5 },
  { id: 'hard',   label: 'Hard',   note: 'Most of the world',     multiplier: 2.0 },
  { id: 'expert', label: 'Expert', note: 'No easy countries',     multiplier: 3.0 },
]

/** Pre-computed Record for O(1) lookup in scoring functions. */
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.id, d.multiplier]),
) as Record<Difficulty, number>

/** Country-pool name shown in UI for each difficulty level. */
export const POOL_LABEL: Record<Difficulty, string> = {
  easy:   'Flagship',
  medium: 'Well-known',
  hard:   'Familiar',
  expert: 'Obscure',
}

/**
 * Country tiers (1–4) included in each difficulty pool.
 * easy=tier≤1, medium=tier≤2, hard=tier≤3, expert=tier≥2 (excludes Flagship).
 */
export const POOL_TIERS: Record<Difficulty, number[]> = {
  easy:   [1],
  medium: [1, 2],
  hard:   [1, 2, 3],
  expert: [2, 3, 4],
}

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
  icon:  'flag' | 'map' | 'cart' | 'compass' | 'shape' | 'capital' | 'region' | 'language' | 'province'
  /** Intrinsic difficulty of this mode — undefined for Grand Tour (mixed). */
  modeDiff?: Difficulty
}

export const MODES: ModeConfig[] = [
  { id: 'mixed',    title: 'The Grand Tour',     label: 'Grand Tour',   sub: 'Flags, maps, capitals, languages and more — matched to your difficulty.',  note: 'Mixed itinerary', icon: 'compass' },
  { id: 'region',   title: 'The Continental',    label: 'Continental',  sub: 'Pick which continent each country belongs to.',                   note: 'Geography',   icon: 'region',   modeDiff: 'easy'   },
  { id: 'language', title: 'The Linguist',       label: 'Linguist',     sub: 'Name an official language spoken in each country.',               note: 'Linguistics', icon: 'language', modeDiff: 'easy'   },
  { id: 'flag',     title: 'The Banner Game',    label: 'Banners',      sub: 'Identify the flag.',                                              note: 'Vexillology', icon: 'flag',     modeDiff: 'medium' },
  { id: 'pin',      title: 'The Pin Drop',       label: 'Pin Drop',     sub: "Find a pin's country on the map.",                                note: 'Cartography', icon: 'map',      modeDiff: 'medium' },
  { id: 'cart',     title: 'The Cartographer',   label: 'Cartographer', sub: 'Pinpoint a country on the world map.',                            note: 'Charting',    icon: 'cart',     modeDiff: 'hard'   },
  { id: 'capital',  title: 'The Capital Cities', label: 'Capitals',     sub: 'Name the capital city of each country.',                          note: 'Civics',      icon: 'capital',  modeDiff: 'hard'   },
  { id: 'shape',    title: 'The Silhouette',     label: 'Silhouette',   sub: 'Name the country from its outline.',                              note: 'Topography',  icon: 'shape',    modeDiff: 'expert' },
  { id: 'province', title: 'The Province',       label: 'Province',     sub: 'Name the country each state or region belongs to.',               note: 'Sovereignty', icon: 'province', modeDiff: 'expert' },
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

/** Tuple form of MODES ids — use with z.enum() so the Zod schema stays in sync with config. */
export const VALID_MODE_IDS = MODES.map((m) => m.id) as [GameMode, ...GameMode[]]
/** Tuple form of DIFFICULTIES ids — use with z.enum() so the Zod schema stays in sync with config. */
export const VALID_DIFFICULTY_IDS = DIFFICULTIES.map((d) => d.id) as [Difficulty, ...Difficulty[]]

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

// ── Distractor nearness ───────────────────────────────────────────────────────
// For multiple-choice rounds, distractors are sampled from the K geographically
// nearest candidates to the answer. Smaller K → closer (harder) options.
// Harder difficulties tighten the window so wrong answers are more confusable.
export const DISTRACTOR_NEARNESS: Record<Difficulty, number> = {
  easy:   40,   // wide band — options spread across the region/world
  medium: 20,
  hard:   10,
  expert:  6,   // nearest neighbours only — hardest to distinguish
}

// ── Map display ───────────────────────────────────────────────────────────────
/** How far to zoom in on the pin in Pin Drop rounds (multiplier over the full map).
 *  3 = shows ~⅓ of the world width, giving clear regional context. */
export const PIN_MAP_ZOOM = 4
/** Duration of the pin-drop SMIL animation in ms — timer and UI are delayed by this. */
export const PIN_DROP_ANIMATION_MS = 550

/**
 * How many ms to wait after a round starts before the timer begins counting.
 * Lets round components with intro animations complete before the clock starts.
 * play.vue reads this generically — it does not need to know why a delay exists.
 */
export const ROUND_TIMER_DELAY_MS: Partial<Record<import('~/types/game').RoundType, number>> = {
  pin: PIN_DROP_ANIMATION_MS,
}

// ── SW reload protection ──────────────────────────────────────────────────────
// Routes where a service-worker-triggered reload should be deferred until the
// user navigates away, to avoid interrupting an active game or results review.
export const SW_RELOAD_PROTECTED = new Set(['/play', '/results'])

// ── UI animations ────────────────────────────────────────────────────────────
/** Duration in seconds for the decorative compass rose spin on the landing page. */
export const COMPASS_SPIN_SECS = 220

/** Maximum character length for a player name. */
export const MAX_NAME_LENGTH = 28

/** Maximum character length for a profile bio. */
export const MAX_BIO_LENGTH = 200

/** Names cycled through the animated placeholder on the landing page name field. */
export const ADVENTURERS = [
  'Captain Nellie Bly',
  'Aviator Amelia Earhart',
  'Sir Ernest Shackleton',
  'Miss Gertrude Bell',
  'Miss Isabella Bird',
  'Ibn Battuta the Traveller',
  'Dame Freya Stark',
  'Sacagawea',
  'Captain Roald Amundsen',
  'Miss Mary Kingsley',
  'Alexandra David-Néel',
  'Miss Annie Londonderry',
  'Mrs. Osa Johnson',
] as const

// ── Grand Tour round-type gates ───────────────────────────────────────────────
// Defines which round types are included in 'mixed' mode at each difficulty.
// Higher difficulties include all lower-tier types plus their own.
export const MIXED_ROUND_TYPES: Record<Difficulty, RoundType[]> = {
  easy:   ['region', 'language'],
  medium: ['region', 'language', 'flag', 'pin'],
  hard:   ['region', 'language', 'flag', 'pin', 'cart', 'capital'],
  expert: ['region', 'language', 'flag', 'pin', 'cart', 'capital', 'shape', 'province'],
}
