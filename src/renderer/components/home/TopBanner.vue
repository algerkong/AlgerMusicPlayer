<template>
  <div class="recommend-singer">
    <div class="recommend-singer-list">
      <n-carousel
        slides-per-view="auto"
        :show-dots="false"
        :space-between="20"
        draggable
        show-arrow
        autoplay
      >
        <n-carousel-item
          :class="setAnimationClass('animate__backInRight')"
          :style="setAnimationDelay(0, 100)"
          style="width: calc((100% / 5) - 16px)"
        >
          <div v-if="dayRecommendData" class="recommend-singer-item relative">
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

        <n-carousel-item
          v-if="userStore.user && userPlaylist.length"
          :class="setAnimationClass('animate__backInRight')"
          :style="setAnimationDelay(1, 100) + '; width: calc(100% / 2); max-width: 460px;'"
        >
          <div class="user-play">
            <div class="user-play-title flex items-center mb-3">
              <n-avatar size="small" round :src="userStore.user?.avatarUrl" class="mr-2" />
              {{ userStore.user?.nickname }}的常听
            </div>
            <div class="user-play-list">
              <div
                v-for="item in userPlaylist"
                :key="item.id"
                class="user-play-item"
                @click="toPlaylist(item.id)"
              >
                <div class="user-play-item-img">
                  <img :src="getImgUrl(item.coverImgUrl, '200y200')" alt="" />
                  <div class="user-play-item-overlay"></div>
                </div>
                <div class="user-play-item-info">
                  <div class="user-play-item-info-name">{{ item.name }}</div>
                  <div class="user-play-item-info-count text-xs opacity-70">
                    {{ t('common.songCount', { count: item.trackCount }) }}
                  </div>
                </div>
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

    <!-- 添加用户歌单弹窗 -->
    <music-list
      v-model:show="showPlaylist"
      v-model:loading="playlistLoading"
      :name="playlistItem?.name || ''"
      :song-list="playlistDetail?.playlist?.tracks || []"
      :list-info="playlistDetail?.playlist"
    />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';

import { getDayRecommend, getHotSinger } from '@/api/home';
import { getListDetail } from '@/api/list';
import { getUserPlaylist } from '@/api/user';
import MusicList from '@/components/MusicList.vue';
import router from '@/router';
import { useUserStore } from '@/store';
import { IDayRecommend } from '@/type/day_recommend';
import { Playlist } from '@/type/list';
import type { IListDetail } from '@/type/listDetail';
import type { IHotSinger } from '@/type/singer';
import { getImgUrl, setAnimationClass, setAnimationDelay, setBackgroundImg } from '@/utils';

const userStore = useUserStore();

const { t } = useI18n();

// 歌手信息
const hotSingerData = ref<IHotSinger>();
const dayRecommendData = ref<IDayRecommend>();
const showMusic = ref(false);
const userPlaylist = ref<Playlist[]>([]);

// 为歌单弹窗添加的状态
const showPlaylist = ref(false);
const playlistLoading = ref(false);
const playlistItem = ref<Playlist | null>(null);
const playlistDetail = ref<IListDetail | null>(null);

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
    if (userStore.user) {
      const { data: playlistData } = await getUserPlaylist(userStore.user?.userId);
      userPlaylist.value = (playlistData.playlist as Playlist[])
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 3);
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

const toPlaylist = async (id: number) => {
  playlistLoading.value = true;
  playlistItem.value = null;
  playlistDetail.value = null;
  showPlaylist.value = true;

  // 设置当前点击的歌单信息
  const selectedPlaylist = userPlaylist.value.find((item) => item.id === id);
  if (selectedPlaylist) {
    playlistItem.value = selectedPlaylist;
  }

  try {
    // 获取歌单详情
    const { data } = await getListDetail(id);
    playlistDetail.value = data;
  } catch (error) {
    console.error('获取歌单详情失败:', error);
  } finally {
    playlistLoading.value = false;
  }
};

// 监听登录状态
watchEffect(() => {
  if (userStore.user) {
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

.user-play {
  @apply bg-light-200 dark:bg-dark-100 rounded-3xl p-5 h-full flex flex-col;
  backdrop-filter: blur(20px);
  &-title {
    @apply text-gray-900 dark:text-gray-100 font-bold text-lg;
  }
  &-list {
    @apply grid grid-cols-3 gap-5 h-full;
  }
  &-item {
    @apply bg-light dark:bg-dark-200 rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300;
    height: 190px;
    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      .user-play-item-overlay {
        opacity: 1;
      }
    }
    &-img {
      @apply relative;
      height: 0;
      width: 100%;
      padding-bottom: 100%; /* 确保宽高比为1:1，即正方形 */
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 8px;

      img {
        @apply absolute inset-0 w-full h-full object-cover;
      }
    }
    &-overlay {
      @apply absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 transition-opacity duration-300;
    }
    &-info {
      @apply px-1 py-1;
      &-name {
        @apply text-gray-900 dark:text-gray-100 font-medium text-sm line-clamp-1;
      }
      &-count {
        @apply text-gray-700 dark:text-gray-300 mt-1;
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
