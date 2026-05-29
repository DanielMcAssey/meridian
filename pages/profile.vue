<script setup lang="ts">
import { MAX_NAME_LENGTH } from '~/config/game'
import { sanitizeName } from '~/stores/profile'

definePageMeta({ ssr: false })

const profile = useProfileStore()

const nameInput   = ref(profile.name)
const nameSaved   = ref(false)
const showDelete  = ref(false)
const confirmText = ref('')

onMounted(() => {
  if (!profile.name) navigateTo('/')
})

function saveName() {
  if (sanitizeName(nameInput.value) === profile.name) return
  if (!profile.setName(nameInput.value)) return
  nameInput.value = profile.name  // reflect any sanitization back into the field
  nameSaved.value = true
  setTimeout(() => { nameSaved.value = false }, 2800)
}

function deleteProfile() {
  profile.deleteProfile()
  navigateTo('/')
}
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
      <p class="text-[15px] text-ink-2 mb-10">
        Manage your identity in the manifest of explorers.
      </p>

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

          <!-- Warning -->
          <div
            class="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] text-ink-2"
            style="border-color: var(--color-rule-2); background: var(--color-bg-tint)"
          >
            <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-px" style="color: var(--accent-deep)" aria-hidden="true">
              <path d="M8 2L14.5 13.5H1.5L8 2Z" />
              <line x1="8" y1="7" x2="8" y2="9.5" />
              <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
            </svg>
            <span>
              Previous leaderboard entries will retain your old name — only new scores will appear under the updated one.
            </span>
          </div>

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
