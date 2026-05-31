<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { POOL_LABEL, modeName } from '~/config/game'
import { ACHIEVEMENTS } from '~/config/achievements'
import { getBadgesForUser } from '~/config/badges'

definePageMeta({ ssr: false })

const route      = useRoute()
const userId     = route.params.userId as string
const userBadges = getBadgesForUser(userId)

// ── Online detection ──────────────────────────────────────────────────────────
const isOnline = ref(import.meta.client ? navigator.onLine : true)

function setOnline()  { isOnline.value = true }
function setOffline() { isOnline.value = false }

onMounted(() => {
  window.addEventListener('online',  setOnline)
  window.addEventListener('offline', setOffline)
})
onUnmounted(() => {
  window.removeEventListener('online',  setOnline)
  window.removeEventListener('offline', setOffline)
})

// ── Profile data ──────────────────────────────────────────────────────────────
interface RecentScore {
  score:      number
  correct:    number
  total:      number
  mode:       string
  difficulty: string
  createdAt:  number
}
interface ProfileStats {
  totalGames:         number
  totalCorrect:       number
  totalRounds:        number
  bestScore:          number
  favoriteMode:       string | null
  favoriteDifficulty: string | null
}
interface UnlockedAchievement {
  id:          string
  name:        string
  description: string
  icon:        string
  category:    string
  unlockedAt:  number
}
interface ProfileData {
  name:         string
  bio:          string | null
  countryCode:  string | null
  firstSeen:    number
  stats:        ProfileStats | null
  recentScores: RecentScore[]
  achievements: UnlockedAchievement[]
}

const { data, isPending, isError } = useQuery<ProfileData>({
  queryKey:  ['profile', userId],
  queryFn:   () => $fetch<ProfileData>(`/api/profile/${userId}`),
  enabled:   isOnline,
  staleTime: 0,
  retry:     1,
})

const profileTitle = computed(() =>
  data.value?.name ? `${data.value.name}'s Voyages` : 'Traveller\'s Log',
)
const profileDescription = computed(() => {
  if (!data.value) return 'View this traveller\'s geography game history on Meridian.'
  if (!data.value.stats) return `${data.value.name} hasn't completed any voyages yet.`
  return `${data.value.name} has completed ${data.value.stats.totalGames} voyages with a best score of ${data.value.stats.bestScore}.`
})

