<script setup lang="ts">
import { DIFFICULTIES } from '~/composables/useGameSettings'
import type { GameMode } from '~/types/game'

definePageMeta({ ssr: false })

const atlas = useAtlasStore()
const session = useSessionStore()
const settings = useGameSettings()
const playerName = useLocalStorage('geo.player.name', '')

onMounted(() => {
  if (!playerName.value) navigateTo('/')
})

const MODES: {
  id: GameMode
  title: string
  sub: string
  note: string
  icon: 'flag' | 'map' | 'cart' | 'compass'
}[] = [
  { id: 'flag', title: 'The Banner Game', sub: 'Identify the flag.', note: 'Vexillology', icon: 'flag' },
  { id: 'pin', title: 'The Pin Drop', sub: "Find a pin's country on the map.", note: 'Cartography', icon: 'map' },
  { id: 'cart', title: 'The Cartographer', sub: 'Pinpoint a country on the world map.', note: 'Charting', icon: 'cart' },
  { id: 'mixed', title: 'The Grand Tour', sub: 'A little of everything.', note: 'Mixed itinerary', icon: 'compass' },
]

const TIMER_OPTIONS = [
  { label: 'Off', on: false, secs: 20 },
  { label: '10s', on: true, secs: 10 },
  { label: '20s', on: true, secs: 20 },
  { label: '30s', on: true, secs: 30 },
  { label: '60s', on: true, secs: 60 },
]

function isTimerActive(opt: (typeof TIMER_OPTIONS)[number]) {
  return settings.timer.value === opt.on && (!opt.on || settings.timerSecs.value === opt.secs)
}

function setTimer(opt: (typeof TIMER_OPTIONS)[number]) {
  settings.timer.value = opt.on
  settings.timerSecs.value = opt.secs
}

function startGame(mode: GameMode) {
  const rounds = buildRounds(
    atlas.countries,
    mode,
    settings.rounds.value,
    settings.difficulty.value,
  )
  session.start(rounds, mode, settings.difficulty.value)
  navigateTo('/play')
}
</script>

<template>
  <main class="screen menu">
    <div class="menu-head">
      <span class="eyebrow">Choose your itinerary</span>
      <h1 class="menu-title">A book of <em>four</em> games.</h1>

      <div class="menu-controls">
        <!-- Difficulty -->
        <div class="menu-control">
          <span class="menu-control-label">Difficulty</span>
          <div class="diff-pills">
            <button
              v-for="d in DIFFICULTIES"
              :key="d.id"
              :class="['diff-pill', { 'diff-pill-on': settings.difficulty.value === d.id }]"
              :title="`${d.note} — ${d.est} countries`"
              @click="settings.difficulty.value = d.id"
            >
              {{ d.label }}
            </button>
          </div>
        </div>

        <!-- Rounds -->
        <div class="menu-control">
          <span class="menu-control-label">Rounds</span>
          <div class="diff-pills">
            <button
              v-for="n in [5, 8, 12, 20]"
              :key="n"
              :class="['diff-pill', { 'diff-pill-on': settings.rounds.value === n }]"
              @click="settings.rounds.value = n"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <!-- Timer -->
        <div class="menu-control">
          <span class="menu-control-label">Timer</span>
          <div class="diff-pills">
            <button
              v-for="opt in TIMER_OPTIONS"
              :key="opt.label"
              :class="['diff-pill', { 'diff-pill-on': isTimerActive(opt) }]"
              @click="setTimer(opt)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mode cards -->
    <div class="menu-cards">
      <button
        v-for="(m, i) in MODES"
        :key="m.id"
        class="menu-card"
        :style="{ animationDelay: `${i * 70}ms` }"
        @click="startGame(m.id)"
      >
        <div class="menu-card-num">{{ String(i + 1).padStart(2, '0') }}</div>
        <div class="menu-card-art">
          <ModeIcon :kind="m.icon" />
        </div>
        <div class="menu-card-body">
          <div class="menu-card-eyebrow">{{ m.note }}</div>
          <h2 class="menu-card-title">{{ m.title }}</h2>
          <p class="menu-card-sub">{{ m.sub }}</p>
        </div>
        <div class="menu-card-go">Begin →</div>
      </button>
    </div>
  </main>
</template>
