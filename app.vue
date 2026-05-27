<script setup lang="ts">
const atlas = useAtlasStore()
const route = useRoute()

// Load geodata once on the client when the app mounts
onMounted(() => {
  atlas.load()
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppChrome />
    <!-- Show splash while atlas data is loading (not needed on the leaderboard) -->
    <GameSplash v-if="!atlas.ready && route.name !== 'leaderboard'" />
    <NuxtPage v-if="atlas.ready || route.name === 'leaderboard'" />
  </div>
</template>
