<template>
  <n-layout class="h-full bg-black" :native-scrollbar="false">
    <div class="main-page">
      <!-- 推荐歌手 -->
      <div class="recommend-singer">
        <div class="recommend-singer-list">
          <div
            class="recommend-singer-item relative"
            v-for="(item,index) in hotSingerData?.artists"
            :key="item.id"
          >
            <div :style="getStyle(item)" class="recommend-singer-item-bg"></div>
            <div
              class="recommend-singer-item-count p-2 text-base text-gray-200 z-10"
            >{{ item.musicSize }}首</div>
            <div class="recommend-singer-item-info z-10">
              <div class="recommend-singer-item-info-play">
                <i class="iconfont icon-playfill text-xl"></i>
              </div>
              <div class="ml-4">
                <div class="recommend-singer-item-info-name">{{ item.name }}</div>
                <div class="recommend-singer-item-info-name">{{ item.name }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="main-content">
        <!-- 歌单分类列表 -->
        <div class="play-list-type">
          <div class="title">歌单分类</div>
          <n-layout class="bg-black">
            <template v-for="(item,index) in playlistCategory?.sub" :key="item.name">
              <span
                class="play-list-type-item animate__animated animate__bounceIn animate__repeat-1"
                :style="getPlaylistTypeStyle(index <= 8 ? index : index - 8)"
                v-if="isShowAllPlaylistCategory || index <= 8"
              >{{ item.name }}</span>
            </template>
            <div
              class="play-list-type-showall animate__animated animate__bounceIn animate__repeat-1"
              :style="getPlaylistTypeStyle(!isShowAllPlaylistCategory ? 25 : playlistCategory?.sub.length + 30)"
              @click="isShowAllPlaylistCategory = !isShowAllPlaylistCategory"
            >{{ !isShowAllPlaylistCategory ? '显示全部' : '隐藏一些' }}</div>
          </n-layout>
        </div>
        <div class="recommend-music">
          <div class="title">本周最热音乐</div>
          <n-layout class=" recommend-music-list " >
            <n-space vertical>
              <!-- 推荐音乐列表 -->
              <div>
               <img v-for="item in recommendMusic?.result" :src="item.picUrl" width="100" height="50" />
              <div>

              </div>
              </div>
            </n-space>
          </n-layout>
        </div>
      </div>
    </div>
  </n-layout>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { getHotSinger, getPlaylistCategory, getRecommendMusic } from "@/api/home"
import type { IHotSinger } from "@/type/singer";
import type { IPlayListSort } from "@/type/playlist";
import type { IRecommendMusic } from "@/type/music";

// 歌手信息
const hotSingerData = ref<IHotSinger>()
// 歌单分类
const playlistCategory = ref<IPlayListSort>()
// 是否显示全部歌单分类
const isShowAllPlaylistCategory = ref<boolean>(false)
// 推荐歌曲
const recommendMusic = ref<IRecommendMusic>()


// 设置歌手背景图片
const getStyle = (item: any) => {
  return {
    "background-image": "url(" + item.picUrl + ")"
  }
}
// 设置歌单分类样式
const getPlaylistTypeStyle = (index: number) => {
  return {
    "animation-delay": index * 25 + "ms"
  }
}
//加载推荐歌手
const loadSingerList = async () => {
  const { data } = await getHotSinger({ offset: 0, limit: 5 })
  hotSingerData.value = data
}
// 加载歌单分类
const loadPlaylistCategory = async () => {
  const { data } = await getPlaylistCategory()
  playlistCategory.value = data
}
// 加载推荐歌曲
const loadRecommendMusic = async () => {
  const { data } = await getRecommendMusic({ limit: 6 })
  recommendMusic.value = data
}

// 页面初始化
onMounted(() => {
  loadSingerList()
  loadPlaylistCategory()
  loadRecommendMusic()
})



</script>

<style lang="scss" scoped>
.recommend-singer {
  &-list {
    @apply flex mt-5;
    height: 350px;
  }
  &-item {
    @apply flex-1 h-full rounded-3xl p-5 mr-5 flex flex-col justify-between;
    &-bg {
      @apply bg-gray-900 bg-no-repeat bg-cover bg-center rounded-3xl absolute w-full h-full top-0 left-0 z-0;
      filter: brightness(80%);
    }
    &-info {
      @apply flex items-center p-2;
      &-play {
        @apply w-12 h-12 bg-green-500 rounded-full flex justify-center items-center;
      }
    }
  }
}

.main-content {
  @apply mt-6 flex;
  .title {
    @apply text-lg font-bold mb-4;
  }
  .play-list-type {
    width: 250px;
    @apply mr-6;
    &-item,
    &-showall {
      @apply py-2 px-3 mr-3 mb-3 inline-block border border-gray-700 rounded-xl cursor-pointer hover:bg-green-600 transition;
      background-color: #1a1a1a;
    }
    &-showall {
      @apply block text-center;
    }
  }

  .recommend-music {
    @apply flex-1 mr-96;
    &-list{
      @apply rounded-3xl p-6 w-full border border-gray-700;
      background-color: #0D0D0D;
    }
  }
}
</style>