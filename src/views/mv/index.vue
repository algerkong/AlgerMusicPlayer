<template>
  <div class="mv-list">
    <div class="mv-list-title">
      <h2>推荐MV</h2>
    </div>
    <n-scrollbar :size="100" @scroll="handleScroll">
      <div v-loading="initLoading" class="mv-list-content" :class="setAnimationClass('animate__bounceInLeft')">
        <div
          v-for="(item, index) in mvList"
          :key="item.id"
          class="mv-item"
          :class="setAnimationClass('animate__bounceIn')"
          :style="getItemAnimationDelay(index)"
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
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';

import { getTopMv } from '@/api/mv';
import MvPlayer from '@/components/MvPlayer.vue';
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
const limit = ref(28);
const hasMore = ref(true);

const getItemAnimationDelay = (index: number) => {
  const currentPageIndex = index % limit.value;
  return setAnimationDelay(currentPageIndex, 30);
};

onMounted(async () => {
  await loadMvList();
});

const handleShowMv = async (item: IMvItem, index: number) => {
  store.commit('setIsPlay', false);
  store.commit('setPlayMusic', false);
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
  if (!hasMore.value || loadingMore.value) return;

  if (offset.value === 0) {
    initLoading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const res = await getTopMv(limit.value, offset.value);
    if (offset.value === 0) {
      mvList.value = res.data.data;
    } else {
      mvList.value.push(...res.data.data);
    }

    hasMore.value = res.data.data.length === limit.value;
    offset.value += limit.value;
  } catch (error) {
    console.error('加载MV失败:', error);
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
  @apply relative h-full w-full;

  &-title {
    @apply text-xl font-bold pb-2;
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
  }
}

.loading-more,
.no-more {
  @apply col-span-full text-center py-4 text-gray-400;
}
</style>
