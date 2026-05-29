<script setup lang="ts">
import type { Country } from '~/types/game'

const props = defineProps<{
  options:   Country[]
  answer:    Country
  picked:    Country | null
  locked:    boolean  // show result colours (correct/wrong/dim)
  disabled?: boolean  // block interaction without revealing results
}>()

const emit = defineEmits<{
  pick: [country: Country]
}>()

function optClass(opt: Country): string {
  const isPicked = props.picked?.code === opt.code
  const isAnswer = opt.code === props.answer.code
  if (props.locked) {
    if (isAnswer) return 'opt-correct'
    if (isPicked) return 'opt-wrong'
    return 'opt-dim'
  }
  return isPicked ? 'opt-picked' : ''
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
    <button
      v-for="(opt, i) in options"
      :key="opt.code"
      :class="[
        'grid grid-cols-[auto_1fr_auto] items-center gap-3 text-left',
        'bg-paper border border-rule rounded-xl px-4 py-3.5 min-h-[3rem]',
        'transition-all duration-150',
        'hover:not-disabled:border-ink-2 hover:not-disabled:-translate-y-px hover:not-disabled:shadow-sm',
        'disabled:cursor-default',
        optClass(opt) === 'opt-correct' && 'bg-ok-soft! border-ok! text-ink',
        optClass(opt) === 'opt-wrong'   && 'bg-bad-soft! border-bad! text-ink',
        optClass(opt) === 'opt-dim'     && 'opacity-50',
        optClass(opt) === 'opt-picked'  && 'border-ink',
      ]"
      :disabled="locked || disabled"
      @click="emit('pick', opt)"
    >
      <span
        :class="[
          'font-mono text-[11px] tracking-[0.1em] text-ink-3',
          'border border-rule w-6 h-6 rounded-md',
          'inline-flex items-center justify-center shrink-0',
          optClass(opt) === 'opt-correct' && 'bg-ok! text-white! border-ok!',
          optClass(opt) === 'opt-wrong'   && 'bg-bad! text-white! border-bad!',
        ]"
      >{{ String.fromCharCode(65 + i) }}</span>
      <span class="font-serif text-xl font-normal tracking-[-0.01em]">{{ opt.name }}</span>
      <span class="font-mono text-[10.5px] tracking-[0.12em] uppercase text-ink-3">{{ opt.region }}</span>
    </button>
  </div>
</template>
