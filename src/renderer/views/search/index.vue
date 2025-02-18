<template>
  <div class="search-page">
    <n-layout
      v-if="isMobile ? !searchDetail : true"
      class="hot-search"
      :class="setAnimationClass('animate__fadeInDown')"
      :native-scrollbar="false"
    >
      <div class="title">{{ t('search.title.hotSearch') }}</div>
      <div class="hot-search-list">
        <template v-for="(item, index) in hotSearchData?.data" :key="index">
          <div
            :class="setAnimationClass('animate__bounceInLeft')"
            :style="setAnimationDelay(index, 10)"
            class="hot-search-item"
            @click.stop="loadSearch(item.searchWord, 1)"
          >
            <span class="hot-search-item-count" :class="{ 'hot-search-item-count-3': index < 3 }">{{
              index + 1
            }}</span>
            {{ item.searchWord }}
          </div>
        </template>
      </div>
    </n-layout>
    <!-- 搜索到的歌曲列表 -->
    <n-layout
      v-if="isMobile ? searchDetail : true"
      class="search-list"
      :class="setAnimationClass('animate__fadeInDown')"
      :native-scrollbar="false"
      @scroll="handleScroll"
    >
      <div v-if="searchDetail" class="title">
        <i
          class="ri-arrow-left-s-line mr-1 cursor-pointer hover:text-gray-500 hover:scale-110"
          @click="searchDetail = null"
        ></i>
        {{ hotKeyword }}
      </div>
      <div v-loading="searchDetailLoading" class="search-list-box">
        <template v-if="searchDetail">
          <div
            v-for="(item, index) in searchDetail?.songs"
            :key="item.id"
            :class="setAnimationClass('animate__bounceInRight')"
            :style="setAnimationDelay(index, 50)"
          >
            <song-item :item="item" @play="handlePlay" />
          </div>
          <template v-for="(list, key) in searchDetail">
            <template v-if="key.toString() !== 'songs'">
              <div
                v-for="(item, index) in list"
                :key="item.id"
                class="mb-3"
                :class="setAnimationClass('animate__bounceInRight')"
                :style="setAnimationDelay(index, 50)"
              >
                <search-item :item="item" />
              </div>
            </template>
          </template>
          <!-- 加载状态 -->
          <div v-if="isLoadingMore" class="loading-more">
            <n-spin size="small" />
            <span class="ml-2">{{ t('search.loading.more') }}</span>
          </div>
          <div v-if="!hasMore && searchDetail" class="no-more">{{ t('search.noMore') }}</div>
        </template>
        <!-- 搜索历史 -->
        <template v-else>
          <div class="search-history">
            <div class="search-history-header title">
              <span>{{ t('search.title.searchHistory') }}</span>
              <n-button text type="error" @click="clearSearchHistory">
                <template #icon>
                  <i class="ri-delete-bin-line"></i>
                </template>
                {{ t('search.button.clear') }}
              </n-button>
            </div>
            <div class="search-history-list">
              <n-tag
                v-for="(item, index) in searchHistory"
                :key="index"
                :class="setAnimationClass('animate__bounceIn')"
                :style="setAnimationDelay(index, 50)"
                class="search-history-item"
                round
                closable
                @click="handleSearchHistory(item)"
                @close="handleCloseSearchHistory(item)"
              >
                {{ item }}
              </n-tag>
            </div>
          </div>
        </template>
      </div>
    </n-layout>
  </div>
</template>

<script lang="ts" setup>
import { useDateFormat } from '@vueuse/core';
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';

import { getHotSearch } from '@/api/home';
import { getSearch } from '@/api/search';
import SearchItem from '@/components/common/SearchItem.vue';
import SongItem from '@/components/common/SongItem.vue';
import type { IHotSearch } from '@/type/search';
import { isMobile, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'Search'
});

const { t } = useI18n();
const route = useRoute();
const store = useStore();

const searchDetail = ref<any>();
const searchType = computed(() => store.state.searchType as number);
const searchDetailLoading = ref(false);
const searchHistory = ref<string[]>([]);

// 添加分页相关的状态
const ITEMS_PER_PAGE = 30; // 每页数量
const page = ref(0);
const hasMore = ref(true);
const isLoadingMore = ref(false);
const currentKeyword = ref('');

// 从 localStorage 加载搜索历史
const loadSearchHistory = () => {
  const history = localStorage.getItem('searchHistory');
  searchHistory.value = history ? JSON.parse(history) : [];
};

// 保存搜索历史
const saveSearchHistory = (keyword: string) => {
  if (!keyword) return;
  const history = searchHistory.value;
  // 移除重复的关键词
  const index = history.indexOf(keyword);
  if (index > -1) {
    history.splice(index, 1);
  }
  // 添加到开头
  history.unshift(keyword);
  // 只保留最近的20条记录
  if (history.length > 20) {
    history.pop();
  }
  searchHistory.value = history;
  localStorage.setItem('searchHistory', JSON.stringify(history));
};

// 清空搜索历史
const clearSearchHistory = () => {
  searchHistory.value = [];
  localStorage.removeItem('searchHistory');
};

// 删除搜索历史
const handleCloseSearchHistory = (keyword: string) => {
  searchHistory.value = searchHistory.value.filter((item) => item !== keyword);
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value));
};

// 热搜列表
const hotSearchData = ref<IHotSearch>();
const loadHotSearch = async () => {
  const { data } = await getHotSearch();
  hotSearchData.value = data;
};

onMounted(() => {
  loadHotSearch();
  loadSearchHistory();
  loadSearch(route.query.keyword);
});

