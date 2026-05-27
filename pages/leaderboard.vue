<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import type { Difficulty, GameMode, LeaderboardEntry } from '~/types/game'
import { DIFFICULTIES } from '~/composables/useGameSettings'

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

const MODES: { id: GameMode | 'any'; label: string }[] = [
  { id: 'any',   label: 'All modes'     },
  { id: 'mixed', label: 'Grand Tour'    },
  { id: 'flag',  label: 'Banners'       },
  { id: 'pin',   label: 'Pin Drop'      },
  { id: 'cart',  label: 'Cartographer'  },
]

const ROUND_OPTIONS: { val: number; label: string }[] = [
  { val: 0,  label: 'Any' },
  { val: 5,  label: '5'   },
  { val: 8,  label: '8'   },
  { val: 12, label: '12'  },
  { val: 20, label: '20'  },
]

// ── Query ─────────────────────────────────────────────────────────────────────
// The reactive queryKey means TanStack re-fetches automatically whenever a
// filter changes.  The existing mutation invalidation (`['leaderboard']` prefix)
// also re-fetches the active filtered query after a score is posted.
const queryKey = computed(() => [
  'leaderboard',
  filterMode.value,
  filterDifficulty.value,
  filterRounds.value,
])

const { data: board, isFetching, refetch } = useQuery<LeaderboardEntry[]>({
  queryKey,
  queryFn: () => {
    const params = new URLSearchParams({ limit: '50' })
    if (filterMode.value !== 'any')       params.set('mode',       filterMode.value)
    if (filterDifficulty.value !== 'any') params.set('difficulty', filterDifficulty.value)
    if (filterRounds.value > 0)           params.set('total',      String(filterRounds.value))
    return $fetch<LeaderboardEntry[]>(`/api/leaderboard?${params}`)
  },
  initialData: () => [],
  staleTime: 1000 * 30,
  refetchOnWindowFocus: true,
  networkMode: 'offlineFirst',
})

// ── Filter summary text ───────────────────────────────────────────────────────
const filterLabel = computed(() => {
  const parts: string[] = []
  const m = MODES.find((x) => x.id === filterMode.value)
  if (m && m.id !== 'any') parts.push(m.label)
  const d = DIFFICULTIES.find((x) => x.id === filterDifficulty.value)
  if (d) parts.push(d.label)
  if (filterRounds.value > 0) parts.push(`${filterRounds.value} rounds`)
  return parts.length ? parts.join(' · ') : 'all games'
})

// ── Helpers ───────────────────────────────────────────────────────────────────
type TrophyKind = 'gold' | 'silver' | 'bronze'
function trophyFor(rank: number): TrophyKind | null {
  if (rank === 0) return 'gold'
  if (rank === 1) return 'silver'
  if (rank === 2) return 'bronze'
  return null
}

function modeName(mode: string) {
  return mode === 'flag' ? 'Banners' : mode === 'pin' ? 'Pin Drop' : mode === 'cart' ? 'Cartographer' : 'Grand Tour'
}

// ── localStorage migration (one-time) ────────────────────────────────────────
onMounted(async () => {
  const LS_BOARD = 'geo.leaderboard.v1'
  try {
    const raw = localStorage.getItem(LS_BOARD)
    if (!raw) return
    const entries = JSON.parse(raw) as Array<{
      name: string; score: number; correct: number; total: number; mode: string; difficulty: string
    }>
    if (!Array.isArray(entries) || entries.length === 0) return
    await Promise.allSettled(
      entries.map((e) => $fetch('/api/leaderboard', { method: 'POST', body: e })),
    )
    localStorage.removeItem(LS_BOARD)
    await refetch()
  } catch { /* Non-critical */ }
})

// ── Trophy styles ─────────────────────────────────────────────────────────────
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
            v-for="m in MODES"
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
        :key="entry.id ?? i"
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
        <span class="hidden sm:block font-mono text-xs tracking-[0.04em] text-ink-2 capitalize">{{ modeName(entry.mode) }}</span>
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
