<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { Country } from '~/types/game'
import { PIN_MAP_ZOOM } from '~/config/game'

const props = withDefaults(
  defineProps<{
    mode?: 'static' | 'click'
    pinCode?: string | null
    revealCode?: string | null
    selectedCode?: string | null
    heightClass?: string
    /** When true the wrapper grows via flex-1 and the SVG fills it 100% (for Cartographer) */
    fillParent?: boolean
  }>(),
  {
    mode: 'static',
    pinCode: null,
    revealCode: null,
    selectedCode: null,
    heightClass: 'max-h-[55vh] sm:max-h-[72vh]',
    fillParent: false,
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
  const parts = atlas.viewBox.split(/\s+/).map(parseFloat)
  return {
    x: parts[0] ?? 30.767,
    y: parts[1] ?? 241.591,
    w: parts[2] ?? 784.077,
    h: parts[3] ?? 458.627,
  }
})

const vb = reactive<VbState>({ x: 30.767, y: 241.591, w: 784.077, h: 458.627 })

// ── animated viewBox transition ───────────────────────────────────────────

let animFrame: number | null = null

function animateVb(target: VbState, duration = 650) {
  if (animFrame !== null) { cancelAnimationFrame(animFrame); animFrame = null }
  const start = { ...vb }
  const t0 = performance.now()
  function tick() {
    const p = Math.min(1, (performance.now() - t0) / duration)
    const e = 1 - Math.pow(1 - p, 3) // ease-out cubic
    vb.x = start.x + (target.x - start.x) * e
    vb.y = start.y + (target.y - start.y) * e
    vb.w = start.w + (target.w - start.w) * e
    vb.h = start.h + (target.h - start.h) * e
    if (p < 1) animFrame = requestAnimationFrame(tick)
    else animFrame = null
  }
  animFrame = requestAnimationFrame(tick)
}

function cancelAnim() {
  if (animFrame !== null) { cancelAnimationFrame(animFrame); animFrame = null }
}

// ── derived data ──────────────────────────────────────────────────────────

const byCode = computed<Record<string, Country>>(() => {
  const m: Record<string, Country> = {}
  for (const c of atlas.countries) m[c.code] = c
  return m
})

const codes = computed(() => Object.keys(atlas.countryPaths))
const pin   = computed(() => (props.pinCode ? byCode.value[props.pinCode] ?? null : null))

// ── viewBox watchers ──────────────────────────────────────────────────────

// Keep vb in sync when the atlas first loads (non-pin views reset to full map).
watch(
  () => atlas.viewBox,
  () => { if (!props.pinCode) Object.assign(vb, vb0.value) },
  { immediate: true },
)

// Zoom to pin when pinCode changes or when the atlas finishes loading with a pin set.
// revealCode changes are intentionally excluded — the country highlight is already
// in view, so there is no reason to reset the viewBox on lock.
watch(
  [() => props.pinCode, () => atlas.ready],
  ([code, ready]) => {
    if (code && ready) {
      const country = byCode.value[code]
      if (country) {
        const newW = vb0.value.w / PIN_MAP_ZOOM
        const newH = vb0.value.h / PIN_MAP_ZOOM
        animateVb(clamp({
          x: country.svgCx - newW / 2,
          y: country.svgCy - newH / 2,
          w: newW,
          h: newH,
        }))
        return
      }
    }
    if (!code) Object.assign(vb, vb0.value)
  },
  { immediate: true },
)

// ── clamp / zoom helpers ──────────────────────────────────────────────────

