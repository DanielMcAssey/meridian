<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{
  correct:   boolean
  timedOut:  boolean
  label:     string
  points:    number | null
}>()

const overlayRef = ref<HTMLElement | null>(null)

onMounted(() => {
  overlayRef.value?.focus()
})
</script>

<template>
  <div
    ref="overlayRef"
    tabindex="-1"
    class="absolute inset-0 z-10 flex items-center justify-center rounded-xl focus:outline-none"
    style="background: color-mix(in srgb, var(--paper) 84%, transparent); backdrop-filter: blur(6px); animation: fb-backdrop 0.22s ease both"
  >
    <div
      class="flex flex-col items-center gap-2.5 px-6 py-5 rounded-2xl border text-center max-w-[90%]"
      :class="correct ? 'bg-ok-soft border-ok/50' : 'bg-bad-soft border-bad/50'"
      style="box-shadow: var(--shadow-lg); animation: feedback-pop 0.42s cubic-bezier(.2,.85,.3,1.25) both"
    >
      <div
        class="w-12 h-12 rounded-full flex items-center justify-center text-[22px] shrink-0"
        :class="correct ? 'bg-ok text-white' : 'bg-bad text-white'"
      >
        {{ correct ? '✓' : (timedOut ? '⏱' : '✗') }}
      </div>
      <div class="flex flex-col gap-1">
        <span
          class="font-serif italic leading-none"
          style="font-size: clamp(20px, 2.5vw, 26px)"
          :class="correct ? 'text-ok' : 'text-bad'"
        >
          {{ correct ? 'Correct!' : (timedOut ? "Time's up" : 'Not quite') }}
        </span>
        <p class="m-0 text-ink-2 text-[13px] sm:text-[14px]">{{ label }}</p>
      </div>
      <div
        v-if="points !== null"
        class="font-mono text-[11px] tracking-[0.1em] uppercase px-3 py-1 rounded-full"
        :class="correct ? 'bg-ok/15 text-ok' : 'bg-ink/8 text-ink-3'"
      >
        {{ correct ? `+${points} pts` : 'No points' }}
      </div>
    </div>
  </div>
</template>
