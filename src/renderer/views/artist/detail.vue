<template>
  <div
    class="artist-detail-page h-full w-full bg-white dark:bg-neutral-900 transition-colors duration-500"
  >
    <n-scrollbar ref="scrollbarRef" class="h-full">
      <div class="artist-detail-content w-full pb-32">
        <!-- Loading State -->
        <div v-if="loading" class="artist-content">
          <!-- Hero Skeleton -->
          <div class="hero-section relative h-[400px] overflow-hidden rounded-tl-2xl">
            <div class="hero-bg absolute inset-0 -top-20">
              <div class="absolute inset-0 bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div class="hero-content relative z-10 px-4 pb-6 pt-4 md:px-8 md:pt-8">
              <div class="flex flex-col items-center gap-6 md:flex-row md:items-end md:gap-10">
                <n-skeleton class="h-36 w-36 rounded-full md:h-48 md:w-48" />
                <div class="flex-1 space-y-4 text-center md:text-left">
                  <n-skeleton class="h-6 w-20 rounded-full" />
                  <n-skeleton class="h-10 w-1/2 md:h-12" />
                  <div class="flex justify-center gap-4 md:justify-start">
                    <n-skeleton class="h-6 w-24" />
                    <n-skeleton class="h-6 w-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Content Skeleton -->
          <div class="mt-8 px-4 md:px-8">
            <div class="space-y-4">
              <div v-for="i in 8" :key="i" class="flex items-center gap-4">
                <n-skeleton class="h-12 w-12 rounded-xl" />
                <div class="flex-1 space-y-2">
                  <n-skeleton text class="w-1/3" />
                  <n-skeleton text class="w-1/4" />
                </div>
                <n-skeleton class="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div v-else-if="artistInfo" class="artist-content">
          <!-- Hero Section -->
          <section class="hero-section relative overflow-hidden overflow-hidden rounded-tl-2xl">
            <!-- Background Image with Blur -->
            <div class="hero-bg absolute inset-0 -top-20">
              <div
                class="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-40 dark:opacity-30"
                :style="{
                  backgroundImage: `url(${getImgUrl(artistInfo.cover || artistInfo.picUrl, '800y800')})`
                }"
              />
              <div
                class="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-neutral-900/80 dark:to-neutral-900"
              />
            </div>

            <!-- Hero Content -->
            <div class="hero-content relative z-10 px-4 md:px-8 pt-4 md:pt-8 pb-6">
              <div class="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
                <!-- Artist Avatar -->
                <div class="artist-avatar-wrapper relative group">
                  <div
                    class="avatar-glow absolute -inset-2 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  <div
                    class="avatar-container relative w-36 h-36 md:w-48 md:h-48 rounded-full overflow-hidden shadow-2xl ring-4 ring-white/50 dark:ring-neutral-800/50"
                  >
                    <img
                      :src="getImgUrl(artistInfo.cover || artistInfo.picUrl, '500y500')"
                      :alt="artistInfo.name"
                      class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <!-- Play overlay on avatar -->
                    <div
                      class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-300"
                    >
                      <div
                        class="play-icon w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-xl cursor-pointer hover:scale-110 active:scale-95"
                        @click="handlePlayAll"
                      >
                        <i class="iconfont icon-playfill text-2xl text-neutral-900 ml-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Artist Info -->
                <div class="artist-info flex-1 text-center md:text-left">
                  <div class="artist-badge mb-2 md:mb-3">
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider"
                    >
                      <i class="iconfont icon-verified text-sm" />
                      Artist
                    </span>
                  </div>
                  <h1
                    class="artist-name text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight"
                  >
                    {{ artistInfo.name }}
                  </h1>

                  <!-- Stats -->
                  <div
                    class="artist-stats flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 mt-4 md:mt-5"
                  >
                    <div v-if="artistInfo.musicSize" class="stat-item flex items-center gap-2">
                      <i class="iconfont icon-music text-primary text-lg" />
                      <span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        <span class="font-bold text-neutral-900 dark:text-white">{{
                          artistInfo.musicSize
                        }}</span>
                        {{ t('artist.hotSongs') }}
                      </span>
                    </div>
                    <div v-if="artistInfo.albumSize" class="stat-item flex items-center gap-2">
                      <i class="iconfont icon-album text-primary text-lg" />
                      <span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        <span class="font-bold text-neutral-900 dark:text-white">{{
                          artistInfo.albumSize
                        }}</span>
                        {{ t('artist.albums') }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Action Bar -->
          <section
            class="action-bar sticky top-0 z-20 px-4 md:px-8 py-3 md:py-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-800/50"
          >
            <div class="flex items-center justify-between gap-3">
              <!-- Left Actions -->
              <div class="flex items-center gap-2 md:gap-3">
                <!-- Play All Button -->
                <button
                  class="play-all-btn flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
                  @click="handlePlayAll"
                >
                  <i class="iconfont icon-playfill text-lg" />
                  <span class="hidden sm:inline">{{ t('comp.musicList.playAll') }}</span>
                </button>

                <!-- Add to Playlist Button -->
                <button
                  class="add-btn flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2.5 rounded-full md:rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                  @click="addToPlaylist"
                >
                  <i class="iconfont icon-add text-lg" />
                  <span class="hidden md:inline ml-2">{{ t('comp.musicList.addToPlaylist') }}</span>
                </button>
              </div>

              <!-- Right Actions -->
              <div class="flex items-center gap-2">
                <!-- Search Toggle -->
                <button
                  v-if="activeTab === 'songs'"
                  class="action-btn w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                  :class="
                    isSearchVisible
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  "
                  @click="isSearchVisible ? closeSearch() : showSearch()"
                >
                  <i class="iconfont" :class="isSearchVisible ? 'icon-close' : 'icon-search'" />
                </button>

                <!-- Layout Toggle (Desktop only) -->
                <button
                  v-if="activeTab === 'songs' && !isMobile"
                  class="action-btn w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-200 hover:scale-105 active:scale-95"
                  :title="
                    isCompactLayout
                      ? t('comp.musicList.switchToNormal')
                      : t('comp.musicList.switchToCompact')
                  "
                  @click="toggleLayout"
                >
                  <i class="iconfont" :class="isCompactLayout ? 'icon-list' : 'icon-menu'" />
                </button>
              </div>
            </div>

            <!-- Search Input (Expandable) -->
            <Transition name="search-slide">
              <div v-if="isSearchVisible && activeTab === 'songs'" class="search-container mt-3">
                <div
                  class="relative flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden"
                >
                  <i class="iconfont icon-search text-neutral-400 dark:text-neutral-500 ml-4" />
                  <input
                    v-model="searchKeyword"
                    type="text"
                    :placeholder="t('comp.musicList.searchSongs')"
                    class="flex-1 px-3 py-2.5 bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
                    @blur="handleSearchBlur"
                  />
                  <button
                    v-if="searchKeyword"
                    class="px-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    @click="searchKeyword = ''"
                  >
                    <i class="iconfont icon-close text-sm" />
                  </button>
                </div>
              </div>
            </Transition>
          </section>

          <!-- Tab Navigation -->
          <section class="tab-nav px-4 md:px-8 pt-4 md:pt-6">
            <div
              class="tab-list relative flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl w-fit"
            >
              <button
                v-for="tab in tabs"
                :key="tab.value"
                class="tab-item relative px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                :class="
                  activeTab === tab.value
                    ? 'text-neutral-900 dark:text-white'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                "
                @click="activeTab = tab.value"
              >
                <span class="relative z-10">{{ tab.label }}</span>
                <!-- Active indicator -->
                <Transition name="tab-indicator">
                  <div
                    v-if="activeTab === tab.value"
                    class="absolute inset-0 bg-white dark:bg-neutral-700 rounded-lg shadow-sm"
                  />
                </Transition>
              </button>
            </div>
          </section>

          <!-- Tab Content -->
          <section class="tab-content px-4 md:px-8 py-6 md:py-8">
            <!-- Songs Tab -->
            <div v-show="activeTab === 'songs'" class="songs-tab">
              <!-- No Results -->
              <div
                v-if="filteredSongs.length === 0 && searchKeyword"
                class="empty-state flex flex-col items-center justify-center py-16"
              >
                <i
                  class="iconfont icon-search text-5xl text-neutral-300 dark:text-neutral-600 mb-4"
                />
                <p class="text-neutral-500 dark:text-neutral-400">
                  {{ t('comp.musicList.noSearchResults') }}
                </p>
              </div>

              <!-- Song List with CSS optimization -->
              <div v-else class="song-list" :class="{ 'compact-mode': isCompactLayout }">
                <div
                  v-for="(song, index) in filteredSongs"
                  :key="song.id"
                  class="song-item-container"
                >
                  <song-item
                    :item="formatSong(song)"
                    :compact="isCompactLayout"
                    :index="index"
                    @play="handlePlay(song)"
                  />
                </div>
              </div>

              <!-- Load More Trigger -->
              <div ref="songsLoadMoreRef" class="load-more-trigger py-8">
                <div v-if="songLoading" class="flex items-center justify-center gap-2">
                  <div
                    class="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
                  />
                  <span class="text-sm text-neutral-400 dark:text-neutral-500">{{
                    t('common.loading') || 'Loading...'
                  }}</span>
                </div>
                <div
                  v-else-if="!songPage.hasMore && songs.length > 0"
                  class="text-center text-sm text-neutral-400 dark:text-neutral-500"
                >
                  — {{ t('common.noMore') || 'No more' }} —
                </div>
              </div>
            </div>

            <!-- Albums Tab -->
            <div v-show="activeTab === 'albums'" class="albums-tab">
              <!-- Album Grid -->
              <div
                v-if="albums.length > 0"
                class="album-grid grid grid-cols-2 gap-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              >
                <div
                  v-for="(album, index) in albums"
                  :key="album.id"
                  class="album-card group cursor-pointer"
                  :style="{ animationDelay: calculateAnimationDelay(index, 0.03) }"
                  @click="handleAlbumClick(album)"
                >
                  <!-- Cover -->
                  <div
                    class="album-cover relative aspect-square overflow-hidden rounded-2xl shadow-lg"
                  >
                    <img
                      :src="getImgUrl(album.picUrl, '500y500')"
                      :alt="album.name"
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <!-- Play Overlay -->
                    <div
                      class="play-overlay absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/20 group-hover:opacity-100 transition-all duration-300"
                    >
                      <div
                        class="play-icon w-12 h-12 rounded-full bg-white/90 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl"
                      >
                        <i class="iconfont icon-playfill text-xl text-neutral-900 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <!-- Info -->
                  <div class="album-info mt-3">
                    <h3
                      class="album-name line-clamp-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-primary dark:group-hover:text-primary transition-colors"
                    >
                      {{ album.name }}
                    </h3>
                    <p class="album-date mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                      {{ formatPublishTime(album.publishTime) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Load More Trigger -->
              <div ref="albumsLoadMoreRef" class="load-more-trigger py-8">
                <div v-if="albumLoading" class="flex items-center justify-center gap-2">
                  <div
                    class="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
                  />
                  <span class="text-sm text-neutral-400 dark:text-neutral-500">{{
                    t('common.loading') || 'Loading...'
                  }}</span>
                </div>
                <div
                  v-else-if="!albumPage.hasMore && albums.length > 0"
                  class="text-center text-sm text-neutral-400 dark:text-neutral-500"
                >
                  — {{ t('common.noMore') || 'No more' }} —
                </div>
              </div>
            </div>

            <!-- About Tab -->
            <div v-show="activeTab === 'about'" class="about-tab">
              <div class="about-content">
                <h2
                  class="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white mb-4 md:mb-6"
                >
                  {{ t('artist.description') }}
                </h2>
                <div
                  v-if="artistInfo.briefDesc"
                  class="prose prose-neutral dark:prose-invert max-w-none"
                >
                  <p
                    class="text-sm md:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 whitespace-pre-line"
                  >
                    {{ artistInfo.briefDesc }}
                  </p>
                </div>
                <div
                  v-else
                  class="empty-state flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500"
                >
                  <i class="iconfont icon-info text-5xl mb-4 opacity-50" />
                  <p>{{ t('common.noData') || 'No description available' }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Empty State (No Artist) -->
        <div
          v-else
          class="empty-state flex flex-col items-center justify-center min-h-[60vh] text-neutral-400 dark:text-neutral-500"
        >
          <i class="iconfont icon-user text-6xl mb-4 opacity-30" />
          <p>{{ t('common.noData') || 'Artist not found' }}</p>
        </div>
      </div>
    </n-scrollbar>

    <!-- Bottom Player Spacer -->
    <play-bottom />
  </div>
</template>

<script setup lang="ts">
import { useDateFormat } from '@vueuse/core';
import { NScrollbar, useMessage } from 'naive-ui';
import PinyinMatch from 'pinyin-match';
import {
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { getArtistAlbums, getArtistDetail, getArtistTopSongs } from '@/api/artist';
import { getMusicDetail } from '@/api/music';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import PlayBottom from '@/components/common/PlayBottom.vue';
import SongItem from '@/components/common/SongItem.vue';
import router from '@/router';
import { usePlayerStore } from '@/store';
import { IArtist } from '@/types/artist';
import { calculateAnimationDelay, getImgUrl, isMobile } from '@/utils';

defineOptions({
  name: 'ArtistDetail'
});

const { t } = useI18n();
const route = useRoute();
const playerStore = usePlayerStore();
const message = useMessage();

const artistId = computed(() => Number(route.params.id));
const activeTab = ref('songs');

const scrollbarRef = ref<any>(null);

// Tab configuration
const tabs = computed(() => [
  { value: 'songs', label: t('artist.hotSongs') },
  { value: 'albums', label: t('artist.albums') },
  { value: 'about', label: t('artist.description') }
]);

// 歌手信息
const artistInfo = ref<IArtist>();
const songs = ref<any[]>([]);
const albums = ref<any[]>([]);

// 加载状态
const loading = ref(false);
const songLoading = ref(false);
const albumLoading = ref(false);

// 分页参数
const songPage = ref({
  page: 1,
  pageSize: 30,
  hasMore: true
});

const albumPage = ref({
  page: 1,
  pageSize: 30,
  hasMore: true
});

// 无限滚动引用
const songsLoadMoreRef = ref<HTMLElement | null>(null);
const albumsLoadMoreRef = ref<HTMLElement | null>(null);
let songsObserver: IntersectionObserver | null = null;
let albumsObserver: IntersectionObserver | null = null;

// 添加上一个ID的引用，用于比较
const previousId = ref<string | null>(null);

// 简化缓存机制
const artistDataCache = new Map();

// 单个缓存键函数
const getCacheKey = (id: string | number) => `artist_${id}`;

// 搜索和布局相关
const searchKeyword = ref('');
const isSearchVisible = ref(false);
const isCompactLayout = ref(
  isMobile.value ? false : localStorage.getItem('musicListLayout') === 'compact'
);

// 导航到专辑详情
const handleAlbumClick = async (album: any) => {
  try {
    navigateToMusicList(router, {
      id: album.id,
      type: 'album',
      name: album.name,
      listInfo: {
        ...album,
        coverImgUrl: album.picUrl
      },
      canRemove: false
    });
  } catch (error) {
    console.error('Failed to navigate to album:', error);
    message.error(t('common.loadFailed'));
  }
};

// 加载歌手信息
const loadArtistInfo = async () => {
  if (!artistId.value) return;

  // 滚动到顶部
  nextTick(() => {
    scrollbarRef.value?.scrollTo(0, 0);
  });

  // 简化缓存检查
  const cacheKey = getCacheKey(artistId.value);
  if (artistDataCache.has(cacheKey)) {
    console.log('使用缓存数据');
    const cachedData = artistDataCache.get(cacheKey);
    artistInfo.value = cachedData.artistInfo;
    songs.value = cachedData.songs;
    albums.value = cachedData.albums;
    songPage.value = cachedData.songPage;
    albumPage.value = cachedData.albumPage;
    return;
  }

  // 加载新数据
  loading.value = true;
  try {
    const info = await getArtistDetail(artistId.value);
    if (info.data?.data?.artist) {
      artistInfo.value = info.data.data.artist;
    }
    // 重置分页并加载初始数据
    resetPagination();
    await Promise.all([loadSongs(), loadAlbums()]);

    // 保存到缓存
    artistDataCache.set(cacheKey, {
      artistInfo: artistInfo.value,
      songs: [...songs.value],
      albums: [...albums.value],
      songPage: { ...songPage.value },
      albumPage: { ...albumPage.value }
    });
  } catch (error) {
    console.error('加载歌手信息失败:', error);
  } finally {
    loading.value = false;
  }
};

// 重置分页
const resetPagination = () => {
  songPage.value = {
    page: 1,
    pageSize: 50,
    hasMore: true
  };
  albumPage.value = {
    page: 1,
    pageSize: 50,
    hasMore: true
  };
  songs.value = [];
  albums.value = [];
};

// 加载歌曲
const loadSongs = async () => {
  if (!artistId.value || !songPage.value.hasMore || songLoading.value) return;

  try {
    songLoading.value = true;
    const { page, pageSize } = songPage.value;
    const res = await getArtistTopSongs({
      id: artistId.value,
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    const ids = res.data.songs.map((item) => item.id);
    const songsDetail = await getMusicDetail(ids);

    if (songsDetail.data?.songs) {
      const newSongs = songsDetail.data.songs.map((item) => {
        return {
          ...item,
          picUrl: item.al.picUrl,
          song: {
            artists: item.ar,
            name: item.name,
            id: item.id
          }
        };
      });
      songs.value = page === 1 ? newSongs : [...songs.value, ...newSongs];
      songPage.value.hasMore = newSongs.length === pageSize;
      songPage.value.page++;
    } else {
      songPage.value.hasMore = false;
    }
  } catch (error) {
    console.error('加载歌曲失败:', error);
  } finally {
    songLoading.value = false;
  }
};

// 加载专辑
const loadAlbums = async () => {
  if (!artistId.value || !albumPage.value.hasMore || albumLoading.value) return;

  try {
    albumLoading.value = true;
    const { page, pageSize } = albumPage.value;
    const res = await getArtistAlbums({
      id: artistId.value,
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    if (res.data?.hotAlbums) {
      const newAlbums = res.data.hotAlbums;
      albums.value = page === 1 ? newAlbums : [...albums.value, ...newAlbums];
      albumPage.value.hasMore = newAlbums.length === pageSize;
      albumPage.value.page++;
    } else {
      albumPage.value.hasMore = false;
    }
  } catch (error) {
    console.error('加载专辑失败:', error);
  } finally {
    albumLoading.value = false;
  }
};

// 格式化发布时间
const formatPublishTime = (time: number) => {
  return useDateFormat(time, 'YYYY-MM-DD').value;
};

// 搜索相关方法
const showSearch = () => {
  isSearchVisible.value = true;
  // 添加一个小延迟后聚焦搜索框
  nextTick(() => {
    const inputEl = document.querySelector('.search-container input');
    if (inputEl) {
      (inputEl as HTMLInputElement).focus();
    }
  });
};

const closeSearch = () => {
  isSearchVisible.value = false;
  searchKeyword.value = '';
};

const handleSearchBlur = () => {
  // 如果搜索框为空，则在失焦时关闭搜索框
  if (!searchKeyword.value) {
    setTimeout(() => {
      isSearchVisible.value = false;
    }, 200);
  }
};

// 过滤歌曲列表
const filteredSongs = computed(() => {
  if (!searchKeyword.value) {
    return songs.value;
  }

  const keyword = searchKeyword.value.toLowerCase().trim();
  return songs.value.filter((song) => {
    const songName = song.name?.toLowerCase() || '';
    const albumName = song.al?.name?.toLowerCase() || '';
    const artists = song.ar || song.artists || [];

    // 原始文本匹配
    const nameMatch = songName.includes(keyword);
    const albumMatch = albumName.includes(keyword);
    const artistsMatch = artists.some((artist: any) => {
      return artist.name?.toLowerCase().includes(keyword);
    });

    // 拼音匹配
    const namePinyinMatch = song.name && PinyinMatch.match(song.name, keyword);
    const albumPinyinMatch = song.al?.name && PinyinMatch.match(song.al.name, keyword);
    const artistsPinyinMatch = artists.some((artist: any) => {
      return artist.name && PinyinMatch.match(artist.name, keyword);
    });

    return (
      nameMatch ||
      albumMatch ||
      artistsMatch ||
      namePinyinMatch ||
      albumPinyinMatch ||
      artistsPinyinMatch
    );
  });
});

// 布局切换
const toggleLayout = () => {
  isCompactLayout.value = !isCompactLayout.value;
  localStorage.setItem('musicListLayout', isCompactLayout.value ? 'compact' : 'normal');
};

// 播放全部
const handlePlayAll = () => {
  if (filteredSongs.value.length === 0) return;

  playerStore.setPlayList(
    filteredSongs.value.map((song) => ({
      ...song,
      picUrl: song.al.picUrl
    }))
  );

  // 开始播放第一首
  playerStore.setPlay(filteredSongs.value[0]);

  message.success(t('comp.musicList.playAll'));
};

// 添加到播放列表
const addToPlaylist = () => {
  if (filteredSongs.value.length === 0) return;

  // 获取当前播放列表
  const currentList = playerStore.playList;

  // 添加歌曲到播放列表(避免重复添加)
  const newSongs = filteredSongs.value.filter(
    (song) => !currentList.some((item) => item.id === song.id)
  );

  if (newSongs.length === 0) {
    message.info(t('comp.musicList.songsAlreadyInPlaylist'));
    return;
  }

  // 合并到当前播放列表末尾
  const newList = [
    ...currentList,
    ...newSongs.map((song) => ({
      ...song,
      picUrl: song.al.picUrl
    }))
  ];

  playerStore.setPlayList(newList);

  message.success(t('comp.musicList.addToPlaylistSuccess', { count: newSongs.length }));
};

const handlePlay = (song?: any) => {
  // 如果传入了特定歌曲（点击单曲播放），则将其作为播放列表的第一首
  if (song) {
    const songList = [...filteredSongs.value];
    const index = songList.findIndex((item) => item.id === song.id);

    if (index !== -1) {
      // 将点击的歌曲移到第一位
      const clickedSong = songList.splice(index, 1)[0];
      songList.unshift(clickedSong);
    }

    playerStore.setPlayList(
      songList.map((item) => ({
        ...item,
        picUrl: item.al?.picUrl || item.picUrl
      }))
    );

    // 设置当前播放歌曲
    playerStore.setPlay(song);
  } else {
    // 默认行为：播放整个过滤后的列表
    playerStore.setPlayList(
      filteredSongs.value.map((item) => ({
        ...item,
        picUrl: item.al?.picUrl || item.picUrl
      }))
    );
  }
};

// 简化观察器设置
const setupObservers = () => {
  // 清理之前的观察器
  if (songsObserver) songsObserver.disconnect();
  if (albumsObserver) albumsObserver.disconnect();

  // 创建观察器(如果不存在)
  if (!songsObserver) {
    songsObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && songPage.value.hasMore) {
          loadSongs();
        }
      },
      { threshold: 0.1 }
    );
  }

  if (!albumsObserver) {
    albumsObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && albumPage.value.hasMore) {
          loadAlbums();
        }
      },
      { threshold: 0.1 }
    );
  }

  // 观察当前标签页的元素
  nextTick(() => {
    if (activeTab.value === 'songs' && songsLoadMoreRef.value) {
      songsObserver?.observe(songsLoadMoreRef.value);
    } else if (activeTab.value === 'albums' && albumsLoadMoreRef.value) {
      albumsObserver?.observe(albumsLoadMoreRef.value);
    }
  });
};

// 监听标签切换
watch(activeTab, () => {
  setupObservers();
});

// 监听引用元素的变化
watch([songsLoadMoreRef, albumsLoadMoreRef], () => {
  setupObservers();
});

// 搜索词变化时重新设置观察器
watch(searchKeyword, () => {
  nextTick(() => {
    setupObservers();
  });
});

onActivated(() => {
  // 确保当前路由是艺术家详情页
  if (route.name === 'artistDetail') {
    const currentId = route.params.id as string;

    // 滚动到顶部
    nextTick(() => {
      scrollbarRef.value?.scrollTo(0, 0);
    });

    // 首次加载或ID变化时加载数据
    if (!previousId.value || previousId.value !== currentId) {
      console.log('ID已变化，加载新数据');
      previousId.value = currentId;
      activeTab.value = 'songs';
      loadArtistInfo();
    }

    // 重新设置观察器
    setupObservers();
  }
});

onMounted(() => {
  // 首次挂载时加载数据
  if (route.params.id) {
    previousId.value = route.params.id as string;
    loadArtistInfo();
    setupObservers();
  }
});

onDeactivated(() => {
  // 断开观察器但不清除引用
  if (songsObserver) songsObserver.disconnect();
  if (albumsObserver) albumsObserver.disconnect();
});

onUnmounted(() => {
  // 完全清理观察器
  if (songsObserver) {
    songsObserver.disconnect();
    songsObserver = null;
  }
  if (albumsObserver) {
    albumsObserver.disconnect();
    albumsObserver = null;
  }
});

// 格式化歌曲（使用在列表中）
const formatSong = (item: any) => {
  if (!item) {
    return null;
  }
  return {
    ...item,
    picUrl: item.al?.picUrl || item.picUrl
  };
};
</script>

<style lang="scss" scoped>
/* Artist Detail Page Styles */
.artist-detail-page {
  position: relative;
}

/* Hero Section */
.hero-section {
  min-height: 200px;
}

/* Action Bar Sticky Behavior */
.action-bar {
  transition:
    background-color 0.3s,
    box-shadow 0.3s;
}

/* Tab Indicator Animation */
.tab-item {
  z-index: 1;
}

.tab-item > div {
  z-index: -1;
}

.tab-indicator-enter-active,
.tab-indicator-leave-active {
  transition: all 0.2s ease;
}

.tab-indicator-enter-from,
.tab-indicator-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Search Slide Animation */
.search-slide-enter-active,
.search-slide-leave-active {
  transition: all 0.25s ease;
}

.search-slide-enter-from,
.search-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
  margin-top: 0;
}

.search-slide-enter-to,
.search-slide-leave-from {
  max-height: 60px;
}

/* Virtual Song List */
.virtual-song-list {
  @apply w-full;
}

.song-list {
  @apply w-full;
}

/* CSS-based virtualization for performance */
.song-item-container {
  content-visibility: auto;
  contain-intrinsic-size: 0 72px; /* 预估高度，防止布局抖动 */
}

/* Compact layout - smaller item height */
.song-list.compact-mode .song-item-container {
  contain-intrinsic-size: 0 52px;
}

/* Album Card Animation */
.album-card {
  animation: fadeInUp 0.4s ease backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading Spinner */
.loading-spinner {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* Hover Effects */
.album-cover {
  transition: box-shadow 0.3s ease;
}

.album-card:hover .album-cover {
  @apply shadow-2xl shadow-primary/10;
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .hero-section {
    min-height: auto;
  }

  .action-bar {
    @apply py-2;
  }

  .tab-list {
    @apply w-full;
  }

  .tab-item {
    @apply flex-1 text-center;
  }
}

/* Focus states for accessibility */
button:focus-visible {
  @apply outline-none ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-neutral-900;
}

input:focus-visible {
  @apply outline-none ring-2 ring-primary/50;
}
</style>
