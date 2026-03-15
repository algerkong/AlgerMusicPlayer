<template>
  <div
    class="search-result-page h-full w-full bg-white dark:bg-black transition-colors duration-500"
  >
    <n-scrollbar class="h-full" @scroll="handleScroll">
      <div class="search-result-content pb-32">
        <!-- Header Section -->
        <section class="header-section page-padding-x pt-8 pb-6">
          <div class="flex flex-col gap-6">
            <div>
              <h1
                ref="titleElRef"
                class="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-1"
              >
                {{ currentKeyword }}
              </h1>
              <p class="text-neutral-500 dark:text-neutral-400">
                {{ t('search.title.searchList') }}
              </p>
            </div>

            <!-- Search Type Tabs -->
            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                v-for="type in searchTypeOptions"
                :key="type.key"
                class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap"
                :class="
                  searchType === type.key
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                "
                @click="handleTypeChange(type.key)"
              >
                {{ type.label }}
              </button>
            </div>
          </div>
        </section>

        <!-- Action Bar (Sticky) -->
        <section
          v-if="searchDetail?.songs?.length && searchType === SEARCH_TYPE.MUSIC"
          class="action-bar sticky top-0 z-20 page-padding-x py-3 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-800/50"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <!-- Play All Button -->
              <button
                class="play-all-btn flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
                @click="handlePlayAll"
              >
                <i class="ri-play-circle-line text-lg" />
                <span>{{ t('search.button.playAll') }}</span>
              </button>

              <!-- Batch Actions -->
              <div
                v-if="isElectron"
                class="h-8 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-1 hidden md:block"
              ></div>

              <button
                v-if="!isSelecting && isElectron"
                class="action-btn-icon w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                @click="startSelect"
              >
                <i class="ri-checkbox-multiple-line text-lg" />
              </button>

              <div
                v-if="isSelecting"
                class="flex items-center gap-2 animate-in fade-in slide-in-from-left-2"
              >
                <n-checkbox
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @update:checked="handleSelectAll"
                >
                  {{ t('common.selectAll') }}
                </n-checkbox>
                <button
                  class="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                  :disabled="selectedSongs.length === 0 || isDownloading"
                  @click="handleBatchDownload"
                >
                  <i class="ri-download-line mr-1" />
                  {{ t('favorite.download', { count: selectedSongs.length }) }}
                </button>
                <button
                  class="text-xs text-neutral-400 hover:text-neutral-600"
                  @click="cancelSelect"
                >
                  {{ t('common.cancel') }}
                </button>
              </div>
            </div>

            <!-- Right Tools -->
            <div class="flex items-center gap-3">
              <!-- Layout Toggle -->
              <button
                v-if="!isMobile"
                class="action-btn-icon w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                @click="toggleLayout"
              >
                <i :class="isCompactLayout ? 'ri-list-check-2' : 'ri-grid-line'" class="text-lg" />
              </button>
            </div>
          </div>
        </section>

        <!-- Results Section -->
        <section class="results-section page-padding-x mt-6">
          <n-spin :show="searchDetailLoading">
            <div
              v-if="searchDetailLoading && !isLoadingMore"
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <div v-for="i in 12" :key="i" class="space-y-3">
                <div class="aspect-square skeleton-shimmer rounded-2xl" />
                <div class="h-4 w-3/4 skeleton-shimmer rounded-lg" />
              </div>
            </div>

            <template v-else>
              <!-- Music List Style (Songs) -->
              <div v-if="searchType === SEARCH_TYPE.MUSIC" class="song-results-list">
                <div
                  v-for="(item, index) in searchDetail?.songs"
                  :key="item.id"
                  class="mb-2 animate-item"
                  :style="{ animationDelay: calculateAnimationDelay(index % 30, 0.04) }"
                >
                  <song-item
                    :index="index"
                    :item="formatSong(item)"
                    :compact="isCompactLayout"
                    :selectable="isSelecting"
                    :selected="selectedSongs.includes(item.id)"
                    :is-next="true"
                    @play="handlePlay"
                    @select="(id, selected) => handleSelect(id, selected)"
                  />
                </div>
              </div>

              <!-- Grid Style (Albums, Playlists, MVs, Radios) -->
              <div v-else>
                <!-- MV Grid (Needs fewer columns) -->
                <div
                  v-if="searchType === SEARCH_TYPE.MV"
                  class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                >
                  <div
                    v-for="(item, index) in searchDetail?.mvs"
                    :key="item.id"
                    class="animate-item"
                    :style="{ animationDelay: calculateAnimationDelay(index % 30, 0.04) }"
                  >
                    <search-item :item="item" />
                  </div>
                </div>

                <!-- Others (Albums, Playlists, Radios) -->
                <div
                  v-else
                  class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                >
                  <template v-for="(list, key) in searchDetail" :key="key">
                    <template
                      v-if="
                        key.toString() !== 'songs' &&
                        key.toString() !== 'djRadios' &&
                        key.toString() !== 'mvs'
                      "
                    >
                      <div
                        v-for="(item, index) in list"
                        :key="item.id"
                        class="animate-item"
                        :style="{ animationDelay: calculateAnimationDelay(index % 30, 0.04) }"
                      >
                        <search-item :item="item" />
                      </div>
                    </template>

                    <!-- Handle djRadios specifically if they are in searchDetail -->
                    <template v-if="key.toString() === 'djRadios'">
                      <div
                        v-for="(item, index) in searchDetail.djRadios"
                        :key="item.id"
                        class="animate-item"
                        :style="{ animationDelay: calculateAnimationDelay(index % 30, 0.04) }"
                      >
                        <search-item :item="item" />
                      </div>
                    </template>
                  </template>
                </div>
              </div>

              <!-- Empty State -->
              <div
                v-if="!searchDetailLoading && isResultEmpty"
                class="flex flex-col items-center justify-center py-20 text-neutral-400"
              >
                <i class="ri-search-line text-6xl mb-4 opacity-20"></i>
                <p>{{ t('comp.musicList.noSearchResults') }}</p>
              </div>

              <!-- Loading More / Footer -->
              <div class="mt-12 py-8 border-t border-neutral-100 dark:border-neutral-800">
                <div v-if="isLoadingMore" class="flex flex-col items-center gap-4">
                  <n-spin size="small" />
                  <span class="text-xs text-neutral-400 font-medium tracking-widest uppercase">
                    {{ t('search.loading.more') }}
                  </span>
                </div>
                <div v-if="!hasMore && !isResultEmpty" class="text-center">
                  <span
                    class="text-xs text-neutral-400 font-medium tracking-widest uppercase opacity-50"
                  >
                    — {{ t('search.noMore') }} —
                  </span>
                </div>
              </div>
            </template>
          </n-spin>
        </section>
      </div>
    </n-scrollbar>
    <play-bottom />
  </div>
