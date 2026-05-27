<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import type { Difficulty, GameMode, LeaderboardRow } from '~/types/game'
import { DIFFICULTIES, MODES, ROUND_COUNTS, modeName } from '~/config/game'

definePageMeta({ ssr: false })

const playerName = useLocalStorage('geo.player.name', '')
const settings   = useGameSettings()
const session    = useSessionStore()

// ── Filters ──────────────────────────────────────────────────────────────────
// Default to the last session's settings so the board opens pre-filtered to
// the game the player just finished.  Falls back to Grand Tour + their saved
// difficulty when there is no active session.
const filterMode       = ref<GameMode | 'any'>(session.hasSession ? session.mode       : 'mixed')
const filterDifficulty = ref<Difficulty | 'any'>(session.hasSession ? session.difficulty : settings.difficulty.value)
const filterRounds     = ref<number>(session.hasSession ? session.rounds.length         : settings.rounds.value)

// Prepend the 'All modes' option to the config MODES list for the filter UI
const FILTER_MODES = [
  { id: 'any' as const, label: 'All modes' },
  ...MODES.map((m) => ({ id: m.id, label: m.label })),
]

const ROUND_OPTIONS = [
  { val: 0, label: 'Any' },
  ...ROUND_COUNTS.map((n) => ({ val: n, label: String(n) })),
]

// ── Query ─────────────────────────────────────────────────────────────────────
const queryKey = computed(() => [
  'leaderboard',
  filterMode.value,
  filterDifficulty.value,
  filterRounds.value,
])

const { data: board, isFetching } = useQuery<LeaderboardRow[]>({
  queryKey,
  queryFn: () => {
    const params = new URLSearchParams({ limit: '50' })
    if (filterMode.value !== 'any')       params.set('mode',       filterMode.value)
    if (filterDifficulty.value !== 'any') params.set('difficulty', filterDifficulty.value)
    if (filterRounds.value > 0)           params.set('total',      String(filterRounds.value))
    return $fetch<LeaderboardRow[]>(`/api/leaderboard?${params}`)
  },
  initialData: () => [],
  staleTime: 1000 * 30,
  refetchOnWindowFocus: true,
  networkMode: 'offlineFirst',
})

// ── Filter summary text ───────────────────────────────────────────────────────
const filterLabel = computed(() => {
  const parts: string[] = []
  if (filterMode.value !== 'any') parts.push(modeName(filterMode.value))
  const d = DIFFICULTIES.find((x) => x.id === filterDifficulty.value)
  if (d) parts.push(d.label)
  if (filterRounds.value > 0) parts.push(`${filterRounds.value} rounds`)
  return parts.length ? parts.join(' · ') : 'all games'
})

// ── Trophy helpers ────────────────────────────────────────────────────────────
type TrophyKind = 'gold' | 'silver' | 'bronze'
function trophyFor(rank: number): TrophyKind | null {
  if (rank === 0) return 'gold'
  if (rank === 1) return 'silver'
  if (rank === 2) return 'bronze'
  return null
}

const trophyBg: Record<TrophyKind, string> = {
  gold:   'linear-gradient(90deg, color-mix(in oklab, oklch(0.84 0.13 90) 35%, var(--color-paper)), var(--color-paper))',
  silver: 'linear-gradient(90deg, color-mix(in oklab, oklch(0.85 0.02 250) 35%, var(--color-paper)), var(--color-paper))',
  bronze: 'linear-gradient(90deg, color-mix(in oklab, oklch(0.65 0.10 45) 30%, var(--color-paper)), var(--color-paper))',
}
const trophyColor: Record<TrophyKind, string> = {
  gold:   'oklch(0.72 0.16 90)',
  silver: 'oklch(0.78 0.015 250)',
  bronze: 'oklch(0.55 0.11 45)',
}
</script>

