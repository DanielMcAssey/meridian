<script setup lang="ts">
import { ADVENTURERS, COMPASS_SPIN_SECS, DIFFICULTIES, MIXED_ROUND_TYPES, MODES } from '~/config/game'
import type { Difficulty } from '~/types/game'

const playerName = useLocalStorage('geo.player.name', '')
const settings = useGameSettings()
const atlas = useAtlasStore()

const countByDiff = computed<Record<Difficulty, number>>(() => ({
  easy:   pickPool(atlas.countries, 'easy').length,
  medium: pickPool(atlas.countries, 'medium').length,
  hard:   pickPool(atlas.countries, 'hard').length,
  expert: pickPool(atlas.countries, 'expert').length,
}))

const name = ref(playerName.value)
const difficulty = ref<Difficulty>(settings.difficulty.value)
const inputRef = ref<HTMLInputElement | null>(null)


const adventurerIndex = ref(0)
let adventurerTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (playerName.value) { navigateTo('/menu'); return }
  inputRef.value?.focus()
  adventurerTimer = setInterval(() => {
    adventurerIndex.value = (adventurerIndex.value + 1) % ADVENTURERS.length
  }, 2800)
})

onUnmounted(() => {
  if (adventurerTimer) clearInterval(adventurerTimer)
})

function submit() {
  const n = name.value.trim()
  if (!n) return
  playerName.value = n
  settings.difficulty.value = difficulty.value
  navigateTo('/menu')
}

// Map round type id → short display label
const roundTypeLabel = Object.fromEntries(
  MODES.filter((m) => m.id !== 'mixed').map((m) => [m.id, m.label]),
)

// Game type chips shown inside each difficulty card
function gamesFor(diff: Difficulty): string[] {
  return MIXED_ROUND_TYPES[diff].map((t) => roundTypeLabel[t] ?? t)
}
</script>

