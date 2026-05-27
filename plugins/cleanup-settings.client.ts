/**
 * One-time cleanup of localStorage keys that no longer exist in the app.
 * Safe to run on every cold start — exits immediately once the keys are gone.
 */
export default defineNuxtPlugin(() => {
  try {
    localStorage.removeItem('geo.theme')
    localStorage.removeItem('geo.accent')
  } catch { /* Non-critical */ }
})
