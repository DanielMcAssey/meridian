<script setup lang="ts">
const route = useRoute()
const playerName = useLocalStorage('geo.player.name', '')
</script>

<template>
  <header
    class="flex justify-between items-center
           px-4 py-3 sm:px-10 sm:py-[22px] sm:pb-[14px]
           border-b border-rule
           sticky top-0 z-10
           bg-gradient-to-b from-bg to-transparent
           backdrop-blur-sm"
  >
    <!-- Brand -->
    <div
      class="flex items-center gap-3 select-none"
      :style="route.name !== 'index' ? 'cursor:pointer' : 'cursor:default'"
      @click="route.name !== 'index' ? navigateTo('/menu') : undefined"
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

    <!-- Right side — nav + player -->
    <div v-if="route.name !== 'index' && playerName" class="flex items-center gap-4">
      <button
        class="hidden sm:inline-flex items-center
               bg-transparent border border-rule-2 px-4 py-2
               rounded-full text-[13px] tracking-[0.02em] transition-[0.15s]
               hover:bg-paper hover:border-ink-2"
        @click="navigateTo('/leaderboard')"
      >
        Leaderboard
      </button>

      <div
        class="flex flex-col items-end leading-[1.1]
               pl-4 border-l border-rule cursor-pointer"
        title="Change name"
        @click="navigateTo('/')"
      >
        <span class="font-mono text-[9.5px] tracking-[0.14em] uppercase text-ink-3">Traveller</span>
        <span class="font-serif italic text-lg mt-0.5 max-w-[10rem] truncate">{{ playerName }}</span>
      </div>
    </div>
  </header>
</template>
