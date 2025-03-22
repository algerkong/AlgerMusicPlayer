<template>
  <div v-if="isPlay" class="bottom" :style="{ height }"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { usePlayerStore } from '@/store/modules/player';

const playerStore = usePlayerStore();
const isPlay = computed(() => playerStore.playMusicUrl);

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
