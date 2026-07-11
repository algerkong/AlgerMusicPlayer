<template>
  <div v-if="isPlay && !isMobile" class="bottom" :style="{ height }"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { usePlayerStore } from '@/store/modules/player';
import { isMobile } from '@/utils';

const playerStore = usePlayerStore();
const isPlay = computed(() => {
  const m = playerStore.playMusic as any;
  return !!(m && (m.id || m.playMusicUrl || playerStore.playMusicUrl));
});

defineProps({
  height: {
    type: String,
    default: undefined
  }
});
</script>

<style lang="scss" scoped>
.bottom {
  @apply h-28;
}
</style>
