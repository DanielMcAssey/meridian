import type { Ref } from 'vue'

/**
 * Returns a stable per-device UUID, generated once and persisted to
 * localStorage under 'geo.user.id'.  All callers share the same Ref via
 * the useLocalStorage singleton registry.
 */
export function useUserId(): Ref<string> {
  const id = useLocalStorage('geo.user.id', '')
  if (import.meta.client && !id.value) {
    id.value = crypto.randomUUID()
  }
  return id as Ref<string>
}
