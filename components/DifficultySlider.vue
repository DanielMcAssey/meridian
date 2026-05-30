<script setup lang="ts">
import type { Difficulty } from '~/types/game'
import { DIFFICULTIES, POOL_LABEL, POOL_TIERS } from '~/config/game'

const props = withDefaults(defineProps<{
  modelValue: Difficulty | 'any'
  allowAny?: boolean
  /** When provided, shows a country count inside each option. */
  countByDiff?: Record<Difficulty, number>
  label?: string
}>(), {
  allowAny: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: Difficulty | 'any'] }>()

const DIFF_COLOR: Record<Difficulty, string> = {
  easy:   'oklch(0.62 0.19 145)',
  medium: 'oklch(0.68 0.17 90)',
  hard:   'oklch(0.66 0.19 50)',
  expert: 'oklch(0.60 0.22 25)',
}

// Text colour on the coloured active pill — easy/medium are bright enough to need dark ink
const DIFF_TEXT: Record<Difficulty | 'any', string> = {
  any:    'var(--color-bg)',
  easy:   'oklch(0.18 0.05 145)',
  medium: 'oklch(0.22 0.06 90)',
  hard:   'oklch(0.16 0.04 50)',
  expert: 'oklch(0.98 0.005 80)',
}

// Tier dot colours — match the legend in the knowledge detail modal
const TIER_DOT_COLOR: Record<number, string> = {
  1: 'var(--color-ok)',
  2: 'var(--accent)',
  3: 'color-mix(in oklab, var(--color-bad) 40%, var(--accent) 60%)',
  4: 'var(--color-bad)',
}

const stops = computed((): Array<Difficulty | 'any'> =>
  props.allowAny ? ['any', ...DIFFICULTIES.map((d) => d.id)] : DIFFICULTIES.map((d) => d.id),
)

const activeIndex = computed(() => stops.value.indexOf(props.modelValue))

function activeBg(stop: Difficulty | 'any'): string {
  return stop === 'any' ? 'var(--color-ink)' : DIFF_COLOR[stop]
}

function tiersFor(stop: Difficulty | 'any'): number[] {
  return stop === 'any' ? [] : POOL_TIERS[stop]
}

const headerLabel = computed(() => props.label ?? 'Difficulty')
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">
      {{ headerLabel }}
    </span>

    <div class="flex gap-[3px] p-[3px] bg-paper border border-rule rounded-[14px]">
      <button
        v-for="(stop, i) in stops"
        :key="stop"
        type="button"
        class="relative flex flex-col items-center justify-center gap-1 flex-1 px-2.5 sm:px-3.5 py-2.5
               rounded-[10px] transition-[background,color,box-shadow,transform] duration-150
               cursor-pointer text-center min-w-0 select-none"
        :style="activeIndex === i
          ? { background: activeBg(stop), color: DIFF_TEXT[stop], boxShadow: 'var(--shadow-sm)' }
          : {}"
        :class="activeIndex === i ? '' : 'text-ink-3 hover:text-ink-2 hover:bg-[var(--color-bg-tint)]'"
        @click="emit('update:modelValue', stop)"
      >
        <span class="font-sans text-[13px] font-medium leading-tight whitespace-nowrap">
          {{ stop === 'any' ? 'Any' : POOL_LABEL[stop] }}
        </span>

        <!-- Tier inclusion dots -->
        <span v-if="tiersFor(stop).length" class="flex items-center gap-[3px]">
          <span
            v-for="tier in tiersFor(stop)"
            :key="tier"
            class="w-[5px] h-[5px] rounded-full shrink-0"
            :style="{
              background: activeIndex === i ? 'currentColor' : TIER_DOT_COLOR[tier],
              opacity: activeIndex === i ? '0.5' : '1',
            }"
          />
        </span>

        <span
          v-if="countByDiff && stop !== 'any'"
          class="font-mono text-[8.5px] tracking-[0.06em] uppercase leading-none transition-opacity duration-150"
          :class="activeIndex === i ? 'opacity-70' : 'opacity-40'"
        >
          {{ countByDiff[stop as Difficulty] }}
        </span>
      </button>
    </div>
  </div>
</template>
