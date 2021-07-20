<template>
  <n-layout class="h-full bg-black" :native-scrollbar="false">
    <div class="main-page pb-20">
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
                :style="getPlaylistTypeStyle(index <= 13 ? index : index - 13)"
                v-if="isShowAllPlaylistCategory || index <= 13"
              >{{ item.name }}</span>
            </template>
            <div
              class="play-list-type-showall animate__animated animate__bounceIn animate__repeat-1"
              :style="getPlaylistTypeStyle(!isShowAllPlaylistCategory ? 25 : playlistCategory?.sub.length || 100 + 30)"
              @click="isShowAllPlaylistCategory = !isShowAllPlaylistCategory"
            >{{ !isShowAllPlaylistCategory ? '显示全部' : '隐藏一些' }}</div>
          </n-layout>
        </div>
        <div class="recommend-music">
          <div class="title">本周最热音乐</div>
          <n-layout class="recommend-music-list">
            <n-space vertical size="large">
              <!-- 推荐音乐列表 -->
              <template v-for="item in recommendMusic?.result" :key="item.id">
                <div class="recommend-music-list-item">
                  <img :src="item.picUrl" class="recommend-music-list-item-img" />
                  <div class="recommend-music-list-item-content">
                    <div class="recommend-music-list-item-content-title">
                      <n-ellipsis class="text-ellipsis" line-clamp="1">{{ item.song.name }}</n-ellipsis>
                    </div>
                    <div class="recommend-music-list-item-content-name">
                      <n-ellipsis
                        class="text-ellipsis"
                        line-clamp="1"
                      >{{ item.song.artists[0].name }}</n-ellipsis>
                    </div>
                  </div>
                  <div class="recommend-music-list-item-operating">
                    <div class="recommend-music-list-item-operating-like">
                      <i class="iconfont icon-likefill"></i>
                    </div>
                    <div class="recommend-music-list-item-operating-play" @click="playMusic(item)">
                      <i class="iconfont icon-playfill"></i>
                    </div>
                  </div>
                </div>
              </template>
            </n-space>
          </n-layout>
        </div>
      </div>
    </div>
  </n-layout>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import {
  getHotSinger,
  getPlaylistCategory,
  getRecommendMusic,
} from "@/api/home";
import type { IHotSinger } from "@/type/singer";
import type { IPlayListSort } from "@/type/playlist";
import type { IRecommendMusic, SongResult } from "@/type/music";
import { useStore } from "vuex";

// 歌手信息
const hotSingerData = ref<IHotSinger>();
// 歌单分类
const playlistCategory = ref<IPlayListSort>();
// 是否显示全部歌单分类
const isShowAllPlaylistCategory = ref<boolean>(false);
// 推荐歌曲
const recommendMusic = ref<IRecommendMusic>();

// 设置歌手背景图片
const getStyle = (item: any) => {
  return "background-image:" + "url(" + item.picUrl + ")";
};
// 设置歌单分类样式
const getPlaylistTypeStyle = (index: number) => {
  return "animation-delay:" + index * 25 + "ms";
};
//加载推荐歌手
const loadSingerList = async () => {
  const { data } = await getHotSinger({ offset: 0, limit: 5 });
  hotSingerData.value = data;
};
// 加载歌单分类
const loadPlaylistCategory = async () => {
  const { data } = await getPlaylistCategory();
  playlistCategory.value = data;
};
// 加载推荐歌曲
const loadRecommendMusic = async () => {
  const { data } = await getRecommendMusic({ limit: 6 });
  recommendMusic.value = data;
};


const store = useStore()
const playMusic = (item: SongResult) => {
  store.commit('setPlay', item)
  store.commit('setIsPlay', true)
}

// 页面初始化
onMounted(() => {
  loadSingerList();
  loadPlaylistCategory();
  loadRecommendMusic();
});
</script>

<style lang="scss" scoped>
.recommend-singer {
  &-list {
    @apply flex;
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
        @apply w-12 h-12 bg-green-500 rounded-full flex justify-center items-center hover:bg-green-600 cursor-pointer;
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
    .text-ellipsis {
      width: 100%;
    }
    @apply flex-1 mr-96;
    &-list {
      @apply rounded-3xl p-6 w-full border border-gray-700;
      background-color: #0d0d0d;

      &-item {
        @apply flex items-center;
        &-img {
          @apply w-14 h-14 rounded-xl mr-4;
        }
        &-content {
          @apply flex-1;
          &-title {
            @apply text-lg;
          }
          &-name {
            @apply text-sm mt-1;
            @apply text-gray-400;
          }
        }
        &-operating {
          @apply flex items-center pl-4 rounded-full border border-gray-700;
          background-color: #1a1a1a;
          .iconfont {
            @apply text-2xl;
          }
          .icon-likefill {
            @apply text-xl text-gray-300 hover:text-red-600 transition;
          }
          &-like {
            @apply mr-2 cursor-pointer;
          }
          &-play {
            @apply bg-green-500 cursor-pointer rounded-full w-10 h-10 flex justify-center items-center hover:bg-green-600 transition;
          }
        }
      }
    }
  }
}
</style>