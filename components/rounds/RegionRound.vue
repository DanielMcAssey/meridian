<script setup lang="ts">
import type { Country, Round } from '~/types/game'

const props = defineProps<{
  round:   Round
  picked:  Country | null
  locked:  boolean
  correct: boolean | null
  points:  number | null
}>()

const emit = defineEmits<{ pick: [country: Country] }>()

function optClass(opt: Country): string {
  const isPicked = props.picked?.code === opt.code
  const isAnswer = opt.region === props.round.answer.region
  if (props.locked) {
    if (isAnswer) return 'opt-correct'
    if (isPicked) return 'opt-wrong'
    return 'opt-dim'
  }
  return isPicked ? 'opt-picked' : ''
}

const label = computed(() => `It belongs to ${props.round.answer.region}`)
</script>

<template>
  <div class="flex flex-col gap-6 items-center">
    <!-- Country name + flag display -->
    <div
      class="relative w-full flex justify-center p-6 sm:p-10 rounded-xl border border-dashed border-rule-2"
      style="background: repeating-linear-gradient(45deg, var(--color-bg-tint) 0 12px, var(--color-paper) 12px 24px)"
    >
      <div class="flex flex-col items-center gap-3 text-center">
        <FlagImage
          :code="round.answer.code"
          alt=""
          class="h-14 sm:h-20 w-auto rounded shadow-sm select-none"
          style="box-shadow: 0 4px 16px -4px rgba(20,15,10,0.3)"
        />
        <span
          class="font-serif font-normal leading-[1.05] tracking-[-0.02em] text-ink"
          style="font-size: clamp(26px, 4vw, 48px)"
        >{{ round.answer.name }}</span>
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
      <span class="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-3">Plate VI · Geography</span>
      <h2 class="font-serif font-normal text-[clamp(28px,3.5vw,40px)] tracking-[-0.015em] mt-1.5 mb-0">
        Which <em class="italic" style="color: var(--accent-deep)">continent</em>?
      </h2>
    </div>

    <!-- Continent buttons -->
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
        <span class="font-serif text-xl font-normal tracking-[-0.01em] flex-1">{{ opt.region }}</span>
      </button>
    </div>
  </div>
</template>
