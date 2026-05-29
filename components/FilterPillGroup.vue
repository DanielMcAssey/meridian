<script setup lang="ts">
defineProps<{
  label:      string
  options:    { id: string | number; label: string }[]
  modelValue: string | number
}>()

defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">{{ label }}</span>
    <div class="flex gap-1 p-[3px] bg-paper border border-rule rounded-full flex-wrap">
      <button
        v-for="opt in options"
        :key="opt.id"
        :class="modelValue === opt.id ? 'diff-pill-on' : 'diff-pill'"
        @click="$emit('update:modelValue', opt.id)"
      >{{ opt.label }}</button>
    </div>
  </div>
</template>
