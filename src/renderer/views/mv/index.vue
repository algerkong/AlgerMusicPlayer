<template>
  <div class="h-full w-full">
    <sticky-tab-page
      ref="pageRef"
      title="MV"
      :description="t('comp.pages.mv.desc')"
      :model-value="selectedCategory"
      :categories="categories"
      @change="handleCategoryChange"
      @scroll="handleScroll"
    >
      <!-- MV Grid -->
      <div v-if="initLoading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div v-for="i in 12" :key="i" class="space-y-3">
          <div class="aspect-video skeleton-shimmer rounded-2xl" />
          <div class="h-4 w-3/4 skeleton-shimmer rounded-lg" />
          <div class="h-3 w-1/2 skeleton-shimmer rounded-lg" />
        </div>
      </div>

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
            {{ t('comp.pages.mv.loadingMore') }}
          </span>
        </div>
        <div v-if="!hasMore && !initLoading" class="text-center">
          <span
            class="text-xs text-neutral-400 font-medium tracking-widest uppercase opacity-50"
          >
            {{ t('comp.pages.mv.noMore') }}
          </span>
        </div>
      </div>
    </sticky-tab-page>

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
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { getAllMv, getTopMv } from '@/api/mv';
import StickyTabPage from '@/components/common/StickyTabPage.vue';
import MvPlayer from '@/components/MvPlayer.vue';
import { audioService } from '@/services/audioService';
import { usePlayerStore } from '@/store/modules/player';
import { IMvItem } from '@/types/mv';
import { calculateAnimationDelay, formatNumber, getImgUrl } from '@/utils';

defineOptions({
  name: 'Mv'
});

const { t } = useI18n();
const showMv = ref(false);
const mvList = ref<Array<IMvItem>>([]);
const playMvItem = ref<IMvItem>();
const initLoading = ref(false);
const loadingMore = ref(false);
const currentIndex = ref(0);
const offset = ref(0);
const limit = ref(40);
const hasMore = ref(true);
const pageRef = ref();

const categories = computed(() => [
  { label: t('comp.pages.mv.area.all'), value: '全部' },
  { label: t('comp.pages.mv.area.mainland'), value: '内地' },
  { label: t('comp.pages.mv.area.hktw'), value: '港台' },
  { label: t('comp.pages.mv.area.western'), value: '欧美' },
  { label: t('comp.pages.mv.area.japan'), value: '日本' },
  { label: t('comp.pages.mv.area.korea'), value: '韩国' }
]);
const selectedCategory = ref('全部');

const router = useRouter();
const route = useRoute();

const playerStore = usePlayerStore();

const handleCategoryChange = async (value: string) => {
  selectedCategory.value = value;
  offset.value = 0;
  mvList.value = [];
  hasMore.value = true;
  router.replace({ query: { ...route.query, area: value } });
  await loadMvList();
};

watch(
  () => route.query,
  async (newParams) => {
    if (route.path !== '/mv') return;
    const newArea = (newParams.area as string) || '全部';
    if (newArea !== selectedCategory.value) {
      selectedCategory.value = newArea;
    }
  }
);

onMounted(async () => {
  selectedCategory.value = (route.query.area as string) || '全部';
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

const handleScroll = (e: any) => {
  const { scrollTop, clientHeight, scrollHeight } = e.target;
  if (scrollHeight - (scrollTop + clientHeight) < 150) {
    loadMvList();
  }
};

const isPrevDisabled = computed(() => currentIndex.value === 0);
</script>

<style scoped lang="scss">
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
</style>
