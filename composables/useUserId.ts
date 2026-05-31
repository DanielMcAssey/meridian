import type { Ref } from 'vue'

/**
 * Returns the device's stable user ID stored in localStorage.
 * The ID is issued by the server on first registration — this composable
 * only reads and exposes it; it never generates one client-side.
 */
export function useUserId(): Ref<string> {
  return useLocalStorage('geo.user.id', '') as Ref<string>
}
