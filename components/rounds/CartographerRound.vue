<script setup lang="ts">
import type { Country, Round } from '~/types/game'

const props = defineProps<{
  round: Round
  picked: Country | null
  locked: boolean
}>()

const emit = defineEmits<{ pick: [country: Country] }>()

function handleClick(country: Country) {
  if (props.locked) return
  emit('pick', country)
}
</script>

<template>
  <div class="round-cart">
    <div class="cart-prompt">
      <FlagImage :code="props.round.answer.code" class="flag-img-sm" />
      <div class="cart-text">
        <span class="prompt-eyebrow">Plate III · Charting</span>
        <h2 class="prompt-text">Locate <em>{{ props.round.answer.name }}</em> on the map.</h2>
        <p class="prompt-sub">Click the country.</p>
      </div>
    </div>
    <WorldMap
      mode="click"
      :reveal-code="props.locked ? props.round.answer.code : null"
      :selected-code="props.picked?.code ?? null"
      @pick="handleClick"
    />
  </div>
</template>
