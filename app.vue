<script setup lang="ts">
import { SW_RELOAD_PROTECTED } from '~/config/game'

const atlas = useAtlasStore()
const route = useRoute()

const appError = ref<Error | null>(null)

onErrorCaptured((err) => {
  appError.value = err instanceof Error ? err : new Error(String(err))
  return false
})

function clearAppError() {
  appError.value = null
  navigateTo('/menu')
}

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
  <div class="flex flex-col" :class="route.name === 'play' ? 'h-dvh' : 'min-h-dvh'">
    <AppChrome />
    <div v-if="appError" class="flex flex-col items-center justify-center gap-5 text-center py-16 screen flex-1">
      <p class="font-serif italic text-2xl" style="color: var(--color-bad)">Something went wrong.</p>
      <button class="btn-primary" @click="clearAppError">Back to menu</button>
    </div>
    <div v-else class="relative flex flex-col flex-1" :class="route.name === 'play' ? 'min-h-0 overflow-auto' : ''">
      <NuxtPage />
      <Transition leave-active-class="transition-opacity duration-500 ease-in" leave-to-class="opacity-0">
        <GameSplash
          v-if="mounted && !atlas.ready && route.name !== 'leaderboard'"
          class="absolute! inset-0! z-10 bg-bg!"
        />
      </Transition>
    </div>
    <footer v-if="route.name !== 'play'" class="py-3 text-center text-xs text-ink/40 shrink-0">
      <a
        href="https://github.com/DanielMcAssey/meridian"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-ink/70 transition-colors"
      >Made with love for my wife ❤️, by Daniel McAssey</a>
    </footer>
  </div>
</template>
