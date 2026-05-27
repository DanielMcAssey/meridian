/**
 * One-time migration of scores from the old client-side localStorage leaderboard
 * (key: geo.leaderboard.v1) to the server API.
 *
 * Runs silently on every cold start but exits immediately when the key is absent.
 * Safe to delete once it's been confirmed all old data has been migrated.
 */
export default defineNuxtPlugin(async () => {
  const LS_KEY = 'geo.leaderboard.v1'

  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return

    const entries = JSON.parse(raw) as Array<{
      name: string; score: number; correct: number
      total: number; mode: string; difficulty: string
    }>

    if (!Array.isArray(entries) || entries.length === 0) {
      localStorage.removeItem(LS_KEY)
      return
    }

    await Promise.allSettled(
      entries.map((e) => $fetch('/api/leaderboard', { method: 'POST', body: e })),
    )

    localStorage.removeItem(LS_KEY)
  } catch { /* Non-critical — old data loss is acceptable */ }
})
