<script setup lang="ts">
import type { LeaderboardEntry } from '~/types/game'

// SSR enabled — data is fetched on the server for a fast first paint
const playerName = useLocalStorage('geo.player.name', '')

const { data: board, refresh } = await useFetch<LeaderboardEntry[]>('/api/leaderboard', {
  default: (): LeaderboardEntry[] => [],
})

type TrophyKind = 'gold' | 'silver' | 'bronze'
function trophyFor(rank: number): TrophyKind | null {
  if (rank === 0) return 'gold'
  if (rank === 1) return 'silver'
  if (rank === 2) return 'bronze'
  return null
}

function modeName(mode: string) {
  return mode === 'flag'
    ? 'Banners'
    : mode === 'pin'
      ? 'Pin Drop'
      : mode === 'cart'
        ? 'Cartographer'
        : 'Grand Tour'
}

// Migrate any scores still sitting in localStorage (one-time migration)
onMounted(async () => {
  const LS_BOARD = 'geo.leaderboard.v1'
  try {
    const raw = localStorage.getItem(LS_BOARD)
    if (!raw) return
    const entries = JSON.parse(raw) as Array<{
      name: string
      score: number
      correct: number
      total: number
      mode: string
      difficulty: string
    }>
    if (!Array.isArray(entries) || entries.length === 0) return

    await Promise.allSettled(
      entries.map((e) =>
        $fetch('/api/leaderboard', {
          method: 'POST',
          body: {
            name: e.name,
            score: e.score,
            correct: e.correct,
            total: e.total,
            mode: e.mode,
            difficulty: e.difficulty,
          },
        }),
      ),
    )
    localStorage.removeItem(LS_BOARD)
    await refresh()
  } catch {
    // Non-critical — ignore migration errors
  }
})
</script>

<template>
  <main class="screen leaderboard">
    <div class="lb-head">
      <span class="eyebrow">The Hall of Travellers</span>
      <h1 class="lb-title">Leaderboard.</h1>
      <p class="lb-sub">The fifty finest scores on record.</p>
    </div>

    <div v-if="!board || board.length === 0" class="lb-empty">
      No scores yet. Set sail to inscribe your name.
    </div>

    <ol v-else class="lb-list">
      <li class="lb-row lb-row-head">
        <span class="lb-rank">#</span>
        <span class="lb-name">Name</span>
        <span class="lb-mode">Game</span>
        <span class="lb-diff">Difficulty</span>
        <span class="lb-acc">Correct</span>
        <span class="lb-score">Score</span>
      </li>
      <li
        v-for="(entry, i) in board"
        :key="entry.id ?? i"
        :class="[
          'lb-row',
          trophyFor(i) ? `lb-trophy lb-trophy-${trophyFor(i)}` : '',
          entry.name === playerName ? 'lb-row-you' : '',
        ]"
      >
        <span class="lb-rank">
          <span v-if="trophyFor(i)" class="trophy-medal" aria-hidden="true">
            <TrophySvg :kind="trophyFor(i)!" />
          </span>
          <span class="lb-rank-num">{{ String(i + 1).padStart(2, '0') }}</span>
        </span>
        <span class="lb-name">
          {{ entry.name }}<em v-if="entry.name === playerName"> (you)</em>
        </span>
        <span class="lb-mode">{{ modeName(entry.mode) }}</span>
        <span class="lb-diff">{{ entry.difficulty }}</span>
        <span class="lb-acc">{{ entry.correct }}/{{ entry.total }}</span>
        <span class="lb-score">{{ entry.score }}</span>
      </li>
    </ol>

    <div class="lb-cta">
      <button class="btn-primary" @click="navigateTo('/menu')">Back to the atlas</button>
    </div>
  </main>
</template>
