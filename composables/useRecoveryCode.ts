import type { Ref } from 'vue'

export function useRecoveryCode(): Ref<string> {
  return useLocalStorage('geo.recovery.code', '') as Ref<string>
}
