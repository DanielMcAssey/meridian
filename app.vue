<script setup lang="ts">
import { SW_RELOAD_PROTECTED } from '~/config/game'

const atlas = useAtlasStore()
const route = useRoute()

// Nuxt's navigateFallback always serves the '/' shell, so the server
// renders with route.name === 'index' regardless of the real URL.
// Any branch on route.name must be deferred until after mount so the
// initial render matches the server output.
const mounted = ref(false)

let swUpdatePending = false

watch(() => route.path, (path) => {
  if (swUpdatePending && !SW_RELOAD_PROTECTED.has(path)) window.location.reload()
})

onMounted(() => {
  mounted.value = true
  atlas.load()
  useUserId() // ensure every returning user gets a UUID on first load after migration

  // When autoUpdate activates a new SW (skipWaiting → controllerchange),
  // reload immediately on safe pages; defer on /play and /results so we
  // don't interrupt an active game or a results review.
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (SW_RELOAD_PROTECTED.has(route.path)) {
      swUpdatePending = true
    } else {
      window.location.reload()
    }
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