useSeoMeta({
  title:              profileTitle,
  description:        profileDescription,
  ogTitle:            computed(() => `${profileTitle.value} — Meridian`),
  ogDescription:      profileDescription,
  twitterTitle:       computed(() => `${profileTitle.value} — Meridian`),
  twitterDescription: profileDescription,
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateShort(unix: number) {
  return new Date(unix * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function accuracy(correct: number, total: number) {
  if (!total) return '—'
  return `${Math.round((correct / total) * 100)}%`
}

const unlockedMap = computed(() => {
  const map = new Map<string, number>()
  for (const a of (data.value?.achievements ?? [])) map.set(a.id, a.unlockedAt)
  return map
})
</script>

<template>
  <main class="screen">
    <div class="max-w-xl">

      <!-- ── Offline state ──────────────────────────────────────────────────── -->
      <div v-if="!isOnline" class="flex flex-col items-start gap-5 py-16">
        <div
          class="flex items-center gap-3 rounded-2xl border px-6 py-5 text-ink-2"
          style="border-color: var(--color-rule-2); background: var(--color-bg-tint)"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" style="color: var(--accent-deep)" aria-hidden="true">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
          </svg>
          <span class="text-[14.5px]">Go online to view this profile.</span>
        </div>
      </div>

      <!-- ── Loading ────────────────────────────────────────────────────────── -->
      <div v-else-if="isPending" class="flex flex-col gap-4 py-4">
        <div class="h-10 w-48 rounded-xl bg-paper border border-rule animate-pulse" />
        <div class="h-5 w-32 rounded-lg bg-paper border border-rule animate-pulse opacity-60" />
        <div class="h-40 rounded-2xl bg-paper border border-rule animate-pulse mt-4" />
        <div class="h-48 rounded-2xl bg-paper border border-rule animate-pulse opacity-70" />
      </div>

      <!-- ── Error / not found ──────────────────────────────────────────────── -->
      <div
        v-else-if="isError"
        class="py-20 text-center font-serif italic text-2xl text-ink-3"
      >
        This traveller's log could not be found.
      </div>

      <!-- ── Profile ────────────────────────────────────────────────────────── -->
      <template v-else-if="data">

        <!-- Header -->
        <span class="eyebrow">Traveller's Log</span>
        <div class="flex items-center gap-3 mt-3 mb-1 flex-wrap">
          <img
            v-if="data.countryCode"
            :src="`/flags/${data.countryCode.toLowerCase()}.svg`"
            :alt="data.countryCode"
            width="36"
            height="26"
            class="rounded shrink-0 object-cover"
          />
          <h1
            class="font-serif font-normal tracking-[-0.02em] leading-none"
            style="font-size: clamp(34px, 5vw, 52px)"
          >
            {{ data.name }}
          </h1>
        </div>
        <div v-if="userBadges.length" class="mt-2 mb-1">
          <PlayerBadges :userId="userId" />
        </div>
        <p v-if="data.bio" class="text-[15px] text-ink-2 mt-3 mb-1">{{ data.bio }}</p>
        <p class="text-[13.5px] text-ink-3 mb-8">
          Exploring since {{ formatDate(data.firstSeen) }}
        </p>

        <!-- ── No voyages ──────────────────────────────────────────────────── -->
        <div
          v-if="!data.stats && data.recentScores.length === 0"
          class="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] text-ink-2 mb-5"
          style="border-color: var(--color-rule-2); background: var(--color-bg-tint)"
        >
          This traveller hasn't completed any voyages yet.
        </div>

        <!-- ── Stats grid ──────────────────────────────────────────────────── -->
        <section
          v-if="data.stats"
          class="rounded-[18px] border border-rule bg-paper px-6 py-6 mb-5"
          :style="{ boxShadow: 'var(--shadow-sm)' }"
        >
          <h2 class="font-serif font-normal text-[20px] tracking-[-0.015em] mb-5 leading-tight">
            Voyage Statistics
          </h2>

          <dl class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <!-- Total games -->
            <div class="flex flex-col gap-1">
              <dt class="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Voyages</dt>
              <dd class="font-serif text-[28px] leading-none tracking-[-0.02em]">{{ data.stats.totalGames }}</dd>
            </div>

            <!-- Best score -->
            <div class="flex flex-col gap-1">
              <dt class="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Best score</dt>
              <dd class="font-serif text-[28px] leading-none tracking-[-0.02em]" style="color: var(--accent)">{{ data.stats.bestScore }}</dd>
            </div>

            <!-- Accuracy -->
            <div class="flex flex-col gap-1">
              <dt class="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Accuracy</dt>
              <dd class="font-serif text-[28px] leading-none tracking-[-0.02em]">
                {{ accuracy(data.stats.totalCorrect, data.stats.totalRounds) }}
              </dd>
            </div>

            <!-- Correct answers -->
            <div class="flex flex-col gap-1">
              <dt class="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Correct</dt>
              <dd class="font-mono text-[18px] leading-none">
                {{ data.stats.totalCorrect }}<span class="text-ink-3 text-[14px]">/{{ data.stats.totalRounds }}</span>
              </dd>
            </div>

            <!-- Favourite mode -->
            <div v-if="data.stats.favoriteMode" class="flex flex-col gap-1">
              <dt class="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Favourite game</dt>
              <dd class="font-mono text-[13px] leading-none text-ink-2">
                {{ modeName(data.stats.favoriteMode) }}
              </dd>
            </div>

            <!-- Favourite difficulty -->
            <div v-if="data.stats.favoriteDifficulty" class="flex flex-col gap-1">
              <dt class="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Favourite pool</dt>
              <dd class="font-mono text-[13px] leading-none text-ink-2">
                {{ POOL_LABEL[data.stats.favoriteDifficulty as keyof typeof POOL_LABEL] ?? data.stats.favoriteDifficulty }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- ── Recent voyages ──────────────────────────────────────────────── -->
        <section
          v-if="data.recentScores.length > 0"
          class="rounded-[18px] border border-rule bg-paper overflow-hidden mb-5"
          :style="{ boxShadow: 'var(--shadow-sm)' }"
        >
          <div class="px-6 py-5 border-b border-rule">
            <h2 class="font-serif font-normal text-[20px] tracking-[-0.015em] leading-tight m-0">
              Recent Voyages
            </h2>
          </div>

          <ol class="list-none m-0 p-0">
            <!-- Column header -->
            <li class="grid gap-3 px-5 py-2.5 bg-bg-tint border-b border-rule
                        grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <span class="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Game</span>
              <span class="hidden sm:block font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Country Pool</span>
              <span class="hidden sm:block font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Date</span>
              <span class="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3">Correct</span>
              <span class="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-3 text-right">Score</span>
            </li>

            <li
              v-for="s in data.recentScores"
              :key="s.createdAt"
              class="grid gap-3 px-5 py-3 border-t border-rule items-center text-[14px]
                     grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_1fr_1fr_auto_auto]"
            >
              <span class="font-mono text-[12.5px] text-ink-2">{{ modeName(s.mode) }}</span>
              <span class="hidden sm:block font-mono text-[12.5px] text-ink-2">
                {{ POOL_LABEL[s.difficulty as keyof typeof POOL_LABEL] ?? s.difficulty }}
              </span>
              <span class="hidden sm:block font-mono text-[12.5px] text-ink-3">{{ formatDateShort(s.createdAt) }}</span>
              <span class="font-mono text-ink-2">{{ s.correct }}/{{ s.total }}</span>
              <span class="font-mono font-semibold text-right text-ink">{{ s.score }}</span>
            </li>
          </ol>
        </section>

        <!-- ── Achievements ────────────────────────────────────────────────── -->
        <section
          class="rounded-[18px] border border-rule bg-paper px-6 py-6 mb-5"
          :style="{ boxShadow: 'var(--shadow-sm)' }"
        >
          <div class="flex items-baseline justify-between gap-3 mb-5">
            <h2 class="font-serif font-normal text-[20px] tracking-[-0.015em] leading-tight m-0">
              Achievements
            </h2>
            <span class="font-mono text-[11px] tracking-[0.1em] text-ink-3">
              {{ data.achievements.length }}/{{ ACHIEVEMENTS.length }}
            </span>
          </div>

          <ul class="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none m-0 p-0">
            <li
              v-for="a in ACHIEVEMENTS"
              :key="a.id"
              class="flex items-start gap-3 rounded-xl border border-rule px-4 py-3 transition-opacity"
              :class="{
                'opacity-35': !unlockedMap.has(a.id),
                'achievement-prestige': a.category === 'prestige' && unlockedMap.has(a.id),
              }"
            >
              <span class="text-2xl leading-none shrink-0 mt-0.5" aria-hidden="true">{{ a.icon }}</span>
              <div class="min-w-0">
                <p class="font-semibold text-[13.5px] text-ink leading-tight m-0">{{ a.name }}</p>
                <p class="text-[12px] text-ink-2 mt-0.5 leading-snug m-0">{{ a.description }}</p>
                <p v-if="unlockedMap.has(a.id)" class="font-mono text-[10.5px] text-ink-3 mt-1.5 m-0">
                  {{ formatDate(unlockedMap.get(a.id)!) }}
                </p>
              </div>
            </li>
          </ul>
        </section>

      </template>

    </div>
  </main>
</template>
