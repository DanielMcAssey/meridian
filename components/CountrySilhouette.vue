<script setup lang="ts">
const props = defineProps<{ path: string; src?: string }>()

const svgEl   = ref<SVGSVGElement | null>(null)
const viewBox = ref('0 0 100 100')
const visible = ref(false)

// Reset when the displayed country changes.
watch([() => props.src, () => props.path], () => { visible.value = false })

onMounted(() => {
  if (props.src) return // <img> path — visibility set by @load
  const el = svgEl.value
  if (!el) return
  const pathEl = el.querySelector('path')
  if (!pathEl) return

  const b = pathEl.getBBox()
  if (b.width < 1 || b.height < 1) return

  const pad = Math.max(Math.min(b.width, b.height) * 0.12, 4)
  viewBox.value = `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`
  visible.value = true
})
</script>

<template>
  <!-- High-quality external SVG (preferred) -->
  <img
    v-if="src"
    :src="src"
    class="silhouette-img silhouette-svg"
    :style="visible ? 'opacity:1' : 'opacity:0'"
    alt=""
    @load="visible = true"
  />
  <!-- Inline SVG path (fallback for countries without a shape file) -->
  <svg
    v-else
    ref="svgEl"
    :viewBox="viewBox"
    class="silhouette-svg"
    :style="visible ? 'opacity:1' : 'opacity:0'"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
  >
    <path :d="props.path" class="silhouette-path" />
  </svg>
</template>
