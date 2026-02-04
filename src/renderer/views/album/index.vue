<template>
  <div class="list-page h-full w-full bg-white dark:bg-black transition-colors duration-500">
    <!-- 专辑地区分类 - 保持固定在顶部 -->
    <div
      class="play-list-type border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black z-10"
    >
      <n-scrollbar ref="scrollbarRef" x-scrollable>
        <div class="categories-wrapper py-4 pr-4 sm:pr-6 lg:pr-8" @wheel.prevent="handleWheel">
          <span
            v-for="(item, index) in areas"
            :key="item.value"
            class="play-list-type-item"
            :class="[
              setAnimationClass('animate__bounceIn'),
              { active: currentArea === item.value }
            ]"
            :style="getAnimationDelay(index)"
            @click="handleClickArea(item)"
          >
            {{ item.name }}
          </span>
        </div>
      </n-scrollbar>
    </div>

    <!-- 专辑列表 -->
    <n-scrollbar
      ref="contentScrollbarRef"
      class="h-full"
      style="height: calc(100% - 73px)"
      :size="100"
      @scroll="handleScroll"
    >
      <div class="list-content w-full pb-32 pt-6 pr-4 sm:pr-6 lg:pr-8">
        <!-- 列表标题 -->
        <div class="mb-8">
          <h1 class="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            {{ currentAreaName }}
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400">{{ t('comp.newAlbum.title') }}</p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <!-- Loading State -->
          <template v-if="loading && page === 0">
            <div v-for="i in 15" :key="`loading-${i}`" class="space-y-3">
              <div
                class="aspect-square animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
              />
              <div class="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div class="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </template>

          <!-- Content State -->
          <template v-else>
            <div
              v-for="(album, index) in albumList"
              :key="album.id"
              class="list-card group cursor-pointer animate-item"
              :style="{ animationDelay: calculateAnimationDelay(index % TOTAL_ITEMS, 0.05) }"
              @click.stop="openAlbum(album)"
            >
              <!-- Cover Image -->
              <div
                class="relative aspect-square overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-all duration-500"
              >
                <img
                  :src="getImgUrl(album.picUrl, '400y400')"
                  :alt="album.name"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                  crossorigin="anonymous"
                />

                <!-- Play Overlay -->
                <div
                  class="absolute inset-0 bg-transparent group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center"
                >
                  <div
                    class="play-icon w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-xl"
                    @click.stop="playAlbum(album)"
                  >
                    <i class="ri-play-fill text-2xl text-neutral-900 ml-1"></i>
                  </div>
                </div>

                <!-- Album Size Badge -->
                <div
                  v-if="album.size"
                  class="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <i class="ri-music-2-fill"></i>
                  {{ album.size }} {{ t('comp.playlistDrawer.count') }}
                </div>
              </div>

              <!-- Info -->
              <div class="mt-3 space-y-1">
                <h3
                  class="text-sm md:text-base font-bold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors"
                >
                  {{ album.name }}
                </h3>
                <p
                  v-if="getArtistNames(album)"
                  class="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1"
                >
                  {{ getArtistNames(album) }}
                </p>
              </div>
            </div>
          </template>
        </div>

        <!-- 加载更多 -->
        <div v-if="isLoadingMore" class="flex justify-center items-center py-8">
          <n-spin size="small" />
          <span class="ml-2 text-neutral-500">{{ t('comp.homeListItem.loading') }}</span>
        </div>
        <div v-if="!hasMore && albumList.length > 0" class="text-center py-8 text-neutral-500">
          {{ t('comp.recommendSonglist.empty') }}
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { getNewAlbums } from '@/api/album';
import { getAlbum } from '@/api/list';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { usePlayerCoreStore } from '@/store/modules/playerCore';
import { usePlaylistStore } from '@/store/modules/playlist';
import { calculateAnimationDelay, getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'Album'
});

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const TOTAL_ITEMS = 30; // 每页数量

const areas = [
  { name: '全部', value: 'ALL' },
  { name: '华语', value: 'ZH' },
  { name: '欧美', value: 'EA' },
  { name: '韩国', value: 'KR' },
  { name: '日本', value: 'JP' }
];

