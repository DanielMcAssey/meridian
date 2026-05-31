/**
 * Migration composable for accounts created before server-side registration
 * was introduced.  Those accounts have a client-generated userId in localStorage
 * but no recoveryCode.  On mount this calls /api/account/init to generate and
 * return the missing code.  No-ops when the code is already present or the
 * user has no DB row yet (404 — pre-registration new user).
 */
export function useInitRecoveryCode() {
  const recoveryCode = useRecoveryCode()
  const profile      = useProfileStore()

  onMounted(async () => {
    if (recoveryCode.value || !profile.userId) return
    try {
      const res = await $fetch<{ recoveryCode?: string }>('/api/account/init', {
        method: 'POST',
        body: { userId: profile.userId },
      })
      if (res?.recoveryCode) recoveryCode.value = res.recoveryCode
    } catch { /* 404 = no DB row — pre-registration user, nothing to migrate */ }
  })
}
