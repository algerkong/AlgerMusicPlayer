<template>
  <div class="recommend-singer">
    <div class="recommend-singer-list">
      <n-carousel
        v-if="hotSingerData?.artists.length"
        slides-per-view="auto"
        :show-dots="false"
        :space-between="20"
        draggable
        show-arrow
        :autoplay="false"
      >
        <n-carousel-item
          :class="setAnimationClass('animate__backInRight')"
          :style="getCarouselItemStyle(0, 100, 6)"
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
              @click="showDayRecommend"
            >
              <div class="font-bold text-lg">
                {{ t('comp.recommendSinger.title') }}
              </div>

              <div class="mt-2">
                <p v-for="item in getDisplayDaySongs.slice(0, 5)" :key="item.id" class="text-el">
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
          :style="getCarouselItemStyleForPlaylist(userPlaylist.length)"
        >
          <div class="user-play">
            <div class="user-play-title mb-3">
              {{ t('comp.userPlayList.title', { name: userStore.user?.nickname }) }}
            </div>
            <div class="user-play-list" :class="getPlaylistGridClass(userPlaylist.length)">
              <div
                v-for="item in userPlaylist"
                :key="item.id"
                class="user-play-item"
                @click="openPlaylist(item)"
              >
                <div class="user-play-item-img">
                  <img :src="getImgUrl(item.coverImgUrl, '200y200')" alt="" />
                  <div class="user-play-item-title">
                    <div class="user-play-item-title-name">{{ item.name }}</div>

                    <div class="user-play-item-list">
                      <div
                        v-for="song in item.tracks"
                        :key="song.id"
                        class="user-play-item-list-name"
                      >
                        {{ song.name }}
                      </div>
                    </div>
                  </div>
                  <div class="user-play-item-count">
                    <div class="user-play-item-count-tag">
                      {{ t('common.songCount', { count: item.trackCount }) }}
                    </div>
                  </div>
                  <div class="user-play-item-direct-play" @click.stop="handlePlayPlaylist(item.id)">
                    <i class="iconfont icon-playfill text-xl text-white"></i>
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
          :style="getCarouselItemStyle(index + 1, 100, 6)"
        >
          <div
            class="recommend-singer-item relative"
            :class="setAnimationClass('animate__backInRight')"
            :style="setAnimationDelay(index + 2, 100)"
            @click="handleArtistClick(item.id)"
          >
            <div
              :style="
                setBackgroundImg(getImgUrl(item.picUrl || item.avatar || item.cover, '500y500'))
              "
              class="recommend-singer-item-bg"
            ></div>
            <div class="recommend-singer-item-count p-2 text-base text-gray-200 z-10">
              {{ t('common.songCount', { count: item.musicSize }) }}
            </div>
            <div class="recommend-singer-item-info z-10">
              <div class="recommend-singer-item-info-name text-el text-right line-clamp-1">
                {{ item.name }}
              </div>
            </div>
            <!-- 播放按钮(hover时显示) -->
            <div
              class="recommend-singer-item-play-overlay"
              @click.stop="handleArtistClick(item.id)"
            >
              <div class="recommend-singer-item-play-btn">
                <i class="iconfont icon-playfill text-4xl"></i>
              </div>
            </div>
          </div>
        </n-carousel-item>
      </n-carousel>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getDayRecommend, getHotSinger } from '@/api/home';
import { getListDetail } from '@/api/list';
import { getMusicDetail } from '@/api/music';
import { getUserPlaylist } from '@/api/user';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { useArtist } from '@/hooks/useArtist';
import { usePlayerStore, useUserStore } from '@/store';
import { IDayRecommend } from '@/types/day_recommend';
import { Playlist } from '@/types/list';
import type { IListDetail } from '@/types/listDetail';
import { SongResult } from '@/types/music';
import type { IHotSinger } from '@/types/singer';
import {
  getImgUrl,
  isMobile,
  setAnimationClass,
  setAnimationDelay,
  setBackgroundImg
} from '@/utils';

