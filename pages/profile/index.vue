<script setup lang="ts">
import QRCode from 'qrcode'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { MAX_BIO_LENGTH, MAX_NAME_LENGTH } from '~/config/game'
import { ACHIEVEMENTS } from '~/config/achievements'
import { getBadgesForUser } from '~/config/badges'

definePageMeta({
  ssr: false,
  middleware: ['require-name'],
})

useSeoMeta({ title: 'Your Profile' })

const profile      = useProfileStore()
const recoveryCode = useRecoveryCode()
const atlas        = useAtlasStore()
const ownBadges    = computed(() => getBadgesForUser(profile.userId))

// ── Name ──────────────────────────────────────────────────────────────────────
const nameInput   = ref(profile.name)
const nameSaved   = ref(false)
const showDelete  = ref(false)
const confirmText = ref('')
const qrDataUrl      = ref('')
const codeCopied     = ref(false)
const showLinkModal  = ref(false)

// ── Public identity ───────────────────────────────────────────────────────────
const bioInput      = ref('')
const countryInput  = ref('')
const queryClient   = useQueryClient()
const identitySaved = ref(false)
const identityError = ref('')
const identitySaving = ref(false)

interface UnlockedAchievement {
  id:          string
  name:        string
  description: string
  icon:        string
  category:    string
  unlockedAt:  number
}
interface OwnProfileData {
  bio:          string | null
  countryCode:  string | null
  achievements: UnlockedAchievement[]
}

// Fetch current bio + countryCode from the server once the recovery code is available.
const { data: serverProfile } = useQuery<OwnProfileData>({
  queryKey:  ['profile', profile.userId],
  queryFn:   () => $fetch<OwnProfileData>(`/api/profile/${profile.userId}` as string),
  enabled:   computed(() => !!profile.userId && !!recoveryCode.value),
  staleTime: 0,
  gcTime:    1000 * 60 * 60 * 24,
  retry:     1,
})

const identityInitialised = ref(false)
watch(serverProfile, (data) => {
  if (!data || identityInitialised.value) return
  bioInput.value     = data.bio     ?? ''
  countryInput.value = data.countryCode ?? ''
  identityInitialised.value = true
}, { immediate: true })

const sortedCountries = computed(() =>
  [...atlas.countries].sort((a, b) => a.name.localeCompare(b.name)),
)

async function saveIdentity() {
  if (!profile.userId || !recoveryCode.value) return
  identitySaving.value = true
  identityError.value  = ''
  try {
    await $fetch('/api/profile/update', {
      method: 'POST',
      body: {
        userId:       profile.userId,
        recoveryCode: recoveryCode.value,
        bio:          bioInput.value.trim() || null,
        countryCode:  countryInput.value   || null,
      },
    })
    queryClient.invalidateQueries({ queryKey: ['profile', profile.userId] })
    identitySaved.value = true
    setTimeout(() => { identitySaved.value = false }, 2800)
  }
  catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    identityError.value = msg ?? 'Failed to save — please try again.'
  }
  finally {
    identitySaving.value = false
  }
}

useInitRecoveryCode()

const recoveryUri = computed(() =>
  profile.userId && recoveryCode.value
    ? `meridian://link?uid=${profile.userId}&rc=${recoveryCode.value}`
    : '',
)

