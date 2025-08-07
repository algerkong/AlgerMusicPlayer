<template>
  <n-scrollbar v-loading="loading" class="artist-page">
    <!-- 歌手信息头部 -->
    <div class="artist-header">
      <div class="artist-cover">
        <n-image
          :src="getImgUrl(artistInfo?.avatar, '300y300')"
          class="artist-avatar"
          preview-disabled
        />
      </div>
      <div class="artist-info">
        <h1 class="artist-name">{{ artistInfo?.name }}</h1>
        <div v-if="artistInfo?.alias?.length" class="artist-alias">
          {{ artistInfo.alias.join(' / ') }}
        </div>
        <div v-if="artistInfo?.briefDesc" class="artist-desc">
          {{ artistInfo.briefDesc }}
        </div>
      </div>
    </div>

    <!-- 标签页切换 -->
    <n-tabs v-model:value="activeTab" class="content-tabs" type="line" animated>
      <n-tab-pane name="songs" :tab="t('artist.hotSongs')">
        <!-- 添加歌曲操作工具栏 -->
        <div class="songs-toolbar">
          <div class="toolbar-left">
            <n-tooltip placement="bottom" trigger="hover">
              <template #trigger>
                <div class="action-button hover-green" @click="handlePlayAll">
                  <i class="icon iconfont ri-play-fill"></i>
                </div>
              </template>
              {{ t('comp.musicList.playAll') }}
            </n-tooltip>

            <n-tooltip placement="bottom" trigger="hover">
              <template #trigger>
                <div class="action-button hover-green" @click="addToPlaylist">
                  <i class="icon iconfont ri-add-line"></i>
                </div>
              </template>
              {{ t('comp.musicList.addToPlaylist') }}
            </n-tooltip>
          </div>

          <div class="toolbar-right">
            <!-- 布局切换按钮 -->
            <div class="layout-toggle" v-if="!isMobile">
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <div class="toggle-button hover-green" @click="toggleLayout">
                    <i
                      class="icon iconfont"
                      :class="isCompactLayout ? 'ri-list-check-2' : 'ri-grid-line'"
                    ></i>
                  </div>
                </template>
                {{
                  isCompactLayout
                    ? t('comp.musicList.switchToNormal')
                    : t('comp.musicList.switchToCompact')
                }}
              </n-tooltip>
            </div>

            <!-- 搜索框 -->
            <div class="search-container" :class="{ 'search-expanded': isSearchVisible }">
              <template v-if="isSearchVisible">
                <n-input
                  v-model:value="searchKeyword"
                  :placeholder="t('comp.musicList.searchSongs')"
                  clearable
                  round
                  size="small"
                  @blur="handleSearchBlur"
                >
                  <template #prefix>
                    <i class="icon iconfont ri-search-line text-sm"></i>
                  </template>
                  <template #suffix>
                    <i
                      class="icon iconfont ri-close-line text-sm cursor-pointer"
                      @click="closeSearch"
                    ></i>
                  </template>
                </n-input>
              </template>
              <template v-else>
                <n-tooltip placement="bottom" trigger="hover">
                  <template #trigger>
                    <div class="search-button" @click="showSearch">
                      <i class="icon iconfont ri-search-line"></i>
                    </div>
                  </template>
                  {{ t('comp.musicList.searchSongs') }}
                </n-tooltip>
              </template>
            </div>
          </div>
        </div>

        <div class="songs-list">
          <div class="song-list-content">
            <div v-if="filteredSongs.length === 0 && searchKeyword" class="no-result">
              {{ t('comp.musicList.noSearchResults') }}
            </div>

            <!-- 替换原来的 v-for 循环为虚拟列表 -->
            <n-virtual-list
              ref="songListRef"
              class="song-virtual-list"
              style="height: calc(80vh - 60px)"
              :items="filteredSongs"
              :item-size="isCompactLayout ? 50 : 70"
              item-resizable
              key-field="id"
              @scroll="handleVirtualScroll"
            >
              <template #default="{ item, index }">
                <div>
                  <div class="double-item">
                    <song-item
                      :index="index"
                      :compact="isCompactLayout"
                      :item="formatSong(item)"
                      @play="handlePlay"
                    />
                  </div>
                  <div v-if="index === filteredSongs.length - 1" class="h-36"></div>
                </div>
              </template>
            </n-virtual-list>

            <div v-if="songLoading" class="loading-more">{{ t('common.loading') }}</div>
            <div
              v-else-if="songPage.hasMore"
              ref="songsLoadMoreRef"
              class="load-more-trigger"
            ></div>
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane name="albums" :tab="t('artist.albums')">
        <div class="albums-list">
          <div class="albums-grid">
            <search-item
              v-for="album in albums"
              :key="album.id"
              shape="square"
              :item="{
                id: album.id,
                picUrl: album.picUrl,
                name: album.name,
                desc: formatPublishTime(album.publishTime),
                size: album.size,
                type: '专辑'
              }"
            />
            <div v-if="albumLoading" class="loading-more">{{ t('common.loading') }}</div>
            <div
              v-else-if="albumPage.hasMore"
              ref="albumsLoadMoreRef"
              class="load-more-trigger"
            ></div>
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane name="about" :tab="t('artist.description')">
        <div class="artist-description">
          <div class="description-content" v-html="artistInfo?.briefDesc"></div>
        </div>
      </n-tab-pane>
    </n-tabs>

    <play-bottom />
  </n-scrollbar>
