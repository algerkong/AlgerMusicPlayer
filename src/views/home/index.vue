<template>
  <div class="main-page">
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
  </div>
</template>

<script lang="ts" setup>
import {defineAsyncComponent} from 'vue';
// import RecommendSinger from "@/components/RecommendSinger.vue";
// import PlaylistType from "@/components/PlaylistType.vue";
// import RecommendSonglist from "@/components/RecommendSonglist.vue";
// import RecommendAlbum from "@/components/RecommendAlbum.vue";
const RecommendSinger = defineAsyncComponent(() => import("@/components/RecommendSinger.vue"));
const PlaylistType = defineAsyncComponent(() => import("@/components/PlaylistType.vue"));
const RecommendSonglist = defineAsyncComponent(() => import("@/components/RecommendSonglist.vue"));
const RecommendAlbum = defineAsyncComponent(() => import("@/components/RecommendAlbum.vue"));
/* 
  异步组件的定义方式
  const asyncComponents  = defineAsyncComponent({
  // 异步组件的路径
  loader: () => import("@/components/RecommendSinger.vue"),
  // 异步组件的占位
  loadingComponent:aaa,
  // 异步组件的错误
  errorComponent:bbb,
  // 在显示loading组件之前，等待多长时间
  delay:1000,
  // 监听错误
  // error 错误信息  retry 再次请求 attempts 当前重试次数
  onError:(err,retry,attempts)=>{
    console.log("错误")
  }
 })
*/



</script>

<style lang="scss" scoped>
.main-page {
  @apply mt-4 pb-32;
}
.main-content {
  @apply mt-6 flex;
}
</style>
