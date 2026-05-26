<script setup lang="ts">
import { DIFFICULTIES } from '~/composables/useGameSettings'
import type { Difficulty } from '~/types/game'

definePageMeta({ ssr: false })

const playerName = useLocalStorage('geo.player.name', '')
const settings = useGameSettings()

// If we already have a name, skip straight to the menu
onMounted(() => {
  if (playerName.value) navigateTo('/menu')
})

const name = ref(playerName.value)
const difficulty = ref<Difficulty>(settings.difficulty.value)
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})

function submit() {
  const n = name.value.trim()
  if (!n) return
  playerName.value = n
  settings.difficulty.value = difficulty.value
  navigateTo('/menu')
}
</script>

<template>
  <main class="screen welcome">
    <!-- Compass art -->
    <div class="welcome-art" aria-hidden="true">
      <svg viewBox="0 0 600 600" class="welcome-compass">
        <defs>
          <radialGradient id="cg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(0,0,0,0)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.06)" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="280" fill="url(#cg)" />
        <circle cx="300" cy="300" r="240" class="rose-ring" />
        <circle cx="300" cy="300" r="180" class="rose-ring" />
        <circle cx="300" cy="300" r="120" class="rose-ring" />
        <line
          v-for="i in 32"
          :key="i"
          :x1="300 + Math.cos(((i - 1) / 32) * Math.PI * 2) * ((i - 1) % 4 === 0 ? 200 : (i - 1) % 2 === 0 ? 230 : 245)"
          :y1="300 + Math.sin(((i - 1) / 32) * Math.PI * 2) * ((i - 1) % 4 === 0 ? 200 : (i - 1) % 2 === 0 ? 230 : 245)"
          :x2="300 + Math.cos(((i - 1) / 32) * Math.PI * 2) * 260"
          :y2="300 + Math.sin(((i - 1) / 32) * Math.PI * 2) * 260"
          class="rose-tick"
        />
        <path d="M300 60 L320 300 L300 540 L280 300 Z" class="rose-needle" />
        <path d="M60 300 L300 280 L540 300 L300 320 Z" class="rose-needle-h" />
        <text x="300" y="46" text-anchor="middle" class="rose-letter">N</text>
        <text x="300" y="568" text-anchor="middle" class="rose-letter">S</text>
        <text x="556" y="308" text-anchor="middle" class="rose-letter">E</text>
        <text x="44" y="308" text-anchor="middle" class="rose-letter">W</text>
      </svg>
    </div>

    <!-- Card -->
    <div class="welcome-card">
      <span class="eyebrow">Volume I · The Atlas</span>
      <h1 class="welcome-title">A wager with the <em>world</em>.</h1>
      <p class="welcome-lede">
        A round of flags, a pin dropped on a far shore, a country to find on the map — your wits
        against every land we know.
      </p>

      <form class="welcome-form" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">Inscribe your name in the manifest</span>
          <input
            ref="inputRef"
            v-model="name"
            class="field-input"
            type="text"
            placeholder="e.g. Captain Aurelia Vance"
            maxlength="28"
          />
        </label>

        <div class="field">
          <span class="field-label">Pick your peril · the wider the world, the harder</span>
          <div class="diff-grid">
            <button
              v-for="d in DIFFICULTIES"
              :key="d.id"
              type="button"
              :class="['diff-card', { 'diff-card-on': difficulty === d.id }]"
              @click="difficulty = d.id"
            >
              <span class="diff-card-label">{{ d.label }}</span>
              <span class="diff-card-note">{{ d.note }}</span>
              <span class="diff-card-count">{{ d.est }} countries</span>
            </button>
          </div>
        </div>

        <button type="submit" class="btn-primary" :disabled="!name.trim()">Set sail →</button>
      </form>

      <div class="welcome-meta">
        <span>Your name &amp; preferences are kept on this device only.</span>
      </div>
    </div>
  </main>
</template>
