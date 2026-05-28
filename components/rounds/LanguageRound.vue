<script setup lang="ts">
import type { Round } from '~/types/game'
import { LANGUAGE_NAMES } from '~/utils/languages'

const props = defineProps<{
  round:      Round
  pickedLang: string | null
  locked:     boolean
  correct:    boolean | null
  points:     number | null
}>()

const emit = defineEmits<{ pickLang: [lang: string] }>()

const atlas = useAtlasStore()

function optClass(lang: string): string {
  const isPicked = props.pickedLang === lang
  const isAnswer = lang === props.round.answerLang
  if (props.locked) {
    if (isAnswer) return 'opt-correct'
    if (isPicked) return 'opt-wrong'
    return 'opt-dim'
  }
  return isPicked ? 'opt-picked' : ''
}

// Show all of the answer country's language names in the feedback label.
const label = computed(() => {
  const names = props.round.answer.langs
    .map((l) => LANGUAGE_NAMES[l])
    .filter(Boolean)
    .join(', ')
  return names ? `Official: ${names}` : `The answer was ${props.round.answerLang}`
})
</script>

<template>
  <div class="flex flex-col gap-6 items-center">
    <!-- Country flag + name display -->
    <div
      class="relative w-full flex justify-center p-6 sm:p-10 rounded-xl border border-dashed border-rule-2"
      style="background: repeating-linear-gradient(45deg, var(--color-bg-tint) 0 12px, var(--color-paper) 12px 24px)"
    >
      <div class="flex flex-col items-center gap-3 text-center">
        <FlagImage
          :code="round.answer.code"
          class="h-14 sm:h-20 w-auto rounded shadow-sm select-none"
          style="box-shadow: 0 4px 16px -4px rgba(20,15,10,0.3)"
        />
        <span
          class="font-serif font-normal leading-[1.05] tracking-[-0.02em] text-ink"
          style="font-size: clamp(26px, 4vw, 48px)"
        >{{ round.answer.name }}</span>
        <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3 mt-0.5">{{ round.answer.region }}</span>
      </div>
      <RoundsFeedbackOverlay
        v-if="correct !== null"
        :correct="correct"
        :timed-out="!pickedLang"
        :label="label"
        :points="points"
      />
    </div>

    <!-- Prompt -->
    <div class="text-center">
      <span class="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-3">Plate VIII · Linguistics</span>
      <h2 class="font-serif font-normal text-[clamp(28px,3.5vw,40px)] tracking-[-0.015em] mt-1.5 mb-0">
        What <em class="italic" style="color: var(--accent-deep)">language</em> is spoken here?
      </h2>
    </div>

    <!-- Language name buttons -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
      <button
        v-for="(lang, i) in round.langOptions"
        :key="lang"
        :class="[
          'flex items-center gap-3 text-left',
          'bg-paper border border-rule rounded-xl px-4 py-3.5 min-h-[3rem]',
          'transition-all duration-150',
          'hover:not-disabled:border-ink-2 hover:not-disabled:-translate-y-px hover:not-disabled:shadow-sm',
          'disabled:cursor-default',
          optClass(lang) === 'opt-correct' && 'bg-ok-soft! border-ok! text-ink',
          optClass(lang) === 'opt-wrong'   && 'bg-bad-soft! border-bad! text-ink',
          optClass(lang) === 'opt-dim'     && 'opacity-50',
          optClass(lang) === 'opt-picked'  && 'border-ink',
        ]"
        :disabled="locked"
        @click="emit('pickLang', lang)"
      >
        <span
          :class="[
            'font-mono text-[11px] tracking-[0.1em] text-ink-3',
            'border border-rule w-6 h-6 rounded-md shrink-0',
            'inline-flex items-center justify-center',
            optClass(lang) === 'opt-correct' && 'bg-ok! text-white! border-ok!',
            optClass(lang) === 'opt-wrong'   && 'bg-bad! text-white! border-bad!',
          ]"
        >{{ String.fromCharCode(65 + i) }}</span>
        <span class="font-serif text-xl font-normal tracking-[-0.01em] flex-1">{{ lang }}</span>
      </button>
    </div>
  </div>
</template>
