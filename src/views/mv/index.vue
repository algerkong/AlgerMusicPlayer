<template>
  <div class="mv-list">
    <div class="mv-list-title">
      <h2>推荐MV</h2>
    </div>
    <div class="play-list-type">
      <n-scrollbar x-scrollable>
        <div class="categories-wrapper">
          <span
            v-for="(category, index) in categories"
            :key="category.value"
            class="play-list-type-item"
            :class="[setAnimationClass('animate__bounceIn'), { active: selectedCategory === category.value }]"
            :style="getAnimationDelay(index)"
            @click="selectedCategory = category.value"
          >
            {{ category.label }}
          </span>
        </div>
      </n-scrollbar>
    </div>
    <n-scrollbar :size="100" @scroll="handleScroll">
      <div v-loading="initLoading" class="mv-list-content" :class="setAnimationClass('animate__bounceInLeft')">
        <div
          v-for="(item, index) in mvList"
          :key="item.id"
          class="mv-item"
          :class="setAnimationClass('animate__bounceIn')"
          :style="getAnimationDelay(index)"
        >
          <div class="mv-item-img" @click="handleShowMv(item, index)">
            <n-image class="mv-item-img-img" :src="getImgUrl(item.cover, '320y180')" lazy preview-disabled />
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
import { useStore } from 'vuex';

import { getAllMv, getTopMv } from '@/api/mv';
import MvPlayer from '@/components/MvPlayer.vue';
import { audioService } from '@/services/audioService';
import { IMvItem } from '@/type/mv';
import { formatNumber, getImgUrl, setAnimationClass, setAnimationDelay } from '@/utils';

defineOptions({
  name: 'Mv',
});

const showMv = ref(false);
const mvList = ref<Array<IMvItem>>([]);
const playMvItem = ref<IMvItem>();
const store = useStore();
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
  { label: '韩国', value: '韩国' },
];
const selectedCategory = ref('全部');

watch(selectedCategory, async () => {
  offset.value = 0;
  mvList.value = [];
  hasMore.value = true;
  await loadMvList();
});

const getAnimationDelay = computed(() => {
  return (index: number) => setAnimationDelay(index, 30);
});

onMounted(async () => {
  await loadMvList();
});

const handleShowMv = async (item: IMvItem, index: number) => {
  store.commit('setIsPlay', false);
  store.commit('setPlayMusic', false);
  audioService.getCurrentSound()?.pause();
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
      area: selectedCategory.value === '全部' ? '' : selectedCategory.value,
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
  }

  // 添加歌单分类样式
  .play-list-type {
    .title {
      @apply text-lg font-bold mb-4;
    }

    .categories-wrapper {
      @apply flex items-center py-2 pb-4;
      white-space: nowrap;
    }

    &-item {
      @apply py-2 px-3 mr-3 inline-block border border-gray-700 rounded-xl cursor-pointer transition-all duration-300;
      background-color: #1a1a1a;

      &:hover {
        @apply bg-green-600/50;
      }

      &.active {
        @apply bg-green-600 border-green-500;
      }
    }
  }

  &-content {
    @apply grid gap-4 pb-28 mt-2 pr-4;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .mv-item {
    @apply p-2 rounded-lg;
    background-color: #1f1f1f;
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
        background-color: #0000009b;
        opacity: 0;

        i {
          font-size: 40px;
          transition: all 0.5s ease-in-out;
          opacity: 0;
        }

        &:hover {
          @apply opacity-100;
        }

        &:hover i {
          @apply transform scale-150 opacity-80;
        }

        .play-count {
          position: absolute;
          top: 20px;
          left: 10px;
          font-size: 14px;
        }
      }
    }

    &-title {
      @apply p-2 text-sm text-white truncate;
    }
  }
}

.mobile {
  .mv-list-title {
    @apply text-xl font-bold px-4;
  }

  .mv-list-content {
    @apply px-4;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}

.loading-more,
.no-more {
  @apply col-span-full text-center py-4 text-gray-400;
}
</style>
