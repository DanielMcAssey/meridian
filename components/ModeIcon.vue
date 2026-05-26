<script setup lang="ts">
defineProps<{ kind: 'flag' | 'map' | 'cart' | 'compass' }>()
</script>

<template>
  <!-- Flag -->
  <svg v-if="kind === 'flag'" viewBox="0 0 120 120" class="mode-icon">
    <line x1="30" y1="20" x2="30" y2="105" class="mi-pole" />
    <path d="M30 28 L92 24 L86 50 L96 70 L30 74 Z" class="mi-fill" />
    <path d="M30 28 L92 24 L86 50 L96 70 L30 74 Z" class="mi-stroke" />
  </svg>

  <!-- Pin drop -->
  <svg v-else-if="kind === 'map'" viewBox="0 0 120 120" class="mode-icon">
    <path
      d="M60 18 C44 18 32 30 32 46 C32 70 60 102 60 102 C60 102 88 70 88 46 C88 30 76 18 60 18 Z"
      class="mi-fill"
    />
    <path
      d="M60 18 C44 18 32 30 32 46 C32 70 60 102 60 102 C60 102 88 70 88 46 C88 30 76 18 60 18 Z"
      class="mi-stroke"
    />
    <circle cx="60" cy="46" r="9" class="mi-hole" />
  </svg>

  <!-- Cartographer -->
  <svg v-else-if="kind === 'cart'" viewBox="0 0 120 120" class="mode-icon">
    <rect x="22" y="30" width="76" height="60" rx="4" class="mi-stroke" />
    <path d="M34 50 L44 44 L56 52 L70 46 L82 54 L82 74 L34 74 Z" class="mi-fill" />
    <circle
      cx="62"
      cy="58"
      r="3"
      class="mi-stroke"
      style="stroke: var(--ink); fill: var(--paper)"
    />
    <path d="M62 58 L78 36" class="mi-stroke" />
    <circle cx="80" cy="34" r="4" class="mi-fill" />
  </svg>

  <!-- Compass / mixed -->
  <svg v-else viewBox="0 0 120 120" class="mode-icon">
    <circle cx="60" cy="60" r="44" class="mi-stroke" />
    <path d="M60 22 L66 60 L60 98 L54 60 Z" class="mi-fill" />
    <path d="M22 60 L60 54 L98 60 L60 66 Z" class="mi-fill" />
    <circle cx="60" cy="60" r="3" class="mi-stroke" />
  </svg>
</template>
