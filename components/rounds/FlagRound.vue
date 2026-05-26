<script setup lang="ts">
import type { Country, Round } from '~/types/game'

defineProps<{
  round: Round
  picked: Country | null
  locked: boolean
}>()

const emit = defineEmits<{ pick: [country: Country] }>()
</script>

<template>
  <div class="round-flag">
    <div class="flag-stage">
      <div class="flag-card">
        <FlagImage :code="round.answer.code" class="flag-img" />
      </div>
    </div>
    <div class="prompt">
      <span class="prompt-eyebrow">Plate I · Vexillology</span>
      <h2 class="prompt-text">Whose <em>banner</em> is this?</h2>
    </div>
    <RoundsAnswerOptions
      :options="round.options"
      :answer="round.answer"
      :picked="picked"
      :locked="locked"
      @pick="emit('pick', $event)"
    />
  </div>
</template>
