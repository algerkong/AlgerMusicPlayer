<template>
  <div class="recommend-singer">
    <div class="recommend-singer-list">
      <n-carousel
        slides-per-view="auto"
        :show-dots="false"
        :space-between="20"
        draggable
        show-arrow
        :autoplay="false"
      >
        <n-carousel-item :class="setAnimationClass('animate__backInRight')" :style="setAnimationDelay(0, 100)" style="width: calc((100% / 5) - 16px)">
          <div
            v-if="dayRecommendData"
            class="recommend-singer-item relative"
          >
            <div
              :style="
                setBackgroundImg(getImgUrl(dayRecommendData?.dailySongs[0].al.picUrl, '500y500'))
              "
              class="recommend-singer-item-bg"
            ></div>
            <div
              class="recommend-singer-item-count p-2 text-base text-gray-200 z-10 cursor-pointer"
              @click="showMusic = true"
            >
              <div class="font-bold text-lg">
                {{ t('comp.recommendSinger.title') }}
              </div>

              <div class="mt-2">
                <p
                  v-for="item in dayRecommendData?.dailySongs.slice(0, 5)"
                  :key="item.id"
                  class="text-el"
                >
                  {{ item.name }}
                  <br />
                </p>
              </div>
            </div>
          </div>
        </n-carousel-item>

        <n-carousel-item  :class="setAnimationClass('animate__backInRight')"
          :style="setAnimationDelay(1, 100)"
          style="width: calc(((100% / 5) - 16px) * 3)">
          <div class="user-play">
            <div class="user-play-title">
              {{ store.state.user?.nickname }}
            </div>
            <div class="user-play-item" v-for="item in userPlaylist" :key="item.id">
              <div class="user-play-item-img">
                <img :src="getImgUrl(item.coverImgUrl, '200y200')" alt="">
              </div>
              <div class="user-play-item-info">
                <div class="user-play-item-info-name text- overflow-hidden">{{ item.name }}</div>
                <div class="user-play-item-info-count">{{ t('common.songCount', { count: item.trackCount }) }}</div>
              </div>
            </div>
          </div>
        </n-carousel-item>
        <n-carousel-item
          v-for="(item, index) in hotSingerData?.artists"
          :key="item.id"
          :class="setAnimationClass('animate__backInRight')"
          :style="setAnimationDelay(index + 1, 100)"
          style="width: calc((100% / 5) - 16px)"
        >
          <div
            class="recommend-singer-item relative"
            :class="setAnimationClass('animate__backInRight')"
            :style="setAnimationDelay(index + 2, 100)"
          >
            <div
              :style="setBackgroundImg(getImgUrl(item.picUrl, '500y500'))"
              class="recommend-singer-item-bg"
            ></div>
            <div class="recommend-singer-item-count p-2 text-base text-gray-200 z-10">
              {{ t('common.songCount', { count: item.musicSize }) }}
            </div>
            <div class="recommend-singer-item-info z-10">
              <div class="recommend-singer-item-info-play" @click="toSearchSinger(item.name)">
                <i class="iconfont icon-playfill text-xl"></i>
              </div>
              <div class="ml-4">
                <div class="recommend-singer-item-info-name text-el">{{ item.name }}</div>
              </div>
            </div>
          </div>
        </n-carousel-item>
      </n-carousel>
    </div>

    <music-list
      v-if="dayRecommendData?.dailySongs.length"
      v-model:show="showMusic"
      :name="t('comp.recommendSinger.songlist')"
      :song-list="dayRecommendData?.dailySongs"
      :cover="false"
    />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';

import { getDayRecommend, getHotSinger } from '@/api/home';
import MusicList from '@/components/MusicList.vue';
import router from '@/router';
import { IDayRecommend } from '@/type/day_recommend';
import type { IHotSinger } from '@/type/singer';
import { getImgUrl, setAnimationClass, setAnimationDelay, setBackgroundImg } from '@/utils';
import { getUserPlaylist } from '@/api/user';
import { Playlist } from '@/type/list';


const store = useStore();
const { t } = useI18n();

// 歌手信息
const hotSingerData = ref<IHotSinger>();
const dayRecommendData = ref<IDayRecommend>();
const showMusic = ref(false);
const userPlaylist = ref<Playlist[]>([]);

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  try {
    // 第一个请求：获取热门歌手
    const { data: singerData } = await getHotSinger({ offset: 0, limit: 5 });

    // 第二个请求：获取每日推荐
    try {
      const {
        data: { data: dayRecommend }
      } = await getDayRecommend();
      dayRecommendData.value = dayRecommend as unknown as IDayRecommend;
    } catch (error) {
      console.error('error', error);
    }

    hotSingerData.value = singerData;
    if(store.state.user){
      const { data: playlistData } = await getUserPlaylist(store.state.user?.userId);
      userPlaylist.value = (playlistData.playlist as Playlist[]).sort((a, b) => b.playCount - a.playCount).slice(0, 3);
    }
  } catch (error) {
    console.error('error', error);
  }
};

const toSearchSinger = (keyword: string) => {
  router.push({
    path: '/search',
    query: {
      keyword
    }
  });
};

// 监听登录状态
watchEffect(() => {
  if (store.state.user) {
    loadData();
  }
});
</script>

<style lang="scss" scoped>
.recommend-singer {
  &-list {
    @apply flex;
    height: 280px;
    margin-right: 20px;
  }
  &-item {
    @apply flex-1 h-full rounded-3xl p-5 flex flex-col justify-between overflow-hidden;
    &-bg {
      @apply bg-gray-900 dark:bg-gray-800 bg-no-repeat bg-cover bg-center rounded-3xl absolute w-full h-full top-0 left-0 z-0;
      filter: brightness(60%);
    }
    &-info {
      @apply flex items-center p-2;
      &-play {
        @apply w-12 h-12 bg-green-500 rounded-full flex justify-center items-center hover:bg-green-600 cursor-pointer text-white;
      }
      &-name {
        @apply text-gray-100 dark:text-gray-100;
      }
    }
    &-count {
      @apply text-gray-100 dark:text-gray-100;
    }
  }
}

.user-play{
  @apply flex bg-light-100 dark:bg-dark rounded-3xl p-4 gap-4;
  &-item{
    @apply bg-light dark:bg-dark-100 rounded-3xl overflow-hidden w-28;
    &-img{
      @apply w-28 h-28 rounded-3xl overflow-hidden;
      img{
        @apply w-full h-full object-cover;
      }
    }
    &-info{
      @apply flex-1;
      &-name{
        @apply text-gray-900 dark:text-gray-100 line-clamp-1;
      }
      &-count{
        @apply text-gray-900 dark:text-gray-100;
      }
    }
  }
}
.mobile .recommend-singer {
  &-list {
    height: 180px;
    @apply ml-4;
  }
  &-item {
    @apply p-4 rounded-xl;
    &-bg {
      @apply rounded-xl;
    }
  }
}
</style>
