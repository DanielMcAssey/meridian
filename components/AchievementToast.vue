<script setup lang="ts">
import type { AchievementDef } from '~/config/achievements'

const props = defineProps<{
  queue: AchievementDef[]
}>()

const emit = defineEmits<{
  dismissed: [id: string]
}>()

const visible  = ref<AchievementDef | null>(null)
const draining = ref(false)
let   hideTimer: ReturnType<typeof setTimeout> | null = null

function showNext() {
  if (draining.value || props.queue.length === 0) return
  visible.value  = props.queue[0] ?? null
  draining.value = true
  hideTimer = setTimeout(() => {
    dismiss()
  }, 4000)
}

function dismiss() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  const current = visible.value
  visible.value  = null
  draining.value = false
  if (current) emit('dismissed', current.id)
}

watch(
  () => props.queue.length,
  (len) => {
    if (len > 0 && !draining.value) showNext()
  },
  { immediate: true },
)

watch(draining, (isDraining) => {
  if (!isDraining && props.queue.length > 0) {
    setTimeout(showNext, 300)
  }
})

onUnmounted(() => {
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      aria-live="polite"
      aria-atomic="true"
      class="fixed bottom-6 right-6 z-50 pointer-events-none"
    >
      <Transition
        enter-from-class="opacity-0 translate-y-3 scale-95"
        leave-to-class="opacity-0 translate-y-3 scale-95"
        enter-active-class="transition-[opacity,transform] duration-300 ease-out"
        leave-active-class="transition-[opacity,transform] duration-200 ease-in"
      >
        <div
          v-if="visible"
          role="status"
          class="pointer-events-auto flex items-start gap-3 rounded-2xl border border-rule bg-paper px-5 py-4 max-w-xs cursor-pointer"
          style="box-shadow: var(--shadow-sm)"
          @click="dismiss"
        >
          <span class="text-3xl leading-none shrink-0 mt-0.5" aria-hidden="true">{{ visible.icon }}</span>
          <div class="min-w-0">
            <p class="font-mono text-[10px] tracking-[0.14em] uppercase mb-1" style="color: var(--accent-deep)">
              Achievement unlocked
            </p>
            <p class="font-serif text-[17px] tracking-[-0.01em] leading-tight text-ink font-normal">
              {{ visible.name }}
            </p>
            <p class="text-[12.5px] text-ink-2 mt-0.5 leading-snug">{{ visible.description }}</p>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
