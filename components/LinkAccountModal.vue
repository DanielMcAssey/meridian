<script setup lang="ts">
import { BrowserQRCodeReader } from '@zxing/browser'

const emit = defineEmits<{
  close: []
}>()

const userId       = useUserId()
const recoveryCode = useRecoveryCode()
const profile      = useProfileStore()

type Tab = 'scan' | 'paste'
const tab         = ref<Tab>('scan')
const pasteInput  = ref('')
const errorMsg    = ref('')
const linking     = ref(false)
const videoRef    = ref<HTMLVideoElement | null>(null)

let reader: BrowserQRCodeReader | null = null
let stopScan: (() => void) | null = null

async function startScanner() {
  if (!videoRef.value) return
  errorMsg.value = ''
  try {
    reader = new BrowserQRCodeReader()
    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      videoRef.value,
      (result, err) => {
        if (result) handleCode(result.getText())
        if (err && (err as Error).name !== 'NotFoundException') {
          errorMsg.value = 'Camera error — try pasting your code instead.'
        }
      },
    )
    stopScan = () => controls.stop()
  } catch {
    errorMsg.value = 'Camera unavailable — try pasting your code instead.'
  }
}

function stopScanner() {
  stopScan?.()
  stopScan = null
  reader = null
}

watch(tab, (t) => {
  if (t === 'scan') {
    nextTick(startScanner)
  } else {
    stopScanner()
  }
})

onMounted(() => {
  if (tab.value === 'scan') nextTick(startScanner)
})

onUnmounted(stopScanner)

function parseCode(raw: string): { uid: string; rc: string } | null {
  try {
    const url    = new URL(raw)
    const uid    = url.searchParams.get('uid')
    const rc     = url.searchParams.get('rc')
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uid && rc && uuidRe.test(uid) && uuidRe.test(rc)) return { uid, rc }
  } catch { /* not a valid URL */ }
  return null
}

async function handleCode(raw: string) {
  if (linking.value) return
  stopScanner()

  const parsed = parseCode(raw)
  if (!parsed) {
    errorMsg.value = 'Invalid recovery code format. Please try again.'
    if (tab.value === 'scan') nextTick(startScanner)
    return
  }

  linking.value = true
  errorMsg.value = ''

  try {
    const res = await $fetch<{ name: string }>('/api/account/link', {
      method: 'POST',
      body: { userId: parsed.uid, recoveryCode: parsed.rc },
    })

    // Adopt the linked identity
    userId.value       = parsed.uid
    recoveryCode.value = parsed.rc
    profile.setName(res.name)

    navigateTo('/menu')
    emit('close')
  } catch (err: unknown) {
    linking.value = false
    const status = (err as { statusCode?: number })?.statusCode
    errorMsg.value = status === 401
      ? 'Recovery code not recognised. Double-check and try again.'
      : 'Something went wrong — please try again.'
    if (tab.value === 'scan') nextTick(startScanner)
  }
}

function submitPaste() {
  handleCode(pasteInput.value.trim())
}

function close() {
  stopScanner()
  emit('close')
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style="background: oklch(from var(--color-ink) l c h / 0.55)"
    @click.self="close"
  >
    <!-- Card -->
    <div
      class="relative w-full max-w-sm rounded-[22px] border border-rule bg-paper px-6 py-7 flex flex-col gap-5"
      :style="{ boxShadow: 'var(--shadow-lg, 0 24px 64px oklch(0 0 0 / 0.22))' }"
    >
      <!-- Header -->
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="eyebrow">Account recovery</span>
          <h2 class="font-serif font-normal text-[22px] tracking-[-0.015em] mt-1 leading-tight">
            Link existing account
          </h2>
        </div>
        <button
          type="button"
          class="shrink-0 mt-1 w-8 h-8 flex items-center justify-center rounded-full
                 border border-rule text-ink-2 hover:text-ink transition-colors cursor-pointer"
          aria-label="Close"
          @click="close"
        >
          <svg viewBox="0 0 14 14" width="12" height="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
          </svg>
        </button>
      </div>

      <!-- Tab switcher -->
      <div class="flex rounded-xl border border-rule overflow-hidden text-[13px] font-medium">
        <button
          type="button"
          class="flex-1 py-2 transition-colors cursor-pointer"
          :class="tab === 'scan'
            ? 'bg-[var(--accent)] text-white'
            : 'text-ink-2 hover:text-ink'"
          @click="tab = 'scan'"
        >
          Scan QR code
        </button>
        <button
          type="button"
          class="flex-1 py-2 transition-colors cursor-pointer"
          :class="tab === 'paste'
            ? 'bg-[var(--accent)] text-white'
            : 'text-ink-2 hover:text-ink'"
          @click="tab = 'paste'"
        >
          Paste code
        </button>
      </div>

      <!-- Scan tab -->
      <div v-if="tab === 'scan'" class="flex flex-col gap-3">
        <p class="text-[13px] text-ink-2">
          Open the profile page on your other device and point its screen at the camera.
        </p>
        <div class="relative rounded-2xl overflow-hidden bg-black aspect-square w-full">
          <video
            ref="videoRef"
            class="absolute inset-0 w-full h-full object-cover"
            autoplay
            muted
            playsinline
          />
          <!-- Corner guides -->
          <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
              <path d="M10 22 L10 10 L22 10" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.8" />
              <path d="M78 10 L90 10 L90 22" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.8" />
              <path d="M10 78 L10 90 L22 90" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.8" />
              <path d="M78 90 L90 90 L90 78" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.8" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Paste tab -->
      <div v-else class="flex flex-col gap-3">
        <p class="text-[13px] text-ink-2">
          Copy your recovery code from the profile page and paste it here.
        </p>
        <label class="flex flex-col gap-2">
          <span class="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-3">Recovery code</span>
          <input
            v-model="pasteInput"
            type="text"
            placeholder="meridian://link?uid=…&rc=…"
            class="font-mono text-[12px] py-2.5 px-3 bg-transparent rounded-xl
                   border border-rule text-ink outline-none
                   transition-[border-color] duration-200 focus:border-[var(--accent)]"
            autocomplete="off"
            spellcheck="false"
            @keydown.enter.prevent="submitPaste"
          />
        </label>
        <button
          type="button"
          class="btn-primary self-start"
          :disabled="!pasteInput.trim() || linking"
          @click="submitPaste"
        >
          {{ linking ? 'Linking…' : 'Link account' }}
        </button>
      </div>

      <!-- Error message -->
      <Transition
        enter-from-class="opacity-0 translate-y-1"
        leave-to-class="opacity-0"
        enter-active-class="transition-[opacity,transform] duration-200 ease-out"
        leave-active-class="transition-opacity duration-150 ease-in"
      >
        <div
          v-if="errorMsg"
          class="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px]"
          style="border-color: var(--color-bad); color: var(--color-bad); background: oklch(from var(--color-bad) l c h / 0.08)"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-px" aria-hidden="true">
            <path d="M8 2L14.5 13.5H1.5L8 2Z" />
            <line x1="8" y1="7" x2="8" y2="9.5" />
            <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
          </svg>
          <span>{{ errorMsg }}</span>
        </div>
      </Transition>

      <!-- Linking spinner -->
      <Transition
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150"
      >
        <div v-if="linking" class="flex items-center justify-center gap-2 text-[13px] text-ink-2">
          <svg class="animate-spin" viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-dasharray="32" stroke-dashoffset="12" stroke-linecap="round" />
          </svg>
          Verifying…
        </div>
      </Transition>
    </div>
  </div>
</template>
