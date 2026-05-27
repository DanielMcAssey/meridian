import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Difficulty, GameMode, Round, RoundResult } from '~/types/game'

export const useSessionStore = defineStore('session', () => {
  const rounds = ref<Round[]>([])
  const idx = ref(0)
  const results = ref<RoundResult[]>([])
  const mode = ref<GameMode>('mixed')
  const difficulty = ref<Difficulty>('medium')
  const finalScore = ref(0)
  const finalCorrect = ref(0)
  const rank = ref<number | null>(null)
  const lbTotal = ref<number | null>(null)

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

  /** @deprecated Use markFinished() + setRank() instead. */
  function finish(rankData: { rank: number; total: number }) {
    finalScore.value = results.value.reduce((s, r) => s + r.points, 0)
    finalCorrect.value = results.value.filter((r) => r.correct).length
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
    hasSession,
    hasFinished,
    currentRound,
    start,
    recordResult,
    advance,
    markFinished,
    setRank,
    finish,
  }
})
