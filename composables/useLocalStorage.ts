import { ref, watch, type Ref } from 'vue'

/**
 * Reactive localStorage binding.
 *
 * All calls with the same key share the **same** Ref instance (module-level
 * registry), so mutating the value in one component is immediately visible in
 * every other component that holds a reference — no page refresh needed.
 *
 * Reads synchronously on the client so SSR:false pages hydrate without flash.
 * Falls back to defaultValue silently on the server.
 */

// Module-level registry — persists across component mount/unmount cycles.
const _registry = new Map<string, Ref<unknown>>()

export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  // Return the cached ref if this key has already been initialised.
  if (_registry.has(key)) {
    return _registry.get(key) as Ref<T>
  }

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

  _registry.set(key, value as Ref<unknown>)
  return value
}
