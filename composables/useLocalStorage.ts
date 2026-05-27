import { ref, watch, onMounted, type Ref } from 'vue'

/**
 * Reactive localStorage binding.
 *
 * All calls with the same key share the **same** Ref instance (module-level
 * registry), so mutating the value in one component is immediately visible in
 * every other component that holds a reference — no page refresh needed.
 *
 * Initialises from defaultValue on the first render (both server and client)
 * so SSR hydration always sees consistent values, then patches in the real
 * localStorage value after mount. For ssr:false pages this patch is invisible
 * (one tick before the page is shown); for SSR pages use <ClientOnly> around
 * any UI driven by this composable to avoid a flash.
 */

// Module-level registry — persists across component mount/unmount cycles.
const _registry = new Map<string, Ref<unknown>>()

export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  // Return the cached ref if this key has already been initialised.
  if (_registry.has(key)) {
    return _registry.get(key) as Ref<T>
  }

  // Always start with defaultValue so the initial render matches the server.
  const value = ref<T>(defaultValue) as Ref<T>
  _registry.set(key, value as Ref<unknown>)

  if (import.meta.client) {
    // Sync the real localStorage value after mount to avoid hydration mismatches.
    // onMounted is called in the context of the first component to access this key.
    onMounted(() => {
      try {
        const stored = localStorage.getItem(key)
        if (stored !== null) {
          value.value = JSON.parse(stored) as T
        }
      } catch {
        // Quota exceeded or private browsing — silently ignore
      }
    })

    // Persist every subsequent change back to localStorage.
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