function clamp(next: VbState, base?: VbState): VbState {
  const b = base ?? vb0.value
  const minW = b.w / 12
  const maxW = b.w
  if (next.w > maxW) next.w = maxW
  if (next.w < minW) next.w = minW
  next.h = next.w * (b.h / b.w)
  // Horizontal: allow half a viewport-width of overscroll so edge countries can be centred.
  const hOver = next.w / 2
  if (next.x < b.x - hOver) next.x = b.x - hOver
  if (next.x + next.w > b.x + b.w + hOver) next.x = b.x + b.w - next.w + hOver
  if (next.y < b.y) next.y = b.y
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
  const b = vb0.value
  // Clamp newW before deriving x/y so position stays stable at zoom limits.
  const newW = Math.min(b.w, Math.max(b.w / 12, vb.w / factor))
  const newH = newW * (b.h / b.w)
  const cx = vb.x + px * vb.w
  const cy = vb.y + py * vb.h
  const next = clamp({ x: cx - px * newW, y: cy - py * newH, w: newW, h: newH })
  Object.assign(vb, next)
}

// ── native event listeners (wheel + drag + pinch-to-zoom) ────────────────

// All currently active pointers keyed by pointerId.
const activePointers = new Map<number, { x: number; y: number }>()
let lastPinchDist = 0
let drag: { startX: number; startY: number; vb: VbState } | null = null
let moved = false
let pointerDownTarget: Element | null = null
let cleanupListeners: (() => void) | null = null

function pinchDist() {
  const pts = [...activePointers.values()]
  const a = pts[0]!, b = pts[1]!
  return Math.hypot(b.x - a.x, b.y - a.y)
}
function pinchMid() {
  const pts = [...activePointers.values()]
  const a = pts[0]!, b = pts[1]!
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

onMounted(() => {
  const el = wrapRef.value
  if (!el) return

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const factor = Math.exp(-e.deltaY * 0.0025)
    zoomAtClient(e.clientX, e.clientY, factor)
  }

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as Element).closest('.map-hud')) return
    cancelAnim()
    // Capture so move/up events keep firing even when the finger leaves the element.
    el.setPointerCapture(e.pointerId)
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.size === 2) {
      // Second finger down — switch to pinch mode, cancel any drag.
      lastPinchDist = pinchDist()
      drag = null
      moved = true   // prevents a spurious click when fingers lift
      return
    }

    // First finger / mouse button down — prepare drag.
    if (e.button !== 0 && e.pointerType === 'mouse') return
    pointerDownTarget = e.target as Element  // record before capture remaps events
    moved = false
    drag = { startX: e.clientX, startY: e.clientY, vb: { ...vb } }
  }

  const onPointerMove = (e: PointerEvent) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.size >= 2) {
      // ── Pinch zoom ──────────────────────────────────────────────────────
      const dist = pinchDist()
      if (lastPinchDist > 0) {
        const factor = dist / lastPinchDist
        const mid = pinchMid()
        zoomAtClient(mid.x, mid.y, factor)
      }
      lastPinchDist = dist
      return
    }

    // ── Single-pointer drag ─────────────────────────────────────────────
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (!moved && Math.abs(dx) + Math.abs(dy) > 5) moved = true
    if (!moved) return
    const rect = el.getBoundingClientRect()
    const scaleX = drag.vb.w / rect.width
    const scaleY = drag.vb.h / rect.height
    Object.assign(vb, clamp({
      x: drag.vb.x - dx * scaleX,
      y: drag.vb.y - dy * scaleY,
      w: drag.vb.w,
      h: drag.vb.h,
    }))
  }

  const onPointerUp = (e: PointerEvent) => {
    activePointers.delete(e.pointerId)
    if (activePointers.size < 2) lastPinchDist = 0
    if (activePointers.size === 0) {
      // Handle tap-to-pick here instead of via @click on <path> elements.
      // setPointerCapture re-routes the synthetic click event to the wrapper,
      // so @click on child paths never fires. Using the pointerdown target
      // (recorded before capture takes effect) avoids that entirely.
      if (!moved && pointerDownTarget) {
        const path = pointerDownTarget.closest('[data-code]')
        const code = path?.getAttribute('data-code') ?? null
        if (code) handlePathClick(code)
      }
      pointerDownTarget = null
      drag = null
      setTimeout(() => { moved = false }, 0)
    }
  }

  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointercancel', onPointerUp)

  cleanupListeners = () => {
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerUp)
  }
})