const userStore = useUserStore();
const playerStore = usePlayerStore();
const router = useRouter();

const { t } = useI18n();

// 歌手信息
const hotSingerData = ref<IHotSinger>();
const dayRecommendData = ref<IDayRecommend>();
const userPlaylist = ref<Playlist[]>([]);

// 为歌单弹窗添加的状态
const playlistLoading = ref(false);
const playlistItem = ref<Playlist | null>(null);
const playlistDetail = ref<IListDetail | null>(null);

const { navigateToArtist } = useArtist();

/**
 * 获取轮播项的样式
 * @param index 项目索引（用于动画延迟）
 * @param delayStep 动画延迟的步长（毫秒）
 * @param totalItems 总共分成几等分（默认为5）
 * @param maxWidth 最大宽度（可选，单位为px）
 * @returns 样式字符串
 */
const getCarouselItemStyle = (
  index: number,
  delayStep: number,
  totalItems: number,
  maxWidth?: number
) => {
  if (isMobile.value) {
    return 'width: 30%;';
  }
  const animationDelay = setAnimationDelay(index, delayStep);
  const width = `calc((100% / ${totalItems}) - 16px)`;
  const maxWidthStyle = maxWidth ? `max-width: ${maxWidth}px;` : '';

  return `${animationDelay}; width: ${width}; ${maxWidthStyle}`;
};

/**
 * 根据歌单数量获取轮播项的样式
 * @param playlistCount 歌单数量
 * @returns 样式字符串
 */
const getCarouselItemStyleForPlaylist = (playlistCount: number) => {
  if (isMobile.value) {
    return 'width: 100%;';
  }
  const animationDelay = setAnimationDelay(1, 100);
  let width = '';
  let maxWidth = '';

  switch (playlistCount) {
    case 1:
      width = 'calc(100% / 4 - 16px)';
      maxWidth = 'max-width: 180px;';
      break;
    case 2:
      width = 'calc(100% / 3 - 16px)';
      maxWidth = 'max-width: 380px;';
      break;
    case 3:
      width = 'calc(100% / 2 - 16px)';
      maxWidth = 'max-width: 520px;';
      break;
    default:
      width = 'calc(100% / 1 - 16px)';
      maxWidth = 'max-width: 656px;';
  }

  return `${animationDelay}; width: ${width}; ${maxWidth}`;
};

onMounted(async () => {
  loadNonUserData();
});

// 提取每日推荐加载逻辑到单独的函数
const loadDayRecommendData = async () => {
  try {
    const {
      data: { data: dayRecommend }
    } = await getDayRecommend();
    const dayRecommendSource = dayRecommend as unknown as IDayRecommend;
    dayRecommendData.value = {
      ...dayRecommendSource,
      dailySongs: dayRecommendSource.dailySongs.filter(
        (song: any) => !playerStore.dislikeList.includes(song.id)
      )
    };
  } catch (error) {
    console.error('获取每日推荐失败:', error);
  }
};

// 加载不需要登录的数据
const loadNonUserData = async () => {
  try {
    // 获取每日推荐（仅在用户未登录时加载，已登录用户会通过watchEffect触发loadDayRecommendData）
    if (!userStore.user) {
      await loadDayRecommendData();
    }

    // 获取热门歌手
    const { data: singerData } = await getHotSinger({ offset: 0, limit: 5 });
    hotSingerData.value = singerData;
  } catch (error) {
    console.error('加载热门歌手数据失败:', error);
  }
};

// 加载需要登录的数据
const loadUserData = async () => {
  try {
    if (userStore.user) {
      const { data: playlistData } = await getUserPlaylist(userStore.user?.userId);
      // 确保最多只显示4个歌单，并按播放次数排序
      userPlaylist.value = (playlistData.playlist as Playlist[])
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 4);
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
  }
};

