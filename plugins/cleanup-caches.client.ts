/**
 * One-time cleanup of stale Workbox runtime caches that have been retired.
 *
 * Add cache names here when a SW cache bucket is removed or renamed so that
 * users' browsers don't keep the old bucket indefinitely.
 */
export default defineNuxtPlugin(() => {
  if (!('caches' in window)) return

  // Nothing retired at the moment — kept as a template for future cleanups.
  const RETIRED: string[] = []

  for (const name of RETIRED) {
    caches.delete(name).catch(() => { /* Non-critical */ })
  }
})
