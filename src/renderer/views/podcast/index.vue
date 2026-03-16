<template>
  <sticky-tab-page
    ref="pageRef"
    :title="currentCategoryId === -1 ? t('podcast.podcast') : currentCategoryName"
    :description="currentCategoryId === -1 ? t('podcast.discover') : t('podcast.exploreCategoryRadios')"
    :model-value="currentCategoryId"
    :categories="categoryList"
    label-key="name"
    value-key="id"
    @change="handleCategoryChange"
    @scroll="handleScroll"
  >
    <!-- Dashboard View -->
    <div v-if="currentCategoryId === -1" class="space-y-10">
      <!-- My Subscriptions -->
      <section v-if="userStore.user && subscribedRadios.length > 0">
        <div class="mb-6 flex items-center gap-3">
          <h2 class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white">
            {{ t('podcast.mySubscriptions') }}
          </h2>
          <div class="h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <radio-card
            v-for="(radio, index) in subscribedRadios.slice(0, 10)"
            :key="`sub-${radio.id}`"
            :radio="radio"
            :animation-delay="calculateAnimationDelay(index, 0.04)"
          />
        </div>
      </section>

      <!-- Today's Picks -->
      <section v-if="todayPerfered.length > 0">
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white">
              {{ t('podcast.todayPerfered') }}
            </h2>
            <div class="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <n-button type="primary" secondary round size="small" @click="handlePlayTodayPerfered">
            <template #icon><i class="ri-play-circle-line"></i></template>
            {{ t('search.button.playAll') }}
          </n-button>
        </div>
        <div class="space-y-3">
          <div
            v-for="(program, index) in todayPerfered.slice(0, 5)"
            :key="`today-${program.id}`"
            class="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all duration-300 animate-item"
            :style="{ animationDelay: calculateAnimationDelay(index, 0.04) }"
            @click="playProgram(program)"
          >
            <div class="relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20">
              <img
                :src="getImgUrl(program.coverUrl, '100y100')"
                :alt="program.mainSong?.name || program.name"
                class="w-full h-full rounded-lg object-cover"
              />
              <div
                class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <i class="ri-play-fill text-white text-2xl"></i>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm md:text-base font-semibold text-neutral-900 dark:text-white truncate">
                {{ program.mainSong?.name || program.name }}
              </h4>
              <p class="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 truncate mt-1">
                {{ program.description }}
              </p>
              <div class="flex items-center gap-3 text-xs text-neutral-400 mt-2">
                <span>{{ formatDate(program.createTime) }}</span>
                <span>{{ secondToMinute((program.mainSong?.duration || 0) / 1000) }}</span>
                <span>{{ formatNumber(program.listenerCount) }} {{ t('podcast.listeners') }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Recommended -->
      <section>
        <div class="mb-6 flex items-center gap-3">
          <h2 class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white">
            {{ t('podcast.recommended') }}
          </h2>
          <div class="h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
        <div v-if="recommendLoading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div v-for="i in 10" :key="`skeleton-${i}`" class="space-y-3">
            <div class="aspect-square skeleton-shimmer rounded-2xl" />
            <div class="h-4 w-3/4 skeleton-shimmer rounded-lg" />
          </div>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <radio-card
            v-for="(radio, index) in recommendRadios.slice(0, 10)"
            :key="`recommend-${radio.id}`"
            :radio="radio"
            :animation-delay="calculateAnimationDelay(index, 0.04)"
          />
        </div>
      </section>
    </div>

    <!-- Category View -->
    <div v-else>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <template v-if="categoryLoading && categoryPage === 0">
          <div v-for="i in 15" :key="`loading-${i}`" class="space-y-3">
            <div class="aspect-square skeleton-shimmer rounded-2xl" />
            <div class="h-4 w-3/4 skeleton-shimmer rounded-lg" />
          </div>
        </template>
        <template v-else>
          <radio-card
            v-for="(radio, index) in categoryRadios"
            :key="`cat-${radio.id}`"
            :radio="radio"
            :animation-delay="calculateAnimationDelay(index % 30, 0.04)"
          />
        </template>
      </div>

      <div v-if="!categoryLoading && categoryRadios.length === 0" class="flex flex-col items-center justify-center py-20 text-neutral-400">
        <i class="ri-radio-line mb-4 text-5xl opacity-20" />
        <p class="text-sm font-medium">{{ t('podcast.noCategoryRadios') }}</p>
      </div>

      <div v-if="categoryLoadingMore" class="flex justify-center items-center py-8">
        <n-spin size="small" />
        <span class="ml-2 text-neutral-500">{{ t('common.loading') }}</span>
      </div>
      <div v-if="!categoryHasMore && categoryRadios.length > 0" class="text-center py-8 text-neutral-500">
        {{ t('common.noMore') }}
      </div>
    </div>
  </sticky-tab-page>
</template>

<script setup lang="ts">
import { createDiscreteApi } from 'naive-ui';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import {
  getDjCategoryList,
  getDjRadioHot,
  getDjRecommend,
  getDjSublist,
  getDjTodayPerfered
} from '@/api/podcast';
import StickyTabPage from '@/components/common/StickyTabPage.vue';
import RadioCard from '@/components/podcast/RadioCard.vue';
import { usePlayerStore, usePlaylistStore, useUserStore } from '@/store';
import type { DjCategory, DjProgram, DjRadio } from '@/types/podcast';
import { calculateAnimationDelay, formatNumber, getImgUrl, secondToMinute } from '@/utils';
import { mapDjProgramToSongResult } from '@/utils/podcastUtils';

defineOptions({ name: 'Podcast' });

const { t } = useI18n();
const { message } = createDiscreteApi(['message']);
const router = useRouter();
const route = useRoute();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const userStore = useUserStore();
const pageRef = ref();

const currentCategoryId = ref(-1);
const categories = ref<DjCategory[]>([]);
const recommendRadios = ref<DjRadio[]>([]);
const todayPerfered = ref<DjProgram[]>([]);
const subscribedRadios = ref<DjRadio[]>([]);
const recommendLoading = ref(false);

const categoryRadios = ref<DjRadio[]>([]);
const categoryLoading = ref(false);
const categoryLoadingMore = ref(false);
const categoryPage = ref(0);
const categoryLimit = ref(30);
const categoryHasMore = ref(true);

const categoryList = computed(() => [{ id: -1, name: t('podcast.discover') }, ...categories.value]);
const currentCategoryName = computed(() => {
  if (currentCategoryId.value === -1) return t('podcast.recommended');
  return categories.value.find((c) => c.id === currentCategoryId.value)?.name || '';
});

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}分钟前`;
    return `${hours}小时前`;
  }
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const handleCategoryChange = (id: number) => {
  router.replace({ query: { ...route.query, category: id === -1 ? undefined : String(id) } });
};

const loadCategoryRadios = async (id: number, loadMore = false) => {
  if (loadMore) {
    if (categoryLoadingMore.value || !categoryHasMore.value) return;
    categoryLoadingMore.value = true;
  } else {
    if (categoryLoading.value) return;
    categoryLoading.value = true;
    categoryPage.value = 0;
    categoryRadios.value = [];
    categoryHasMore.value = true;
    await nextTick();
    pageRef.value?.scrollTo({ top: 0 });
  }
  try {
    const offset = categoryPage.value * categoryLimit.value;
    const res = await getDjRadioHot(id, categoryLimit.value, offset);
    const radios = res.data?.djRadios || [];
    if (loadMore) categoryRadios.value.push(...radios);
    else categoryRadios.value = radios;
    categoryHasMore.value = radios.length === categoryLimit.value;
    categoryPage.value++;
  } catch (error) {
    console.error('获取分类电台失败:', error);
    message.error(t('common.loadFailed'));
  } finally {
    categoryLoading.value = false;
    categoryLoadingMore.value = false;
  }
};

const handleScroll = (e: any) => {
  if (currentCategoryId.value === -1) return;
  const { scrollTop, clientHeight, scrollHeight } = e.target;
  if (scrollHeight - (scrollTop + clientHeight) < 150) {
    loadCategoryRadios(currentCategoryId.value, true);
  }
};

const playProgram = async (program: DjProgram) => {
  const song = mapDjProgramToSongResult(program);
  playlistStore.setPlayList([song]);
  await playerStore.setPlay(song);
};

const handlePlayTodayPerfered = async () => {
  if (todayPerfered.value.length === 0) return;
  const songList = todayPerfered.value.map(mapDjProgramToSongResult);
  playlistStore.setPlayList(songList);
  await playerStore.setPlay(songList[0]);
};

// ==================== Data loading ====================

const loadCategories = async () => {
  try {
    const res = await getDjCategoryList();
    categories.value = res.data?.categories || [];
  } catch (error) {
    console.error('获取分类列表失败:', error);
  }
};

const loadRecommendRadios = async () => {
  try {
    recommendLoading.value = true;
    const res = await getDjRecommend();
    recommendRadios.value = res.data?.djRadios || [];
  } catch (error) {
    console.error('获取推荐电台失败:', error);
  } finally {
    recommendLoading.value = false;
  }
};

const loadTodayPerfered = async () => {
  try {
    const res = await getDjTodayPerfered();
    todayPerfered.value = res.data?.data || [];
  } catch (error) {
    console.error('获取今日优选失败:', error);
  }
};

const loadSubscribedRadios = async () => {
  if (!userStore.user) return;
  try {
    const res = await getDjSublist();
    subscribedRadios.value = res.data?.djRadios || [];
  } catch (error) {
    console.error('获取订阅列表失败:', error);
  }
};

const loadDashboard = async () => {
  await Promise.all([
    loadCategories(),
    loadRecommendRadios(),
    loadTodayPerfered(),
    loadSubscribedRadios()
  ]);
};

const loadData = async (categoryId: number) => {
  if (categoryId === -1) {
    categoryRadios.value = [];
    categoryPage.value = 0;
    categoryHasMore.value = true;
    await loadDashboard();
  } else {
    await loadCategoryRadios(categoryId);
  }
};

watch(
  () => route.query.category,
  async (newCategory) => {
    if (route.path !== '/podcast') return;
    const newId = newCategory ? Number(newCategory) : -1;
    if (newId !== currentCategoryId.value) {
      currentCategoryId.value = newId;
      await loadData(newId);
    }
  }
);

watch(
  () => userStore.user,
  async (user) => {
    if (user) {
      await loadSubscribedRadios();
    } else {
      subscribedRadios.value = [];
    }
  }
);

onMounted(async () => {
  const queryId = route.query.category ? Number(route.query.category) : -1;
  currentCategoryId.value = queryId;
  await loadData(queryId);
});
</script>

<style lang="scss" scoped>
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
