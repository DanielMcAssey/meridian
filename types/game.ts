export type GameMode  = 'flag' | 'pin' | 'cart' | 'shape' | 'capital' | 'region' | 'language' | 'mixed'
export type RoundType = 'flag' | 'pin' | 'cart' | 'shape' | 'capital' | 'region' | 'language'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface Country {
  code:    string
  name:    string
  capital: string
  lat:     number
  lng:     number
  svgCx:   number
  svgCy:   number
  region:  string
  tier:    number
  langs:   string[]  // ISO 639-1 alpha-2 codes of official languages
}

export interface Round {
  type:    RoundType
  answer:  Country
  options: Country[]
  // Language rounds only — language names (shuffled) and the correct answer.
  langOptions?: string[]
  answerLang?:  string
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
  name:       string
  score:      number
  correct:    number
  total:      number
  mode:       GameMode
  difficulty: Difficulty
}

/** Full row returned by GET /api/leaderboard (server-persisted fields added). */
export interface LeaderboardRow extends LeaderboardEntry {
  id:        number
  createdAt: number
}
