import { defineStore, skipHydrate } from 'pinia'
import { computed, ref } from 'vue'
import type { Difficulty, GameMode, Round, RoundResult } from '~/types/game'

export const useSessionStore = defineStore('session', () => {
  // skipHydrate: session state is created entirely client-side.
  // Prevents Pinia from attempting to SSR-serialise these values,
  // sidestepping the shouldHydrate() crash on null-prototype objects
  // introduced by Vue Router / @pinia/nuxt internals during devalue traversal.
  const rounds       = skipHydrate(ref<Round[]>([]))
  const idx          = skipHydrate(ref(0))
  const results      = skipHydrate(ref<RoundResult[]>([]))
  const mode         = skipHydrate(ref<GameMode>('mixed'))
  const difficulty   = skipHydrate(ref<Difficulty>('medium'))
  const finalScore   = skipHydrate(ref(0))
  const finalCorrect = skipHydrate(ref(0))
  const rank         = skipHydrate(ref<number | null>(null))
  const lbTotal      = skipHydrate(ref<number | null>(null))
  const gameToken    = skipHydrate(ref<string>(''))

  /**
   * True while the score has been submitted but the server hasn't responded
   * yet (e.g. the player is offline and the mutation is queued).
   */
  const lbPending = ref(false)

  const hasSession = computed(() => rounds.value.length > 0)
  /**
   * The game is "finished" (results page is reachable) as soon as scores are
   * tallied – regardless of whether the leaderboard POST has returned.
   */
  const hasFinished = computed(() => hasSession.value && (rank.value !== null || lbPending.value))
  const currentRound = computed(() => rounds.value[idx.value] ?? null)

  function start(newRounds: Round[], gameMode: GameMode, gameDifficulty: Difficulty) {
    rounds.value = newRounds
    idx.value = 0
    results.value = []
    mode.value = gameMode
    difficulty.value = gameDifficulty
    finalScore.value = 0
    finalCorrect.value = 0
    rank.value = null
    lbTotal.value = null
    lbPending.value = false
    gameToken.value = crypto.randomUUID()
  }

  function recordResult(result: RoundResult) {
    results.value = [...results.value, result]
  }

  function advance() {
    idx.value++
  }

  /**
   * Tally scores and mark the session as finished.
   * Call this *before* firing the leaderboard mutation so we can navigate to
   * the results page immediately without blocking on the network.
   */
  function markFinished() {
    finalScore.value = results.value.reduce((s, r) => s + r.points, 0)
    finalCorrect.value = results.value.filter((r) => r.correct).length
    rank.value = null
    lbTotal.value = null
    lbPending.value = true
  }

  /**
   * Called by useLeaderboardMutation's onSuccess handler once the server
   * responds (immediately if online; later if the mutation was queued offline).
   */
  function setRank(rankData: { rank: number; total: number }) {
    rank.value = rankData.rank
    lbTotal.value = rankData.total
    lbPending.value = false
  }

  return {
    rounds,
    idx,
    results,
    mode,
    difficulty,
    finalScore,
    finalCorrect,
    rank,
    lbTotal,
    lbPending,
    gameToken,
    hasSession,
    hasFinished,
    currentRound,
    start,
    recordResult,
    advance,
    markFinished,
    setRank,
  }
})
