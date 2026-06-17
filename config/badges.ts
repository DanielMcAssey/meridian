export interface Badge {
  id: string
  label: string
  description: string
  icon: string
}

const BADGE_DEFINITIONS: Record<string, Badge> = {
  creator: {
    id: 'creator',
    label: 'Creator',
    description: 'Built this world',
    icon: '⚒️',
  },
  pluto: {
    id: 'pluto',
    label: 'Pluto',
    description: 'My amazing Wife',
    icon: '🪐',
  },
  friends: {
    id: 'friends',
    label: 'Friend',
    description: 'Friend of Meridian',
    icon: '🧭',
  },
}

const USER_BADGES: Record<string, string[]> = {
  'ea7e8303-4821-413e-9518-96789574963e': ['creator'],
  '5b370d76-c290-4e52-94b4-e9d9dbc4e7c4': ['pluto'],
  '55a74030-90a4-4dd3-94e0-2bd5a6398ce9': ['friends'],
  'cf22e901-82c8-4f10-9278-2834f3cf262f': ['friends'],
  'e35b2fd6-884e-4e05-a0f0-9131aa6411c5': ['friends'],
  '04644558-cf9a-4e96-a9e7-372af481e26c': ['friends'],
  'd7880b2c-0b90-4b19-a014-b769221f78f9': ['friends'],
  'a8b06d25-30a2-402b-8943-958f236702ee': ['friends'],
  '3c709741-f253-434a-a10a-f72a134af8ee': ['friends'],
}

export function getBadgesForUser(userId: string | null | undefined): Badge[] {
  if (!userId) return []
  const ids = USER_BADGES[userId]
  if (!ids) return []
  return ids.map(id => BADGE_DEFINITIONS[id]).filter((b): b is Badge => b != null)
}
