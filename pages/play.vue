<script setup lang="ts">
import type { Country, RoundResult } from '~/types/game'

definePageMeta({ ssr: false })

const session = useSessionStore()
const settings = useGameSettings()
const playerName = useLocalStorage('geo.player.name', '')

onMounted(() => {
  if (!session.hasSession) navigateTo('/menu')
})

// ── Per-round reactive state ─────────────────────────────────────────────

const picked = ref<Country | null>(null)
const locked = ref(false)
const timeLeft = ref(0)

let tickInterval: ReturnType<typeof setInterval> | null = null
let advanceTimeout: ReturnType<typeof setTimeout> | null = null
let startTime = Date.now()

function clearTick() {
  if (tickInterval !== null) {
    clearInterval(tickInterval)
    tickInterval = null
  }
}

function startTick() {
  clearTick()
  if (!settings.timer.value) return
  tickInterval = setInterval(() => {
    timeLeft.value = Math.max(0, +(timeLeft.value - 0.1).toFixed(1))
    if (timeLeft.value === 0) {
      clearTick()
      handleLock(null, 0)
    }
  }, 100)
}

// Reset everything when a new round begins
watch(
  () => session.idx,
  () => {
    picked.value = null
    locked.value = false
    startTime = Date.now()
    timeLeft.value = settings.timer.value ? settings.timerSecs.value : 0
    startTick()
  },
  { immediate: true },
)

onUnmounted(() => {
  clearTick()
  if (advanceTimeout !== null) clearTimeout(advanceTimeout)
})

// ── Scoring ──────────────────────────────────────────────────────────────

function handlePick(opt: Country) {
  if (locked.value) return
  picked.value = opt
  handleLock(opt, (Date.now() - startTime) / 1000)
}

async function handleLock(opt: Country | null, elapsedSec: number) {
  locked.value = true
  clearTick()

  const round = session.currentRound!
  const correct = !!opt && opt.code === round.answer.code

  let pts = 0
  if (correct) {
    pts = 100
    if (settings.timer.value) {
      const remaining = Math.max(0, settings.timerSecs.value - elapsedSec)
      pts += Math.round((remaining / settings.timerSecs.value) * 50)
    }
  }

  const result: RoundResult = {
    type: round.type,
    answer: round.answer,
    picked: opt,
    correct,
    points: pts,
    elapsed: elapsedSec,
  }
  session.recordResult(result)

  advanceTimeout = setTimeout(async () => {
    advanceTimeout = null
    const next = session.idx + 1
    if (next >= session.rounds.length) {
      await finishGame()
    } else {
      session.advance()
    }
  }, 1500)
}

async function finishGame() {
  const score = session.results.reduce((s, r) => s + r.points, 0)
  const correct = session.results.filter((r) => r.correct).length

  try {
    const { rank, total } = await $fetch<{ rank: number; total: number }>('/api/leaderboard', {
      method: 'POST',
      body: {
        name: playerName.value,
        score,
        correct,
        total: session.rounds.length,
        mode: session.mode,
        difficulty: session.difficulty,
      },
    })
    session.finish({ rank, total })
  } catch {
    // If the API call fails, still show results without rank data
    session.finish({ rank: 0, total: 0 })
  }

  navigateTo('/results')
}

// ── Display helpers ──────────────────────────────────────────────────────

const total = computed(() => session.rounds.length)
const runningScore = computed(() => session.results.reduce((s, r) => s + r.points, 0))
const correctSoFar = computed(() => session.results.filter((r) => r.correct).length)
const timerPct = computed(() =>
  settings.timer.value && settings.timerSecs.value > 0
    ? Math.max(0, (timeLeft.value / settings.timerSecs.value) * 100)
    : 0,
)
const timerLow = computed(() => timeLeft.value < 4 && settings.timer.value)

function pipClass(i: number): string {
  if (i < session.idx) {
    return session.results[i]?.correct ? 'pip pip-correct' : 'pip pip-wrong'
  }
  if (i === session.idx) return 'pip pip-current'
  return 'pip pip-future'
}
</script>

<template>
  <main v-if="session.currentRound" class="screen play">
    <!-- Top bar: progress + stats -->
    <div class="play-top">
      <div class="play-progress">
        <span class="play-round-num">
          Round {{ session.idx + 1 }}<span class="of">/{{ total }}</span>
        </span>
        <div class="play-progress-bar">
          <div v-for="(_, i) in session.rounds" :key="i" :class="pipClass(i)" />
        </div>
      </div>

      <div class="play-stats">
        <div class="stat-mini">
          <span class="mini-label">Score</span>
          <span class="mini-val">{{ runningScore }}</span>
        </div>
        <div class="stat-mini">
          <span class="mini-label">Correct</span>
          <span class="mini-val">
            {{ correctSoFar }}<span class="muted">/{{ session.idx + (locked ? 1 : 0) }}</span>
          </span>
        </div>
        <div v-if="settings.timer.value" :class="['stat-mini timer-mini', { 'timer-low': timerLow }]">
          <span class="mini-label">Time</span>
          <span class="mini-val">
            {{ Math.max(0, timeLeft).toFixed(1) }}<span class="muted">s</span>
          </span>
          <div class="timer-mini-bar">
            <div class="timer-mini-bar-fill" :style="{ width: `${timerPct}%` }" />
          </div>
        </div>
      </div>
    </div>

    <!-- Round stage -->
    <div :key="session.idx" class="play-stage">
      <RoundsFlagRound
        v-if="session.currentRound.type === 'flag'"
        :round="session.currentRound"
        :picked="picked"
        :locked="locked"
        @pick="handlePick"
      />
      <RoundsPinDropRound
        v-else-if="session.currentRound.type === 'pin'"
        :round="session.currentRound"
        :picked="picked"
        :locked="locked"
        @pick="handlePick"
      />
      <RoundsCartographerRound
        v-else-if="session.currentRound.type === 'cart'"
        :round="session.currentRound"
        :picked="picked"
        :locked="locked"
        @pick="handlePick"
      />
    </div>

    <!-- Feedback toast -->
    <div v-if="locked" class="round-toast">
      <span
        v-if="picked && picked.code === session.currentRound.answer.code"
        class="toast-correct"
      >
        ✓ Correct — it is indeed <em>{{ session.currentRound.answer.name }}</em>
      </span>
      <span v-else-if="picked" class="toast-wrong">
        ✗ Not quite — the answer was <em>{{ session.currentRound.answer.name }}</em>
      </span>
      <span v-else class="toast-wrong">
        Time's up — it was <em>{{ session.currentRound.answer.name }}</em>
      </span>
    </div>
  </main>
</template>
