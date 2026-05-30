import { MAX_NAME_LENGTH } from '~/config/game'

export function sanitizeName(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}\s'\-]/gu, '') // keep unicode letters, numbers, spaces, apostrophes, hyphens
    .replace(/\s+/g, ' ')                  // collapse runs of whitespace
    .trim()
    .slice(0, MAX_NAME_LENGTH)
}
