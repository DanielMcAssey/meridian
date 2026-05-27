<script setup lang="ts">
import type { Country, RoundResult } from '~/types/game'

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

  const pts = correct
    ? calcPoints(
        settings.timer.value,
        Math.max(0, settings.timerSecs.value - elapsedSec),
        settings.timerSecs.value,
        session.difficulty,
      )
    : 0

  const result: RoundResult = { type: round.type, answer: round.answer, picked: opt, correct, points: pts, elapsed: elapsedSec }
  session.recordResult(result)

  advanceTimeout = setTimeout(async () => {
    advanceTimeout = null
    const next = session.idx + 1
    if (next >= session.rounds.length) await finishGame()
    else session.advance()
  }, 1500)
}

const { submitScore } = useLeaderboardMutation()

async function finishGame() {
  const score   = session.results.reduce((s, r) => s + r.points, 0)
  const correct = session.results.filter((r) => r.correct).length

  // Tally scores and mark session as finished immediately so we can navigate
  // to the results page without blocking on the network.
  session.markFinished()

  // Fire the mutation.  If online, it resolves straight away and onSuccess
  // calls session.setRank().  If offline, it's queued in localStorage and
  // retried automatically when connectivity returns.
  submitScore({
    name: playerName.value,
    score,
    correct,
    total: session.rounds.length,
    mode: session.mode,
    difficulty: session.difficulty,
  })

  navigateTo('/results')
}

// ── Display helpers ──────────────────────────────────────────────────────

const total = computed(() => session.rounds.length)
const runningScore  = computed(() => session.results.reduce((s, r) => s + r.points, 0))
const correctSoFar  = computed(() => session.results.filter((r) => r.correct).length)
const isCorrect     = computed(() => !!picked.value && picked.value.code === session.currentRound?.answer.code)
const lastResult    = computed(() => locked.value && session.results.length > 0 ? session.results[session.results.length - 1] : null)
const timerPct      = computed(() =>
  settings.timer.value && settings.timerSecs.value > 0
    ? Math.max(0, (timeLeft.value / settings.timerSecs.value) * 100) : 0,
)
const timerLow = computed(() => timeLeft.value < 4 && settings.timer.value)

function pipClass(i: number): string {
  if (i < session.idx) return session.results[i]?.correct ? 'pip-correct' : 'pip-wrong'
  if (i === session.idx) return 'pip-current'
  return 'pip-future'
}
</script>