onUnmounted(() => {
  cleanupListeners?.()
  cancelAnim()
})

// ── click handler ────────────────────────────────────────────────────────

function handlePathClick(code: string) {
  if (props.mode !== 'click') return
  if (moved) return
  const country = byCode.value[code]
  if (country) emit('pick', country)
}

function classFor(code: string): string {
  if (code === props.pinCode) return 'country country-pin'
  if (code === props.revealCode) return 'country country-reveal'
  if (code === props.selectedCode && props.selectedCode !== props.revealCode)
    return 'country country-wrong'
  return 'country'
}

// ── zoom bounds (used to enable/disable +/- buttons) ─────────────────────

const zoomLevel = computed(() => vb0.value.w / vb.w)
const canZoomIn  = computed(() => zoomLevel.value < 12)
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
    class="worldmap-wrap relative w-full rounded-2xl overflow-hidden
           border border-rule-2 bg-ocean user-select-none
           cursor-grab active:cursor-grabbing"
    :class="[
      { 'cursor-crosshair! active:cursor-crosshair!': mode === 'click' },
      props.fillParent ? 'worldmap-fill sm:flex-1 sm:min-h-0' : '',
    ]"
    :data-mode="mode"
    style="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.02), var(--shadow-sm); touch-action: none"
  >
    <svg
      :viewBox="`${vb.x} ${vb.y} ${vb.w} ${vb.h}`"
      :class="props.fillParent ? 'worldmap-svg' : ['worldmap-svg', props.heightClass]"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="-1000" y="-1000" width="4000" height="4000" class="ocean" />
      <g class="countries">
        <path
          v-for="code in codes"
          :key="code"
          :d="atlas.countryPaths[code]"
          :data-code="code"
          :class="classFor(code)"
        />
      </g>

      <!-- Pin marker — outer g positions at country centroid via SVG attribute,
           inner g carries the CSS drop animation so translateY is relative to
           the country position rather than the SVG origin. -->
      <g v-if="pin" :transform="`translate(${pin.svgCx},${pin.svgCy})`">
        <g class="pin">
          <!-- SMIL drop: values are SVG user units so the animation scales with zoom -->
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,-70; 0,4; 0,0"
            keyTimes="0; 0.75; 1"
            keySplines="0.2 0 0.3 1; 0.4 0 0.6 1"
            calcMode="spline"
            dur="0.55s"
            fill="remove"
          />
          <animate
            attributeName="opacity"
            values="0;1"
            keyTimes="0;0.18"
            dur="0.55s"
            fill="freeze"
          />
          <line x1="0" y1="0" x2="0" y2="-22" class="pin-stem" />
          <circle cx="0" cy="-22" r="4.5" class="pin-head" />
          <circle cx="0" cy="-22" r="1.5" class="pin-dot" />
        </g>
      </g>
    </svg>

    <!-- HUD controls -->
    <div
      class="map-hud absolute top-2.5 right-2.5
             flex flex-col gap-1.5 items-center
             rounded-xl p-1.5 backdrop-blur-md"
      style="background: var(--hud); border: 1px solid var(--hud-border); box-shadow: var(--shadow-sm)"
    >
      <button
        class="w-10 h-10 flex items-center justify-center
               font-mono text-base text-ink rounded-lg border-none bg-transparent
               transition-[0.12s] hover:not-disabled:bg-bg-tint
               disabled:opacity-30 disabled:cursor-default"
        :disabled="!canZoomIn"
        title="Zoom in"
        aria-label="Zoom in"
        @click="zoomCenter(1.4)"
      >+</button>
      <button
        class="w-10 h-10 flex items-center justify-center
               font-mono text-base text-ink rounded-lg border-none bg-transparent
               transition-[0.12s] hover:not-disabled:bg-bg-tint
               disabled:opacity-30 disabled:cursor-default"
        :disabled="!canZoomOut"
        title="Zoom out"
        aria-label="Zoom out"
        @click="zoomCenter(1 / 1.4)"
      >−</button>
    </div>
  </div>
</template>