const albumList = ref<any[]>([]);
const page = ref(0);
const hasMore = ref(true);
const isLoadingMore = ref(false);
const loading = ref(false);

const currentArea = ref((route.query.area as string) || 'ALL');
const currentAreaName = computed(
  () => areas.find((a) => a.value === currentArea.value)?.name || '全部'
);

const getAnimationDelay = computed(() => {
  return (index: number) => setAnimationDelay(index, 30);
});

const loadList = async (area: string, isLoadMore = false) => {
  if (!hasMore.value && isLoadMore) return;
  if (isLoadMore) {
    isLoadingMore.value = true;
  } else {
    loading.value = true;
    page.value = 0;
    albumList.value = [];
    contentScrollbarRef.value?.scrollTo({ top: 0 });
  }

  try {
    const params = {
      area: area,
      limit: TOTAL_ITEMS,
      offset: page.value * TOTAL_ITEMS
    };
    const { data } = await getNewAlbums(params);

    // API returns { albums: [], code: 200 } or { monthData: [] } depending on endpoint
    // /album/new returns { albums: [], total, code }
    const albums = data.albums || [];

    if (isLoadMore) {
      albumList.value.push(...albums);
    } else {
      albumList.value = albums;
    }

    // Check if we have more data
    hasMore.value = albums.length === TOTAL_ITEMS;
    page.value++;
  } catch (error) {
    console.error('加载专辑列表失败:', error);
  } finally {
    loading.value = false;
    isLoadingMore.value = false;
  }
};

const handleScroll = (e: any) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoadingMore.value && hasMore.value) {
    loadList(currentArea.value, true);
  }
};

const handleClickArea = (item: { name: string; value: string }) => {
  if (currentArea.value === item.value) return;
  currentArea.value = item.value;
  router.replace({ query: { area: item.value } });
  loadList(item.value);
};

const scrollbarRef = ref();
const contentScrollbarRef = ref();

const handleWheel = (e: WheelEvent) => {
  const scrollbar = scrollbarRef.value;
  if (scrollbar) {
    const delta = e.deltaY || e.detail;
    scrollbar.scrollBy({ left: delta });
  }
};

const getArtistNames = (album: any) => {
  if (album.artists) {
    return album.artists.map((ar: any) => ar.name).join(' / ');
  }
  return '';
};

const openAlbum = async (album: any) => {
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
  }
};

const playAlbum = async (album: any) => {
  try {
    const { data } = await getAlbum(album.id);
    if (data.code === 200 && data.songs?.length > 0) {
      const playerCore = usePlayerCoreStore();
      const playlistStore = usePlaylistStore();

      const playlist = data.songs.map((s: any) => ({
        id: s.id,
        name: s.name,
        picUrl: s.al?.picUrl || album.picUrl,
        source: 'netease',
        song: s,
        ...s,
        playLoading: false
      }));

      playlistStore.setPlayList(playlist, false, false);
      await playerCore.handlePlayMusic(playlist[0], true);
    }
  } catch (error) {
    console.error('Failed to play album:', error);
  }
};

onMounted(() => {
  currentArea.value = (route.query.area as string) || 'ALL';
  loadList(currentArea.value);
});

watch(
  () => route.query.area,
  (newArea) => {
    if (newArea && newArea !== currentArea.value) {
      currentArea.value = newArea as string;
      loadList(newArea as string);
    }
  }
);
</script>

<style lang="scss" scoped>
.play-list-type {
  .categories-wrapper {
    @apply flex items-center;
    white-space: nowrap;
  }

  &-item {
    @apply py-1.5 px-4 mr-3 inline-block rounded-full cursor-pointer transition-all duration-300;
    @apply text-sm font-medium;
    @apply bg-gray-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400;
    @apply hover:bg-gray-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white;

    &.active {
      @apply bg-primary text-white shadow-lg shadow-primary/25 scale-105;
    }
  }
}

.animate-item {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.list-card {
  &:hover {
    .play-icon {
      @apply opacity-100 scale-100;
    }
  }
}
</style>
