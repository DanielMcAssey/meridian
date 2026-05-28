<script setup lang="ts">
const route      = useRoute()
const playerName = useLocalStorage('geo.player.name', '')

const mounted  = ref(false)
const menuOpen = ref(false)

onMounted(() => { mounted.value = true })

// Close on route change (e.g. after navigating from the menu)
watch(() => route.name, () => { menuOpen.value = false })

function go(path: string) {
  menuOpen.value = false
  navigateTo(path)
}

const isNavVisible = computed(() => mounted.value && route.name !== 'index' && !!playerName.value)
</script>

<template>
  <!-- Tap-outside backdrop — sits just below the header in z-order -->
  <Transition
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
    enter-active-class="transition-opacity duration-150"
    leave-active-class="transition-opacity duration-150"
  >
    <div
      v-if="menuOpen"
      class="fixed inset-0 z-[9] sm:hidden"
      aria-hidden="true"
      @click="menuOpen = false"
    />
  </Transition>

  <header
    class="sticky top-0 z-10
           border-b border-rule
           bg-gradient-to-b from-bg to-transparent
           backdrop-blur-sm"
  >
    <!-- ── Top bar ──────────────────────────────────────────────────────────── -->
    <div class="flex justify-between items-center px-4 py-3 sm:px-10 sm:py-[22px] sm:pb-[14px]">

      <!-- Brand -->
      <div
        class="flex items-center gap-3 select-none"
        :style="mounted && route.name !== 'index' ? 'cursor:pointer' : 'cursor:default'"
        @click="mounted && route.name !== 'index' ? go('/menu') : undefined"
      >
        <span class="brand-mark shrink-0" aria-hidden="true">
          <svg viewBox="0 0 40 40" width="34" height="34">
            <circle cx="20" cy="20" r="18" class="mark-ring" />
            <circle cx="20" cy="20" r="1.6" class="mark-dot" />
            <path d="M20 6 L23 20 L20 34 L17 20 Z" class="mark-needle" />
            <path d="M6 20 L20 17 L34 20 L20 23 Z" class="mark-needle-h" />
          </svg>
        </span>
        <span class="flex flex-col leading-[1.1]">
          <span class="font-serif italic text-2xl tracking-[-0.01em]">Meridian</span>
          <span class="hidden sm:block font-mono text-[10.5px] tracking-[0.12em] uppercase text-ink-3 mt-[3px]">
            A Geographical Pastime · est. MMXXVI
          </span>
        </span>
      </div>

      <div v-if="isNavVisible">
        <!-- Desktop nav (sm+) -->
        <div class="hidden sm:flex items-center gap-4">
          <button
            class="inline-flex items-center
                   bg-transparent border border-rule-2 px-4 py-2
                   rounded-full text-[13px] tracking-[0.02em] transition-[0.15s]
                   hover:bg-paper hover:border-ink-2"
            @click="go('/knowledge')"
          >The Knowledge</button>

          <button
            class="inline-flex items-center
                   bg-transparent border border-rule-2 px-4 py-2
                   rounded-full text-[13px] tracking-[0.02em] transition-[0.15s]
                   hover:bg-paper hover:border-ink-2"
            @click="go('/leaderboard')"
          >Leaderboard</button>

          <div
            class="flex flex-col items-end leading-[1.1]
                   pl-4 border-l border-rule cursor-pointer"
            title="Change name"
            @click="go('/')"
          >
            <span class="font-mono text-[9.5px] tracking-[0.14em] uppercase text-ink-3">Traveller</span>
            <span class="font-serif italic text-lg mt-0.5 max-w-[10rem] truncate">{{ playerName }}</span>
          </div>
        </div>

        <!-- Mobile burger (<sm) -->
        <button
          class="sm:hidden flex items-center justify-center w-11 h-11
                 rounded-xl border border-rule-2 bg-transparent text-ink
                 transition-colors duration-150 hover:bg-paper"
          :aria-expanded="menuOpen"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          @click="menuOpen = !menuOpen"
        >
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <Transition
              enter-from-class="opacity-0 rotate-45"
              leave-to-class="opacity-0 rotate-45"
              enter-active-class="transition-[opacity,transform] duration-150"
              leave-active-class="transition-[opacity,transform] duration-150"
              mode="out-in"
            >
              <!-- X when open -->
              <g v-if="menuOpen" key="x">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </g>
              <!-- Burger when closed -->
              <g v-else key="burger">
                <line x1="3" y1="5.5" x2="17" y2="5.5" />
                <line x1="3" y1="10"  x2="17" y2="10"  />
                <line x1="3" y1="14.5" x2="17" y2="14.5" />
              </g>
            </Transition>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Mobile dropdown ─────────────────────────────────────────────────── -->
    <Transition
      enter-from-class="-translate-y-1 opacity-0"
      leave-to-class="-translate-y-1 opacity-0"
      enter-active-class="transition-[transform,opacity] duration-150 ease-out"
      leave-active-class="transition-[transform,opacity] duration-100 ease-in"
    >
      <nav
        v-if="menuOpen && isNavVisible"
        class="sm:hidden border-t border-rule px-3 py-2"
      >
        <!-- The Knowledge -->
        <button
          class="w-full flex items-center justify-between
                 px-3 py-3.5 rounded-xl text-left
                 transition-colors duration-150 hover:bg-paper active:bg-paper"
          @click="go('/knowledge')"
        >
          <span class="font-serif italic text-[19px] tracking-[-0.01em]">The Knowledge</span>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-ink-3">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>

        <!-- Divider -->
        <div class="mx-3 border-t border-rule" />

        <!-- Leaderboard -->
        <button
          class="w-full flex items-center justify-between
                 px-3 py-3.5 rounded-xl text-left
                 transition-colors duration-150 hover:bg-paper active:bg-paper"
          @click="go('/leaderboard')"
        >
          <span class="font-serif italic text-[19px] tracking-[-0.01em]">Leaderboard</span>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-ink-3">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>

        <!-- Divider -->
        <div class="mx-3 border-t border-rule" />

        <!-- Player / change name -->
        <button
          class="w-full flex items-center justify-between
                 px-3 py-3.5 rounded-xl text-left
                 transition-colors duration-150 hover:bg-paper active:bg-paper"
          title="Change name"
          @click="go('/')"
        >
          <div class="flex flex-col leading-[1.1]">
            <span class="font-mono text-[9.5px] tracking-[0.14em] uppercase text-ink-3">Traveller</span>
            <span class="font-serif italic text-lg mt-0.5">{{ playerName }}</span>
          </div>
          <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3">Change</span>
        </button>
      </nav>
    </Transition>
  </header>
</template>
