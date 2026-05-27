<script setup lang="ts">
import type { Country, Round } from '~/types/game'

defineProps<{
  round:  Round
  picked: Country | null
  locked: boolean
}>()

const emit = defineEmits<{ pick: [country: Country] }>()

const atlas = useAtlasStore()
</script>

<template>
  <div class="flex flex-col gap-6 items-center">
    <!-- Silhouette display — hatched surround to frame the shape -->
    <div
      class="w-full flex justify-center p-5 rounded-xl border border-dashed border-rule-2"
      style="background: repeating-linear-gradient(45deg, var(--color-bg-tint) 0 12px, var(--color-paper) 12px 24px)"
    >
      <div class="w-full max-w-[min(480px,100%)]" style="height: clamp(140px, 28vw, 260px)">
        <CountrySilhouette :path="atlas.countryPaths[round.answer.code] ?? ''" />
      </div>
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
