<script setup lang="ts">
const atlas = useAtlasStore()
</script>

<template>
  <main class="screen splash">
    <div class="splash-inner">
      <template v-if="atlas.error">
        <div class="splash-text" style="color: var(--bad)">
          Failed to load atlas data. Please refresh.
        </div>
      </template>
      <template v-else>
        <div class="splash-spinner" />
        <div class="splash-text">Loading the atlas…</div>
      </template>
    </div>
  </main>
</template>