<template>
  <main
    v-if="session.currentRound"
    class="flex flex-col gap-3.5 flex-1 min-h-0
           px-[clamp(1.25rem,5vw,5rem)] pt-10 pb-6
           max-w-[1240px] mx-auto w-full"
  >
    <!-- Top bar: progress + stats — stacks on mobile -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-wrap py-1.5 px-0.5">
      <!-- Progress -->
      <div class="flex items-center gap-4 w-full sm:w-auto sm:flex-1 min-w-0">
        <span class="font-serif italic text-[22px] leading-none whitespace-nowrap shrink-0">
          Round {{ session.idx + 1 }}<span class="text-ink-3 text-[15px] ml-0.5">/{{ total }}</span>
        </span>
        <div class="flex gap-[3px] flex-1 min-w-0">
          <div
            v-for="(_, i) in session.rounds"
            :key="i"
            class="flex-1 h-1 rounded-full transition-[background] duration-300"
            :class="{
              'bg-ink':     pipClass(i) === 'pip-current',
              'bg-ok':      pipClass(i) === 'pip-correct',
              'bg-bad':     pipClass(i) === 'pip-wrong',
              'bg-rule':    pipClass(i) === 'pip-future',
            }"
          />
        </div>
      </div>

      <!-- Stats -->
      <div class="flex gap-4 items-center flex-wrap">
        <div class="inline-flex items-baseline gap-1.5 font-mono leading-none">
          <span class="text-[10px] tracking-[0.14em] uppercase text-ink-3">Score</span>
          <span class="text-base font-medium text-ink tabular-nums tracking-[-0.01em]">{{ runningScore }}</span>
        </div>
        <div class="inline-flex items-baseline gap-1.5 font-mono leading-none">
          <span class="text-[10px] tracking-[0.14em] uppercase text-ink-3">Correct</span>
          <span class="text-base font-medium text-ink tabular-nums">
            {{ correctSoFar }}<span class="text-ink-3 font-normal text-[13px] ml-px">/{{ session.idx + (locked ? 1 : 0) }}</span>
          </span>
        </div>
        <div
          v-if="settings.timer.value"
          class="inline-flex items-baseline gap-1.5 font-mono leading-none relative min-w-[92px]"
          :class="timerLow ? 'text-bad' : ''"
        >
          <span class="text-[10px] tracking-[0.14em] uppercase" :class="timerLow ? 'text-bad' : 'text-ink-3'">Time</span>
          <span
            class="text-base font-medium tabular-nums tracking-[-0.01em]"
            :class="{ 'text-bad': timerLow, 'text-ink': !timerLow }"
            :style="timerLow ? 'animation: pulse 0.6s infinite alternate' : ''"
          >
            {{ Math.max(0, timeLeft).toFixed(1) }}<span :class="timerLow ? 'text-bad opacity-60' : 'text-ink-3'" class="font-normal text-[13px] ml-px">s</span>
          </span>
          <!-- Timer bar -->
          <div class="absolute left-0 right-0 -bottom-1.5 h-0.5 bg-rule rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-[width] duration-100 ease-linear"
              :style="{ width: `${timerPct}%`, background: timerLow ? 'var(--color-bad)' : 'var(--accent)' }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Round stage — flex-1 + min-h-0 lets it grow for the Cartographer map -->
    <div
      :key="session.idx"
      class="bg-paper border border-rule rounded-[18px] px-4 sm:px-6 lg:px-9 py-6
             flex flex-col flex-1 min-h-0 relative overflow-hidden"
      style="box-shadow: var(--shadow-md); animation: stage-in 0.4s cubic-bezier(.2,.7,.2,1)"
    >
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
      <RoundsSilhouetteRound
        v-else-if="session.currentRound.type === 'shape'"
        :round="session.currentRound"
        :picked="picked"
        :locked="locked"
        @pick="handlePick"
      />

      <!-- Feedback overlay — pops up over the question when the round is locked -->
      <div
        v-if="locked"
        class="absolute inset-0 z-20 flex items-center justify-center rounded-[18px]"
        style="background: color-mix(in srgb, var(--paper) 80%, transparent); backdrop-filter: blur(8px); animation: fb-backdrop 0.22s ease both"
      >
        <div
          class="flex flex-col items-center gap-3 px-8 sm:px-14 py-7 rounded-2xl border text-center"
          :class="isCorrect ? 'bg-ok-soft border-ok/50' : 'bg-bad-soft border-bad/50'"
          style="box-shadow: var(--shadow-lg); animation: feedback-pop 0.42s cubic-bezier(.2,.85,.3,1.25) both"
        >
          <!-- Icon badge -->
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center text-[26px] shrink-0"
            :class="isCorrect ? 'bg-ok text-white' : 'bg-bad text-white'"
          >
            {{ isCorrect ? '✓' : (picked ? '✗' : '⏱') }}
          </div>

          <!-- Verdict + country name -->
          <div class="flex flex-col gap-1.5">
            <span
              class="font-serif italic leading-none"
              style="font-size: clamp(22px, 3vw, 30px)"
              :class="isCorrect ? 'text-ok' : 'text-bad'"
            >
              {{ isCorrect ? 'Correct!' : (picked ? 'Not quite' : "Time's up") }}
            </span>
            <p class="m-0 text-ink-2 text-[14px] sm:text-[15px]">
              {{ isCorrect ? 'It is indeed' : 'The answer was' }}
              <em class="not-italic font-medium text-ink">{{ session.currentRound.answer.name }}</em>
            </p>
          </div>

          <!-- Points pill -->
          <div
            v-if="lastResult"
            class="font-mono text-[12px] tracking-[0.1em] uppercase px-3.5 py-1 rounded-full mt-1"
            :class="isCorrect ? 'bg-ok/15 text-ok' : 'bg-ink/8 text-ink-3'"
          >
            {{ isCorrect ? `+${lastResult.points} pts` : 'No points' }}
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
