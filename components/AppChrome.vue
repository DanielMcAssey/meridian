<script setup lang="ts">
const route = useRoute()
const playerName = useLocalStorage('geo.player.name', '')
</script>

<template>
  <header class="chrome">
    <div
      class="chrome-brand"
      :style="route.name !== 'index' ? 'cursor:pointer' : 'cursor:default'"
      @click="route.name !== 'index' ? navigateTo('/menu') : undefined"
    >
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="34" height="34">
          <circle cx="20" cy="20" r="18" class="mark-ring" />
          <circle cx="20" cy="20" r="1.6" class="mark-dot" />
          <path d="M20 6 L23 20 L20 34 L17 20 Z" class="mark-needle" />
          <path d="M6 20 L20 17 L34 20 L20 23 Z" class="mark-needle-h" />
        </svg>
      </span>
      <span class="brand-text">
        <span class="brand-title">Meridian</span>
        <span class="brand-sub">A Geographical Pastime · est. MMXXVI</span>
      </span>
    </div>

    <div v-if="route.name !== 'index' && playerName" class="chrome-right">
      <button class="chrome-btn ghost" @click="navigateTo('/leaderboard')">Leaderboard</button>
      <div class="chrome-player" title="Change name" @click="navigateTo('/')">
        <span class="chrome-player-label">Traveller</span>
        <span class="chrome-player-name">{{ playerName }}</span>
      </div>
    </div>
  </header>
</template>
