<template>
  <div class="mv-list-page h-full w-full bg-white dark:bg-black transition-colors duration-500">
    <n-scrollbar class="h-full" @scroll="handleScroll">
      <div class="mv-content w-full pb-32 pt-6 px-4 sm:px-6 lg:px-8 lg:pl-0">
        <!-- Hero Section -->
        <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1
              class="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2"
            >
              MV
            </h1>
            <p class="text-neutral-500 dark:text-neutral-400">探索精彩视频内容</p>
          </div>

          <!-- Category Selector (Pills) -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="category in categories"
              :key="category.value"
              class="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300"
              :class="[
                selectedCategory === category.value
                  ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              ]"
              @click="selectedCategory = category.value"
            >
              {{ category.label }}
            </button>
          </div>
        </div>

        <!-- MV Grid Container -->
        <div class="mv-grid-container">
          <!-- Loading State -->
          <div v-if="initLoading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div v-for="i in 12" :key="i" class="space-y-3">
              <div
                class="aspect-video animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
              />
              <div class="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div class="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          </div>

          <!-- Content State -->
          <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div
              v-for="(item, index) in mvList"
              :key="item.id"
              class="mv-card group cursor-pointer animate-item"
              :style="{ animationDelay: calculateAnimationDelay(index, 0.05) }"
              @click="handleShowMv(item, index)"
            >
              <!-- Cover Image -->
              <div
                class="relative aspect-video overflow-hidden rounded-2xl shadow-md group-hover:shadow-xl transition-all duration-500"
              >
                <img
                  :src="getImgUrl(item.cover, '400y225')"
                  :alt="item.name"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />

                <!-- Play Overlay -->
                <div
                  class="absolute inset-0 bg-transparent group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center"
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
                <p class="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                  {{ item.artistName }}
                </p>
              </div>
            </div>
          </div>

          <!-- Loading More / No More -->
          <div class="mt-12 py-8 border-t border-neutral-100 dark:border-neutral-800">
            <div v-if="loadingMore" class="flex flex-col items-center gap-4">
              <n-spin size="small" />
              <span class="text-xs text-neutral-400 font-medium tracking-widest uppercase">
                加载更多中...
              </span>
            </div>
            <div v-if="!hasMore && !initLoading" class="text-center">
              <span
                class="text-xs text-neutral-400 font-medium tracking-widest uppercase opacity-50"
              >
                — 已加载全部内容 —
              </span>
            </div>
          </div>
        </div>
      </div>
    </n-scrollbar>

    <mv-player
      v-model:show="showMv"
      :current-mv="playMvItem"
      :is-prev-disabled="isPrevDisabled"
      @next="playNextMv"
      @prev="playPrevMv"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { getAllMv, getTopMv } from '@/api/mv';
import MvPlayer from '@/components/MvPlayer.vue';
import { audioService } from '@/services/audioService';
import { usePlayerStore } from '@/store/modules/player';
import { IMvItem } from '@/types/mv';
import { calculateAnimationDelay, formatNumber, getImgUrl } from '@/utils';

defineOptions({
  name: 'Mv'
});

const showMv = ref(false);
const mvList = ref<Array<IMvItem>>([]);
const playMvItem = ref<IMvItem>();
const initLoading = ref(false);
const loadingMore = ref(false);
const currentIndex = ref(0);
const offset = ref(0);
const limit = ref(40); // 调整为40，方便4列布局 (10行)
const hasMore = ref(true);

const categories = [
  { label: '全部', value: '全部' },
  { label: '内地', value: '内地' },
  { label: '港台', value: '港台' },
  { label: '欧美', value: '欧美' },
  { label: '日本', value: '日本' },
  { label: '韩国', value: '韩国' }
];
const selectedCategory = ref('全部');

const playerStore = usePlayerStore();

watch(selectedCategory, async () => {
  offset.value = 0;
  mvList.value = [];
  hasMore.value = true;
  await loadMvList();
});

onMounted(async () => {
  await loadMvList();
});

const handleShowMv = async (item: IMvItem, index: number) => {
  playerStore.setIsPlay(false);
  audioService.pause();
  showMv.value = true;
  currentIndex.value = index;
  playMvItem.value = item;
};

const playPrevMv = async (setLoading: (value: boolean) => void) => {
  try {
    if (currentIndex.value > 0) {
      const prevItem = mvList.value[currentIndex.value - 1];
      await handleShowMv(prevItem, currentIndex.value - 1);
    }
  } finally {
    setLoading(false);
  }
};

const playNextMv = async (setLoading: (value: boolean) => void) => {
  try {
    if (currentIndex.value < mvList.value.length - 1) {
      const nextItem = mvList.value[currentIndex.value + 1];
      await handleShowMv(nextItem, currentIndex.value + 1);
    } else if (hasMore.value) {
      await loadMvList();
      if (mvList.value.length > currentIndex.value + 1) {
        const nextItem = mvList.value[currentIndex.value + 1];
        await handleShowMv(nextItem, currentIndex.value + 1);
      } else {
        showMv.value = false;
      }
    } else {
      showMv.value = false;
    }
  } catch (error) {
    console.error('加载更多MV失败:', error);
    showMv.value = false;
  } finally {
    setLoading(false);
  }
};

const loadMvList = async () => {
  try {
    if (!hasMore.value || loadingMore.value) return;
    if (offset.value === 0) {
      initLoading.value = true;
    } else {
      loadingMore.value = true;
    }

    const params = {
      limit: limit.value,
      offset: offset.value,
      area: selectedCategory.value === '全部' ? '' : selectedCategory.value
    };

    const res = selectedCategory.value === '全部' ? await getTopMv(params) : await getAllMv(params);

    const { data } = res.data;
    mvList.value.push(...data);
    hasMore.value = data.length === limit.value;
    offset.value += limit.value;
  } finally {
    initLoading.value = false;
    loadingMore.value = false;
  }
};

const handleScroll = (e: Event) => {
  const target = e.target as Element;
  const { scrollTop, clientHeight, scrollHeight } = target;
  const threshold = 150;

  if (scrollHeight - (scrollTop + clientHeight) < threshold) {
    loadMvList();
  }
};

const isPrevDisabled = computed(() => currentIndex.value === 0);
</script>

<style scoped lang="scss">
.mv-list-page {
  position: relative;
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

.mv-card {
  &:hover {
    .play-icon {
      @apply opacity-100 scale-100;
    }
  }
}
</style>
