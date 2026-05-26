<script setup lang="ts">
import type { Country } from '~/types/game'

const props = defineProps<{
  options: Country[]
  answer: Country
  picked: Country | null
  locked: boolean
}>()

const emit = defineEmits<{
  pick: [country: Country]
}>()

function optClass(opt: Country): string {
  const isPicked = props.picked?.code === opt.code
  const isAnswer = opt.code === props.answer.code
  if (props.locked) {
    if (isAnswer) return 'opt opt-correct'
    if (isPicked) return 'opt opt-wrong'
    return 'opt opt-dim'
  }
  return isPicked ? 'opt opt-picked' : 'opt'
}
</script>

<template>
  <div class="options">
    <button
      v-for="(opt, i) in options"
      :key="opt.code"
      :class="optClass(opt)"
      :disabled="locked"
      @click="emit('pick', opt)"
    >
      <span class="opt-letter">{{ String.fromCharCode(65 + i) }}</span>
      <span class="opt-name">{{ opt.name }}</span>
      <span class="opt-region">{{ opt.region }}</span>
    </button>
  </div>
</template>
