<script setup lang="ts">
defineProps<{ kind: 'gold' | 'silver' | 'bronze' }>()
</script>

<template>
  <svg :class="`trophy-svg trophy-${kind}`" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 3h10v3a5 5 0 0 1-10 0V3z" class="trophy-cup" />
    <path d="M4 4h3v3a3 3 0 0 1-3-3z M20 4h-3v3a3 3 0 0 0 3-3z" class="trophy-handle" />
    <rect x="10" y="11" width="4" height="4" class="trophy-stem" />
    <rect x="7" y="15" width="10" height="2.5" rx="1" class="trophy-base" />
    <rect x="6" y="18" width="12" height="2.5" rx="1" class="trophy-base" />
  </svg>
</template>