watch(recoveryUri, async (uri) => {
  if (!uri) { qrDataUrl.value = ''; return }
  qrDataUrl.value = await QRCode.toDataURL(uri, {
    width: 280,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}, { immediate: true })



async function saveName() {
  if (sanitizeName(nameInput.value) === profile.name) return
  if (!profile.setName(nameInput.value)) return
  nameInput.value = profile.name  // reflect any sanitization back into the field
  if (profile.userId && recoveryCode.value) {
    await $fetch('/api/profile/update', {
      method: 'POST',
      body: { userId: profile.userId, recoveryCode: recoveryCode.value, name: profile.name },
    }).catch(() => { /* best-effort — name is already saved locally */ })
  }
  nameSaved.value = true
  setTimeout(() => { nameSaved.value = false }, 2800)
}

async function copyCode() {
  if (!recoveryUri.value) return
  try {
    await navigator.clipboard.writeText(recoveryUri.value)
    codeCopied.value = true
    setTimeout(() => { codeCopied.value = false }, 2800)
  } catch { /* clipboard unavailable */ }
}

function deleteProfile() {
  profile.deleteProfile()
  navigateTo('/')
}

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const achievements  = computed(() => serverProfile.value?.achievements ?? [])
const unlockedMap   = computed(() => {
  const map = new Map<string, number>()
  for (const a of achievements.value) map.set(a.id, a.unlockedAt)
  return map
})
</script>

<template>
  <main class="screen">
    <div class="max-w-xl">

      <!-- ── Page header ────────────────────────────────────────────────────── -->
      <span class="eyebrow">Your folio</span>
      <h1
        class="font-serif font-normal tracking-[-0.02em] leading-none mt-3 mb-2"
        style="font-size: clamp(36px, 5vw, 56px)"
      >
        The <em class="italic" style="color: var(--accent-deep)">Traveller</em>
      </h1>
      <p class="text-[15px] text-ink-2 mb-6">
        Manage your identity in the manifest of explorers.
      </p>

      <div v-if="ownBadges.length" class="mb-5 -mt-2">
        <PlayerBadges :userId="profile.userId" />
      </div>

      <a
        v-if="profile.userId"
        :href="`/profile/${profile.userId}`"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-ghost inline-flex items-center gap-2 text-[13.5px] mb-8"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9" />
          <path d="M10 2h4v4" />
          <line x1="14" y1="2" x2="7" y2="9" />
        </svg>
        View public profile
      </a>

      <!-- ── Name section ───────────────────────────────────────────────────── -->
      <section
        class="rounded-[18px] border border-rule bg-paper px-6 py-6 mb-5"
        :style="{ boxShadow: 'var(--shadow-sm)' }"
      >
        <div class="flex items-start gap-3 mb-5">
          <!-- Compass icon -->
          <svg viewBox="0 0 40 40" width="32" height="32" class="shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--color-rule-2)" stroke-width="1.5" />
            <circle cx="20" cy="20" r="1.6" fill="var(--color-ink)" />
            <path d="M20 7 L22.5 20 L20 33 L17.5 20 Z" fill="var(--accent)" opacity="0.9" />
            <path d="M7 20 L20 17.5 L33 20 L20 22.5 Z" fill="var(--color-ink)" opacity="0.35" />
          </svg>
          <div>
            <h2 class="font-serif font-normal text-[22px] tracking-[-0.015em] m-0 leading-tight">
              Name in the register
            </h2>
            <p class="text-[13.5px] text-ink-2 mt-1 m-0">
              How the leaderboard knows you.
            </p>
          </div>
        </div>

        <form class="flex flex-col gap-4" @submit.prevent="saveName">
          <label class="flex flex-col gap-2">
            <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">
              Inscribed name
            </span>
            <input
              v-model="nameInput"
              type="text"
              :maxlength="MAX_NAME_LENGTH"
              class="font-serif italic text-[26px] py-2.5 bg-transparent border-0
                     border-b-[1.5px] border-ink-2 text-ink outline-none
                     transition-[border-color] duration-200 focus:border-[var(--accent)]"
            />
          </label>

          <div class="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              class="btn-primary"
              :disabled="!nameInput.trim() || nameInput.trim() === profile.name"
            >
              Save name
            </button>
            <Transition
              enter-from-class="opacity-0 translate-y-1"
              leave-to-class="opacity-0"
              enter-active-class="transition-[opacity,transform] duration-300 ease-out"
              leave-active-class="transition-opacity duration-200 ease-in"
            >
              <span
                v-if="nameSaved"
                class="font-mono text-[11px] tracking-[0.14em] uppercase"
                style="color: var(--color-ok)"
              >
                ✓ Name updated
              </span>
            </Transition>
          </div>
        </form>
      </section>

      <!-- ── Public Identity ──────────────────────────────────────────────────── -->
      <section
        class="rounded-[18px] border border-rule bg-paper px-6 py-6 mb-5"
        :style="{ boxShadow: 'var(--shadow-sm)' }"
      >
        <div class="flex items-start gap-3 mb-5">
          <!-- Globe icon -->
          <svg viewBox="0 0 40 40" width="32" height="32" class="shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--color-rule-2)" stroke-width="1.5" />
            <ellipse cx="20" cy="20" rx="7" ry="17" fill="none" stroke="var(--accent)" stroke-width="1.5" />
            <line x1="3" y1="20" x2="37" y2="20" stroke="var(--accent)" stroke-width="1.5" />
            <line x1="6" y1="12" x2="34" y2="12" stroke="var(--color-ink)" stroke-width="1" opacity="0.3" />
            <line x1="6" y1="28" x2="34" y2="28" stroke="var(--color-ink)" stroke-width="1" opacity="0.3" />
          </svg>
          <div>
            <h2 class="font-serif font-normal text-[22px] tracking-[-0.015em] m-0 leading-tight">
              Public identity
            </h2>
            <p class="text-[13.5px] text-ink-2 mt-1 m-0">
              Shown on your profile and next to your name on the leaderboard.
            </p>
          </div>
        </div>

        <!-- Requires first voyage -->
        <div
          v-if="!recoveryCode"
          class="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] text-ink-2"
          style="border-color: var(--color-rule-2); background: var(--color-bg-tint)"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-px" style="color: var(--color-ink-3)" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <line x1="8" y1="5.5" x2="8" y2="8.5" />
            <circle cx="8" cy="10.5" r="0.5" fill="currentColor" />
          </svg>
          <span>Complete your first voyage to set up your public identity.</span>
        </div>

        <form v-else class="flex flex-col gap-5" @submit.prevent="saveIdentity">
          <!-- Country selector -->
          <label class="flex flex-col gap-2">
            <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Home nation</span>
            <div class="relative">
              <select
                v-model="countryInput"
                class="w-full appearance-none bg-paper border-0 border-b-[1.5px] border-ink-2
                       text-[15px] text-ink py-2.5 pr-8 outline-none cursor-pointer
                       transition-[border-color] duration-200 focus:border-[var(--accent)]"
              >
                <option value="">None</option>
                <option
                  v-for="c in sortedCountries"
                  :key="c.code"
                  :value="c.code"
                >{{ c.name }}</option>
              </select>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </div>
            <div v-if="countryInput" class="flex items-center gap-2">
              <FlagImage
                :code="countryInput.toLowerCase()"
                :alt="countryInput"
                width="28"
                height="20"
                class="rounded-sm object-cover"
              />
              <span class="text-[13px] text-ink-2">
                {{ sortedCountries.find(c => c.code === countryInput)?.name }}
              </span>
            </div>
          </label>

          <!-- Bio textarea -->
          <label class="flex flex-col gap-2">
            <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">
              Bio
              <span class="normal-case text-[11px] tracking-normal text-ink-3 ml-1">(optional)</span>
            </span>
            <textarea
              v-model="bioInput"
              :maxlength="MAX_BIO_LENGTH"
              rows="3"
              placeholder="A few words about your travels…"
              class="bg-transparent border border-rule rounded-xl px-4 py-3 text-[15px] text-ink
                     outline-none resize-none transition-[border-color] duration-200
                     focus:border-[var(--accent)] placeholder:text-ink-3"
            />
            <span class="text-[11px] text-ink-3 text-right">{{ bioInput.length }}/{{ MAX_BIO_LENGTH }}</span>
          </label>

          <div class="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              class="btn-primary"
              :disabled="identitySaving"
            >
              {{ identitySaving ? 'Saving…' : 'Save identity' }}
            </button>
            <Transition
              enter-from-class="opacity-0 translate-y-1"
              leave-to-class="opacity-0"
              enter-active-class="transition-[opacity,transform] duration-300 ease-out"
              leave-active-class="transition-opacity duration-200 ease-in"
            >
              <span
                v-if="identitySaved"
                class="font-mono text-[11px] tracking-[0.14em] uppercase"
                style="color: var(--color-ok)"
              >✓ Saved</span>
            </Transition>
            <Transition
              enter-from-class="opacity-0"
              leave-to-class="opacity-0"
              enter-active-class="transition-opacity duration-200"
              leave-active-class="transition-opacity duration-150"
            >
              <span
                v-if="identityError"
                class="text-[13px]"
                style="color: var(--color-bad)"
              >{{ identityError }}</span>
            </Transition>
          </div>
        </form>
      </section>

      <!-- ── Recovery Passport ────────────────────────────────────────────────── -->
      <section
        class="rounded-[18px] border border-rule bg-paper px-6 py-6 mb-5"
        :style="{ boxShadow: 'var(--shadow-sm)' }"
      >
        <div class="flex items-start gap-3 mb-5">
          <!-- Key icon -->
          <svg viewBox="0 0 40 40" width="32" height="32" class="shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--color-rule-2)" stroke-width="1.5" />
            <circle cx="15" cy="18" r="5" fill="none" stroke="var(--accent)" stroke-width="1.8" />
            <line x1="19.5" y1="20.5" x2="27" y2="28" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" />
            <line x1="24" y1="25" x2="26" y2="23" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <div>
            <h2 class="font-serif font-normal text-[22px] tracking-[-0.015em] m-0 leading-tight">
              Recovery passport
            </h2>
            <p class="text-[13.5px] text-ink-2 mt-1 m-0">
              Scan this QR code on a new device to link your account.
            </p>
          </div>
        </div>

        <!-- QR code available -->
        <div v-if="qrDataUrl" class="flex flex-col items-center gap-5">
          <div
            class="rounded-2xl overflow-hidden border border-rule p-3 bg-white"
            style="width: fit-content"
          >
            <img :src="qrDataUrl" alt="Recovery QR code" width="280" height="280" class="block" />
          </div>

          <!-- Privacy notice -->
          <div
            class="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] text-ink-2 w-full"
            style="border-color: var(--color-rule-2); background: var(--color-bg-tint)"
          >
            <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-px" style="color: var(--accent-deep)" aria-hidden="true">
              <path d="M8 2L14.5 13.5H1.5L8 2Z" />
              <line x1="8" y1="7" x2="8" y2="9.5" />
              <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
            </svg>
            <span>Keep this private — anyone with this code can link your account to their device.</span>
          </div>

          <!-- Copy button + confirmation -->
          <div class="flex items-center gap-3 flex-wrap self-start">
            <button
              type="button"
              class="btn-ghost text-[13.5px]"
              @click="copyCode"
            >
              Copy recovery code
            </button>
            <Transition
              enter-from-class="opacity-0 translate-y-1"
              leave-to-class="opacity-0"
              enter-active-class="transition-[opacity,transform] duration-300 ease-out"
              leave-active-class="transition-opacity duration-200 ease-in"
            >
              <span
                v-if="codeCopied"
                class="font-mono text-[11px] tracking-[0.14em] uppercase"
                style="color: var(--color-ok)"
              >
                ✓ Copied
              </span>
            </Transition>
          </div>
        </div>

        <!-- Passport not yet generated -->
        <div
          v-else
          class="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] text-ink-2"
          style="border-color: var(--color-rule-2); background: var(--color-bg-tint)"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-px" style="color: var(--color-ink-3)" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <line x1="8" y1="5.5" x2="8" y2="8.5" />
            <circle cx="8" cy="10.5" r="0.5" fill="currentColor" />
          </svg>
          <span>Complete your first voyage to generate your recovery passport.</span>
        </div>

        <!-- Link a different account -->
        <div class="border-t border-rule mt-5 pt-5">
          <p class="text-[13px] text-ink-2 m-0">
            Need to switch to a different account?
            <button
              type="button"
              class="text-ink-2 underline underline-offset-2 cursor-pointer hover:text-ink transition-colors"
              @click="showLinkModal = true"
            >Link it here</button>
          </p>
        </div>
      </section>

      <!-- Link account modal (accessible from profile page to allow account switching) -->
      <Transition
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
        enter-active-class="transition-opacity duration-200 ease-out"
        leave-active-class="transition-opacity duration-150 ease-in"
      >
        <LinkAccountModal v-if="showLinkModal" @close="showLinkModal = false" />
      </Transition>

      <!-- ── Achievements ────────────────────────────────────────────────────── -->
      <section
        class="rounded-[18px] border border-rule bg-paper px-6 py-6 mb-5"
        :style="{ boxShadow: 'var(--shadow-sm)' }"
      >
        <div class="flex items-start gap-3 mb-5">
          <!-- Trophy icon -->
          <svg viewBox="0 0 40 40" width="32" height="32" class="shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--color-rule-2)" stroke-width="1.5" />
            <path d="M14 11h12v9a6 6 0 0 1-12 0z" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round" />
            <path d="M14 15H10a3 3 0 0 0 4 5" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" />
            <path d="M26 15h4a3 3 0 0 1-4 5" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" />
            <line x1="20" y1="26" x2="20" y2="30" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" />
            <line x1="16" y1="30" x2="24" y2="30" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <div>
            <div class="flex items-baseline gap-2">
              <h2 class="font-serif font-normal text-[22px] tracking-[-0.015em] m-0 leading-tight">
                Achievements
              </h2>
              <span class="font-mono text-[11px] tracking-[0.1em] text-ink-3">{{ achievements.length }}/{{ ACHIEVEMENTS.length }}</span>
            </div>
            <p class="text-[13.5px] text-ink-2 mt-1 m-0">
              Honours earned on your voyages.
            </p>
          </div>
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

      <!-- ── Danger zone ────────────────────────────────────────────────────── -->
      <section
        class="rounded-[18px] border px-6 py-6"
        style="border-color: var(--color-bad); background: var(--color-bad-soft); box-shadow: var(--shadow-sm)"
      >
        <div class="flex items-start gap-3 mb-4">
          <svg viewBox="0 0 40 40" width="32" height="32" class="shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--color-bad)" stroke-width="1.5" opacity="0.6" />
            <line x1="20" y1="11" x2="20" y2="22" stroke="var(--color-bad)" stroke-width="2.2" stroke-linecap="round" />
            <circle cx="20" cy="27.5" r="1.4" fill="var(--color-bad)" />
          </svg>
          <div>
            <h2
              class="font-serif font-normal text-[22px] tracking-[-0.015em] m-0 leading-tight"
              style="color: var(--color-bad)"
            >
              Abandon the voyage
            </h2>
            <p class="text-[13.5px] text-ink-2 mt-1 m-0">
              Erase this traveller from the device entirely.
            </p>
          </div>
        </div>

        <div
          class="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] text-ink-2 mb-5"
          style="border-color: var(--color-bad); background: oklch(from var(--color-bad) l c h / 0.08)"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-px" style="color: var(--color-bad)" aria-hidden="true">
            <path d="M8 2L14.5 13.5H1.5L8 2Z" />
            <line x1="8" y1="7" x2="8" y2="9.5" />
            <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
          </svg>
          <span>
            Your leaderboard entries will remain on the server, but you will no longer be able to access this account.
            This device will be treated as a new traveller.
          </span>
        </div>

        <button
          v-if="!showDelete"
          class="font-sans text-[13.5px] font-medium px-5 py-2.5 rounded-full border transition-[0.18s] cursor-pointer"
          style="border-color: var(--color-bad); color: var(--color-bad); background: transparent"
          @click="showDelete = true; confirmText = ''"
        >
          Delete this profile…
        </button>

        <!-- Confirm panel -->
        <Transition
          enter-from-class="opacity-0 translate-y-1"
          leave-to-class="opacity-0 -translate-y-1"
          enter-active-class="transition-[opacity,transform] duration-200 ease-out"
          leave-active-class="transition-[opacity,transform] duration-150 ease-in"
        >
          <div v-if="showDelete" class="flex flex-col gap-3.5">
            <label class="flex flex-col gap-2">
              <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">
                Type <strong class="font-semibold" style="color: var(--color-bad)">{{ profile.name }}</strong> to confirm
              </span>
              <input
                v-model="confirmText"
                type="text"
                :placeholder="profile.name"
                class="font-serif italic text-[22px] py-2 bg-transparent border-0
                       border-b-[1.5px] text-ink outline-none
                       transition-[border-color] duration-200"
                style="border-color: var(--color-bad)"
                autocomplete="off"
              />
            </label>

            <div class="flex gap-3 flex-wrap">
              <button
                class="font-sans text-[13.5px] font-medium px-5 py-2.5 rounded-full border transition-[0.18s] cursor-pointer"
                style="border-color: var(--color-bad); background: var(--color-bad); color: white"
                :disabled="confirmText !== profile.name"
                :style="confirmText !== profile.name ? 'opacity:0.35;cursor:not-allowed' : ''"
                @click="deleteProfile"
              >
                Confirm — abandon voyage
              </button>
              <button
                class="btn-ghost text-[13.5px]"
                @click="showDelete = false; confirmText = ''"
              >
                Cancel
              </button>
            </div>
          </div>
        </Transition>
      </section>

    </div>
  </main>
</template>
