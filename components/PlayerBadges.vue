<script setup lang="ts">
import { getBadgesForUser } from '~/config/badges'

const props = defineProps<{
  userId: string | null | undefined
  size?: 'sm' | 'md'
}>()

const badges = computed(() => getBadgesForUser(props.userId))
</script>

<template>
  <span v-if="badges.length" class="inline-flex items-center gap-1.5 flex-wrap">
    <PlayerBadge
      v-for="b in badges"
      :key="b.id"
      :badge="b"
      :size="props.size ?? 'md'"
    />
  </span>
</template>
