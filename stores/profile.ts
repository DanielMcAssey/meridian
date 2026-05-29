import { defineStore } from 'pinia'
import { MAX_NAME_LENGTH } from '~/config/game'

const GEO_STORAGE_KEYS = [
  'geo.player.name',
  'geo.user.id',
  'geo.difficulty',
  'geo.rounds',
  'geo.timer',
  'geo.tq-cache',
] as const

export function sanitizeName(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}\s'\-]/gu, '')  // keep unicode letters, numbers, spaces, apostrophes, hyphens
    .replace(/\s+/g, ' ')                   // collapse runs of whitespace
    .trim()
    .slice(0, MAX_NAME_LENGTH)
}

export const useProfileStore = defineStore('profile', () => {
  const name   = useLocalStorage('geo.player.name', '')
  const userId = useUserId()

  function setName(raw: string): boolean {
    const n = sanitizeName(raw)
    if (!n) return false
    name.value = n
    return true
  }

  function deleteProfile() {
    GEO_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k))
    name.value   = ''
    userId.value = ''
  }

  return { name, userId, setName, deleteProfile }
})
