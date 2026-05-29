/**
 * Singleton compass composable — driven by DeviceOrientationEvent when available.
 * compassRotation is a CSS-ready angle in degrees (null when no sensor data).
 *
 * Handles:
 *  - iOS 13+: requests permission on first user gesture (required by Safari)
 *  - Android: uses deviceorientationabsolute for true-north heading
 *  - Angle continuity: tracks a running total so CSS transitions never wrap 0↔360
 */

const compassRotation = ref<number | null>(null)

let consumers = 0
let hasAbsolute = false   // true once we receive an absolute event (prefer over relative)
let continuous = 0        // running angle sum (avoids CSS transition wrap-around)
let hasFirst = false      // whether we've seeded `continuous`

function applyRaw(raw: number) {
  if (!hasFirst) {
    continuous = raw
    hasFirst = true
  } else {
    // Clamp delta to [-180, 180] so we always take the short arc
    let delta = raw - (continuous % 360)
    if (delta > 180)  delta -= 360
    if (delta < -180) delta += 360
    continuous += delta
  }
  compassRotation.value = continuous
}

function onEvent(e: DeviceOrientationEvent) {
  // Once we receive an absolute event, ignore relative ones
  if (!e.absolute && hasAbsolute) return
  if (e.absolute) hasAbsolute = true

  // iOS provides webkitCompassHeading (0 = N, CW) — negate for CSS rotate()
  const ios = (e as any).webkitCompassHeading as number | undefined
  if (typeof ios === 'number' && !isNaN(ios)) {
    applyRaw(-ios)
    return
  }

  // Android absolute: alpha=0 means North; rotating CW increases alpha in MDN's model,
  // so alpha maps directly to a CSS clockwise rotation.
  if (e.absolute && e.alpha !== null) {
    applyRaw(e.alpha)
  }
}

function attachListeners() {
  window.addEventListener('deviceorientationabsolute', onEvent as EventListener)
  window.addEventListener('deviceorientation',         onEvent as EventListener)
}

async function start() {
  if (typeof window === 'undefined') return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DOE = DeviceOrientationEvent as any

  if (typeof DOE.requestPermission === 'function') {
    // iOS 13+: permission must be requested from a user gesture
    document.addEventListener('click', async function ask() {
      document.removeEventListener('click', ask, true)
      try {
        if (await DOE.requestPermission() === 'granted') attachListeners()
      } catch {}
    }, { capture: true, once: true })
  } else {
    attachListeners()
  }
}

function stop() {
  window.removeEventListener('deviceorientationabsolute', onEvent as EventListener)
  window.removeEventListener('deviceorientation',         onEvent as EventListener)
  compassRotation.value = null
  hasAbsolute = false
  hasFirst    = false
}

export function useCompass() {
  onMounted(()   => { if (consumers++ === 0) start() })
  onUnmounted(() => { if (--consumers  === 0) stop()  })
  return { compassRotation }
}
