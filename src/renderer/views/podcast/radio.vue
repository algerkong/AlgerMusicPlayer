<template>
  <div
    class="radio-detail-page h-full w-full bg-white dark:bg-black transition-colors duration-500"
  >
    <n-scrollbar class="h-full" @scroll="handleScroll">
      <div class="radio-detail-content w-full pb-32">
        <n-spin :show="podcastStore.isLoading && !podcastStore.currentRadio">
          <div v-if="podcastStore.currentRadio" class="radio-content">
            <!-- Hero Section -->
            <section class="hero-section relative overflow-hidden rounded-tl-2xl">
              <!-- Background Image with Blur -->
              <div class="hero-bg absolute inset-0 -top-20">
                <div
                  class="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-40 dark:opacity-30"
                  :style="{
                    backgroundImage: `url(${getImgUrl(podcastStore.currentRadio.picUrl, '800y800')})`
                  }"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-black/80 dark:to-black"
                />
              </div>

              <!-- Hero Content -->
              <div class="hero-content relative z-10 px-4 md:px-8 pt-4 md:pt-8 pb-6">
                <div class="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
                  <!-- Radio Cover -->
                  <div class="radio-cover-wrapper relative group">
                    <div
                      class="cover-glow absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    />
                    <div
                      class="cover-container relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/50 dark:ring-neutral-800/50"
                    >
                      <img
                        :src="getImgUrl(podcastStore.currentRadio.picUrl, '500y500')"
                        :alt="podcastStore.currentRadio.name"
                        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <!-- Play overlay on cover -->
                      <div
                        class="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/30 transition-all duration-300"
                      >
                        <div
                          class="play-icon w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-xl cursor-pointer hover:scale-110 active:scale-95"
                          @click="handlePlayAll"
                        >
                          <i class="iconfont icon-playfill text-2xl text-neutral-900 ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Radio Info -->
                  <div class="radio-info flex-1 text-center md:text-left">
                    <div class="radio-badge mb-2 md:mb-3">
                      <span
                        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider"
                      >
                        <i class="ri-radio-line text-sm" />
                        {{ podcastStore.currentRadio.category }}
                      </span>
                    </div>
                    <h1
                      class="radio-name text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight"
                    >
                      {{ podcastStore.currentRadio.name }}
                    </h1>

                    <!-- Stats -->
                    <div
                      class="radio-stats flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 mt-4 md:mt-5"
                    >
                      <div class="stat-item flex items-center gap-2">
                        <i class="ri-user-follow-line text-primary text-lg" />
                        <span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                          <span class="font-bold text-neutral-900 dark:text-white">{{
                            formatNumber(podcastStore.currentRadio.subCount)
                          }}</span>
                          {{ t('podcast.subscribeCount') }}
                        </span>
                      </div>
                      <div class="stat-item flex items-center gap-2">
                        <i class="ri-play-list-2-line text-primary text-lg" />
                        <span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                          <span class="font-bold text-neutral-900 dark:text-white">{{
                            podcastStore.currentRadio.programCount
                          }}</span>
                          {{ t('podcast.programCount') }}
                        </span>
                      </div>
                    </div>

                    <p
                      class="mt-4 text-sm md:text-base text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed max-w-2xl"
                    >
                      {{ podcastStore.currentRadio.desc }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Action Bar -->
            <section
              class="action-bar sticky top-0 z-20 px-4 md:px-8 py-3 md:py-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-800/50"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <!-- Play All Button -->
                  <button
                    class="play-all-btn flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
                    @click="handlePlayAll"
                  >
                    <i class="iconfont icon-playfill text-lg" />
                    <span>{{ t('search.button.playAll') }}</span>
                  </button>

                  <!-- Subscribe Button -->
                  <button
                    class="subscribe-btn flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                    :class="
                      isSubscribed
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                        : 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20'
                    "
                    @click="handleSubscribe"
                  >
                    <i
                      :class="isSubscribed ? 'ri-checkbox-circle-line' : 'ri-add-line'"
                      class="text-lg"
                    />
                    <span>{{
                      isSubscribed ? t('podcast.subscribed') : t('podcast.subscribe')
                    }}</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Program List Section -->
            <section class="tab-content px-4 md:px-8 py-6 md:py-8">
              <div class="mb-6 flex items-center gap-3">
                <h2
                  class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white"
                >
                  {{ t('podcast.programList') }}
                </h2>
                <div class="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>

              <program-list
                :programs="podcastStore.currentPrograms"
                :loading="podcastStore.isLoading"
              />

              <!-- Loading state for pagination -->
              <div v-if="podcastStore.isLoading" class="mt-8 flex justify-center">
                <n-spin size="small" />
              </div>
            </section>
          </div>
        </n-spin>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { NScrollbar, NSpin, useMessage } from 'naive-ui';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { getDjProgram } from '@/api/podcast';
import ProgramList from '@/components/podcast/ProgramList.vue';
import { usePlayerStore, usePlaylistStore, usePodcastStore, useUserStore } from '@/store';
import type { SongResult } from '@/types/music';
import { formatNumber, getImgUrl } from '@/utils';
import { mapDjProgramToSongResult } from '@/utils/podcastUtils';

defineOptions({
  name: 'PodcastRadio'
});

const { t } = useI18n();
const route = useRoute();
const message = useMessage();
const podcastStore = usePodcastStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const userStore = useUserStore();

const radioId = computed(() => Number(route.params.id));
const isSubscribed = computed(() => podcastStore.isRadioSubscribed(radioId.value));

const offset = ref(0);
const hasMore = computed(() => {
  if (!podcastStore.currentRadio) return false;
  return podcastStore.currentPrograms.length < podcastStore.currentRadio.programCount;
});

const handleScroll = async (e: any) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    if (!podcastStore.isLoading && hasMore.value) {
      offset.value += 30;
      await podcastStore.fetchRadioPrograms(radioId.value, offset.value);
    }
  }
};

const handlePlayAll = async () => {
  if (!podcastStore.currentRadio) return;

  const total = podcastStore.currentRadio.programCount;
  try {
    message.loading(t('common.loading'));
    const { data } = await getDjProgram(radioId.value, total);
    const allPrograms = data.programs || [];

    const songList: SongResult[] = allPrograms.map((program) => mapDjProgramToSongResult(program));

    playlistStore.setPlayList(songList);
    if (songList[0]) {
      playerStore.setPlay(songList[0]);
    }
  } catch (error) {
    console.error('获取全部节目失败:', error);
  }
};

onMounted(async () => {
  await podcastStore.fetchRadioDetail(radioId.value);
  await podcastStore.fetchRadioPrograms(radioId.value);
});

onUnmounted(() => {
  podcastStore.clearCurrentRadio();
});

const handleSubscribe = async () => {
  if (!userStore.user) {
    message.warning(t('history.needLogin'));
    return;
  }
  if (podcastStore.currentRadio) {
    await podcastStore.toggleSubscribe(podcastStore.currentRadio);
  }
};
</script>

<style scoped lang="scss">
.radio-detail-page {
  position: relative;
}

/* Hero Section */
.hero-section {
  min-height: 200px;
}

/* Action Bar Sticky Behavior */
.action-bar {
  transition:
    background-color 0.3s,
    box-shadow 0.3s;
}

.animate-item {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .hero-section {
    min-height: auto;
  }

  .action-bar {
    @apply py-2;
  }
}

/* Button micro-interactions */
button {
  @apply cursor-pointer;
}

/* Hero background enhancement */
.hero-bg {
  z-index: 0;
}
</style>
