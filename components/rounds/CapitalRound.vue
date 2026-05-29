<script setup lang="ts">
import type { Country, Round } from '~/types/game'
import { calcOptClass } from '~/composables/useRoundOptionClass'

const props = defineProps<{
  round:   Round
  picked:  Country | null
  locked:  boolean
  correct: boolean | null
  points:  number | null
}>()

const emit = defineEmits<{ pick: [country: Country] }>()

function optClass(opt: Country): string {
  return calcOptClass(opt.code === props.round.answer.code, props.picked?.code === opt.code, props.locked)
}

const label = computed(() => `The capital is ${props.round.answer.capital}`)
</script>

<template>
  <div class="flex flex-col gap-6 items-center">
    <!-- Country name display -->
    <div
      class="relative w-full flex justify-center p-6 sm:p-10 rounded-xl border border-dashed border-rule-2"
      style="background: repeating-linear-gradient(45deg, var(--color-bg-tint) 0 12px, var(--color-paper) 12px 24px)"
    >
      <div class="flex flex-col items-center gap-2 text-center">
        <span class="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-3">Country</span>
        <span
          class="font-serif font-normal leading-[1.05] tracking-[-0.02em] text-ink"
          style="font-size: clamp(30px, 5vw, 56px)"
        >{{ round.answer.name }}</span>
        <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3 mt-1">{{ round.answer.region }}</span>
      </div>
      <RoundsFeedbackOverlay
        v-if="correct !== null"
        :correct="correct"
        :timed-out="!picked"
        :label="label"
        :points="points"
      />
    </div>

    <!-- Prompt -->
    <div class="text-center">
      <span class="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-3">Plate V · Civics</span>
      <h2 class="font-serif font-normal text-[clamp(28px,3.5vw,40px)] tracking-[-0.015em] mt-1.5 mb-0">
        What is the <em class="italic" style="color: var(--accent-deep)">capital</em>?
      </h2>
    </div>

    <!-- Answer buttons showing capital city names -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
      <button
        v-for="(opt, i) in round.options"
        :key="opt.code"
        :class="[
          'flex items-center gap-3 text-left',
          'bg-paper border border-rule rounded-xl px-4 py-3.5 min-h-[3rem]',
          'transition-all duration-150',
          'hover:not-disabled:border-ink-2 hover:not-disabled:-translate-y-px hover:not-disabled:shadow-sm',
          'disabled:cursor-default',
          optClass(opt) === 'opt-correct' && 'bg-ok-soft! border-ok! text-ink',
          optClass(opt) === 'opt-wrong'   && 'bg-bad-soft! border-bad! text-ink',
          optClass(opt) === 'opt-dim'     && 'opacity-50',
          optClass(opt) === 'opt-picked'  && 'border-ink',
        ]"
        :aria-label="`Option ${String.fromCharCode(65 + i)}: ${opt.capital}`"
        :disabled="locked"
        @click="emit('pick', opt)"
      >
        <span
          :class="[
            'font-mono text-[11px] tracking-[0.1em] text-ink-3',
            'border border-rule w-6 h-6 rounded-md shrink-0',
            'inline-flex items-center justify-center',
            optClass(opt) === 'opt-correct' && 'bg-ok! text-white! border-ok!',
            optClass(opt) === 'opt-wrong'   && 'bg-bad! text-white! border-bad!',
          ]"
        >{{ String.fromCharCode(65 + i) }}</span>
        <span class="font-serif text-xl font-normal tracking-[-0.01em] flex-1">{{ opt.capital }}</span>
      </button>
    </div>
  </div>
</template>
