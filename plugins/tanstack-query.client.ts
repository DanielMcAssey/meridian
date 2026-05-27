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
import type { LeaderboardPayload } from '~/composables/useLeaderboardMutation'

// Bump this string whenever the leaderboard POST schema changes –
// it busts the persisted cache so stale mutations aren't replayed.
const CACHE_BUSTER = 'v1'

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,         // 5 min
        retry: 1,
      },
      mutations: {
        // 'online' = pause when the browser is offline; resume automatically
        // when connectivity returns.  Paused mutations are also persisted below.
        networkMode: 'online',
        retry: 5,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
      },
    },
  })

  // Register the default mutation fn for the leaderboard key.
  // TanStack serialises variable data to localStorage but not functions, so we
  // register the fn here; it is looked up by mutationKey when a mutation is
  // replayed after a reload.
  queryClient.setMutationDefaults(['leaderboard-post'], {
    mutationFn: async (variables: LeaderboardPayload) =>
      $fetch<{ rank: number; total: number }>('/api/leaderboard', {
        method: 'POST',
        body: variables,
      }),
    networkMode: 'online',
    retry: 5,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
  })

  // Persist both the query cache and the mutation cache (including paused
  // mutations) to localStorage.  On next load, paused mutations are
  // automatically resumed.
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'geo.tq-cache',
  })

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1_000 * 60 * 60 * 24 * 7,   // 7 days
    buster: CACHE_BUSTER,
  })

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
})
