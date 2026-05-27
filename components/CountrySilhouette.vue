<script setup lang="ts">
const props = defineProps<{ path: string }>()

const svgEl  = ref<SVGSVGElement | null>(null)
const viewBox = ref('0 0 100 100')
const visible = ref(false)

onMounted(() => {
  const el = svgEl.value
  if (!el) return
  const pathEl = el.querySelector('path')
  if (!pathEl) return

  const b = pathEl.getBBox()
  if (b.width < 1 || b.height < 1) return

  // Pad by 12 % of the smaller dimension so the shape never touches the edge.
  const pad = Math.max(Math.min(b.width, b.height) * 0.12, 4)
  viewBox.value = `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`
  visible.value = true
})
</script>

<template>
  <!--
    Initially invisible so there is no jump from the default viewBox
    to the computed one. Once getBBox is done, opacity transitions in.
  -->
  <svg
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