<template>
  <main class="screen">
    <!-- Header -->
    <div class="max-w-2xl mb-6">
      <span class="eyebrow">The Hall of Travellers</span>
      <h1
        class="font-serif font-normal tracking-[-0.02em] leading-none mt-3 mb-1.5"
        style="font-size: clamp(40px, 5vw, 64px)"
      >Leaderboard.</h1>
      <p class="text-ink-2 m-0 flex items-center gap-2">
        Top 50 for <span class="text-ink font-medium">{{ filterLabel }}</span>.
        <span
          v-if="isFetching"
          class="inline-block w-3 h-3 rounded-full border-2 border-rule border-t-ink-3 animate-spin"
          aria-hidden="true"
        />
      </p>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-5 mb-8 items-start">
      <!-- Game mode -->
      <div class="flex flex-col gap-2">
        <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Game</span>
        <div class="flex gap-1 p-[3px] bg-paper border border-rule rounded-full flex-wrap">
          <button
            v-for="m in FILTER_MODES"
            :key="m.id"
            :class="filterMode === m.id ? 'diff-pill-on' : 'diff-pill'"
            @click="filterMode = m.id"
          >{{ m.label }}</button>
        </div>
      </div>

      <!-- Difficulty -->
      <div class="flex flex-col gap-2">
        <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Difficulty</span>
        <div class="flex gap-1 p-[3px] bg-paper border border-rule rounded-full flex-wrap">
          <button
            :class="filterDifficulty === 'any' ? 'diff-pill-on' : 'diff-pill'"
            @click="filterDifficulty = 'any'"
          >Any</button>
          <button
            v-for="d in DIFFICULTIES"
            :key="d.id"
            :class="filterDifficulty === d.id ? 'diff-pill-on' : 'diff-pill'"
            @click="filterDifficulty = d.id"
          >{{ d.label }}</button>
        </div>
      </div>

      <!-- Rounds -->
      <div class="flex flex-col gap-2">
        <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Rounds</span>
        <div class="flex gap-1 p-[3px] bg-paper border border-rule rounded-full">
          <button
            v-for="opt in ROUND_OPTIONS"
            :key="opt.val"
            :class="filterRounds === opt.val ? 'diff-pill-on' : 'diff-pill'"
            @click="filterRounds = opt.val"
          >{{ opt.label }}</button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!board || board.length === 0"
      class="text-center py-20 px-5 font-serif italic text-2xl text-ink-3"
    >
      No scores yet for these settings. Set sail to inscribe your name.
    </div>

    <!-- Table -->
    <ol
      v-else
      class="list-none m-0 mb-7 p-0 bg-paper border border-rule rounded-[18px] overflow-hidden"
      style="box-shadow: var(--shadow-sm)"
    >
      <!-- Header row -->
      <li
        class="grid gap-3 px-4 sm:px-5 py-3 bg-bg-tint border-b border-rule
               grid-cols-[3rem_1fr_auto] sm:grid-cols-[5rem_1.4fr_1fr_1fr_0.8fr_0.8fr]"
      >
        <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">#</span>
        <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Name</span>
        <span class="hidden sm:block font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Game</span>
        <span class="hidden sm:block font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Difficulty</span>
        <span class="hidden sm:block font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Correct</span>
        <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3 text-right">Score</span>
      </li>

      <!-- Data rows -->
      <li
        v-for="(entry, i) in board"
        :key="entry.id"
        class="grid gap-3 px-4 sm:px-5 py-3 border-t border-rule items-center text-[14.5px] text-ink
               grid-cols-[3rem_1fr_auto] sm:grid-cols-[5rem_1.4fr_1fr_1fr_0.8fr_0.8fr]"
        :style="{
          background: entry.name === playerName
            ? 'color-mix(in oklab, var(--accent) 22%, var(--color-paper))'
            : trophyFor(i) ? trophyBg[trophyFor(i)!] : undefined,
          boxShadow: entry.name === playerName && trophyFor(i) ? 'inset 4px 0 0 var(--accent)' : undefined,
        }"
      >
        <!-- Rank -->
        <span class="font-mono text-ink-3 inline-flex items-center gap-2">
          <span
            v-if="trophyFor(i)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
            :style="{ color: trophyColor[trophyFor(i)!], background: `color-mix(in oklab, ${trophyColor[trophyFor(i)!]} 25%, transparent)` }"
            aria-hidden="true"
          >
            <TrophySvg :kind="trophyFor(i)!" class="trophy-svg w-[18px] h-[18px]" />
          </span>
          <span class="tabular-nums">{{ String(i + 1).padStart(2, '0') }}</span>
        </span>

        <!-- Name -->
        <span class="font-serif text-[19px] text-ink truncate">
          {{ entry.name }}
          <em
            v-if="entry.name === playerName"
            class="font-mono not-italic text-[13px] ml-2 tracking-[0.08em]"
            :style="{ color: 'var(--accent)' }"
          >(you)</em>
        </span>

        <!-- Game + Difficulty — hidden on mobile -->
        <span class="hidden sm:block font-mono text-xs tracking-[0.04em] text-ink-2">{{ modeName(entry.mode) }}</span>
        <span class="hidden sm:block font-mono text-xs tracking-[0.04em] text-ink-2 capitalize">{{ entry.difficulty }}</span>

        <!-- Correct — hidden on mobile -->
        <span class="hidden sm:block font-mono text-ink-2">{{ entry.correct }}/{{ entry.total }}</span>

        <!-- Score -->
        <span class="font-mono font-semibold text-right text-ink">{{ entry.score }}</span>
      </li>
    </ol>

    <div>
      <button class="btn-primary" @click="navigateTo('/menu')">Back to the atlas</button>
    </div>
  </main>
</template>
