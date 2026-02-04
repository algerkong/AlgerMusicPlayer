<template>
  <div class="list-page h-full w-full bg-white dark:bg-black transition-colors duration-500">
    <!-- 歌单分类 - 保持固定在顶部 -->
    <div
      class="play-list-type border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black z-10"
    >
      <n-scrollbar ref="scrollbarRef" x-scrollable>
        <div class="categories-wrapper py-4 pr-4 sm:pr-6 lg:pr-8" @wheel.prevent="handleWheel">
          <span
            v-for="(item, index) in playlistCategory?.sub"
            :key="item.name"
            class="play-list-type-item"
            :class="[setAnimationClass('animate__bounceIn'), { active: currentType === item.name }]"
            :style="getAnimationDelay(index)"
            @click="handleClickPlaylistType(item.name)"
          >
            {{ item.name }}
          </span>
        </div>
      </n-scrollbar>
    </div>

    <!-- 歌单列表 -->
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
            {{ listTitle }}
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400">发现更多好听的歌单</p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <!-- Loading State -->
          <template v-if="loading && page === 0">
            <div v-for="i in 15" :key="`loading-${i}`" class="space-y-3">
              <div
                class="aspect-square animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
              />
              <div class="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </template>

          <!-- Content State -->
          <template v-else>
            <div
              v-for="(item, index) in recommendList"
              :key="item.id"
              class="list-card group cursor-pointer animate-item"
              :style="{ animationDelay: calculateAnimationDelay(index % TOTAL_ITEMS, 0.05) }"
              @click.stop="openPlaylist(item)"
            >
              <!-- Cover Image -->
              <div
                class="relative aspect-square overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-all duration-500"
              >
                <img
                  :src="getImgUrl(item.picUrl || item.coverImgUrl, '400y400')"
                  :alt="item.name"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />

                <!-- Play Overlay -->
                <div
                  class="absolute inset-0 bg-transparent group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center"
                >
                  <div
                    class="play-icon w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-xl"
                  >
                    <i class="ri-play-fill text-2xl text-neutral-900 ml-1"></i>
                  </div>
                </div>

                <!-- Play Count Badge -->
                <div
                  class="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <i class="ri-play-fill"></i>
                  {{ formatNumber(item.playCount) }}
                </div>
              </div>

              <!-- Info -->
              <div class="mt-3 space-y-1">
                <h3
                  class="text-sm md:text-base font-bold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors"
                >
                  {{ item.name }}
                </h3>
              </div>
            </div>
          </template>
        </div>

        <!-- 加载更多 -->
        <div v-if="isLoadingMore" class="flex justify-center items-center py-8">
          <n-spin size="small" />
          <span class="ml-2 text-neutral-500">加载中...</span>
        </div>
        <div v-if="!hasMore && recommendList.length > 0" class="text-center py-8 text-neutral-500">
          没有更多了
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getPlaylistCategory } from '@/api/home';
import { getListByCat } from '@/api/list';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import type { IPlayListSort } from '@/types/playlist';
import {
  calculateAnimationDelay,
  formatNumber,
  getImgUrl,
  setAnimationClass,
  setAnimationDelay
} from '@/utils';

defineOptions({
  name: 'List'
});

const TOTAL_ITEMS = 42; // 每页数量

const recommendList = ref<any[]>([]);
const page = ref(0);
const hasMore = ref(true);
const isLoadingMore = ref(false);

const router = useRouter();

const openPlaylist = (item: any) => {
  navigateToMusicList(router, {
    id: item.id,
    type: 'playlist',
    name: item.name,
    listInfo: item,
    canRemove: false
  });
};

const route = useRoute();
const listTitle = ref((route.query.type as string) || '每日推荐');

const loading = ref(false);
const loadList = async (type: string, isLoadMore = false) => {
  if (!hasMore.value && isLoadMore) return;
  if (isLoadMore) {
    isLoadingMore.value = true;
  } else {
    loading.value = true;
    page.value = 0;
    recommendList.value = [];
    contentScrollbarRef.value?.scrollTo({ top: 0 });
  }

  try {
    const params = {
      cat: type === '每日推荐' ? '' : type,
      limit: TOTAL_ITEMS,
      offset: page.value * TOTAL_ITEMS
    };
    const { data } = await getListByCat(params);
    if (isLoadMore) {
      recommendList.value.push(...data.playlists);
    } else {
      recommendList.value = data.playlists;
    }
    hasMore.value = data.more;
    page.value++;
  } catch (error) {
    console.error('加载歌单列表失败:', error);
  } finally {
    loading.value = false;
    isLoadingMore.value = false;
  }
};

// 监听滚动事件
const handleScroll = (e: any) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  // 距离底部100px时加载更多
  if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoadingMore.value && hasMore.value) {
    loadList(currentType.value, true);
  }
};

// 添加歌单分类相关的代码
const playlistCategory = ref<IPlayListSort>();
const currentType = ref((route.query.type as string) || '每日推荐');

const getAnimationDelay = computed(() => {
  return (index: number) => setAnimationDelay(index, 30);
});

// 加载歌单分类
const loadPlaylistCategory = async () => {
  const { data } = await getPlaylistCategory();
  playlistCategory.value = {
    ...data,
    sub: [
      {
        name: '每日推荐',
        category: 0
      },
      ...data.sub
    ]
  };
};

const handleClickPlaylistType = (type: string) => {
  if (currentType.value === type) return;
  currentType.value = type;
  listTitle.value = type;
  loading.value = true;
  loadList(type);
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

onMounted(() => {
  loadPlaylistCategory();
  currentType.value = (route.query.type as string) || currentType.value;
  loadList(currentType.value);
});

watch(
  () => route.query,
  async (newParams) => {
    if (newParams.type) {
      // 如果路由参数变化，且与当前类型不同，则重新加载
      if (newParams.type !== currentType.value) {
        listTitle.value = (newParams.type as string) || '歌单列表';
        currentType.value = newParams.type as string;
        loading.value = true;
        loadList(newParams.type as string);
      }
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
