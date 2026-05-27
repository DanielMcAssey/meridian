<script setup lang="ts">
import type { GameMode } from '~/types/game'
import { DIFFICULTIES, MODES, ROUND_COUNTS, TIMER_OPTIONS, type TimerOption } from '~/config/game'

definePageMeta({ ssr: false })

const atlas      = useAtlasStore()
const session    = useSessionStore()
const settings   = useGameSettings()
const playerName = useLocalStorage('geo.player.name', '')

onMounted(() => {
  if (!playerName.value) navigateTo('/')
})

function isTimerActive(opt: TimerOption) {
  return settings.timer.value === opt.on && (!opt.on || settings.timerSecs.value === opt.secs)
}

function setTimer(opt: TimerOption) {
  settings.timer.value    = opt.on
  settings.timerSecs.value = opt.secs
}

function startGame(mode: GameMode) {
  const rounds = buildRounds(atlas.countries, mode, settings.rounds.value, settings.difficulty.value)
  session.start(rounds, mode, settings.difficulty.value)
  navigateTo('/play')
}
</script>

<template>
  <main class="screen">
    <!-- Header + controls -->
    <div class="max-w-2xl mb-12">
      <span class="eyebrow">Choose your itinerary</span>
      <h1
        class="font-serif font-normal tracking-[-0.02em] leading-none mt-3 mb-3.5"
        style="font-size: clamp(40px, 5vw, 64px)"
      >
        A book of <em class="italic" style="color: var(--accent-deep)">four</em> games.
      </h1>

      <!-- Pill controls -->
      <div class="flex flex-wrap gap-6 mt-4 items-start">
        <!-- Difficulty -->
        <div class="flex flex-col gap-2">
          <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Difficulty</span>
          <div class="flex gap-1 p-[3px] bg-paper border border-rule rounded-full">
            <button
              v-for="d in DIFFICULTIES"
              :key="d.id"
              :class="settings.difficulty.value === d.id ? 'diff-pill-on' : 'diff-pill'"
              :title="`${d.note} — ${d.est} countries`"
              @click="settings.difficulty.value = d.id"
            >{{ d.label }}</button>
          </div>
        </div>

        <!-- Rounds -->
        <div class="flex flex-col gap-2">
          <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Rounds</span>
          <div class="flex gap-1 p-[3px] bg-paper border border-rule rounded-full">
            <button
              v-for="n in ROUND_COUNTS"
              :key="n"
              :class="settings.rounds.value === n ? 'diff-pill-on' : 'diff-pill'"
              @click="settings.rounds.value = n"
            >{{ n }}</button>
          </div>
        </div>

        <!-- Timer -->
        <div class="flex flex-col gap-2">
          <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Timer</span>
          <div class="flex gap-1 p-[3px] bg-paper border border-rule rounded-full">
            <button
              v-for="opt in TIMER_OPTIONS"
              :key="opt.label"
              :class="isTimerActive(opt) ? 'diff-pill-on' : 'diff-pill'"
              @click="setTimer(opt)"
            >{{ opt.label }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mode cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <button
        v-for="(m, i) in MODES"
        :key="m.id"
        class="bg-paper border border-rule rounded-[18px] px-6 py-[26px] pb-[22px]
               text-left flex flex-col gap-3.5 cursor-pointer relative overflow-hidden
               opacity-0 translate-y-2
               transition-[transform,box-shadow,border-color] duration-[220ms] ease-[cubic-bezier(.2,.7,.2,1)]
               hover:-translate-y-1 hover:border-[var(--accent)] active:translate-y-0"
        :style="{
          animationName: 'card-in',
          animationDuration: '0.5s',
          animationFillMode: 'forwards',
          animationTimingFunction: 'cubic-bezier(.2,.7,.2,1)',
          animationDelay: `${i * 70}ms`,
          boxShadow: 'var(--shadow-sm)',
        }"
        @click="startGame(m.id)"
        @mouseenter="($event.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'"
      >
        <!-- Art panel -->
        <div
          class="h-28 flex items-center justify-center overflow-hidden
                 bg-gradient-to-b from-bg-tint to-paper
                 rounded-xl border border-rule"
        >
          <ModeIcon :kind="m.icon" />
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="font-mono text-[10.5px] tracking-[0.16em] uppercase" style="color: var(--accent-deep)">
            {{ m.note }}
          </div>
          <h2 class="font-serif font-normal text-[28px] tracking-[-0.015em] m-0">{{ m.title }}</h2>
          <p class="text-[14.5px] text-ink-2 m-0">{{ m.sub }}</p>
        </div>

      </button>
    </div>
  </main>
</template>
