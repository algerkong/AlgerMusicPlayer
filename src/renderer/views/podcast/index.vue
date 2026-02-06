<template>
  <div
    class="podcast-container h-full w-full bg-white dark:bg-black transition-colors duration-500 flex flex-col"
  >
    <!-- Top Categories Bar -->
    <category-selector
      :model-value="currentCategoryId"
      :categories="categoryList"
      label-key="name"
      value-key="id"
      @change="handleCategoryChange"
    />

    <!-- Main Content Scrollbar -->
    <n-scrollbar ref="contentScrollbarRef" class="flex-1" :size="100" @scroll="handleScroll">
      <div class="podcast-content w-full pb-32 pt-6 px-4 sm:px-6 lg:px-8 lg:pl-0">
        <!-- Dashboard View (Recommend) -->
        <div v-if="currentCategoryId === -1">
          <!-- Hero Section -->
          <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1
                class="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2"
              >
                {{ t('podcast.podcast') }}
              </h1>
              <p class="text-neutral-500 dark:text-neutral-400">
                {{ t('podcast.discover') }}
              </p>
            </div>
          </div>

          <!-- Main Content Sections -->
          <div class="content-sections space-y-10 md:space-y-8 lg:space-y-12">
            <!-- Recently Played Section -->
            <section v-if="displayRecentPrograms.length > 0">
              <div class="mb-6 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <h2
                    class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white"
                  >
                    {{ t('podcast.recentPlayed') }}
                  </h2>
                  <div class="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
                <div class="flex items-center gap-4">
                  <n-button
                    v-if="!userStore.user"
                    text
                    class="text-xs text-neutral-400"
                    @click="clearLocalHistory"
                  >
                    {{ t('common.clear') }}
                  </n-button>
                </div>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <radio-card
                  v-for="(program, index) in displayRecentPrograms"
                  :key="`recent-${program.id}`"
                  :radio="program.radio as any"
                  :program="program"
                  :animation-delay="calculateAnimationDelay(index, 0.04)"
                />
              </div>
            </section>
            <!-- Today's Perfered Section -->
            <section v-if="todayPerfered.length > 0">
              <div class="mb-6 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <h2
                    class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white"
                  >
                    {{ t('podcast.todayPerfered') }}
                  </h2>
                  <div class="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
                <n-button
                  v-if="todayPerfered.length > 0"
                  type="primary"
                  secondary
                  round
                  size="small"
                  @click="handlePlayTodayPerfered"
                >
                  <template #icon>
                    <i class="ri-play-circle-line"></i>
                  </template>
                  {{ t('search.button.playAll') }}
                </n-button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(program, index) in todayPerfered.slice(0, 5)"
                  :key="`today-${program.id}`"
                  class="program-card flex items-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all duration-300 animate-item"
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
                    <h4
                      class="text-sm md:text-base font-semibold text-neutral-900 dark:text-white truncate"
                    >
                      {{ program.mainSong?.name || program.name }}
                    </h4>
                    <p
                      class="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 truncate mt-1"
                    >
                      {{ program.description }}
                    </p>
                    <div class="flex items-center gap-3 text-xs text-neutral-400 mt-2">
                      <span>{{ formatDate(program.createTime) }}</span>
                      <span>{{ secondToMinute((program.mainSong?.duration || 0) / 1000) }}</span>
                      <span
                        >{{ formatNumber(program.listenerCount) }}
                        {{ t('podcast.listeners') }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- My Subscriptions Section -->
            <section v-if="userStore.user">
              <div class="mb-6 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <h2
                    class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white"
                  >
                    {{ t('podcast.mySubscriptions') }}
                  </h2>
                  <div class="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
              </div>

              <!-- Empty State -->
              <div
                v-if="subscribedRadios.length === 0"
                class="flex flex-col items-center justify-center py-20 text-neutral-400"
              >
                <i class="ri-radio-line mb-4 text-5xl opacity-20" />
                <p class="text-sm font-medium mb-4">{{ t('podcast.noSubscriptions') }}</p>
                <n-button type="primary" @click="scrollToRecommended">
                  {{ t('podcast.goDiscover') }}
                </n-button>
              </div>

              <!-- Subscribed Radios Grid -->
              <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <radio-card
                  v-for="(radio, index) in subscribedRadios.slice(0, 10)"
                  :key="`sub-${radio.id}`"
                  :radio="radio"
                  :show-subscribe-button="true"
                  :is-subscribed="isRadioSubscribed(radio.id)"
                  :animation-delay="calculateAnimationDelay(index, 0.04)"
                  @subscribe="handleSubscribe"
                />
              </div>
            </section>

            <!-- Recommended Radios Section -->
            <section ref="recommendedSection">
              <div class="mb-6 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <h2
                    class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white"
                  >
                    {{ t('podcast.recommended') }}
                  </h2>
                  <div class="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
              </div>

              <div
                v-if="recommendLoading"
                class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"
              >
                <div v-for="i in 10" :key="`skeleton-${i}`" class="space-y-3">
                  <div
                    class="aspect-square animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
                  />
                  <div class="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div class="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>

              <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <radio-card
                  v-for="(radio, index) in recommendRadios.slice(0, 10)"
                  :key="`recommend-${radio.id}`"
                  :radio="radio"
                  :show-subscribe-button="true"
                  :is-subscribed="isRadioSubscribed(radio.id)"
                  :animation-delay="calculateAnimationDelay(index, 0.04)"
                  @subscribe="handleSubscribe"
                />
              </div>
            </section>
          </div>
        </div>

        <!-- Category View -->
        <div v-else>
          <!-- Hero Section -->
          <div class="mb-8">
            <h1
              class="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2"
            >
              {{ currentCategoryName }}
            </h1>
            <p class="text-neutral-500 dark:text-neutral-400">
              {{ t('podcast.exploreCategoryRadios') }}
            </p>
          </div>

          <!-- Radios Grid -->
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <template v-if="categoryLoading && categoryPage === 0">
              <div v-for="i in 15" :key="`loading-${i}`" class="space-y-3">
                <div
                  class="aspect-square animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
                />
                <div class="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div class="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </template>

            <template v-else>
              <radio-card
                v-for="(radio, index) in categoryRadios"
                :key="`cat-${radio.id}`"
                :radio="radio"
                :show-subscribe-button="true"
                :is-subscribed="isRadioSubscribed(radio.id)"
                :animation-delay="calculateAnimationDelay(index % 30, 0.04)"
                @subscribe="handleSubscribe"
              />
            </template>
          </div>

          <!-- Empty State -->
          <div
            v-if="!categoryLoading && categoryRadios.length === 0"
            class="flex flex-col items-center justify-center py-20 text-neutral-400"
          >
            <i class="ri-radio-line mb-4 text-5xl opacity-20" />
            <p class="text-sm font-medium">{{ t('podcast.noCategoryRadios') }}</p>
          </div>

          <!-- Load More Spinner -->
          <div v-if="categoryLoadingMore" class="flex justify-center items-center py-8">
            <n-spin size="small" />
            <span class="ml-2 text-neutral-500">{{ t('common.loading') }}</span>
          </div>
          <div
            v-if="!categoryHasMore && categoryRadios.length > 0"
            class="text-center py-8 text-neutral-500"
          >
            {{ t('common.noMore') }}
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
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
  getDjTodayPerfered,
  getRecentDj,
  subscribeDj
} from '@/api/podcast';
import CategorySelector from '@/components/common/CategorySelector.vue';
import RadioCard from '@/components/podcast/RadioCard.vue';
import { usePodcastHistory } from '@/hooks/PodcastHistoryHook';
import { usePlayerStore, usePlaylistStore, useUserStore } from '@/store';
import type { DjCategory, DjProgram, DjRadio } from '@/types/podcast';
import { calculateAnimationDelay, formatNumber, getImgUrl, secondToMinute } from '@/utils';
import { mapDjProgramToSongResult } from '@/utils/podcastUtils';

