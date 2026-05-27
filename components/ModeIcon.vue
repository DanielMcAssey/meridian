<script setup lang="ts">
defineProps<{ kind: 'flag' | 'map' | 'cart' | 'compass' | 'shape' | 'capital' | 'region' }>()
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
  <svg v-else-if="kind === 'compass'" viewBox="0 0 120 120" class="mode-icon">
    <circle cx="60" cy="60" r="44" class="mi-stroke" />
    <path d="M60 22 L66 60 L60 98 L54 60 Z" class="mi-fill" />
    <path d="M22 60 L60 54 L98 60 L60 66 Z" class="mi-fill" />
    <circle cx="60" cy="60" r="3" class="mi-stroke" />
  </svg>

  <!-- Capital cities — building with star -->
  <svg v-else-if="kind === 'capital'" viewBox="0 0 120 120" class="mode-icon">
    <!-- Building body -->
    <rect x="28" y="52" width="64" height="44" rx="2" class="mi-fill" />
    <rect x="28" y="52" width="64" height="44" rx="2" class="mi-stroke" />
    <!-- Columns / pillars -->
    <rect x="36" y="52" width="6" height="44" class="mi-hole" />
    <rect x="57" y="52" width="6" height="44" class="mi-hole" />
    <rect x="78" y="52" width="6" height="44" class="mi-hole" />
    <!-- Entablature -->
    <rect x="24" y="46" width="72" height="8" rx="1" class="mi-fill" />
    <rect x="24" y="46" width="72" height="8" rx="1" class="mi-stroke" />
    <!-- Pediment / triangle roof -->
    <path d="M20 46 L60 18 L100 46 Z" class="mi-fill" />
    <path d="M20 46 L60 18 L100 46 Z" class="mi-stroke" />
    <!-- Star on top -->
    <path d="M60 10 L61.8 15.5 L67.5 15.5 L63 18.9 L64.8 24.5 L60 21.1 L55.2 24.5 L57 18.9 L52.5 15.5 L58.2 15.5 Z" class="mi-fill" style="fill: var(--ink)" />
  </svg>

  <!-- Continental / region — globe with grid lines -->
  <svg v-else-if="kind === 'region'" viewBox="0 0 120 120" class="mode-icon">
    <circle cx="60" cy="60" r="40" class="mi-stroke" />
    <!-- Equator -->
    <line x1="20" y1="60" x2="100" y2="60" class="mi-stroke" />
    <!-- Prime meridian -->
    <line x1="60" y1="20" x2="60" y2="100" class="mi-stroke" />
    <!-- Latitude bands -->
    <path d="M27 40 Q60 34 93 40" class="mi-stroke" style="fill:none" />
    <path d="M27 80 Q60 86 93 80" class="mi-stroke" style="fill:none" />
    <!-- Longitude curves -->
    <path d="M60 20 Q44 60 60 100" class="mi-stroke" style="fill:none" />
    <path d="M60 20 Q76 60 60 100" class="mi-stroke" style="fill:none" />
    <!-- Highlighted continent blob -->
    <path d="M44 46 L56 40 L68 44 L72 56 L66 66 L52 68 L40 62 L38 50 Z" class="mi-fill" />
  </svg>

  <!-- Silhouette / shape — irregular country outline -->
  <svg v-else viewBox="0 0 120 120" class="mode-icon">
    <path
      d="M40 26 L57 18 L76 22 L90 34 L96 52 L92 70 L82 82 L66 90 L48 88 L32 78 L22 62 L24 44 Z"
      class="mi-fill"
    />
    <path
      d="M40 26 L57 18 L76 22 L90 34 L96 52 L92 70 L82 82 L66 90 L48 88 L32 78 L22 62 L24 44 Z"
      class="mi-stroke"
    />
  </svg>
</template>
