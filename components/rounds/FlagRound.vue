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

const imageAlt = computed(() =>
  props.correct !== null ? `Flag of ${props.round.answer.name}` : 'Country flag',
)
</script>

<template>
  <div class="flex flex-col gap-6 items-center">
    <!-- Flag display -->
    <div
      class="relative w-full flex justify-center p-4 rounded-xl border border-dashed border-rule-2"
      style="background: repeating-linear-gradient(45deg, var(--color-bg-tint) 0 12px, var(--color-paper) 12px 24px)"
    >
      <div
        class="w-full max-w-[min(520px,100%)] aspect-[3/2]
               bg-paper rounded-md overflow-hidden flex items-center justify-center"
        style="box-shadow: 0 16px 40px -16px rgba(20,15,10,0.35), 0 1px 0 rgba(20,15,10,0.06)"
      >
        <FlagImage :code="round.answer.code" :alt="imageAlt" class="w-full h-full block object-contain select-none" />
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
      <span class="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-3">Plate I · Vexillology</span>
      <h2 class="font-serif font-normal text-[clamp(28px,3.5vw,40px)] tracking-[-0.015em] mt-1.5 mb-0">
        Whose <em class="italic" style="color: var(--accent-deep)">banner</em> is this?
      </h2>
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
