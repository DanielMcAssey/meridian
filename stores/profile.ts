import { defineStore } from 'pinia'

const GEO_STORAGE_KEYS = [
  'geo.player.name',
  'geo.user.id',
  'geo.recovery.code',
  'geo.difficulty',
  'geo.rounds',
  'geo.timer',
  'geo.tq-cache',
] as const

import { sanitizeName } from '~/utils/sanitizeName'

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
