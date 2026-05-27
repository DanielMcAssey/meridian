/**
 * useLeaderboardMutation
 *
 * Wraps the POST /api/leaderboard call in a TanStack Query mutation.
 *
 * Offline behaviour:
 *  - While the browser is offline the mutation is *paused* (not failed).
 *  - The persisted QueryClient (see plugins/tanstack-query.client.ts) saves
 *    the paused mutation to localStorage.
 *  - On reconnect (or next page load), TanStack automatically resumes it.
 *
 * Usage:
 *   const { submitScore, isPending, isPaused } = useLeaderboardMutation()
 *   submitScore({ name, score, correct, total, mode, difficulty })
 */

import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { GameMode, Difficulty } from '~/types/game'

export interface LeaderboardPayload {
  name: string
  score: number
  correct: number
  total: number
  mode: GameMode
  difficulty: Difficulty
}

export function useLeaderboardMutation() {
  const queryClient = useQueryClient()
  const session = useSessionStore()

  const mutation = useMutation<{ rank: number; total: number }, Error, LeaderboardPayload>({
    mutationKey: ['leaderboard-post'],

    // mutationFn is intentionally omitted here; the default registered in the
    // plugin is used.  This allows replayed mutations (post-reload) to resolve
    // the correct function even if this composable hasn't been instantiated yet.

    onSuccess(data) {
      // Update the session store with the rank returned by the server.
      session.setRank({ rank: data.rank, total: data.total })
      // Invalidate the leaderboard list so the next visit shows fresh data.
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    },

    onError(err) {
      console.warn('[leaderboard] Submission error (will retry):', err?.message ?? err)
    },
  })

  return {
    /** Fire the leaderboard POST.  Safe to call while offline – it will queue. */
    submitScore: mutation.mutate,
    isPending: mutation.isPending,
    /** True while the mutation is paused waiting for network connectivity. */
    isPaused: mutation.isPaused,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    status: mutation.status,
  }
}
