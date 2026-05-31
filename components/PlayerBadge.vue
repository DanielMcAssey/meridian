<script setup lang="ts">
import type { Badge } from '~/config/badges'

defineProps<{
  badge: Badge
  size?: 'sm' | 'md'
}>()
</script>

<template>
  <span
    :title="`${badge.label} — ${badge.description}`"
    :aria-label="`${badge.label}: ${badge.description}`"
    :class="['player-badge', `badge-${badge.id}`, size === 'sm' ? 'badge-sm' : 'badge-md']"
  >
    <span aria-hidden="true">{{ badge.icon }}</span>
    <span v-if="(size ?? 'md') !== 'sm'" class="badge-label">{{ badge.label }}</span>
  </span>
</template>

<style scoped>
.player-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 9999px;
  border: 1px solid;
  font-family: var(--font-mono);
  line-height: 1;
  flex-shrink: 0;
  white-space: nowrap;
}

.badge-sm { padding: 0.2rem 0.4rem;  font-size: 11px; }
.badge-md { padding: 0.25rem 0.5rem; font-size: 11.5px; letter-spacing: 0.04em; }

/* Creator — amber/gold */
.badge-creator {
  background: oklch(0.72 0.16 90 / 0.12);
  color: oklch(0.50 0.15 90);
  border-color: oklch(0.72 0.16 90 / 0.4);
}
@media (prefers-color-scheme: dark) {
  .badge-creator {
    background: oklch(0.72 0.16 90 / 0.15);
    color: oklch(0.84 0.14 90);
    border-color: oklch(0.72 0.16 90 / 0.45);
  }
}

/* Pluto — rose */
.badge-pluto {
  background: oklch(0.70 0.17 340 / 0.12);
  color: oklch(0.46 0.17 340);
  border-color: oklch(0.70 0.17 340 / 0.38);
}
@media (prefers-color-scheme: dark) {
  .badge-pluto {
    background: oklch(0.70 0.17 340 / 0.15);
    color: oklch(0.82 0.15 340);
    border-color: oklch(0.70 0.17 340 / 0.45);
  }
}

/* Friends — teal */
.badge-friends {
  background: oklch(0.68 0.13 185 / 0.12);
  color: oklch(0.40 0.13 185);
  border-color: oklch(0.68 0.13 185 / 0.38);
}
@media (prefers-color-scheme: dark) {
  .badge-friends {
    background: oklch(0.68 0.13 185 / 0.15);
    color: oklch(0.78 0.12 185);
    border-color: oklch(0.68 0.13 185 / 0.45);
  }
}
</style>
