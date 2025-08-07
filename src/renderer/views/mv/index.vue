<template>
  <div class="mv-list">
    <div class="play-list-type">
      <n-scrollbar x-scrollable>
        <div class="categories-wrapper">
          <span
            v-for="(category, index) in categories"
            :key="category.value"
            class="play-list-type-item"
            :class="[
              setAnimationClass('animate__bounceIn'),
              { active: selectedCategory === category.value }
            ]"
            :style="getAnimationDelay(index)"
            @click="selectedCategory = category.value"
          >
            {{ category.label }}
          </span>
        </div>
      </n-scrollbar>
    </div>
    <n-scrollbar :size="100" @scroll="handleScroll">
      <div
        v-loading="initLoading"
        class="mv-list-content"
        :class="setAnimationClass('animate__bounceInLeft')"
      >
        <div
          v-for="(item, index) in mvList"
          :key="item.id"
          class="mv-item"
          :class="setAnimationClass('animate__bounceIn')"
          :style="getAnimationDelay(index)"
        >
          <div class="mv-item-img" @click="handleShowMv(item, index)">
            <n-image
              class="mv-item-img-img"
              :src="getImgUrl(item.cover, '320y180')"
              lazy
              preview-disabled
            />
            <div class="top">
              <div class="play-count">{{ formatNumber(item.playCount) }}</div>
              <i class="iconfont icon-videofill"></i>
            </div>
          </div>
          <div class="mv-item-title">{{ item.name }}</div>
        </div>

        <div v-if="loadingMore" class="loading-more">加载中...</div>
        <div v-if="!hasMore && !initLoading" class="no-more">没有更多了</div>
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
import { formatNumber, getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';

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
const limit = ref(42);
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

const getAnimationDelay = (index: number) => {
  const currentPageIndex = index % limit.value;
  return setAnimationDelay(currentPageIndex, 30);
};

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
  const threshold = 100;

  if (scrollHeight - (scrollTop + clientHeight) < threshold) {
    loadMvList();
  }
};

const isPrevDisabled = computed(() => currentIndex.value === 0);
</script>

<style scoped lang="scss">
.mv-list {
  @apply h-full flex-1 flex flex-col overflow-hidden;

  &-title {
    @apply text-xl font-bold pb-2;
    @apply text-gray-900 dark:text-white;
  }

  // 添加歌单分类样式
  .play-list-type {
    .title {
      @apply text-lg font-bold mb-2;
      @apply text-gray-900 dark:text-white;
    }

    .categories-wrapper {
      @apply flex items-center py-2;
      white-space: nowrap;
    }

    &-item {
      @apply py-2 px-3 mr-3 inline-block rounded-xl cursor-pointer transition-all duration-300;
      @apply bg-light dark:bg-black text-gray-900 dark:text-white;
      @apply border border-gray-200 dark:border-gray-700;

      &:hover {
        @apply bg-green-50 dark:bg-green-900;
      }

      &.active {
        @apply bg-green-500 border-green-500 text-white;
      }
    }
  }

  &-content {
    @apply grid gap-4 pb-28 mt-2 pr-4;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .mv-item {
    @apply p-2 rounded-lg;
    @apply bg-light dark:bg-black;
    @apply border border-gray-200 dark:border-gray-700;

    &-img {
      @apply rounded-lg overflow-hidden relative;
      aspect-ratio: 16/9;
      line-height: 0;

      &:hover img {
        @apply hover:scale-110 transition-all duration-300 ease-in-out object-top;
      }

      &-img {
        @apply w-full h-full object-cover rounded-lg overflow-hidden;
      }

      .top {
        @apply absolute w-full h-full top-0 left-0 flex justify-center items-center transition-all duration-300 ease-in-out cursor-pointer;
        @apply bg-black bg-opacity-60;
        opacity: 0;

        i {
          @apply text-4xl text-white;
        }

        .play-count {
          @apply absolute top-2 right-2 text-sm;
          @apply text-white text-opacity-90;
        }

        &:hover {
          opacity: 1;
        }
      }
    }

    &-title {
      @apply mt-2 text-sm line-clamp-1;
      @apply text-gray-900 dark:text-white;
    }
  }
}

.loading-more {
  @apply text-center py-4 col-span-full;
  @apply text-gray-500 dark:text-gray-400;
}

.no-more {
  @apply text-center py-4 col-span-full;
  @apply text-gray-500 dark:text-gray-400;
}

.mobile {
  .mv-list-content {
    @apply pl-4 pr-4;
  }
  .categories-wrapper {
    @apply pl-4;
  }
}
</style>