defineOptions({
  name: 'Podcast'
});

const { t } = useI18n();
const { message } = createDiscreteApi(['message']);
const router = useRouter();
const route = useRoute();

const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const userStore = useUserStore();
const { podcastList, clearPodcastHistory } = usePodcastHistory();

const contentScrollbarRef = ref();
const recommendedSection = ref<HTMLElement | null>(null);

const currentCategoryId = ref(-1);

const categories = ref<DjCategory[]>([]);
const recommendRadios = ref<DjRadio[]>([]);
const todayPerfered = ref<DjProgram[]>([]);
const subscribedRadios = ref<DjRadio[]>([]);
const recentPrograms = ref<DjProgram[]>([]);
const recommendLoading = ref(false);

const categoryRadios = ref<DjRadio[]>([]);
const categoryLoading = ref(false);
const categoryLoadingMore = ref(false);
const categoryPage = ref(0);
const categoryLimit = ref(30);
const categoryHasMore = ref(true);

const categoryList = computed(() => {
  return [{ id: -1, name: t('podcast.discover') }, ...categories.value];
});

const currentCategoryName = computed(() => {
  if (currentCategoryId.value === -1) return t('podcast.recommend');
  return categories.value.find((c) => c.id === currentCategoryId.value)?.name || '';
});

