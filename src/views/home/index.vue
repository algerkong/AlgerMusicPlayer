<template>
  <n-scrollbar :size="100" :x-scrollable="false">
    <div class="main-page">
      <!-- 推荐歌手 -->
      <recommend-singer />
      <div class="main-content">
        <!-- 歌单分类列表 -->
        <playlist-type v-if="!isMobile" />
        <!-- 本周最热音乐 -->
        <recommend-songlist />
        <!-- 推荐最新专辑 -->
        <recommend-album />
      </div>
    </div>
  </n-scrollbar>
</template>

<script lang="ts" setup>
import { isMobile } from '@/utils';

const RecommendSinger = defineAsyncComponent(() => import('@/components/RecommendSinger.vue'));
const PlaylistType = defineAsyncComponent(() => import('@/components/PlaylistType.vue'));
const RecommendSonglist = defineAsyncComponent(() => import('@/components/RecommendSonglist.vue'));
const RecommendAlbum = defineAsyncComponent(() => import('@/components/RecommendAlbum.vue'));
defineOptions({
  name: 'Home',
});
</script>

<style lang="scss" scoped>
.main-page {
  @apply h-full w-full overflow-hidden;
}
.main-content {
  @apply mt-6 flex mb-28;
}

.mobile .main-content {
  @apply flex-col mx-4;
}
</style>
