<script lang="ts">
// Module-level constants — these never change so there's no need to
// re-create them on each component mount.
export const trophyBg = {
  gold:   'linear-gradient(90deg, color-mix(in oklab, oklch(0.84 0.13 90) 35%, var(--color-paper)), var(--color-paper))',
  silver: 'linear-gradient(90deg, color-mix(in oklab, oklch(0.85 0.02 250) 35%, var(--color-paper)), var(--color-paper))',
  bronze: 'linear-gradient(90deg, color-mix(in oklab, oklch(0.65 0.10 45) 30%, var(--color-paper)), var(--color-paper))',
} as const
export const trophyColor = {
  gold:   'oklch(0.72 0.16 90)',
  silver: 'oklch(0.78 0.015 250)',
  bronze: 'oklch(0.55 0.11 45)',
} as const
</script>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import type { Difficulty, GameMode, LeaderboardResponse, TrophyKind } from '~/types/game'
import type { LeaderboardPeriod } from '~/config/game'
import { DIFFICULTIES, LEADERBOARD_PERIODS, MODES, POOL_LABEL, ROUND_COUNTS, VALID_PERIODS, VALID_ROUND_COUNTS, modeName } from '~/config/game'

useSeoMeta({
  title: 'Leaderboard',
  description: 'The Hall of Travellers — top scores across all game modes and difficulty levels.',
  ogTitle: 'Leaderboard — Meridian',
  ogDescription: 'The Hall of Travellers — top scores across all game modes and difficulty levels.',
  twitterTitle: 'Leaderboard — Meridian',
  twitterDescription: 'The Hall of Travellers — top scores across all game modes and difficulty levels.',
})

const playerName = useLocalStorage('geo.player.name', '')
const userId     = useUserId()
const route      = useRoute()
const router     = useRouter()

// ── Filters ──────────────────────────────────────────────────────────────────
// Query params take priority (permalink support); fall back to last session or
// saved settings when absent or invalid.

function initMode(): GameMode | 'any' {
  const q = route.query.mode
  if (typeof q === 'string' && (q === 'any' || MODES.some((m) => m.id === q)))
    return q as GameMode | 'any'
  return 'any'
}

function initDifficulty(): Difficulty | 'any' {
  const q = route.query.difficulty
  if (typeof q === 'string' && (q === 'any' || DIFFICULTIES.some((d) => d.id === q)))
    return q as Difficulty | 'any'
  return 'any'
}

function initRounds(): number {
  const n = Number(route.query.rounds)
  if (route.query.rounds !== undefined && (n === 0 || VALID_ROUND_COUNTS.has(n))) return n
  return 0
}

function initPeriod(): LeaderboardPeriod {
  const q = route.query.period
  if (typeof q === 'string' && VALID_PERIODS.has(q)) return q as LeaderboardPeriod
  return 'week'
}

const filterMode       = ref<GameMode | 'any'>(initMode())
const filterDifficulty = ref<Difficulty | 'any'>(initDifficulty())
const filterRounds     = ref<number>(initRounds())
const filterPeriod     = ref<LeaderboardPeriod>(initPeriod())

// Keep the URL in sync so filters are shareable as permalinks.
watch([filterMode, filterDifficulty, filterRounds, filterPeriod], () => {
  if (!import.meta.client) return
  const query: Record<string, string> = {}
  if (filterMode.value !== 'any')       query.mode       = filterMode.value
  if (filterDifficulty.value !== 'any') query.difficulty = filterDifficulty.value
  if (filterRounds.value > 0)           query.rounds     = String(filterRounds.value)
  if (filterPeriod.value !== 'week')    query.period     = filterPeriod.value
  router.replace({ query })
})

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
// Refs embedded directly in the key array — TanStack Vue Query v5 deep-unrefs
// them when hashing and tracks each .value as a reactive dependency.
//
// placeholderData (not initialData) — shows an empty list while fetching without
// writing into the query cache.  initialData participates in stale-time checks so
// a recently-persisted 'any' key could be served from localStorage without a
// network request.  placeholderData is purely visual and never blocks a fetch.
const { data: leaderboardData, isFetching } = useQuery<LeaderboardResponse>({
  queryKey: ['leaderboard', filterMode, filterDifficulty, filterRounds, filterPeriod],
  queryFn: () => {
    const params = new URLSearchParams({ limit: '50' })
    if (filterMode.value !== 'any')       params.set('mode',       filterMode.value)
    if (filterDifficulty.value !== 'any') params.set('difficulty', filterDifficulty.value)
    if (filterRounds.value > 0)           params.set('total',      String(filterRounds.value))
    if (filterPeriod.value !== 'all')     params.set('period',     filterPeriod.value)
    return $fetch<LeaderboardResponse>(`/api/leaderboard?${params}`)
  },
  placeholderData: () => ({ rows: [], hasMore: false }),
  staleTime: 1000 * 30,
  refetchOnWindowFocus: true,
  // 'offlineFirst': TanStack always fires the fetch regardless of navigator.onLine,
  // which lets the Workbox service worker intercept it and serve the SW cache when
  // the network is genuinely down.  Without this, TanStack would pause the query
  // while offline and Workbox's fallback cache would never be reached.
  networkMode: 'offlineFirst',
})

