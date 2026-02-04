<template>
  <div
    class="podcast-container h-full w-full bg-white dark:bg-black transition-colors duration-500"
  >
    <n-scrollbar class="h-full">
      <div class="podcast-content w-full pb-32 pt-6 px-4 sm:px-6 lg:px-8 lg:pl-0">
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

          <!-- Search Bar -->
          <div class="relative w-full md:w-80 group">
            <n-input
              v-model:value="searchKeyword"
              round
              :placeholder="t('podcast.searchPlaceholder')"
              class="!bg-neutral-100 dark:!bg-neutral-900 border-none transition-all duration-300 group-hover:shadow-lg focus:shadow-lg"
              @keypress.enter="handleSearch"
            >
              <template #prefix>
                <i class="ri-search-line text-neutral-400"></i>
              </template>
              <template #suffix>
                <n-spin v-if="isSearching" size="small" />
              </template>
            </n-input>
          </div>
        </div>

        <!-- Search Results Section -->
        <div v-if="showSearchResults" class="content-sections mb-12">
          <section>
            <div class="mb-6 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <h2
                  class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white"
                >
                  {{ t('podcast.searchResults') }}
                </h2>
                <div class="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
              <n-button text class="text-neutral-400 hover:text-primary" @click="clearSearch">
                {{ t('common.close') }}
              </n-button>
            </div>

            <div
              v-if="searchResults.length === 0 && !isSearching"
              class="py-10 text-center text-neutral-400"
            >
              {{ t('common.noData') }}
            </div>

            <div v-else class="grid gap-6" :style="gridStyle">
              <radio-card
                v-for="(radio, index) in searchResults"
                :key="radio.id"
                :radio="radio"
                :show-subscribe-button="true"
                :animation-delay="calculateAnimationDelay(index, 0.04)"
              />
            </div>

            <div v-if="hasMoreSearch && !isSearching" class="mt-8 flex justify-center">
              <n-button secondary round @click="loadMoreSearch">
                {{ t('common.loadMore') }}
              </n-button>
            </div>
          </section>
        </div>

        <!-- Main Content Sections -->
        <div
          v-if="!showSearchResults"
          class="content-sections space-y-10 md:space-y-8 lg:space-y-12"
        >
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
                :key="program.id"
                :radio="program.radio as any"
                :program="program"
                :animation-delay="calculateAnimationDelay(index, 0.04)"
              />
            </div>
          </section>
          <!-- Today's Perfered Section -->
          <section v-if="podcastStore.todayPerfered.length > 0">
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
                v-if="podcastStore.todayPerfered.length > 0"
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
                v-for="(program, index) in podcastStore.todayPerfered.slice(0, 5)"
                :key="program.id"
                class="program-card flex items-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all duration-300 animate-item"
                :style="{ animationDelay: calculateAnimationDelay(index, 0.04) }"
                @click="playProgram(program)"
              >
                <div class="relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20">
                  <img
                    :src="getImgUrl(program.coverUrl, '100y100')"
                    :alt="program.mainSong.name"
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
                    {{ program.mainSong.name || program.name }}
                  </h4>
                  <p
                    class="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 truncate mt-1"
                  >
                    {{ program.description }}
                  </p>
                  <div class="flex items-center gap-3 text-xs text-neutral-400 mt-2">
                    <span>{{ formatDate(program.createTime) }}</span>
                    <span>{{ secondToMinute(program.mainSong.duration / 1000) }}</span>
                    <span
                      >{{ formatNumber(program.listenerCount) }} {{ t('podcast.listeners') }}</span
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
              v-if="podcastStore.subscribedRadios.length === 0"
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
                v-for="(radio, index) in podcastStore.subscribedRadios.slice(0, 10)"
                :key="radio.id"
                :radio="radio"
                :show-subscribe-button="true"
                :animation-delay="calculateAnimationDelay(index, 0.04)"
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
              v-if="podcastStore.isLoading"
              class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"
            >
              <div v-for="i in 10" :key="i" class="space-y-3">
                <div
                  class="aspect-square animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
                />
                <div class="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div class="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </div>

            <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <radio-card
                v-for="(radio, index) in podcastStore.recommendRadios.slice(0, 10)"
                :key="radio.id"
                :radio="radio"
                :show-subscribe-button="true"
                :animation-delay="calculateAnimationDelay(index, 0.04)"
              />
            </div>
          </section>

          <!-- Categories Section -->
          <section>
            <div class="mb-6 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <h2
                  class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white"
                >
                  {{ t('podcast.popularCategories') }}
                </h2>
                <div class="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
            </div>

            <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div
                v-for="(category, index) in podcastStore.categories.slice(0, 12)"
                :key="category.id"
                class="category-card flex flex-col items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer group transition-all duration-300 animate-item"
                :style="{ animationDelay: calculateAnimationDelay(index, 0.03) }"
                @click="router.push(`/podcast/category/${category.id}`)"
              >
                <img
                  v-if="category.pic84x84Url"
                  :src="category.pic84x84Url"
                  :alt="category.name"
                  class="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <span
                  class="text-xs md:text-sm text-center font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-primary dark:group-hover:text-white transition-colors"
                >
                  {{ category.name }}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { createDiscreteApi, NButton, NInput, NScrollbar, NSpin } from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getSearch } from '@/api/search';
