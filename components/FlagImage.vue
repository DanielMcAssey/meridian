<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ code: string }>()
const atlas = useAtlasStore()
</script>

<template>
  <img
    v-if="atlas.flagPaths[code]"
    v-bind="$attrs"
    :src="atlas.flagPaths[code]"
    loading="lazy"
    :draggable="false"
  />
  <div v-else v-bind="$attrs" />
</template>
