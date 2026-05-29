<script setup lang="ts">
import type { Difficulty } from '~/types/game'
import { DIFFICULTIES } from '~/config/game'

const props = withDefaults(defineProps<{
  modelValue: Difficulty | 'any'
  allowAny?: boolean
  /** When provided, appends "· N countries" to the header label. */
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

const DIFF_LABEL: Record<Difficulty | 'any', string> = {
  any:    'Any',
  easy:   'Flagship',
  medium: 'Well-known',
  hard:   'World',
  expert: 'Obscure',
}

const stops = computed((): Array<Difficulty | 'any'> =>
  props.allowAny ? ['any', ...DIFFICULTIES.map((d) => d.id)] : DIFFICULTIES.map((d) => d.id),
)

const maxVal    = computed(() => stops.value.length - 1)
const sliderVal = computed(() => stops.value.indexOf(props.modelValue))

const activeColor = computed(() =>
  props.modelValue === 'any' ? 'var(--color-ink)' : DIFF_COLOR[props.modelValue],
)

const trackStyle = computed(() => {
  if (props.modelValue === 'any') return 'var(--color-rule)'
  const pct = (sliderVal.value / maxVal.value) * 100
  const col = DIFF_COLOR[props.modelValue]
  return `linear-gradient(to right, ${col} 0%, ${col} ${pct}%, var(--color-rule) ${pct}%, var(--color-rule) 100%)`
})

const headerLabel = computed(() => {
  const base = props.label ?? 'Difficulty'
  if (props.countByDiff && props.modelValue !== 'any') {
    return `${base} · ${props.countByDiff[props.modelValue as Difficulty]} countries`
  }
  return base
})

function onInput(e: Event) {
  emit('update:modelValue', stops.value[Number((e.target as HTMLInputElement).value)]!)
}
</script>

<template>
  <div class="flex flex-col gap-2" :class="allowAny ? 'min-w-[260px]' : 'min-w-[220px]'">
    <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">
      {{ headerLabel }}
    </span>
    <div class="relative pt-1">
      <input
        type="range"
        :min="0"
        :max="maxVal"
        step="1"
        :value="sliderVal"
        :style="{ background: trackStyle }"
        class="diff-slider w-full"
        aria-label="Country obscurity"
        @input="onInput"
      />
      <div class="flex justify-between mt-2">
        <span
          v-for="(stop, i) in stops"
          :key="stop"
          class="font-mono text-[9px] tracking-[0.1em] uppercase transition-colors duration-150 cursor-pointer select-none"
          :style="sliderVal === i ? { color: activeColor } : { color: 'var(--color-ink-3)' }"
          @click="emit('update:modelValue', stop)"
        >{{ DIFF_LABEL[stop] }}</span>
      </div>
    </div>
  </div>
</template>
