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
        <div>
          <favorite-list is-component />
          <recommend-album />
        </div>
      </div>
    </div>
  </n-scrollbar>
</template>

<script lang="ts" setup>
import { isMobile } from '@/utils';
import FavoriteList from '@/views/favorite/index.vue';

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

.mobile {
  .main-content {
    @apply flex-col mx-4;
  }
  :deep(.favorite-page) {
    @apply p-0 mx-4 h-full;
  }
}

:deep(.favorite-page) {
  @apply p-0 mx-4 h-[300px];
  .favorite-header {
    @apply mb-0;
    h2 {
      @apply text-lg font-bold mb-4;
    }
  }
}
</style>
