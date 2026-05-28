const RATE_WINDOW_MS = 60_000

/**
 * Returns a per-IP sliding-window rate limiter.
 * @param limit  Max requests allowed per IP per minute.
 */
export function createRateLimiter(limit: number) {
  const window = new Map<string, { count: number; resetAt: number }>()

  return function isRateLimited(ip: string): boolean {
    const now = Date.now()

    // Sweep expired entries when the map grows large to prevent unbounded memory.
    if (window.size > 5_000) {
      for (const [key, val] of window) {
        if (val.resetAt < now) window.delete(key)
      }
    }

    const entry = window.get(ip)
    if (!entry || entry.resetAt < now) {
      window.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
      return false
    }
    if (entry.count >= limit) return true
    entry.count++
    return false
  }
}