const handleArtistClick = (id: number) => {
  navigateToArtist(id);
};
const getDisplayDaySongs = computed(() => {
  if (!dayRecommendData.value) {
    return [];
  }
  return dayRecommendData.value.dailySongs.filter(
    (song) => !playerStore.dislikeList.includes(song.id)
  );
});

const showDayRecommend = () => {
  if (!dayRecommendData.value?.dailySongs) return;

  navigateToMusicList(router, {
    type: 'dailyRecommend',
    name: t('comp.recommendSinger.songlist'),
    songList: getDisplayDaySongs.value,
    canRemove: false
  });
};

const openPlaylist = (item: any) => {
  playlistItem.value = item;
  playlistLoading.value = true;

  getListDetail(item.id).then((res) => {
    playlistDetail.value = res.data;
    playlistLoading.value = false;

    navigateToMusicList(router, {
      id: item.id,
      type: 'playlist',
      name: item.name,
      songList: res.data.playlist.tracks || [],
      listInfo: res.data.playlist,
      canRemove: false
    });
  });
};

// 添加直接播放歌单的方法
const handlePlayPlaylist = async (id: number) => {
  try {
    // 先显示加载状态
    playlistLoading.value = true;

    // 获取歌单详情
    const { data } = await getListDetail(id);

    if (data?.playlist) {
      // 先使用已有的tracks开始播放（这些是已经在歌单详情中返回的前几首歌曲）
      if (data.playlist.tracks?.length > 0) {
        // 格式化歌曲列表
        const initialSongs = data.playlist.tracks.map((track) => ({
          ...track,
          source: 'netease',
          picUrl: track.al.picUrl
        })) as unknown as SongResult[];

        // 设置播放列表
        playerStore.setPlayList(initialSongs);

        // 开始播放第一首
        await playerStore.setPlay(initialSongs[0]);

        // 如果有trackIds，异步加载完整歌单
        if (data.playlist.trackIds?.length > initialSongs.length) {
          loadFullPlaylist(data.playlist.trackIds, initialSongs);
        }
      }
    }

    // 关闭加载状态
    playlistLoading.value = false;
  } catch (error) {
    console.error('播放歌单失败:', error);
    playlistLoading.value = false;
  }
};

// 异步加载完整歌单
const loadFullPlaylist = async (trackIds: { id: number }[], initialSongs: SongResult[]) => {
  try {
    // 获取已加载歌曲的ID集合，避免重复加载
    const loadedIds = new Set(initialSongs.map((song) => song.id));

    // 筛选出未加载的ID
    const unloadedTrackIds = trackIds
      .filter((item) => !loadedIds.has(item.id as number))
      .map((item) => item.id);

    if (unloadedTrackIds.length === 0) return;

    // 分批获取歌曲详情，每批最多获取500首
    const batchSize = 500;
    const allSongs = [...initialSongs];

    for (let i = 0; i < unloadedTrackIds.length; i += batchSize) {
      const batchIds = unloadedTrackIds.slice(i, i + batchSize);
      if (batchIds.length > 0) {
        try {
          const { data: songsData } = await getMusicDetail(batchIds);
          if (songsData?.songs?.length) {
            const formattedSongs = songsData.songs.map((item) => ({
              ...item,
              source: 'netease',
              picUrl: item.al.picUrl
            })) as unknown as SongResult[];

            allSongs.push(...formattedSongs);
          }
        } catch (error) {
          console.error('获取批次歌曲详情失败:', error);
        }
      }
    }

    // 更新完整的播放列表但保持当前播放的歌曲不变
    if (allSongs.length > initialSongs.length) {
      console.log('更新播放列表，总歌曲数:', allSongs.length);
      playerStore.setPlayList(allSongs);
    }
  } catch (error) {
    console.error('加载完整歌单失败:', error);
  }
};

// 监听登录状态
watchEffect(() => {
  if (userStore.user) {
    loadUserData();
    loadDayRecommendData();
  }
});

