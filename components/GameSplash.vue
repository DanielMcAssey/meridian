<script setup lang="ts">
const atlas = useAtlasStore()
</script>

<template>
  <main class="screen flex items-center justify-center min-h-[50vh]">
    <div class="flex flex-col items-center gap-5">
      <template v-if="atlas.error">
        <p class="font-serif italic text-2xl" style="color: var(--color-bad)">
          Failed to load atlas data. Please refresh.
        </p>
      </template>
      <template v-else>
        <div
          class="w-10 h-10 rounded-full border-2 border-rule border-t-[var(--accent)]"
          style="animation: spin 0.8s linear infinite"
        />
        <p class="font-serif italic text-2xl text-ink-3">Loading the atlas…</p>
      </template>
    </div>
  </main>
</template>
