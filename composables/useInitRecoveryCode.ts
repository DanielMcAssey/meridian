/**
 * Fetches a recovery code from the server if one isn't stored locally yet.
 * Silent no-op when: code already exists, no userId, or the user has no DB
 * row yet (404 — they haven't submitted a score yet).
 */
export async function initRecoveryCode(): Promise<void> {
  const recoveryCode = useRecoveryCode()
  const profile      = useProfileStore()

  if (recoveryCode.value || !profile.userId) return

  try {
    const res = await $fetch<{ recoveryCode?: string }>('/api/account/init', {
      method: 'POST',
      body: { userId: profile.userId },
    })
    if (res?.recoveryCode) recoveryCode.value = res.recoveryCode
  } catch { /* 404 = no DB row yet — will succeed after first game */ }
}