const getPlaylistGridClass = (length: number) => {
  switch (length) {
    case 1:
      return 'one-column';
    case 2:
      return 'two-columns';
    case 3:
      return 'three-columns';
    default:
      return 'four-columns';
  }
};
</script>

<style lang="scss" scoped>
.recommend-singer {
  &-list {
    @apply flex;
    height: 220px;
    margin-right: 20px;
  }
  &-item {
    @apply flex-1 h-full rounded-3xl p-5 flex flex-col justify-between overflow-hidden relative;
    cursor: pointer;
    transition: transform 0.3s ease;

    &:hover {
      transform: translateY(-5px);
    }

    &-bg {
      @apply bg-gray-900 dark:bg-gray-800 bg-no-repeat bg-cover bg-center rounded-3xl absolute w-full h-full top-0 left-0 z-0;
      filter: brightness(60%);
    }

    &-info {
      @apply flex flex-col p-2;
      &-name {
        @apply text-gray-100 dark:text-gray-100;
      }
    }

    &-count {
      @apply text-gray-100 dark:text-gray-100;
    }

    &-play {
      &-overlay {
        @apply absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 z-20 opacity-0 transition-all duration-300 flex items-center justify-center;
        backdrop-filter: blur(1px);

        .recommend-singer-item:hover & {
          opacity: 1;
        }
      }

      &-btn {
        @apply w-20 h-20 bg-transparent flex justify-center items-center text-white;
        transform: translateY(50px) scale(0.8);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

        .recommend-singer-item:hover & {
          transform: translateY(0) scale(1);
        }
      }
    }
  }
}

.user-play {
  @apply bg-light-300 dark:bg-dark-300 rounded-3xl px-4 py-3 h-full;
  backdrop-filter: blur(20px);
  &-title {
    @apply text-gray-900 dark:text-gray-100 font-bold text-lg line-clamp-1;
  }
  &-list {
    @apply grid gap-3 h-full;
    &.one-column {
      grid-template-columns: repeat(1, minmax(0, 1fr));
      .user-play-item {
        max-width: 100%;
      }
    }
    &.two-columns {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      .user-play-item {
        max-width: 100%;
      }
    }
    &.three-columns {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      .user-play-item {
        max-width: 100%;
      }
    }
    &.four-columns {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      .user-play-item {
        max-width: 100%;
      }
    }
  }
  &-item {
    @apply rounded-2xl overflow-hidden flex flex-col;
    height: 176px;

    &-img {
      @apply relative cursor-pointer transition-all duration-300;
      height: 0;
      width: 100%;
      padding-bottom: 100%; /* 确保宽高比为1:1，即正方形 */
      border-radius: 12px;
      overflow: hidden;
      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      }

      img {
        @apply absolute inset-0 w-full h-full object-cover;
      }
    }
    &-title {
      @apply absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent z-10;
      &-name {
        @apply text-white font-medium text-sm line-clamp-3;
      }
    }
    &-count {
      @apply absolute bottom-2 left-2 z-10;
      &-tag {
        @apply px-2 py-0.5 text-xs text-white bg-black/50 backdrop-blur-sm rounded-full;
      }
    }
    &-direct-play {
      @apply absolute bottom-2 right-2 z-20 w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center cursor-pointer transform scale-90 hover:scale-100 transition-all;
      &:hover {
        @apply shadow-lg;
      }
    }
    &-play-btn {
      @apply flex items-center justify-center;
      transform: scale(0.8);
      transition: transform 0.3s ease;

      .user-play-item:hover & {
        transform: scale(1);
      }
    }
  }
}
.mobile {
  .recommend-singer {
    &-list {
      height: 180px;
      @apply ml-4;
    }
    &-item {
      @apply p-2 rounded-xl;
      &-bg {
        @apply rounded-xl;
      }
    }
  }
}
</style>