</template>

<script setup lang="ts">
import { useDateFormat } from '@vueuse/core';
import { useMessage } from 'naive-ui';
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
import PlayBottom from '@/components/common/PlayBottom.vue';
import SearchItem from '@/components/common/SearchItem.vue';
import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store';
import { IArtist } from '@/types/artist';
import { getImgUrl, isMobile } from '@/utils';

defineOptions({
  name: 'ArtistDetail'
});

const { t } = useI18n();
const route = useRoute();
const playerStore = usePlayerStore();
const message = useMessage();

const artistId = computed(() => Number(route.params.id));
const activeTab = ref('songs');

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

// 加载歌手信息
const loadArtistInfo = async () => {
  if (!artistId.value) return;

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

// 定义在script setup部分
const songListRef = ref(null);

// 格式化歌曲（使用在虚拟列表中）
const formatSong = (item: any) => {
  if (!item) {
    return null;
  }
  return {
    ...item,
    picUrl: item.al?.picUrl || item.picUrl
  };
};

// 处理虚拟列表滚动
const handleVirtualScroll = (e: any) => {
  if (!e || !e.target) return;

  const { scrollTop, scrollHeight, clientHeight } = e.target;
  const threshold = 200;

  if (
    scrollHeight - scrollTop - clientHeight < threshold &&
    !songLoading.value &&
    songPage.value.hasMore &&
    !searchKeyword.value // 搜索状态下不触发加载更多
  ) {
    loadSongs();
  }
};
</script>

<style lang="scss" scoped>
.artist-page {
  @apply min-h-screen w-full bg-light dark:bg-dark pb-24;

  .nav-header {
    @apply flex items-center px-4 py-3 sticky top-0 bg-light dark:bg-dark z-10;

    i {
      @apply text-xl mr-4 cursor-pointer;
    }

    .page-title {
      @apply text-base font-medium truncate;
    }
  }

  .artist-header {
    @apply flex flex-col md:flex-row gap-4 md:gap-6 px-4 pb-4;

    .artist-cover {
      @apply flex justify-center md:justify-start;

      .artist-avatar {
        @apply w-40 h-40 md:w-48 md:h-48 rounded-2xl object-cover;
      }
    }

    .artist-info {
      @apply flex-1;

      .artist-name {
        @apply text-2xl md:text-4xl font-bold mb-2 text-center md:text-left;
      }

      .artist-alias {
        @apply text-gray-500 dark:text-gray-400 mb-2 text-center md:text-left;
      }

      .artist-desc {
        @apply text-sm text-gray-600 dark:text-gray-300 line-clamp-3 text-center md:text-left;
      }
    }
  }

  .content-tabs {
    @apply px-4;

    :deep(.n-tabs-nav) {
      @apply sticky top-0 bg-light dark:bg-dark z-10;
    }
  }

  .albums-grid {
    @apply grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 pb-40;
  }

  .loading-more {
    @apply text-center py-4 text-gray-500 dark:text-gray-400;
  }

  .load-more-trigger {
    @apply h-4 w-full;
  }

  .artist-description {
    .description-content {
      @apply text-sm leading-relaxed whitespace-pre-wrap;
    }
  }

  // 添加歌曲工具栏样式
  .songs-toolbar {
    @apply flex items-center justify-between mb-4;

    .toolbar-left,
    .toolbar-right {
      @apply flex items-center gap-2;
    }
  }

  // 搜索框样式
  .search-container {
    @apply max-w-md transition-all duration-300 ease-in-out;

    &.search-expanded {
      @apply w-52;
    }

    .search-button {
      @apply w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-light-300 dark:hover:bg-dark-300 transition-colors text-gray-500 dark:text-gray-400 hover:text-green-500;

      .icon {
        @apply text-lg;
      }
    }

    :deep(.n-input) {
      @apply bg-light-200 dark:bg-dark-200;
    }
  }

  // 操作按钮样式
  .layout-toggle .toggle-button,
  .action-button {
    @apply w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-light-300 dark:hover:bg-dark-300 transition-colors text-gray-500 dark:text-gray-400;

    .icon {
      @apply text-lg;
    }

    &.hover-green:hover {
      .icon {
        @apply text-green-500;
      }
    }
  }

  // 搜索无结果样式
  .no-result {
    @apply text-center py-8 text-gray-500 dark:text-gray-400;
  }

  // 虚拟列表样式
  .song-virtual-list {
    :deep(.n-virtual-list__scroll) {
      scrollbar-width: thin;
      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-thumb {
        @apply bg-gray-400 dark:bg-gray-600 rounded;
      }
    }
  }

  .double-item {
    @apply mb-2 bg-light-100 bg-opacity-30 dark:bg-dark-100 dark:bg-opacity-20 rounded-3xl;
  }
}

.mobile {
  .songs-toolbar {
    @apply mb-0;
  }
}
</style>
