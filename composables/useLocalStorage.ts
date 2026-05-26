import { ref, watch, type Ref } from 'vue'

/**
 * Reactive localStorage binding.
 * Reads synchronously on the client (so SSR:false pages hydrate without flash).
 * On the server, falls back to defaultValue silently.
 */
export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  const getInitial = (): T => {
    if (!import.meta.client) return defaultValue
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  }

  const value = ref<T>(getInitial()) as Ref<T>

  if (import.meta.client) {
    watch(
      value,
      (newVal) => {
        try {
          localStorage.setItem(key, JSON.stringify(newVal))
        } catch {
          // Quota exceeded or private browsing — silently ignore
        }
      },
      { deep: true },
    )
  }

  return value
}
