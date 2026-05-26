<script setup lang="ts">
import { ACCENTS } from '~/composables/useGameSettings'

const settings = useGameSettings()

// Apply accent hue + theme to <html> element (client-only — document doesn't exist on server)
onMounted(() => {
  watchEffect(() => {
    const hue = ACCENTS[settings.accent.value]?.hue ?? 30
    document.documentElement.style.setProperty('--accent-h', String(hue))
  })

  watchEffect(() => {
    const theme = settings.theme.value
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
    else if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
  })
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
