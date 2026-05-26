<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { Country } from '~/types/game'

const props = withDefaults(
  defineProps<{
    mode?: 'static' | 'click'
    pinCode?: string | null
    revealCode?: string | null
    selectedCode?: string | null
  }>(),
  {
    mode: 'static',
    pinCode: null,
    revealCode: null,
    selectedCode: null,
  },
)

const emit = defineEmits<{
  pick: [country: Country]
}>()

const atlas = useAtlasStore()

// ── viewBox state ──────────────────────────────────────────────────────────

interface VbState {
  x: number
  y: number
  w: number
  h: number
}

const vb0 = computed<VbState>(() => {
  if (!atlas.viewBox) return { x: 30.767, y: 241.591, w: 784.077, h: 458.627 }
  const [x, y, w, h] = atlas.viewBox.split(/\s+/).map(parseFloat)
  return { x, y, w, h }
})

const vb = reactive<VbState>({ x: 30.767, y: 241.591, w: 784.077, h: 458.627 })

// Sync when atlas loads (viewBox is read once)
watch(
  () => atlas.viewBox,
  () => Object.assign(vb, vb0.value),
  { immediate: true },
)

// Reset zoom when the target country changes
watch([() => props.pinCode, () => props.revealCode], () => {
  Object.assign(vb, vb0.value)
})

// ── derived data ──────────────────────────────────────────────────────────

const byCode = computed<Record<string, Country>>(() => {
  const m: Record<string, Country> = {}
  for (const c of atlas.countries) m[c.code] = c
  return m
})

const codes = computed(() => Object.keys(atlas.countryPaths))
const pin = computed(() => (props.pinCode ? byCode.value[props.pinCode] ?? null : null))
const reveal = computed(() => (props.revealCode ? byCode.value[props.revealCode] ?? null : null))

// ── clamp / zoom helpers ──────────────────────────────────────────────────

function clamp(next: VbState, base?: VbState): VbState {
  const b = base ?? vb0.value
  const minW = b.w / 12
  const maxW = b.w
  if (next.w > maxW) next.w = maxW
  if (next.w < minW) next.w = minW
  next.h = next.w * (b.h / b.w)
  if (next.x < b.x) next.x = b.x
  if (next.y < b.y) next.y = b.y
  if (next.x + next.w > b.x + b.w) next.x = b.x + b.w - next.w
  if (next.y + next.h > b.y + b.h) next.y = b.y + b.h - next.h
  return next
}

const wrapRef = ref<HTMLElement | null>(null)

function zoomAtClient(clientX: number, clientY: number, factor: number) {
  const el = wrapRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const px = (clientX - rect.left) / rect.width
  const py = (clientY - rect.top) / rect.height
  const newW = vb.w / factor
  const newH = vb.h / factor
  const cx = vb.x + px * vb.w
  const cy = vb.y + py * vb.h
  const next = clamp({ x: cx - px * newW, y: cy - py * newH, w: newW, h: newH })
  Object.assign(vb, next)
}

// ── native event listeners (wheel + drag) ────────────────────────────────
// We attach these natively (not via Vue bindings) so:
//   - wheel can call preventDefault (passive: false)
//   - pointermove is on window, not the element

let drag: { startX: number; startY: number; vb: VbState } | null = null
let moved = false

let cleanupListeners: (() => void) | null = null

onMounted(() => {
  const el = wrapRef.value
  if (!el) return

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const factor = Math.exp(-e.deltaY * 0.0025)
    zoomAtClient(e.clientX, e.clientY, factor)
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    if ((e.target as Element).closest('.map-hud')) return
    moved = false
    drag = { startX: e.clientX, startY: e.clientY, vb: { ...vb } }

    const onPointerMove = (ev: PointerEvent) => {
      if (!drag) return
      const dx = ev.clientX - drag.startX
      const dy = ev.clientY - drag.startY
      if (!moved && Math.abs(dx) + Math.abs(dy) > 5) moved = true
      if (!moved) return
      const rect = el.getBoundingClientRect()
      const scaleX = drag.vb.w / rect.width
      const scaleY = drag.vb.h / rect.height
      const next = clamp({
        x: drag.vb.x - dx * scaleX,
        y: drag.vb.y - dy * scaleY,
        w: drag.vb.w,
        h: drag.vb.h,
      })
      Object.assign(vb, next)
    }

    const onPointerUp = () => {
      drag = null
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      // Let the click handler read `moved` before we clear it
      setTimeout(() => {
        moved = false
      }, 0)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('pointerdown', onPointerDown)

  cleanupListeners = () => {
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('pointerdown', onPointerDown)
  }
})

onUnmounted(() => {
  cleanupListeners?.()
})

// ── click handler ────────────────────────────────────────────────────────

function handlePathClick(code: string) {
  if (props.mode !== 'click') return
  if (moved) return
  const country = byCode.value[code]
  if (country) emit('pick', country)
}

function classFor(code: string): string {
  if (code === props.revealCode) return 'country country-reveal'
  if (code === props.selectedCode && props.selectedCode !== props.revealCode)
    return 'country country-wrong'
  return 'country'
}

// ── zoom level display ──────────────────────────────────────────────────

const zoomLevel = computed(() => vb0.value.w / vb.w)
const canZoomIn = computed(() => zoomLevel.value < 12)
const canZoomOut = computed(() => zoomLevel.value > 1.01)

function zoomCenter(factor: number) {
  const el = wrapRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  zoomAtClient(rect.left + rect.width / 2, rect.top + rect.height / 2, factor)
}
</script>

<template>
  <div
    ref="wrapRef"
    class="worldmap-wrap"
    :data-mode="mode"
    style="touch-action: none"
  >
    <svg
      :viewBox="`${vb.x} ${vb.y} ${vb.w} ${vb.h}`"
      class="worldmap-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="-1000" y="-1000" width="4000" height="4000" class="ocean" />
      <g class="countries">
        <path
          v-for="code in codes"
          :key="code"
          :d="atlas.countryPaths[code]"
          :class="classFor(code)"
          @click="handlePathClick(code)"
        />
      </g>

      <!-- Reveal marker (pulsing halo) -->
      <g
        v-if="reveal"
        class="reveal-marker"
        :transform="`translate(${reveal.svgCx},${reveal.svgCy})`"
      >
        <circle r="14" class="reveal-halo-outer" />
        <circle r="6" class="reveal-halo-inner" />
      </g>

      <!-- Pin -->
      <g
        v-if="pin"
        class="pin"
        :transform="`translate(${pin.svgCx},${pin.svgCy})`"
      >
        <circle r="9" class="pin-ring" />
        <line x1="0" y1="0" x2="0" y2="-22" class="pin-stem" />
        <circle cx="0" cy="-22" r="4.5" class="pin-head" />
        <circle cx="0" cy="-22" r="1.5" class="pin-dot" />
        <circle r="1.6" class="pin-base" />
      </g>
    </svg>

    <!-- HUD controls -->
    <div class="map-hud">
      <button
        class="hud-btn"
        :disabled="!canZoomIn"
        title="Zoom in"
        @click="zoomCenter(1.4)"
      >+</button>
      <button
        class="hud-btn"
        :disabled="!canZoomOut"
        title="Zoom out"
        @click="zoomCenter(1 / 1.4)"
      >−</button>
      <button
        class="hud-btn hud-btn-reset"
        :disabled="!canZoomOut"
        title="Reset"
        @click="Object.assign(vb, vb0)"
      >↺</button>
      <span class="hud-zoom">{{ zoomLevel.toFixed(1) }}×</span>
    </div>
  </div>
</template>
