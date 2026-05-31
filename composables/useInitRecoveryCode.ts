/**
 * Migration composable for accounts created before server-side registration
 * was introduced.  Those accounts have a client-generated userId in localStorage
 * but no recoveryCode.
 *
 * Flow:
 *  1. Call /api/account/init — returns the recovery code for accounts that
 *     already have a DB row but were created before recovery codes existed.
 *  2. 404 means the UUID has no DB row at all (client-generated, user never
 *     submitted a score).  Fall back to /api/account/register to create a
 *     proper server-issued identity — safe because there is no data attached
 *     to the old UUID.
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
    } catch (err) {
      // 404 = no DB row for this UUID (old client-generated identity).
      // Register fresh so the user gets a proper server-issued account.
      if (isHttpError(err, 404) && profile.name) {
        try {
          const reg = await $fetch<{ userId: string; recoveryCode: string }>('/api/account/register', {
            method: 'POST',
            body: { name: profile.name },
          })
          useUserId().value       = reg.userId
          recoveryCode.value      = reg.recoveryCode
        } catch { /* silent — will retry on next mount */ }
      }
    }
  })
}

function isHttpError(err: unknown, status: number): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    (err as { statusCode: number }).statusCode === status
  )
}
