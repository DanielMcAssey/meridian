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
  '098b3a30-78aa-4adb-b23f-beb18eaa357a': ['friends'],
  'cf22e901-82c8-4f10-9278-2834f3cf262f': ['friends'],
  'e35b2fd6-884e-4e05-a0f0-9131aa6411c5': ['friends'],
}

export function getBadgesForUser(userId: string | null | undefined): Badge[] {
  if (!userId) return []
  const ids = USER_BADGES[userId]
  if (!ids) return []
  return ids.map(id => BADGE_DEFINITIONS[id]).filter((b): b is Badge => b != null)
}
