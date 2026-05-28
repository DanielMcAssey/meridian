<script setup lang="ts">
const atlas = useAtlasStore()
const route = useRoute()

// Nuxt's navigateFallback always serves the '/' shell, so the server
// renders with route.name === 'index' regardless of the real URL.
// Any branch on route.name must be deferred until after mount so the
// initial render matches the server output.
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
  atlas.load()
  useUserId() // ensure every returning user gets a UUID on first load after migration

  // When autoUpdate activates a new SW (skipWaiting → controllerchange),
  // reload so the new bundles are served instead of the old cached ones.
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    window.location.reload()
  })
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppChrome />
    <div class="relative flex flex-col flex-1 min-h-0">
      <NuxtPage />
      <Transition leave-active-class="transition-opacity duration-500 ease-in" leave-to-class="opacity-0">
        <GameSplash
          v-if="mounted && !atlas.ready && route.name !== 'leaderboard'"
          class="absolute! inset-0! z-10 bg-bg!"
        />
      </Transition>
    </div>
  </div>
</template>
