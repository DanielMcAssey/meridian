export type GameMode  = 'flag' | 'pin' | 'cart' | 'shape' | 'capital' | 'region' | 'language' | 'province' | 'mixed'
export type RoundType = 'flag' | 'pin' | 'cart' | 'shape' | 'capital' | 'region' | 'language' | 'province'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface Subdivision {
  name: string
  cat:  string  // raw category e.g. "STATE", "PROVINCE", "CANTON"
}

export interface Country {
  code:         string
  name:         string
  capital:      string
  lat:          number
  lng:          number
  svgCx:        number
  svgCy:        number
  region:       string
  tier:         number
  langs:        string[]       // ISO 639-1 alpha-2 codes of official languages
  subdivisions: Subdivision[]  // top-level administrative divisions
  hasShape:     boolean        // silhouette SVG is available (shape != null in data.json)
  hasMapPath:   boolean        // country has a real visible path on the world map SVG
}

export interface Round {
  type:    RoundType
  answer:  Country
  options: Country[]
  // Language rounds only — language names (shuffled) and the correct answer.
  langOptions?: string[]
  answerLang?:  string
  // Province rounds only — the subdivision to identify.
  subdivisionName?: string
  subdivisionCat?:  string
}

export interface RoundResult {
  type:       RoundType
  answer:     Country
  picked:     Country | null
  pickedLang?: string    // for language rounds
  correct:    boolean
  points:     number
  elapsed:    number
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

/** Payload sent to POST /api/leaderboard after a game ends. */
export interface LeaderboardEntry {
  score:         number
  correct:       number
  total:         number
  mode:          GameMode
  difficulty:    Difficulty
  userId:        string
  gameToken:     string
  recoveryCode?: string
}

// Runtime mirror of LeaderboardEntry — TypeScript errors if this object diverges
// from the interface (missing key, extra key, or renamed key all fail to compile).
// The derived version string changes automatically when any field is added,
// removed, or renamed, busting the persisted offline-mutation cache.
const _leaderboardEntryShape: Record<keyof LeaderboardEntry, 1> = {
  score: 1, correct: 1, total: 1, mode: 1, difficulty: 1, userId: 1, gameToken: 1, recoveryCode: 1,
}
export const LEADERBOARD_MUTATION_VERSION = Object.keys(_leaderboardEntryShape).sort().join('|')

/** Full row returned by GET /api/leaderboard (server-persisted fields added). */
export interface LeaderboardRow {
  id:          number
  name:        string
  score:       number
  correct:     number
  total:       number
  mode:        GameMode
  difficulty:  Difficulty
  userId:      string | null
  createdAt:   number
  countryCode: string | null
}

/** Response envelope for GET /api/leaderboard. */
export interface LeaderboardResponse {
  rows:    LeaderboardRow[]
  hasMore: boolean
}

export type TrophyKind = 'gold' | 'silver' | 'bronze'
