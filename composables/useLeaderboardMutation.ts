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
 */

import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { LeaderboardEntry } from '~/types/game'

export function useLeaderboardMutation() {
  const queryClient = useQueryClient()
  const session     = useSessionStore()

  const mutation = useMutation<{ rank: number; total: number }, Error, LeaderboardEntry>({
    mutationKey: ['leaderboard-post'],

    // mutationFn is intentionally omitted here; the default registered in the
    // plugin is used.  This allows replayed mutations (post-reload) to resolve
    // the correct function even if this composable hasn't been instantiated yet.

    onSuccess(data) {
      session.setRank({ rank: data.rank, total: data.total })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    },

    onError(err) {
      console.warn('[leaderboard] Submission error (will retry):', err?.message ?? err)
    },
  })

  return {
    /** Fire the leaderboard POST.  Safe to call while offline – it will queue. */
    submitScore: mutation.mutate,
    isPending:   mutation.isPending,
    /** True while the mutation is paused waiting for network connectivity. */
    isPaused:    mutation.isPaused,
    isError:     mutation.isError,
    isSuccess:   mutation.isSuccess,
    status:      mutation.status,
  }
}
