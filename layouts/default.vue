<script setup lang="ts">
const atlas = useAtlasStore()
const route = useRoute()

// Load geodata once on the client when any game page mounts
onMounted(() => atlas.load())
</script>

<template>
  <div class="app">
    <AppChrome />
    <!-- Show splash while atlas data is loading (not needed on the leaderboard) -->
    <GameSplash v-if="!atlas.ready && route.name !== 'leaderboard'" />
    <slot v-if="atlas.ready || route.name === 'leaderboard'" />
  </div>
</template>
