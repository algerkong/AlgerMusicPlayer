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
        <div class="songs-list">
          <div class="song-list-content">
            <song-item
              v-for="song in songs"
              :key="song.id"
              :item="song"
              :list="true"
              @play="handlePlay"
            />
            <div v-if="songLoading" class="loading-more">{{ t('common.loading') }}</div>
            <div v-else-if="songPage.hasMore" ref="songsLoadMoreRef" class="load-more-trigger"></div>
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
            <div v-else-if="albumPage.hasMore" ref="albumsLoadMoreRef" class="load-more-trigger"></div>
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
import { useDateFormat, useThrottleFn } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { getArtistAlbums, getArtistDetail, getArtistTopSongs } from '@/api/artist';
import { getMusicDetail } from '@/api/music';
import PlayBottom from '@/components/common/PlayBottom.vue';
import SearchItem from '@/components/common/SearchItem.vue';
import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store';
import { IArtist } from '@/type/artist';
import { getImgUrl } from '@/utils';

const { t } = useI18n();
const route = useRoute();
const playerStore = usePlayerStore();

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

// 加载歌手信息
const loadArtistInfo = async () => {
  if (!artistId.value) return;

  loading.value = true;
  try {
    const info = await getArtistDetail(artistId.value);
    if (info.data?.data?.artist) {
      artistInfo.value = info.data.data.artist;
    }
    // 重置分页并加载初始数据
    resetPagination();
    await Promise.all([loadSongs(), loadAlbums()]);
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

const handlePlay = () => {
  playerStore.setPlayList(
    songs.value.map((item) => ({
      ...item,
      picUrl: item.al.picUrl
    }))
  );
};

// 设置无限滚动观察器
const setupIntersectionObservers = () => {
  // 清除现有的观察器
  if (songsObserver) songsObserver.disconnect();
  if (albumsObserver) albumsObserver.disconnect();

  // 创建歌曲观察器
  songsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !songLoading.value && songPage.value.hasMore) {
      loadSongs();
    }
  }, { threshold: 0.1 });

  // 创建专辑观察器
  albumsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !albumLoading.value && albumPage.value.hasMore) {
      loadAlbums();
    }
  }, { threshold: 0.1 });

  // 监听标签页更改，重新设置观察器
  watch(activeTab, (newTab) => {
    nextTick(() => {
      if (newTab === 'songs' && songsLoadMoreRef.value && songPage.value.hasMore) {
        songsObserver?.observe(songsLoadMoreRef.value);
      } else if (newTab === 'albums' && albumsLoadMoreRef.value && albumPage.value.hasMore) {
        albumsObserver?.observe(albumsLoadMoreRef.value);
      }
    });
  });

  // 监听引用元素的变化
  watch(songsLoadMoreRef, (el) => {
    if (el && activeTab.value === 'songs' && songPage.value.hasMore) {
      songsObserver?.observe(el);
    }
  });

  watch(albumsLoadMoreRef, (el) => {
    if (el && activeTab.value === 'albums' && albumPage.value.hasMore) {
      albumsObserver?.observe(el);
    }
  });
};

onMounted(() => {
  loadArtistInfo();
  
  // 添加nextTick以确保DOM已更新
  nextTick(() => {
    setupIntersectionObservers();
  });
});

onUnmounted(() => {
  // 清理观察器
  if (songsObserver) songsObserver.disconnect();
  if (albumsObserver) albumsObserver.disconnect();
});

// 监听路由参数变化
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadArtistInfo();
      // 添加nextTick以确保DOM已更新
      nextTick(() => {
        setupIntersectionObservers();
      });
    }
  }
);
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
    @apply grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6;
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
}
</style>
