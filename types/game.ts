export type GameMode = 'flag' | 'pin' | 'cart' | 'mixed'
export type RoundType = 'flag' | 'pin' | 'cart'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type Accent = 'terracotta' | 'teal' | 'olive' | 'plum'
export type Theme = 'auto' | 'light' | 'dark'

export interface Country {
  code: string
  name: string
  lat: number
  lng: number
  svgCx: number
  svgCy: number
  region: string
  tier: number
}

export interface Round {
  type: RoundType
  answer: Country
  options: Country[]
}

export interface RoundResult {
  type: RoundType
  answer: Country
  picked: Country | null
  correct: boolean
  points: number
  elapsed: number
}

export interface LeaderboardEntry {
  id?: number
  name: string
  score: number
  correct: number
  total: number
  mode: GameMode
  difficulty: Difficulty
  created_at?: number
}
