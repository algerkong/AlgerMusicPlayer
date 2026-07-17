<template>
  <!-- 占位高度与播放条 token 一致，避免「内容底 ↔ 播放条」之间多一条透明缝 -->
  <div
    v-if="isPlay && !isMobile"
    class="play-bottom-spacer"
    :style="height ? { height } : undefined"
  ></div>
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
.play-bottom-spacer {
  flex-shrink: 0;
  width: 100%;
  height: var(--play-bar-height, 5rem);
  /* 不要透明洞：跟页面底色走，封面底时也别露花 */
  background: inherit;
}
</style>
