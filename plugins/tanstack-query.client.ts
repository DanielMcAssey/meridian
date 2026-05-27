/**
 * TanStack Query – client-only plugin.
 *
 * Responsibilities:
 *  - Create a QueryClient with sensible defaults.
 *  - Register the leaderboard mutation *default* so persisted/replayed mutations
 *    know which function to call even after a page reload.
 *  - Wire up localStorage persistence so paused (offline-queued) mutations
 *    survive browser refreshes and are automatically retried once connectivity
 *    is restored.
 */

import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { persistQueryClient } from '@tanstack/query-persist-client-core'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import type { LeaderboardEntry } from '~/types/game'

// Bump this string whenever the leaderboard POST schema changes —
// it busts the persisted cache so stale mutations aren't replayed.
const CACHE_BUSTER = 'v1'

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
      mutations: {
        networkMode: 'online',
        retry: 5,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
      },
    },
  })

  queryClient.setMutationDefaults(['leaderboard-post'], {
    mutationFn: async (variables: LeaderboardEntry) =>
      $fetch<{ rank: number; total: number }>('/api/leaderboard', {
        method: 'POST',
        body: variables,
      }),
    networkMode: 'online',
    retry: 5,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
  })

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'geo.tq-cache',
  })

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1_000 * 60 * 60 * 24 * 7,
    buster: CACHE_BUSTER,
  })

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
})
