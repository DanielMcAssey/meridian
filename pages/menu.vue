<script setup lang="ts">
import type { Difficulty, GameMode } from '~/types/game'
import { DIFFICULTIES, DIFFICULTY_TIMER_SECS, MIXED_ROUND_TYPES, MODES, ROUND_COUNTS, type ModeConfig } from '~/config/game'

const atlas      = useAtlasStore()
const session    = useSessionStore()
const settings   = useGameSettings()
const playerName = useLocalStorage('geo.player.name', '')

// MODES[0] is always the Grand Tour (mixed); the rest are individual modes.
const grandTour    = MODES[0]!
const regularModes = MODES.slice(1)

onMounted(() => {
  if (!playerName.value) navigateTo('/')
})

function startGame(mode: GameMode) {
  const rounds = buildRounds(atlas.countries, mode, settings.rounds.value, settings.difficulty.value, atlas.languageNames)
  session.start(rounds, mode, settings.difficulty.value)
  navigateTo('/play')
}

// ── Difficulty meter helpers ──────────────────────────────────────────────────

const DIFF_LEVEL: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, expert: 4 }
const DIFF_COLOR: Record<Difficulty, string> = {
  easy:   'oklch(0.62 0.19 145)',
  medium: 'oklch(0.68 0.17 90)',
  hard:   'oklch(0.66 0.19 50)',
  expert: 'oklch(0.60 0.22 25)',
}

function diffLevel(m: ModeConfig): number {
  return m.modeDiff ? DIFF_LEVEL[m.modeDiff] : 0
}
function diffColor(m: ModeConfig): string {
  return m.modeDiff ? DIFF_COLOR[m.modeDiff] : ''
}
function diffLabel(m: ModeConfig): string {
  return m.modeDiff ?? ''
}

// ── Grand Tour dynamic tags ───────────────────────────────────────────────────

const GRAND_TOUR_TAGS: Record<Difficulty, string[]> = {
  easy:   ['Continental'],
  medium: ['Continental', 'Vexillology', 'Pin Drops'],
  hard:   ['Continental', 'Vexillology', 'Pin Drops', 'Charting', 'Civics'],
  expert: ['Continental', 'Vexillology', 'Pin Drops', 'Charting', 'Civics', 'Silhouette', 'Linguistics', 'Sovereignty'],
}

const grandTourTags = computed(() => GRAND_TOUR_TAGS[settings.difficulty.value])
const grandTourTypeCount = computed(() => MIXED_ROUND_TYPES[settings.difficulty.value].length)

const countByDiff = computed<Record<Difficulty, number>>(() => ({
  easy:   pickPool(atlas.countries, 'easy').length,
  medium: pickPool(atlas.countries, 'medium').length,
  hard:   pickPool(atlas.countries, 'hard').length,
  expert: pickPool(atlas.countries, 'expert').length,
}))

// ── Filter pill option arrays ─────────────────────────────────────────────────

const difficultyLabel = computed(() =>
  `Difficulty (${countByDiff.value[settings.difficulty.value]} countries)`,
)
const difficultyOptions = computed(() =>
  DIFFICULTIES.map((d) => ({ id: d.id, label: d.label })),
)

const roundOptions = ROUND_COUNTS.map((n) => ({ id: n, label: String(n) }))

