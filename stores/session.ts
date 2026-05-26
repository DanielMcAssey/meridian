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

  const hasSession = computed(() => rounds.value.length > 0)
  const hasFinished = computed(() => hasSession.value && rank.value !== null)
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
  }

  function recordResult(result: RoundResult) {
    results.value = [...results.value, result]
  }

  function advance() {
    idx.value++
  }

  function finish(rankData: { rank: number; total: number }) {
    finalScore.value = results.value.reduce((s, r) => s + r.points, 0)
    finalCorrect.value = results.value.filter((r) => r.correct).length
    rank.value = rankData.rank
    lbTotal.value = rankData.total
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
    hasSession,
    hasFinished,
    currentRound,
    start,
    recordResult,
    advance,
    finish,
  }
})