const hotKeyword = ref(route.query.keyword || t('search.title.searchList'));

watch(
  () => store.state.searchValue,
  (value) => {
    loadSearch(value);
  }
);

watch(
  () => searchType.value,
  () => {
    if (store.state.searchValue) {
      loadSearch(store.state.searchValue);
    }
  }
);

const dateFormat = (time: any) => useDateFormat(time, 'YYYY.MM.DD').value;
const loadSearch = async (keywords: any, type: any = null, isLoadMore = false) => {
  if (!keywords) return;

  if (!isLoadMore) {
    hotKeyword.value = keywords;
    searchDetail.value = undefined;
    page.value = 0;
    hasMore.value = true;
    currentKeyword.value = keywords;
  } else if (isLoadingMore.value || !hasMore.value) {
    return;
  }

  // 保存搜索历史
  if (!isLoadMore) {
    saveSearchHistory(keywords);
  }

  if (isLoadMore) {
    isLoadingMore.value = true;
  } else {
    searchDetailLoading.value = true;
  }

  try {
    const { data } = await getSearch({
      keywords: currentKeyword.value,
      type: type || searchType.value,
      limit: ITEMS_PER_PAGE,
      offset: page.value * ITEMS_PER_PAGE
    });

    const songs = data.result.songs || [];
    const albums = data.result.albums || [];
    const mvs = (data.result.mvs || []).map((item: any) => ({
      ...item,
      picUrl: item.cover,
      playCount: item.playCount,
      desc: item.artists.map((artist: any) => artist.name).join('/'),
      type: 'mv'
    }));

    const playlists = (data.result.playlists || []).map((item: any) => ({
      ...item,
      picUrl: item.coverImgUrl,
      playCount: item.playCount,
      desc: item.creator.nickname,
      type: 'playlist'
    }));

    // songs map 替换属性
    songs.forEach((item: any) => {
      item.picUrl = item.al.picUrl;
      item.artists = item.ar;
    });
    albums.forEach((item: any) => {
      item.desc = `${item.artist.name} ${item.company} ${dateFormat(item.publishTime)}`;
    });

    if (isLoadMore && searchDetail.value) {
      // 合并数据
      searchDetail.value.songs = [...searchDetail.value.songs, ...songs];
      searchDetail.value.albums = [...searchDetail.value.albums, ...albums];
      searchDetail.value.mvs = [...searchDetail.value.mvs, ...mvs];
      searchDetail.value.playlists = [...searchDetail.value.playlists, ...playlists];
    } else {
      searchDetail.value = {
        songs,
        albums,
        mvs,
        playlists
      };
    }

    // 判断是否还有更多数据
    hasMore.value =
      songs.length === ITEMS_PER_PAGE ||
      albums.length === ITEMS_PER_PAGE ||
      mvs.length === ITEMS_PER_PAGE ||
      playlists.length === ITEMS_PER_PAGE;

    page.value++;
  } catch (error) {
    console.error(t('search.error.searchFailed'), error);
  } finally {
    searchDetailLoading.value = false;
    isLoadingMore.value = false;
  }
};

// 添加滚动处理函数
const handleScroll = (e: any) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  // 距离底部100px时加载更多
  if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoadingMore.value && hasMore.value) {
    loadSearch(currentKeyword.value, null, true);
  }
};

watch(
  () => route.path,
  async (path) => {
    if (path === '/search') {
      store.state.searchValue = route.query.keyword;
    }
  }
);

const handlePlay = () => {
  const tracks = searchDetail.value?.songs || [];
  store.commit('setPlayList', tracks);
};

// 点击搜索历史
const handleSearchHistory = (keyword: string) => {
  loadSearch(keyword, 1);
};
</script>

<style lang="scss" scoped>
.search-page {
  @apply flex h-full;
}

.hot-search {
  @apply mr-4 rounded-xl flex-1 overflow-hidden;
  @apply bg-light-100 dark:bg-dark-100;
  animation-duration: 0.2s;
  min-width: 400px;
  height: 100%;

  &-list {
    @apply pb-28;
  }

  &-item {
    @apply px-4 py-3 text-lg rounded-xl cursor-pointer;
    @apply text-gray-900 dark:text-white;
    transition: all 0.3s ease;

    &:hover {
      @apply bg-light-100 dark:bg-dark-200;
    }

    &-count {
      @apply inline-block ml-3 w-8;
      @apply text-green-500;

      &-3 {
        @apply font-bold inline-block ml-3 w-8;
        @apply text-red-500;
      }
    }
  }
}

.search-list {
  @apply flex-1 rounded-xl;
  @apply bg-light-100 dark:bg-dark-100;
  height: 100%;
  animation-duration: 0.2s;

  &-box {
    @apply pb-28;
  }
}

.title {
  @apply text-xl font-bold my-2 mx-4;
  @apply text-gray-900 dark:text-white;
}

.search-history {
  &-header {
    @apply flex justify-between items-center mb-4;
    @apply text-gray-900 dark:text-white;
  }

  &-list {
    @apply flex flex-wrap gap-2 px-4;
  }

  &-item {
    @apply cursor-pointer;
    animation-duration: 0.2s;
  }
}

.mobile {
  .hot-search {
    @apply mr-0 w-full;
  }
}

.loading-more {
  @apply flex justify-center items-center py-4;
  @apply text-gray-500 dark:text-gray-400;
}

.no-more {
  @apply text-center py-4;
  @apply text-gray-500 dark:text-gray-400;
}
</style>