</template>

<script lang="ts" setup>
import { useDateFormat } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { getSearch } from '@/api/search';
import PlayBottom from '@/components/common/PlayBottom.vue';
import SearchItem from '@/components/common/SearchItem.vue';
import SongItem from '@/components/common/SongItem.vue';
import { SEARCH_TYPE, SEARCH_TYPES } from '@/const/bar-const';
import { useDownload } from '@/hooks/useDownload';
import { useScrollTitle } from '@/hooks/useScrollTitle';
import { usePlayerStore } from '@/store/modules/player';
import { useSearchStore } from '@/store/modules/search';
import type { SongResult } from '@/types/music';
import { calculateAnimationDelay, isElectron, isMobile } from '@/utils';

defineOptions({
  name: 'SearchResult'
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();
const searchStore = useSearchStore();

const formatSong = (item: any) => {
  if (!item) return null;
  return {
    ...item,
    picUrl: item.al?.picUrl || item.picUrl,
    song: {
      artists: item.ar || item.artists,
      name: item.name,
      id: item.id
    }
  };
};

const searchDetail = ref<any>();
const searchType = computed(() => searchStore.searchType as number);
const searchDetailLoading = ref(false);

const ITEMS_PER_PAGE = 30;
const page = ref(0);
const hasMore = ref(true);
const isLoadingMore = ref(false);
const currentKeyword = computed(() => (route.query.keyword as string) || '');

const titleElRef = ref<HTMLElement | null>(null);
useScrollTitle(currentKeyword, titleElRef);

const searchTypeOptions = computed(() => {
  return SEARCH_TYPES.map((type) => ({
    label: t(type.label),
    key: type.key
  }));
});

const isResultEmpty = computed(() => {
  if (!searchDetail.value) return false;
  return Object.values(searchDetail.value).every((list: any) => !list || list.length === 0);
});

const isSelecting = ref(false);
const selectedSongs = ref<number[]>([]);
const { isDownloading, batchDownloadMusic } = useDownload();
const isCompactLayout = ref(
  isMobile.value ? false : localStorage.getItem('musicListLayout') === 'compact'
);

const startSelect = () => {
  isSelecting.value = true;
  selectedSongs.value = [];
};

const cancelSelect = () => {
  isSelecting.value = false;
  selectedSongs.value = [];
};

const handleSelect = (id: number, selected: boolean) => {
  if (selected) {
    if (!selectedSongs.value.includes(id)) {
      selectedSongs.value.push(id);
    }
  } else {
    selectedSongs.value = selectedSongs.value.filter((i) => i !== id);
  }
};

const isAllSelected = computed(
  () =>
    searchDetail.value?.songs?.length > 0 &&
    selectedSongs.value.length === searchDetail.value.songs.length
);

const isIndeterminate = computed(
  () =>
    selectedSongs.value.length > 0 &&
    selectedSongs.value.length < (searchDetail.value?.songs?.length || 0)
);

const handleSelectAll = (checked: boolean) => {
  selectedSongs.value = checked ? searchDetail.value.songs.map((s: any) => s.id) : [];
};

const handleBatchDownload = async () => {
  const list = selectedSongs.value
    .map((id) => searchDetail.value.songs.find((s: any) => s.id === id))
    .filter((s) => s)
    .map(formatSong) as SongResult[];
  await batchDownloadMusic(list);
  cancelSelect();
};

const toggleLayout = () => {
  isCompactLayout.value = !isCompactLayout.value;
  localStorage.setItem('musicListLayout', isCompactLayout.value ? 'compact' : 'normal');
};

const loadSearch = async (isLoadMore = false) => {
  const keywords = currentKeyword.value;
  if (!keywords) return;

  const type = searchType.value;

  if (!isLoadMore) {
    searchDetail.value = undefined;
    page.value = 0;
    hasMore.value = true;
    searchDetailLoading.value = true;
  } else {
    if (isLoadingMore.value || !hasMore.value) return;
    isLoadingMore.value = true;
  }

  try {
    const { data } = await getSearch({
      keywords,
      type,
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

    const djRadios = (data.result.djRadios || []).map((item: any) => ({
      ...item,
      picUrl: item.picUrl,
      desc: item.dj.nickname,
      type: 'djRadio'
    }));

    songs.forEach((item: any) => {
      item.picUrl = item.al.picUrl;
      item.artists = item.ar;
    });
    albums.forEach((item: any) => {
      item.type = '专辑';
      item.desc = `${item.artist.name} ${item.company} ${dateFormat(item.publishTime)}`;
    });

    if (isLoadMore && searchDetail.value) {
      searchDetail.value.songs = [...(searchDetail.value.songs || []), ...songs];
      searchDetail.value.albums = [...(searchDetail.value.albums || []), ...albums];
      searchDetail.value.mvs = [...(searchDetail.value.mvs || []), ...mvs];
      searchDetail.value.playlists = [...(searchDetail.value.playlists || []), ...playlists];
      searchDetail.value.djRadios = [...(searchDetail.value.djRadios || []), ...djRadios];
    } else {
      searchDetail.value = { songs, albums, mvs, playlists, djRadios };
    }

    hasMore.value =
      songs.length === ITEMS_PER_PAGE ||
      albums.length === ITEMS_PER_PAGE ||
      mvs.length === ITEMS_PER_PAGE ||
      playlists.length === ITEMS_PER_PAGE ||
      djRadios.length === ITEMS_PER_PAGE;

    page.value++;
  } catch (error) {
    console.error(t('search.error.searchFailed'), error);
  } finally {
    searchDetailLoading.value = false;
    isLoadingMore.value = false;
  }
};

const handleTypeChange = (type: number) => {
  searchStore.searchType = type;
  router.replace({
    path: '/search-result',
    query: {
      ...route.query,
      type
    }
  });
};

const handleScroll = (e: any) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoadingMore.value && hasMore.value) {
    loadSearch(true);
  }
};

const dateFormat = (time: any) => useDateFormat(time, 'YYYY.MM.DD').value;

const handlePlay = (item: any) => {
  playerStore.addToNextPlay(item);
};

const handlePlayAll = () => {
  if (!searchDetail.value?.songs?.length) return;
  const songs = searchDetail.value.songs.map(formatSong);
  playerStore.setPlayList(songs);
  if (songs[0]) {
    playerStore.setPlay(songs[0]);
  }
};

onMounted(() => {
  if (route.query.type) {
    searchStore.searchType = Number(route.query.type);
  }
  if (currentKeyword.value) {
    loadSearch();
  }
});

watch(
  () => [route.query.keyword, route.query.type],
  () => {
    if (route.name === 'searchResult') {
      if (route.query.type) {
        searchStore.searchType = Number(route.query.type);
      }
      loadSearch();
    }
  }
);
</script>

<style lang="scss" scoped>
.search-result-page {
  position: relative;
}

.animate-item {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
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

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
