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

const atlas = useAtlasStore()

const label = computed(() =>
  props.correct ? `It is indeed ${props.round.answer.name}` : `The answer was ${props.round.answer.name}`,
)

const imageAlt = computed(() =>
  props.correct !== null ? `Silhouette of ${props.round.answer.name}` : 'Country silhouette outline',
)
</script>

<template>
  <div class="flex flex-col gap-6 items-center">
    <!-- Silhouette display -->
    <div
      class="relative w-full flex justify-center p-5 rounded-xl border border-dashed border-rule-2"
      style="background: repeating-linear-gradient(45deg, var(--color-bg-tint) 0 12px, var(--color-paper) 12px 24px)"
    >
      <div class="w-full max-w-[min(480px,100%)]" style="height: clamp(140px, 28vw, 260px)">
        <CountrySilhouette
          :src="atlas.shapePaths[round.answer.code]"
          :path="atlas.countryPaths[round.answer.code] ?? ''"
          :alt="imageAlt"
        />
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
      <span class="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-3">Plate IV · Topography</span>
      <h2 class="font-serif font-normal text-[clamp(28px,3.5vw,40px)] tracking-[-0.015em] mt-1.5 mb-0">
        Which country has this <em class="italic" style="color: var(--accent-deep)">outline</em>?
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
