<script setup lang="ts">
import { ACCENTS } from '~/composables/useGameSettings'

const settings = useGameSettings()
const atlas = useAtlasStore()
const route = useRoute()

// Load geodata once on the client when the app mounts
onMounted(() => {
  atlas.load()

  // Apply accent hue + theme to <html> element (client-only — document doesn't exist on server)
  watchEffect(() => {
    const hue = ACCENTS[settings.accent.value]?.hue ?? 30
    document.documentElement.style.setProperty('--accent-h', String(hue))
  })

  watchEffect(() => {
    const theme = settings.theme.value
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
    else if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
  })
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
