<script setup lang="ts">
import type { Country, Round } from '~/types/game'

const props = defineProps<{
  round: Round
  picked: Country | null
  locked: boolean
}>()

const emit = defineEmits<{ pick: [country: Country] }>()
</script>

<template>
  <div class="round-map">
    <div class="prompt">
      <span class="prompt-eyebrow">Plate II · Cartography</span>
      <h2 class="prompt-text">A pin has been dropped. <em>Where</em> are we?</h2>
    </div>
    <WorldMap
      mode="static"
      :pin-code="props.round.answer.code"
      :reveal-code="props.locked ? props.round.answer.code : null"
    />
    <RoundsAnswerOptions
      :options="props.round.options"
      :answer="props.round.answer"
      :picked="props.picked"
      :locked="props.locked"
      @pick="emit('pick', $event)"
    />
  </div>
</template>
