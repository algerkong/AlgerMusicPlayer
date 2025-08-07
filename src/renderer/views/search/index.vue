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
        <div v-if="searchDetail?.songs?.length" class="title-play-all">
          <div class="play-all-btn" @click="handlePlayAll">
            <i class="ri-play-circle-fill"></i>
            <span>{{ t('search.button.playAll') }}</span>
          </div>
        </div>
      </div>
      <div v-loading="searchDetailLoading" class="search-list-box">
        <template v-if="searchDetail">
          <!-- B站视频搜索结果 -->
          <template v-if="searchType === SEARCH_TYPE.BILIBILI">
            <div
              v-for="(item, index) in searchDetail?.bilibili"
              :key="item.bvid"
              :class="setAnimationClass('animate__bounceInRight')"
              :style="getSearchListAnimation(index)"
            >
              <bilibili-item :item="item" @play="handlePlayBilibili" />
            </div>
            <div v-if="isLoadingMore" class="loading-more">
              <n-spin size="small" />
              <span class="ml-2">{{ t('search.loading.more') }}</span>
            </div>
            <div v-if="!hasMore && searchDetail" class="no-more">{{ t('search.noMore') }}</div>
          </template>
          <!-- 原有音乐搜索结果 -->
          <template v-else>
            <div
              v-for="(item, index) in searchDetail?.songs"
              :key="item.id"
              :class="setAnimationClass('animate__bounceInRight')"
              :style="getSearchListAnimation(index)"
            >
              <song-item :item="item" @play="handlePlay" :is-next="true" />
            </div>
            <template v-for="(list, key) in searchDetail">
              <template v-if="key.toString() !== 'songs'">
                <div
                  v-for="(item, index) in list"
                  :key="item.id"
                  class="mb-3"
                  :class="setAnimationClass('animate__bounceInRight')"
                  :style="getSearchListAnimation(index)"
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
                :style="getSearchListAnimation(index)"
                class="search-history-item"
                round
                closable
                @click="handleSearchHistory(item)"
                @close="handleCloseSearchHistory(item)"
              >
                {{ item.keyword }}
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
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { getBilibiliProxyUrl, searchBilibili } from '@/api/bilibili';
import { getHotSearch } from '@/api/home';
import { getSearch } from '@/api/search';
import BilibiliItem from '@/components/common/BilibiliItem.vue';
import SearchItem from '@/components/common/SearchItem.vue';
import SongItem from '@/components/common/SongItem.vue';
import { SEARCH_TYPE } from '@/const/bar-const';
import { usePlayerStore } from '@/store/modules/player';
import { useSearchStore } from '@/store/modules/search';
import type { IBilibiliSearchResult } from '@/types/bilibili';
import type { IHotSearch } from '@/types/search';
import { isMobile, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'Search'
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();
const searchStore = useSearchStore();

const searchDetail = ref<any>();
const searchType = computed(() => searchStore.searchType as number);
const searchDetailLoading = ref(false);
const searchHistory = ref<Array<{ keyword: string; type: number }>>([]);

// 添加分页相关的状态
const ITEMS_PER_PAGE = 30; // 每页数量
const page = ref(0);
const hasMore = ref(true);
const isLoadingMore = ref(false);
const currentKeyword = ref('');

const getSearchListAnimation = (index: number) => {
  return setAnimationDelay(index % ITEMS_PER_PAGE, 50);
};

// 从 localStorage 加载搜索历史
const loadSearchHistory = () => {
  const history = localStorage.getItem('searchHistory');
  searchHistory.value = history ? JSON.parse(history) : [];
};

// 保存搜索历史，改为保存关键词和类型
const saveSearchHistory = (keyword: string, type: number) => {
  if (!keyword) return;
  const history = searchHistory.value;
  // 移除重复的关键词
  const index = history.findIndex((item) => item.keyword === keyword);
  if (index > -1) {
    history.splice(index, 1);
  }
  // 添加到开头
  history.unshift({ keyword, type });
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
const handleCloseSearchHistory = (item: { keyword: string; type: number }) => {
  searchHistory.value = searchHistory.value.filter((h) => h.keyword !== item.keyword);
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
  // 注意：路由参数的处理已经在 watch route.query 中处理了
});

const hotKeyword = ref(route.query.keyword || t('search.title.searchList'));

const loadSearch = async (keywords: any, type: any = null, isLoadMore = false) => {
  if (!keywords) return;

  // 使用传入的类型或当前类型
  const searchTypeToUse = type !== null ? type : searchType.value;

  if (!isLoadMore) {
    hotKeyword.value = keywords;
    searchDetail.value = undefined;
    page.value = 0;
    hasMore.value = true;
    currentKeyword.value = keywords;

    // 保存搜索历史
    saveSearchHistory(keywords, searchTypeToUse);

    // 始终更新搜索框内容和类型
    searchStore.searchType = searchTypeToUse;
    searchStore.searchValue = keywords;
  } else if (isLoadingMore.value || !hasMore.value) {
    return;
  }

  if (isLoadMore) {
    isLoadingMore.value = true;
  } else {
    searchDetailLoading.value = true;
  }

  try {
    // B站搜索
    if (searchTypeToUse === SEARCH_TYPE.BILIBILI) {
      const response = await searchBilibili({
        keyword: currentKeyword.value,
        page: page.value + 1,
        pagesize: ITEMS_PER_PAGE
      });
      console.log('response', response);

      const bilibiliVideos = response.data.data.result.map((item: any) => ({
        id: item.aid,
        bvid: item.bvid,
        title: item.title,
        author: item.author,
        pic: getBilibiliProxyUrl(item.pic),
        duration: item.duration,
        pubdate: item.pubdate,
        description: item.description,
        view: item.play,
        danmaku: item.video_review
      }));

      if (isLoadMore && searchDetail.value) {
        // 合并数据
        searchDetail.value.bilibili = [...searchDetail.value.bilibili, ...bilibiliVideos];
      } else {
        searchDetail.value = {
          bilibili: bilibiliVideos
        };
      }

      // 判断是否还有更多数据
      hasMore.value = bilibiliVideos.length === ITEMS_PER_PAGE;
    }
    // 音乐搜索
    else {
      const { data } = await getSearch({
        keywords: currentKeyword.value,
        type: searchTypeToUse,
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
    }

    page.value++;
  } catch (error) {
    console.error(t('search.error.searchFailed'), error);
  } finally {
    searchDetailLoading.value = false;
    isLoadingMore.value = false;
  }
};

watch(
  () => searchStore.searchValue,
  (value) => {
    loadSearch(value);
  }
);

watch(
  () => searchType.value,
  () => {
    if (searchStore.searchValue) {
      loadSearch(searchStore.searchValue);
    }
  }
);
// 修改 store.state 的访问
if (searchStore.searchValue) {
  loadSearch(searchStore.searchValue);
}

// 修改 store.state 的设置
searchStore.searchValue = route.query.keyword as string;

const dateFormat = (time: any) => useDateFormat(time, 'YYYY.MM.DD').value;

// 添加滚动处理函数
const handleScroll = (e: any) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  // 距离底部100px时加载更多
  if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoadingMore.value && hasMore.value) {
    loadSearch(currentKeyword.value, null, true);
  }
};

watch(
  () => route.query,
  (query) => {
    if (route.path === '/search' && query.keyword) {
      const routeKeyword = query.keyword as string;
      const routeType = query.type ? Number(query.type) : searchType.value;

      // 更新搜索类型和值
      searchStore.searchType = routeType;
      searchStore.searchValue = routeKeyword;

      // 加载搜索结果
      loadSearch(routeKeyword, routeType);
    }
  },
  { immediate: true }
);

const handlePlay = (item: any) => {
  // 添加到下一首
  playerStore.addToNextPlay(item);
};

// 点击搜索历史
const handleSearchHistory = (item: { keyword: string; type: number }) => {
  // 更新搜索类型
  searchStore.searchType = item.type;
  // 先更新搜索值到 store
  searchStore.searchValue = item.keyword;
  // 使用关键词和类型加载搜索
  loadSearch(item.keyword, item.type);
};

// 处理B站视频播放
const handlePlayBilibili = (item: IBilibiliSearchResult) => {
  // 使用路由导航到B站播放页面
  router.push(`/bilibili/${item.bvid}`);
};

const handlePlayAll = () => {
  if (!searchDetail.value?.songs?.length) return;

  // 设置播放列表为搜索结果中的所有歌曲
  playerStore.setPlayList(searchDetail.value.songs);

  // 开始播放第一首歌
  if (searchDetail.value.songs[0]) {
    playerStore.setPlay(searchDetail.value.songs[0]);
  }
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
  @apply text-xl font-bold my-2 mx-4 flex items-center;
  @apply text-gray-900 dark:text-white;

  &-play-all {
    @apply ml-auto;
  }
}

.play-all-btn {
  @apply flex items-center gap-1 px-3 py-1 rounded-full cursor-pointer transition-all;
  @apply text-sm font-normal text-gray-900 dark:text-white hover:bg-light-300 dark:hover:bg-dark-300 hover:text-green-500;

  i {
    @apply text-xl;
  }
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