const board   = computed(() => leaderboardData.value?.rows ?? [])
const hasMore = computed(() => leaderboardData.value?.hasMore ?? false)

// ── Filter summary text ───────────────────────────────────────────────────────
const filterLabel = computed(() => {
  const parts: string[] = []
  if (filterMode.value !== 'any') parts.push(modeName(filterMode.value))
  const d = DIFFICULTIES.find((x) => x.id === filterDifficulty.value)
  if (d) parts.push(d.label)
  if (filterRounds.value > 0) parts.push(`${filterRounds.value} rounds`)
  if (filterPeriod.value !== 'all') {
    const p = LEADERBOARD_PERIODS.find((x) => x.id === filterPeriod.value)
    if (p) parts.push(p.label)
  }
  return parts.length ? parts.join(' · ') : 'all games'
})

// ── Trophy helpers ────────────────────────────────────────────────────────────
function trophyFor(rank: number): TrophyKind | null {
  if (rank === 0) return 'gold'
  if (rank === 1) return 'silver'
  if (rank === 2) return 'bronze'
  return null
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
      <p class="text-ink-2 m-0 flex items-center gap-2 flex-wrap">
        <span>Top {{ board.length }} for <span class="text-ink font-medium">{{ filterLabel }}</span><template v-if="hasMore"> — more available</template>.</span>
        <span
          v-if="isFetching"
          class="inline-block w-3 h-3 rounded-full border-2 border-rule border-t-ink-3 animate-spin"
          aria-hidden="true"
        />
      </p>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-5 mb-8 items-start">
      <FilterPillGroup
        label="Game"
        :options="FILTER_MODES"
        :model-value="filterMode"
        @update:model-value="filterMode = $event as typeof filterMode"
      />
      <DifficultySlider
        allow-any
        label="Country Pool"
        :model-value="filterDifficulty"
        @update:model-value="filterDifficulty = $event as Difficulty | 'any'"
      />
      <FilterPillGroup
        label="Rounds"
        :options="ROUND_OPTIONS.map(o => ({ id: o.val, label: o.label }))"
        :model-value="filterRounds"
        @update:model-value="filterRounds = $event as typeof filterRounds"
      />
      <FilterPillGroup
        label="Period"
        :options="LEADERBOARD_PERIODS"
        :model-value="filterPeriod"
        @update:model-value="filterPeriod = $event as LeaderboardPeriod"
      />
    </div>

    <!-- Loading skeleton -->
    <div v-if="isFetching && board.length === 0" class="flex flex-col gap-2 mb-7">
      <div
        v-for="n in 5"
        :key="n"
        class="h-12 rounded-xl bg-paper border border-rule animate-pulse"
        :style="{ opacity: 1 - n * 0.15 }"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="board.length === 0"
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
        <span class="hidden sm:block font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Country Pool</span>
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
          background: (entry.userId && entry.userId === userId)
            ? 'color-mix(in oklab, var(--accent) 22%, var(--color-paper))'
            : trophyFor(i) ? trophyBg[trophyFor(i)!] : undefined,
          boxShadow: (entry.userId && entry.userId === userId) && trophyFor(i) ? 'inset 4px 0 0 var(--accent)' : undefined,
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
        <div class="flex items-center gap-2 min-w-0">
          <img
            v-if="entry.countryCode"
            :src="`/flags/${entry.countryCode.toLowerCase()}.svg`"
            :alt="entry.countryCode"
            width="20"
            height="14"
            class="rounded-sm shrink-0 object-cover"
          />
          <component
            :is="entry.userId ? 'a' : 'span'"
            :href="entry.userId ? `/profile/${entry.userId}` : undefined"
            :target="entry.userId ? '_blank' : undefined"
            :rel="entry.userId ? 'noopener noreferrer' : undefined"
            class="font-serif text-[19px] text-ink truncate"
            :class="{ 'hover:underline underline-offset-2 decoration-ink-3 cursor-pointer': entry.userId }"
          >
            {{ entry.name }}
            <em
              v-if="entry.userId && entry.userId === userId"
              class="font-mono not-italic text-[13px] ml-2 tracking-[0.08em]"
              :style="{ color: 'var(--accent)' }"
            >(you)</em>
          </component>
          <PlayerBadges :userId="entry.userId" size="sm" />
        </div>

        <!-- Game + Difficulty — hidden on mobile -->
        <span class="hidden sm:block font-mono text-xs tracking-[0.04em] text-ink-2">{{ modeName(entry.mode) }}</span>
        <span class="hidden sm:block font-mono text-xs tracking-[0.04em] text-ink-2">{{ POOL_LABEL[entry.difficulty as Difficulty] }}</span>

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
