<script setup lang="ts">
definePageMeta({ ssr: false })

const session = useSessionStore()
const playerName = useLocalStorage('geo.player.name', '')

onMounted(() => {
  if (!session.hasFinished) navigateTo('/menu')
})

const total = computed(() => session.results.length)
const accuracy = computed(() =>
  total.value > 0 ? Math.round((session.finalCorrect / total.value) * 100) : 0,
)

const verdict = computed(() => {
  const a = accuracy.value
  if (a >= 90) return 'Cartographer Extraordinaire'
  if (a >= 70) return 'Seasoned Voyager'
  if (a >= 50) return 'Promising Apprentice'
  if (a >= 30) return 'Wayward Wanderer'
  return 'Lost at Sea'
})

const percentText = computed(() => {
  if (!session.rank || !session.lbTotal) return null
  if (session.rank === 1) return `Top of the leaderboard — first of ${session.lbTotal}.`
  const pct = Math.max(1, Math.round((session.rank / session.lbTotal) * 100))
  return `You are in the top ${pct}% — no. ${session.rank} of ${session.lbTotal} voyagers.`
})

function playAgain() {
  // Re-use the same mode/difficulty
  const atlas = useAtlasStore()
  const rounds = buildRounds(
    atlas.countries,
    session.mode,
    session.results.length,
    session.difficulty,
  )
  session.start(rounds, session.mode, session.difficulty)
  navigateTo('/play')
}
</script>

<template>
  <main class="screen results">
    <div class="results-head">
      <span class="eyebrow">The Verdict</span>
      <h1 class="results-title">
        <em>{{ verdict }}.</em>
      </h1>
      <p class="results-sub">{{ playerName }}, your final tally</p>
      <p v-if="percentText" class="results-percentile">{{ percentText }}</p>
    </div>

    <div class="results-board">
      <div class="big-stat">
        <span class="big-stat-label">Final Score</span>
        <span class="big-stat-value">{{ session.finalScore }}</span>
      </div>
      <div class="big-stat">
        <span class="big-stat-label">Correct</span>
        <span class="big-stat-value">
          {{ session.finalCorrect }}<span class="muted">/{{ total }}</span>
        </span>
      </div>
      <div class="big-stat">
        <span class="big-stat-label">Accuracy</span>
        <span class="big-stat-value">{{ accuracy }}%</span>
      </div>
    </div>

    <div class="results-rounds">
      <div class="results-rounds-head">Round by round</div>
      <ol class="results-list">
        <li
          v-for="(r, i) in session.results"
          :key="i"
          :class="['results-row', r.correct ? 'row-ok' : 'row-bad']"
        >
          <span class="row-idx">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="row-type">{{ r.type === 'flag' ? 'Flag' : r.type === 'pin' ? 'Pin' : 'Map' }}</span>
          <span class="row-answer">{{ r.answer.name }}</span>
          <span class="row-picked">
            <template v-if="r.picked">
              {{ r.correct ? '✓' : `✗ chose ${r.picked.name}` }}
            </template>
            <template v-else>— no answer</template>
          </span>
          <span class="row-pts">{{ r.points }} pts</span>
        </li>
      </ol>
    </div>

    <div class="results-cta">
      <button class="btn-primary" @click="playAgain">Play again</button>
      <button class="btn-ghost" @click="navigateTo('/menu')">Change game</button>
      <button class="btn-ghost" @click="navigateTo('/leaderboard')">View leaderboard</button>
    </div>
  </main>
</template>