<template>
  <main class="screen">
    <div class="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-14 items-center min-h-[calc(100vh-5rem)]">
      <!-- Compass art — top on mobile, right on md+ -->
      <div
        class="relative aspect-square max-w-xs mx-auto w-full md:order-last md:max-w-none"
        aria-hidden="true"
      >
        <svg viewBox="0 0 600 600" class="w-full h-full" :style="`animation: gentle-spin ${COMPASS_SPIN_SECS}s linear infinite`">
          <defs>
            <radialGradient id="cg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(0,0,0,0)" />
              <stop offset="100%" stop-color="rgba(0,0,0,0.06)" />
            </radialGradient>
          </defs>
          <circle cx="300" cy="300" r="280" fill="url(#cg)" />
          <circle cx="300" cy="300" r="240" class="rose-ring" />
          <circle cx="300" cy="300" r="180" class="rose-ring" />
          <circle cx="300" cy="300" r="120" class="rose-ring" />
          <line
            v-for="i in 32"
            :key="i"
            :x1="300 + Math.cos(((i - 1) / 32) * Math.PI * 2) * ((i - 1) % 4 === 0 ? 200 : (i - 1) % 2 === 0 ? 230 : 245)"
            :y1="300 + Math.sin(((i - 1) / 32) * Math.PI * 2) * ((i - 1) % 4 === 0 ? 200 : (i - 1) % 2 === 0 ? 230 : 245)"
            :x2="300 + Math.cos(((i - 1) / 32) * Math.PI * 2) * 260"
            :y2="300 + Math.sin(((i - 1) / 32) * Math.PI * 2) * 260"
            class="rose-tick"
          />
          <path d="M300 60 L320 300 L300 540 L280 300 Z" class="rose-needle" />
          <path d="M60 300 L300 280 L540 300 L300 320 Z" class="rose-needle-h" />
          <text x="300" y="46"  text-anchor="middle" class="rose-letter">N</text>
          <text x="300" y="568" text-anchor="middle" class="rose-letter">S</text>
          <text x="556" y="308" text-anchor="middle" class="rose-letter">E</text>
          <text x="44"  y="308" text-anchor="middle" class="rose-letter">W</text>
        </svg>
      </div>

      <!-- Card -->
      <div class="max-w-lg">
        <span class="eyebrow">Volume I · The Atlas</span>
        <h1
          class="font-serif font-normal tracking-[-0.025em] leading-[0.98] mt-3.5 mb-4"
          style="font-size: clamp(48px, 6vw, 80px)"
        >
          A wager with the <em class="italic" style="color: var(--accent-deep)">world</em>.
        </h1>
        <p class="text-[17px] text-ink-2 mb-9 max-w-[460px]">
          Eight games of geography — flags, silhouettes, capitals, languages, a pin dropped on a
          far shore. Your wits against every land we know.
        </p>

        <form class="flex flex-col gap-5" @submit.prevent="submit">
          <!-- Name field -->
          <label class="flex flex-col gap-2.5">
            <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">
              Inscribe your name in the manifest
            </span>
            <div class="relative">
              <input
                ref="inputRef"
                v-model="name"
                class="relative z-10 w-full font-serif italic text-[28px] py-3 bg-transparent border-0
                       border-b-[1.5px] border-ink-2 text-ink outline-none transition-[border-color_0.2s]
                       focus:border-[var(--accent)]"
                type="text"
                maxlength="28"
              />
              <!-- Animated placeholder — hidden once user starts typing -->
              <div
                v-if="!name"
                class="absolute inset-0 flex items-center pointer-events-none overflow-hidden"
                aria-hidden="true"
              >
                <Transition
                  enter-from-class="opacity-0"
                  leave-to-class="opacity-0"
                  enter-active-class="transition-opacity duration-400 ease-out"
                  leave-active-class="transition-opacity duration-200 ease-in"
                  mode="out-in"
                >
                  <span
                    :key="adventurerIndex"
                    class="font-serif italic text-[28px] text-ink-3 opacity-55 select-none whitespace-nowrap"
                  >e.g. {{ ADVENTURERS[adventurerIndex] }}</span>
                </Transition>
              </div>
            </div>
          </label>

          <!-- Difficulty -->
          <div class="flex flex-col gap-2.5">
            <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">
              Pick your peril · the wider the world, the harder
            </span>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="d in DIFFICULTIES"
                :key="d.id"
                type="button"
                :class="[
                  'text-left bg-paper border-[1.5px] border-rule rounded-xl px-4 py-3.5',
                  'flex flex-col gap-0.5 transition-[0.14s] cursor-pointer',
                  'hover:border-ink-2 hover:-translate-y-px',
                  difficulty === d.id
                    ? 'border-[var(--accent)]! bg-[var(--accent-soft)]!'
                    : '',
                ]"
                @click="difficulty = d.id"
              >
                <span
                  :class="[
                    'font-serif text-xl font-medium tracking-[-0.01em]',
                    difficulty === d.id ? 'text-[var(--accent-deep)]' : 'text-ink',
                  ]"
                >{{ d.label }}</span>
                <span class="text-[13px] text-ink-2">{{ d.note }}</span>
                <span class="font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-3 mt-1">
                  {{ countByDiff[d.id] }} countries
                </span>
                <!-- Game types unlocked at this difficulty -->
                <div class="flex flex-wrap gap-1 mt-2.5">
                  <span
                    v-for="label in gamesFor(d.id)"
                    :key="label"
                    class="font-mono text-[9px] tracking-[0.1em] uppercase px-1.5 py-[3px] rounded border transition-colors duration-150"
                    :class="difficulty === d.id
                      ? 'border-[var(--accent)]/50 text-[var(--accent-deep)]'
                      : 'border-rule-2 text-ink-3'"
                  >{{ label }}</span>
                </div>
              </button>
            </div>
          </div>

          <button type="submit" class="btn-primary" :disabled="!name.trim()">Set sail →</button>
        </form>

        <p class="mt-7 text-[12.5px] text-ink-3 font-mono tracking-[0.04em]">
          Your name &amp; preferences are kept on this device only.
        </p>
      </div>
    </div>
  </main>
</template>