import RadioCard from '@/components/podcast/RadioCard.vue';
import { usePodcastHistory } from '@/hooks/PodcastHistoryHook';
import { usePlayerStore, usePlaylistStore, usePodcastStore, useUserStore } from '@/store';
import type { DjProgram, DjRadio } from '@/types/podcast';
import { calculateAnimationDelay, formatNumber, getImgUrl, secondToMinute } from '@/utils';
import { mapDjProgramToSongResult } from '@/utils/podcastUtils';

defineOptions({
  name: 'Podcast'
});

const { t } = useI18n();
const { message } = createDiscreteApi(['message']);
const router = useRouter();
const podcastStore = usePodcastStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const userStore = useUserStore();
const { addPodcast, podcastList, clearPodcastHistory } = usePodcastHistory();
const recommendedSection = ref<HTMLElement | null>(null);

// Search State
const searchKeyword = ref('');
const isSearching = ref(false);
const searchResults = ref<DjRadio[]>([]);
const searchPage = ref(0);
const hasMoreSearch = ref(false);
const showSearchResults = ref(false);

const gridStyle = computed(() => ({
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))'
}));

const displayRecentPrograms = computed(() => {
  if (userStore.user) {
    return podcastStore.recentPrograms.slice(0, 5);
  }
  return podcastList.value.slice(0, 5);
});

const handlePlayTodayPerfered = () => {
  if (podcastStore.todayPerfered.length === 0) return;
  const songList = podcastStore.todayPerfered.map((p) => mapDjProgramToSongResult(p));
  playlistStore.setPlayList(songList);
  if (songList[0]) {
    playerStore.setPlay(songList[0]);
  }
};

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) return;

  isSearching.value = true;
  showSearchResults.value = true;
  searchPage.value = 0;
  searchResults.value = [];

  try {
    const { data } = await getSearch({
      keywords: searchKeyword.value,
      type: 1009, // DJ Radio
      limit: 30,
      offset: 0
    });

    searchResults.value = data.result?.djRadios || [];
    hasMoreSearch.value = data.result?.djRadioCount > searchResults.value.length;
  } catch (error) {
    console.error('搜索播客失败:', error);
    message.error(t('common.searchFailed'));
  } finally {
    isSearching.value = false;
  }
};

const loadMoreSearch = async () => {
  if (isSearching.value) return;

  isSearching.value = true;
  searchPage.value++;

  try {
    const { data } = await getSearch({
      keywords: searchKeyword.value,
      type: 1009,
      limit: 30,
      offset: searchPage.value * 30
    });

    const newResults = data.result?.djRadios || [];
    searchResults.value.push(...newResults);
    hasMoreSearch.value = data.result?.djRadioCount > searchResults.value.length;
  } catch (error) {
    console.error('加载更多搜索结果失败:', error);
  } finally {
    isSearching.value = false;
  }
};

const clearSearch = () => {
  showSearchResults.value = false;
  searchKeyword.value = '';
  searchResults.value = [];
};

const clearLocalHistory = () => {
  clearPodcastHistory();
};

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

const playProgram = async (program: DjProgram) => {
  try {
    const songData = mapDjProgramToSongResult(program);
    await playerStore.setPlay(songData);
    addPodcast(program);
  } catch (error) {
    console.error('播放节目失败:', error);
  }
};

const scrollToRecommended = () => {
  if (recommendedSection.value) {
    recommendedSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

onMounted(async () => {
  const tasks = [
    podcastStore.fetchCategories(),
    podcastStore.fetchRecommendRadios(),
    podcastStore.fetchTodayPerfered()
  ];

  if (userStore.user) {
    tasks.push(podcastStore.fetchSubscribedRadios());
    tasks.push(podcastStore.fetchRecentPrograms());
  }

  await Promise.all(tasks);
});
</script>

<style lang="scss" scoped>
.podcast-container {
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
</style>
