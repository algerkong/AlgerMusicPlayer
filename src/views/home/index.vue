<template>
  <n-layout class="h-full bg-black" :native-scrollbar="false">
    <div class="main-page pb-20">
      <!-- 推荐歌手 -->
      <recommend-singer />
      <div class="main-content">
        <!-- 歌单分类列表 -->
        <playlist-type />
        <!-- 本周最热音乐 -->
        <recommend-songlist />
      </div>
    </div>
  </n-layout>
</template>

<script lang="ts" setup>
import RecommendSinger from "@/components/RecommendSinger.vue";
import PlaylistType from "@/components/PlaylistType.vue";
import RecommendSonglist from "@/components/RecommendSonglist.vue";

</script>

<style lang="scss" scoped>
.main-content {
  @apply mt-6 flex;
}
</style>
