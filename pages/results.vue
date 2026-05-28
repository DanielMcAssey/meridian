<script setup lang="ts">
import type { RoundType } from '~/types/game'

const session = useSessionStore()
const playerName = useLocalStorage('geo.player.name', '')
const { isPending, isPaused } = useLeaderboardMutation()

onMounted(() => {
  if (!session.hasFinished) navigateTo('/menu')
})

const total    = computed(() => session.results.length)
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

const TYPE_LABEL: Record<RoundType, string> = {
  flag:     'Flag',
  pin:      'Pin',
  cart:     'Map',
  shape:    'Shape',
  capital:  'Capital',
  region:   'Region',
  language: 'Language',
}

function playAgain() {
  const atlas = useAtlasStore()
  const rounds = buildRounds(atlas.countries, session.mode, session.results.length, session.difficulty)
  session.start(rounds, session.mode, session.difficulty)
  navigateTo('/play')
}
</script>

<template>
  <main class="screen">
    <!-- Header -->
    <div class="max-w-2xl mb-8">
      <span class="eyebrow">The Verdict</span>
      <h1
        class="font-serif font-normal tracking-[-0.025em] leading-none mt-3 mb-2"
        style="font-size: clamp(48px, 6vw, 80px)"
      >
        <em class="italic" style="color: var(--accent-deep)">{{ verdict }}.</em>
      </h1>
      <p class="font-serif italic text-[22px] text-ink-2 mt-1.5 mb-0">{{ playerName }}, your final tally</p>
      <p v-if="percentText" class="font-mono text-[12.5px] tracking-[0.06em] mt-3 uppercase" style="color: var(--accent-deep)">
        {{ percentText }}
      </p>

      <!-- Offline / queued leaderboard submission banner -->
      <div
        v-if="isPaused || (session.lbPending && !isPending)"
        class="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border border-rule bg-paper text-ink-3 font-mono text-[11px] tracking-[0.08em] uppercase"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-ink-3 opacity-60 animate-pulse shrink-0" aria-hidden="true" />
        Score queued — will post to leaderboard when back online
      </div>
      <div
        v-else-if="isPending"
        class="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border border-rule bg-paper text-ink-3 font-mono text-[11px] tracking-[0.08em] uppercase"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-ink-3 opacity-60 animate-pulse shrink-0" aria-hidden="true" />
        Posting score…
      </div>
    </div>

    <!-- Big stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
      <div
        v-for="stat in [
          { label: 'Final Score', value: String(session.finalScore), muted: '' },
          { label: 'Correct',     value: String(session.finalCorrect), muted: `/${total}` },
          { label: 'Accuracy',    value: `${accuracy}%`, muted: '' },
        ]"
        :key="stat.label"
        class="bg-paper border border-rule rounded-[18px] p-7 flex flex-col gap-2"
        style="box-shadow: var(--shadow-sm)"
      >
        <span class="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-3">{{ stat.label }}</span>
        <span class="font-mono text-[56px] font-medium tracking-[-0.02em] leading-none tabular-nums">
          {{ stat.value }}<span v-if="stat.muted" class="text-ink-3 text-[36px]">{{ stat.muted }}</span>
        </span>
      </div>
    </div>

    <!-- Round breakdown -->
    <div
      class="bg-paper border border-rule rounded-[18px] p-6 mb-8"
      style="box-shadow: var(--shadow-sm)"
    >
      <div class="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-3 mb-3">Round by round</div>
      <ol class="list-none m-0 p-0 flex flex-col">
        <li
          v-for="(r, i) in session.results"
          :key="i"
          class="flex items-center gap-3 py-3 px-1.5 border-t border-rule first:border-t-0 text-[14.5px]"
          :class="r.correct ? 'text-ok' : 'text-bad'"
        >
          <!-- Index -->
          <span class="font-mono text-ink-3 text-xs w-7 shrink-0">{{ String(i + 1).padStart(2, '0') }}</span>
          <!-- Type — hidden on xs -->
          <span class="hidden sm:block font-mono text-[10.5px] tracking-[0.14em] uppercase text-ink-3 w-14 shrink-0">
            {{ TYPE_LABEL[r.type] ?? r.type }}
          </span>
          <!-- Answer -->
          <span class="font-serif text-[18px] text-ink flex-1 min-w-0 truncate">{{ r.answer.name }}</span>
          <!-- Picked — hidden on xs -->
          <span
            class="hidden sm:block text-[13.5px] flex-1 min-w-0 truncate"
            :class="r.correct ? 'text-ok' : 'text-bad'"
          >
            <template v-if="r.picked">{{ r.correct ? '✓' : `✗ chose ${r.picked.name}` }}</template>
            <template v-else-if="r.pickedLang">{{ r.correct ? '✓' : `✗ chose ${r.pickedLang}` }}</template>
            <template v-else>— no answer</template>
          </span>
          <!-- Points -->
          <span class="font-mono font-medium text-right shrink-0" :class="r.correct ? 'text-ink' : 'text-ink-3'">
            {{ r.points }} pts
          </span>
        </li>
      </ol>
    </div>

    <!-- CTA -->
    <div class="flex gap-3 flex-wrap">
      <button class="btn-primary" @click="playAgain">Play again</button>
      <button class="btn-ghost" @click="navigateTo('/menu')">Change game</button>
      <button class="btn-ghost" @click="navigateTo('/leaderboard')">View leaderboard</button>
    </div>
  </main>
</template>
