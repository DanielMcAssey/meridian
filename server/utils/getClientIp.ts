import { getRequestIP } from 'h3'
import type { H3Event } from 'h3'

/**
 * Returns the best available client IP for rate-limiting purposes.
 *
 * Uses H3's built-in getRequestIP, which also honours
 * event.context.clientAddress (set by server middleware for custom proxy
 * setups, e.g. reading CF-Connecting-IP from Cloudflare).
 *
 * Set NUXT_TRUST_PROXY=1 when running behind a trusted reverse proxy
 * (Nginx, Cloudflare, etc.) that sets X-Forwarded-For.  Without that flag,
 * X-Forwarded-For is ignored to prevent IP spoofing.
 */
export function getClientIp(event: H3Event): string {
  const { trustProxy } = useRuntimeConfig(event)
  return getRequestIP(event, { xForwardedFor: !!trustProxy }) ?? 'unknown'
}
