<template>
  <n-layout class="main-page" :native-scrollbar="false">
    <!-- 推荐歌手 -->
    <recommend-singer />
    <div class="main-content">
      <!-- 歌单分类列表 -->
      <playlist-type />
      <!-- 本周最热音乐 -->
      <recommend-songlist />
      <!-- 推荐最新专辑 -->
      <recommend-album />
    </div>
  </n-layout>
</template>

<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
const RecommendSinger = defineAsyncComponent(() => import("@/components/RecommendSinger.vue"));
const PlaylistType = defineAsyncComponent(() => import("@/components/PlaylistType.vue"));
const RecommendSonglist = defineAsyncComponent(() => import("@/components/RecommendSonglist.vue"));
const RecommendAlbum = defineAsyncComponent(() => import("@/components/RecommendAlbum.vue"));
</script>

<style lang="scss" scoped>
.main-page {
  @apply mt-4 h-full;
}

.main-content {
  @apply mt-6 flex;
}
</style>