const timerLabel = computed(() =>
  settings.timer.value
    ? `Timer (${DIFFICULTY_TIMER_SECS[settings.difficulty.value]}s)`
    : 'Timer',
)
const timerOptions = [{ id: 'off', label: 'Off' }, { id: 'on', label: 'On' }]
const timerValue   = computed(() => settings.timer.value ? 'on' : 'off')
function setTimer(v: string | number) { settings.timer.value = v === 'on' }
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
        A book of <em class="italic" style="color: var(--accent-deep)">eight</em> games.
      </h1>

      <!-- Pill controls -->
      <div class="flex flex-wrap gap-6 mt-4 items-start">
        <FilterPillGroup
          :label="difficultyLabel"
          :options="difficultyOptions"
          :model-value="settings.difficulty.value"
          @update:model-value="settings.difficulty.value = $event as Difficulty"
        />
        <FilterPillGroup
          label="Rounds"
          :options="roundOptions"
          :model-value="settings.rounds.value"
          @update:model-value="settings.rounds.value = $event as number"
        />
        <FilterPillGroup
          :label="timerLabel"
          :options="timerOptions"
          :model-value="timerValue"
          @update:model-value="setTimer($event)"
        />
      </div>
    </div>

    <!-- Mode cards -->
    <div class="flex flex-col gap-4 max-w-2xl">

      <!-- ── The Grand Tour — featured, full-width card ───────────────────── -->
      <button
        class="mode-card text-left flex flex-col sm:flex-row sm:items-center gap-6
               cursor-pointer relative overflow-hidden
               rounded-[18px] px-6 py-7 sm:px-8 sm:py-8
               border-2 border-[var(--accent)]
               opacity-0 translate-y-2
               transition-[box-shadow] duration-[220ms] ease-[cubic-bezier(.2,.7,.2,1)]"
        :style="{
          background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--color-paper) 55%)',
          animationName: 'card-in',
          animationDuration: '0.5s',
          animationFillMode: 'forwards',
          animationTimingFunction: 'cubic-bezier(.2,.7,.2,1)',
          animationDelay: '0ms',
          boxShadow: 'var(--shadow-md)',
        }"
        @click="startGame(grandTour.id)"
        @mouseenter="($event.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'"
      >
        <!-- Content side -->
        <div class="flex flex-col gap-3 flex-1 min-w-0">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span
              class="font-mono text-[10px] tracking-[0.18em] uppercase px-3 py-1 rounded-full font-medium"
              style="background: var(--accent); color: var(--color-bg)"
            >Recommended</span>
            <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase" style="color: var(--accent-deep)">
              {{ grandTour.note }}
            </span>
          </div>
          <h2
            class="font-serif font-normal tracking-[-0.02em] leading-none m-0"
            style="font-size: clamp(32px, 4vw, 48px)"
          >{{ grandTour.title }}</h2>
          <p class="text-[15px] text-ink-2 m-0 max-w-md">{{ grandTour.sub }}</p>
          <!-- Sub-tags: dynamically shows which round types are included at current difficulty -->
          <div class="flex flex-wrap gap-2 mt-1 min-h-[54px] content-start">
            <span
              v-for="tag in grandTourTags"
              :key="tag"
              class="font-mono text-[10px] tracking-[0.14em] uppercase
                     px-2.5 py-1 rounded-full border border-rule-2 text-ink-3"
            >{{ tag }}</span>
          </div>
        </div>

        <!-- Art panel -->
        <div
          class="h-36 sm:h-48 sm:w-48 flex-shrink-0
                 flex items-center justify-center
                 rounded-2xl border border-[var(--accent)]"
          style="background: linear-gradient(160deg, var(--accent-soft), var(--color-paper))"
        >
          <ModeIcon :kind="grandTour.icon" />
        </div>
      </button>

      <!-- ── Individual mode cards — 2-col on desktop, 1-col on mobile ─────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        v-for="(m, i) in regularModes"
        :key="m.id"
        class="mode-card bg-paper border border-rule rounded-[18px] px-6 py-[26px] pb-[22px]
               text-left flex flex-col gap-3.5 cursor-pointer relative overflow-hidden
               opacity-0 translate-y-2
               transition-[box-shadow,border-color] duration-[220ms] ease-[cubic-bezier(.2,.7,.2,1)]
               hover:border-[var(--accent)]"
        :style="{
          animationName: 'card-in',
          animationDuration: '0.5s',
          animationFillMode: 'forwards',
          animationTimingFunction: 'cubic-bezier(.2,.7,.2,1)',
          animationDelay: `${(i + 1) * 70}ms`,
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
          <div class="flex items-center gap-2 flex-wrap">
            <div class="font-mono text-[10.5px] tracking-[0.16em] uppercase" style="color: var(--accent-deep)">
              {{ m.note }}
            </div>
          </div>
          <h2 class="font-serif font-normal text-[28px] tracking-[-0.015em] m-0">{{ m.title }}</h2>
          <p class="text-[14.5px] text-ink-2 m-0">{{ m.sub }}</p>

          <!-- Difficulty meter -->
          <div class="flex items-center gap-2 pt-1">
            <div class="flex gap-[3px]">
              <div
                v-for="n in 4"
                :key="n"
                class="w-5 h-[5px] rounded-full transition-colors duration-200"
                :style="n <= diffLevel(m) ? { background: diffColor(m) } : { background: 'var(--color-rule)' }"
              />
            </div>
            <span class="font-mono text-[9.5px] tracking-[0.16em] uppercase" :style="{ color: diffColor(m) }">
              {{ diffLabel(m) }}
            </span>
          </div>
        </div>
      </button>
      </div>

    </div>
  </main>
</template>