const displayRecentPrograms = computed(() => {
  if (userStore.user) {
    return recentPrograms.value.slice(0, 5);
  }
  return podcastList.value.slice(0, 5);
});

const subscribedIdSet = computed(() => new Set(subscribedRadios.value.map((radio) => radio.id)));

const isRadioSubscribed = (id: number) => subscribedIdSet.value.has(id);

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    }
    return `${hours}小时前`;
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const handleCategoryChange = (id: number) => {
  router.replace({
    query: { ...route.query, category: id === -1 ? undefined : String(id) }
  });
};

const resetCategoryState = () => {
  categoryRadios.value = [];
  categoryPage.value = 0;
  categoryHasMore.value = true;
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
    contentScrollbarRef.value?.scrollTo({ top: 0 });
  }

  try {
    const offset = categoryPage.value * categoryLimit.value;
    const res = await getDjRadioHot(id, categoryLimit.value, offset);
    const radios = res.data?.djRadios || [];

    if (loadMore) {
      categoryRadios.value.push(...radios);
    } else {
      categoryRadios.value = radios;
    }

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

const handleScroll = (e: Event) => {
  if (currentCategoryId.value === -1) return;
  const target = e.target as Element;
  const { scrollTop, clientHeight, scrollHeight } = target;
  const threshold = 150;

  if (scrollHeight - (scrollTop + clientHeight) < threshold) {
    loadCategoryRadios(currentCategoryId.value, true);
  }
};

const scrollToRecommended = async () => {
  await nextTick();
  recommendedSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const clearLocalHistory = () => {
  clearPodcastHistory();
};

const handleSubscribe = async (radio: DjRadio) => {
  if (!userStore.user) {
    message.warning(t('history.needLogin'));
    return;
  }

  const isSubed = isRadioSubscribed(radio.id);

  try {
    await subscribeDj(radio.id, isSubed ? 0 : 1);
    if (radio.subCount !== undefined) {
      radio.subCount = Math.max(0, radio.subCount + (isSubed ? -1 : 1));
    }
    await loadSubscribedRadios();
    message.success(isSubed ? '已取消订阅' : '订阅成功');
  } catch (error) {
    console.error('订阅操作失败:', error);
    message.error(isSubed ? '取消订阅失败' : '订阅失败');
  }
};

const playProgram = async (program: DjProgram) => {
  const song = mapDjProgramToSongResult(program);
  playlistStore.setPlayList([song]);
  await playerStore.setPlay(song);
};

const handlePlayTodayPerfered = async () => {
  if (todayPerfered.value.length === 0) return;
  const songList = todayPerfered.value.map((program) => mapDjProgramToSongResult(program));
  playlistStore.setPlayList(songList);
  await playerStore.setPlay(songList[0]);
};

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

const loadRecentPrograms = async () => {
  if (!userStore.user) return;
  try {
    const res = await getRecentDj();
    recentPrograms.value = res.data?.data?.list || [];
  } catch (error) {
    console.error('获取最近播放失败:', error);
  }
};

const loadDashboard = async () => {
  await Promise.all([loadCategories(), loadRecommendRadios(), loadTodayPerfered()]);
};

const loadData = async (categoryId: number) => {
  if (categoryId === -1) {
    resetCategoryState();
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
      await Promise.all([loadSubscribedRadios(), loadRecentPrograms()]);
    } else {
      subscribedRadios.value = [];
      recentPrograms.value = [];
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
