import { ref, watch, type Ref } from 'vue'

/**
 * Reactive localStorage binding.
 *
 * All calls with the same key share the **same** Ref instance (module-level
 * registry), so mutating the value in one component is immediately visible in
 * every other component that holds a reference.
 *
 * The value is read from localStorage synchronously during setup so that it is
 * available immediately — including in route middleware, which runs before any
 * component lifecycle hooks (onMounted) fire.  All pages are ssr:false so
 * there is no server/client hydration mismatch to worry about.
 */

const _registry = new Map<string, Ref<unknown>>()

export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  if (_registry.has(key)) {
    return _registry.get(key) as Ref<T>
  }

  let initial = defaultValue
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) initial = JSON.parse(stored) as T
    } catch { /* quota exceeded or private browsing */ }
  }

  const value = ref<T>(initial) as Ref<T>
  _registry.set(key, value as Ref<unknown>)

  if (import.meta.client) {
    watch(value, (newVal) => {
      try {
        localStorage.setItem(key, JSON.stringify(newVal))
      } catch { /* quota exceeded or private browsing */ }
    }, { deep: true })
  }

  return value
}
