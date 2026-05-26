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
  <div class="flex flex-col gap-5 flex-1 min-h-0">
    <!-- Prompt bar — stacks vertically on mobile, row on sm+ -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4
             p-4 bg-bg-tint border border-rule rounded-xl shrink-0"
    >
      <FlagImage
        :code="props.round.answer.code"
        class="w-[90px] aspect-[3/2] block object-cover rounded shrink-0"
        style="box-shadow: 0 4px 12px -4px rgba(20,15,10,0.35), 0 1px 0 rgba(20,15,10,0.06)"
      />
      <div class="flex flex-col gap-0.5">
        <span class="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink-3">Plate III · Charting</span>
        <h2 class="font-serif font-normal text-[clamp(24px,2.6vw,32px)] tracking-[-0.015em] mt-1 mb-0">
          Locate <em class="italic" style="color: var(--accent-deep)">{{ props.round.answer.name }}</em> on the map.
        </h2>
        <p class="text-ink-3 mt-1 text-[13.5px] font-mono tracking-[0.04em]">Click the country.</p>
      </div>
    </div>

    <WorldMap
      mode="click"
      fill-parent
      :reveal-code="props.locked ? props.round.answer.code : null"
      :selected-code="props.picked?.code ?? null"
      @pick="handleClick"
    />
  </div>
</template>
