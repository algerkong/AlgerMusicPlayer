<template>
  <div class="mobile-search-result">
    <!-- 搜索结果头部 -->
    <div class="result-header" :class="{ 'safe-area-top': hasSafeArea }">
      <div class="header-back" @click="goBack">
        <i class="ri-arrow-left-s-line"></i>
      </div>
      <div class="header-keyword">{{ keyword }}</div>
      <div class="header-actions">
        <div class="action-btn" @click="openSearch">
          <i class="ri-search-line"></i>
        </div>
      </div>
    </div>

    <!-- 搜索类型标签 -->
    <div class="search-types">
      <div
        v-for="type in searchTypes"
        :key="type.key"
        class="type-tag"
        :class="{ active: searchType === type.key }"
        @click="selectType(type.key)"
      >
        {{ type.label }}
      </div>
    </div>

    <!-- 搜索结果列表 -->
    <div class="result-content" @scroll="handleScroll">
      <!-- 加载中 -->
      <div v-if="loading && !results.length" class="loading-state">
        <n-spin size="medium" />
        <span class="ml-2">{{ t('search.loading.searching') }}</span>
      </div>

      <!-- 搜索结果 -->
      <div v-else-if="results.length" class="result-list">
        <!-- 歌曲搜索 -->
        <template v-if="searchType === SEARCH_TYPE.MUSIC">
          <song-item
            v-for="item in results"
            :key="item.id"
            :item="item"
            :is-next="true"
            @play="handlePlay"
          />
        </template>

        <!-- 专辑/歌单/MV 搜索 -->
        <template v-else>
          <search-item v-for="item in results" :key="item.id" :item="item" class="mb-3" />
        </template>

        <!-- 加载更多 -->
        <div v-if="isLoadingMore" class="loading-more">
          <n-spin size="small" />
          <span class="ml-2">{{ t('search.loading.more') }}</span>
        </div>

        <!-- 没有更多 -->
        <div v-if="!hasMore && results.length" class="no-more">
          {{ t('search.noMore') }}
        </div>
      </div>

      <!-- 无结果 -->
      <div v-else-if="!loading" class="empty-state">
        <i class="ri-search-line"></i>
        <span>{{ t('comp.musicList.noSearchResults') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { getSearch } from '@/api/search';
import SearchItem from '@/components/common/SearchItem.vue';
import SongItem from '@/components/common/SongItem.vue';
import { SEARCH_TYPE, SEARCH_TYPES } from '@/const/bar-const';
import { usePlayerStore } from '@/store/modules/player';
import { useSearchStore } from '@/store/modules/search';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();
const searchStore = useSearchStore();

// 注入是否有安全区域
const hasSafeArea = inject('hasSafeArea', false);

// 搜索关键词
const keyword = ref((route.query.keyword as string) || '');

// 搜索类型
const searchType = ref(Number(route.query.type) || searchStore.searchType || 1);
const searchTypes = computed(() => {
  locale.value;
  return SEARCH_TYPES.map((type) => ({
    label: t(type.label),
    key: type.key
  }));
});

// 搜索结果
const results = ref<any[]>([]);
const loading = ref(false);

// 分页
const ITEMS_PER_PAGE = 30;
const page = ref(1);
const hasMore = ref(true);
const isLoadingMore = ref(false);

// 执行搜索
const performSearch = async (isLoadMore = false) => {
  if (!keyword.value) return;

  if (isLoadMore) {
    if (!hasMore.value || isLoadingMore.value) return;
    isLoadingMore.value = true;
  } else {
    loading.value = true;
    results.value = [];
    page.value = 1;
    hasMore.value = true;
  }

  try {
    // 歌曲搜索
    if (searchType.value === SEARCH_TYPE.MUSIC) {
      const { data } = await getSearch({
        keywords: keyword.value,
        type: searchType.value,
        limit: ITEMS_PER_PAGE,
        offset: (page.value - 1) * ITEMS_PER_PAGE
      });

      const songs = (data.result.songs || []).map((item: any) => ({
        ...item,
        picUrl: item.al?.picUrl,
        artists: item.ar
      }));

      if (isLoadMore) {
        results.value = [...results.value, ...songs];
      } else {
        results.value = songs;
      }

      hasMore.value = songs.length === ITEMS_PER_PAGE;
    }
    // 专辑搜索
    else if (searchType.value === SEARCH_TYPE.ALBUM) {
      const { data } = await getSearch({
        keywords: keyword.value,
        type: searchType.value,
        limit: ITEMS_PER_PAGE,
        offset: (page.value - 1) * ITEMS_PER_PAGE
      });

      const albums = (data.result.albums || []).map((item: any) => ({
        ...item,
        desc: `${item.artist?.name || ''} ${item.company || ''}`,
        type: 'album'
      }));

      if (isLoadMore) {
        results.value = [...results.value, ...albums];
      } else {
        results.value = albums;
      }

      hasMore.value = albums.length === ITEMS_PER_PAGE;
    }
    // 歌单搜索
    else if (searchType.value === SEARCH_TYPE.PLAYLIST) {
      const { data } = await getSearch({
        keywords: keyword.value,
        type: searchType.value,
        limit: ITEMS_PER_PAGE,
        offset: (page.value - 1) * ITEMS_PER_PAGE
      });

      const playlists = (data.result.playlists || []).map((item: any) => ({
        ...item,
        picUrl: item.coverImgUrl,
        playCount: item.playCount,
        desc: item.creator?.nickname || '',
        type: 'playlist'
      }));

      if (isLoadMore) {
        results.value = [...results.value, ...playlists];
      } else {
        results.value = playlists;
      }

      hasMore.value = playlists.length === ITEMS_PER_PAGE;
    }
    // MV 搜索
    else if (searchType.value === SEARCH_TYPE.MV) {
      const { data } = await getSearch({
        keywords: keyword.value,
        type: searchType.value,
        limit: ITEMS_PER_PAGE,
        offset: (page.value - 1) * ITEMS_PER_PAGE
      });

      const mvs = (data.result.mvs || []).map((item: any) => ({
        ...item,
        picUrl: item.cover,
        playCount: item.playCount,
        desc: item.artists?.map((artist: any) => artist.name).join('/') || '',
        type: 'mv'
      }));

      if (isLoadMore) {
        results.value = [...results.value, ...mvs];
      } else {
        results.value = mvs;
      }

      hasMore.value = mvs.length === ITEMS_PER_PAGE;
    }

    page.value++;
  } catch (error) {
    console.error('搜索失败:', error);
  } finally {
    loading.value = false;
    isLoadingMore.value = false;
  }
};

// 选择搜索类型
const selectType = (type: number) => {
  if (searchType.value === type) return;

  searchType.value = type;
  searchStore.searchType = type;

  // 更新路由查询参数
  router.replace({
    query: {
      ...route.query,
      type: type.toString()
    }
  });

  performSearch();
};

// 滚动加载更多
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const { scrollTop, scrollHeight, clientHeight } = target;

  if (scrollTop + clientHeight >= scrollHeight - 100) {
    performSearch(true);
  }
};

// 播放音乐
const handlePlay = (item: any) => {
  playerStore.addToNextPlay(item);
};

// 返回
const goBack = () => {
  router.back();
};

// 打开搜索
const openSearch = () => {
  router.push('/mobile-search');
};

// 监听路由变化
watch(
  () => route.query,
  (query) => {
    if (route.path === '/mobile-search-result' && query.keyword) {
      keyword.value = query.keyword as string;
      searchType.value = Number(query.type) || searchStore.searchType || 1;
      performSearch();
    }
  }
);

onMounted(() => {
  if (keyword.value) {
    performSearch();
  }
});
</script>

<style lang="scss" scoped>
.mobile-search-result {
  @apply fixed inset-0;
  @apply bg-light dark:bg-black;
  @apply flex flex-col;
}

.result-header {
  @apply flex items-center gap-3 px-4 py-3;
  @apply border-b border-gray-100 dark:border-gray-800;

  &.safe-area-top {
    padding-top: calc(var(--safe-area-inset-top, 0px) + 12px);
  }
}

.header-back {
  @apply flex items-center justify-center;
  @apply w-10 h-10 rounded-full text-xl;
  @apply text-gray-600 dark:text-gray-300;
  @apply active:bg-gray-100 dark:active:bg-gray-800;
}

.header-keyword {
  @apply flex-1 text-base font-medium;
  @apply text-gray-900 dark:text-white;
  @apply truncate;
}

.header-actions {
  @apply flex items-center gap-2;
}

.action-btn {
  @apply flex items-center justify-center;
  @apply w-10 h-10 rounded-full text-xl;
  @apply text-gray-600 dark:text-gray-300;
  @apply active:bg-gray-100 dark:active:bg-gray-800;
}

.search-types {
  @apply flex gap-2 px-4 py-3 overflow-x-auto;
  @apply border-b border-gray-100 dark:border-gray-800;

  &::-webkit-scrollbar {
    display: none;
  }
}

.type-tag {
  @apply px-4 py-1.5 rounded-full text-sm whitespace-nowrap;
  @apply bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300;
  @apply transition-colors duration-200;

  &.active {
    @apply bg-green-500 text-white;
  }
}

.result-content {
  @apply flex-1 overflow-y-auto;
}

.loading-state {
  @apply flex flex-col items-center justify-center py-20;
  @apply text-gray-500 dark:text-gray-400;
}

.result-list {
  @apply pb-20;
}

.loading-more {
  @apply flex justify-center items-center py-4;
  @apply text-gray-500 dark:text-gray-400;
}

.no-more {
  @apply text-center py-4;
  @apply text-gray-500 dark:text-gray-400;
}

.empty-state {
  @apply flex flex-col items-center justify-center py-20;
  @apply text-gray-400 dark:text-gray-500;

  i {
    @apply text-6xl mb-4;
  }
}
</style>
