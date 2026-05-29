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

const label = computed(() =>
  props.correct ? `It is indeed ${props.round.answer.name}` : `The answer was ${props.round.answer.name}`,
)
</script>

<template>
  <div class="flex flex-col gap-5 items-center">
    <!-- Prompt -->
    <div class="text-center">
      <span class="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-3">Plate II · Cartography</span>
      <h2 class="font-serif font-normal text-[clamp(28px,3.5vw,40px)] tracking-[-0.015em] mt-1.5 mb-0">
        A pin has been dropped. <em class="italic" style="color: var(--accent-deep)">Where</em> are we?
      </h2>
    </div>

    <!-- Map with feedback overlay scoped to this section -->
    <div class="relative w-full">
      <WorldMap
        mode="static"
        height-class="max-h-[38vh] sm:max-h-[48vh]"
        :pin-code="props.round.answer.code"
        :reveal-code="props.locked ? props.round.answer.code : null"
      />
      <RoundsFeedbackOverlay
        v-if="correct !== null"
        :correct="correct"
        :timed-out="!picked"
        :label="label"
        :points="points"
      />
    </div>

    <RoundsAnswerOptions
      :options="props.round.options"
      :answer="props.round.answer"
      :picked="props.picked"
      :locked="props.locked"
      @pick="emit('pick', $event)"
    />
  </div>
</template>
