<template>
  <div class="hero-section mb-8 md:mb-12">
    <!-- Skeleton Loading -->
    <div v-if="loading" class="space-y-5">
      <div class="flex gap-2 overflow-hidden">
        <div
          v-for="i in 6"
          :key="i"
          class="skeleton-pill h-10 w-24 flex-shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800"
        />
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          class="skeleton-card aspect-[2.2/1] animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
        />
        <div
          class="skeleton-card aspect-[2.2/1] animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
        />
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-5">
      <!-- Quick Navigation -->
      <nav class="quick-nav flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          v-for="(item, index) in quickNavItems"
          :key="item.key"
          class="quick-nav-item group flex flex-shrink-0 items-center gap-2.5 rounded-full px-4 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          :class="[
            item.active
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:text-neutral-200 dark:hover:bg-neutral-700/80'
          ]"
          :style="{ animationDelay: calculateAnimationDelay(index, 0.05) }"
          @click="item.action"
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full text-sm transition-transform duration-300 group-hover:scale-110"
            :class="item.active ? 'bg-white/20' : item.iconBg"
          >
            <i :class="[item.icon, item.active ? 'text-white' : item.iconColor]" />
          </span>
          <span class="text-sm font-semibold whitespace-nowrap">{{ item.label }}</span>
          <span
            v-if="item.badge"
            class="ml-0.5 rounded-full bg-white/30 px-1.5 py-0.5 text-[10px] font-bold"
          >
            {{ item.badge }}
          </span>
        </button>
      </nav>

      <!-- Feature Cards -->
      <div class="cards-grid grid grid-cols-1 gap-4 md:grid-cols-5 lg:gap-5">
        <!-- Daily Recommend Card -->
        <div
          class="daily-card group relative col-span-1 cursor-pointer overflow-hidden rounded-2xl md:col-span-3"
          :style="{ animationDelay: calculateAnimationDelay(1, 0.08) }"
          @click="showDayRecommend"
        >
          <!-- Background -->
          <div class="absolute inset-0">
            <img
              v-if="dayRecommendCover"
              :src="getImgUrl(dayRecommendCover, '600y600')"
              alt=""
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70"
            />
          </div>

          <!-- Content -->
          <div
            class="relative z-10 flex h-full min-h-[160px] flex-col justify-between p-5 md:min-h-[180px] md:p-6"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2">
                <span
                  class="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
                >
                  <i class="ri-calendar-check-fill" />
                  {{ t('comp.homeHero.dailyRecommend') }}
                </span>
              </div>
              <span class="text-xs font-medium text-white/70">
                {{ dayRecommendSongs.length }} {{ t('comp.homeHero.songs') }}
              </span>
            </div>

            <div class="flex items-end justify-between gap-4">
              <!-- Song Preview List -->
              <div v-if="dayRecommendSongs.length > 0" class="flex-1 space-y-1.5">
                <div
                  v-for="(song, idx) in dayRecommendSongs.slice(0, 3)"
                  :key="song.id"
                  class="flex items-center gap-2 text-white/90"
                >
                  <span class="w-4 text-center text-xs font-bold text-white/50">{{ idx + 1 }}</span>
                  <span class="max-w-[140px] truncate text-sm font-medium md:max-w-[200px]">{{
                    song.name
                  }}</span>
                  <span class="max-w-[80px] truncate text-xs text-white/50 md:max-w-[120px]">
                    {{ song.ar?.[0]?.name }}
                  </span>
                </div>
              </div>

              <!-- Play Button -->
              <button
                class="play-btn flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95"
              >
                <i class="ri-play-fill ml-0.5 text-xl" />
              </button>
            </div>
          </div>
        </div>

        <!-- Personal FM Card -->
        <div
          class="fm-card group relative col-span-1 cursor-pointer overflow-hidden rounded-2xl md:col-span-2"
          :style="{ animationDelay: calculateAnimationDelay(2, 0.08) }"
          @click="playPersonalFm"
        >
          <!-- Gradient Background -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600"
          >
            <img
              v-if="personalFmCover"
              :src="getImgUrl(personalFmCover, '400y400')"
              alt=""
              class="h-full w-full object-cover opacity-30 mix-blend-overlay transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          <!-- Wave Animation -->
          <div class="fm-waves absolute right-4 top-4 flex items-end gap-[3px]">
            <span
              v-for="i in 4"
              :key="i"
              class="fm-wave-bar"
              :style="{ animationDelay: `${i * 0.15}s` }"
            />
          </div>

          <!-- Content -->
          <div
            class="relative z-10 flex h-full min-h-[160px] flex-col justify-between p-5 md:min-h-[180px] md:p-6"
          >
            <div>
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
              >
                <i class="ri-radio-fill" />
                私人FM
              </span>
            </div>

            <div class="flex items-end justify-between gap-4">
              <div v-if="personalFmSong" class="flex-1 min-w-0">
                <p class="truncate text-base font-bold text-white md:text-lg">
                  {{ personalFmSong.name }}
                </p>
                <p class="mt-1 truncate text-sm text-white/70">
                  {{ personalFmSong.artists?.[0]?.name }}
                </p>
              </div>
              <div v-else class="flex-1">
                <p class="text-base font-bold text-white md:text-lg">发现新音乐</p>
                <p class="mt-1 text-sm text-white/70">根据你的喜好推荐</p>
              </div>

              <button
                class="play-btn flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/95 text-purple-600 shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl active:scale-95"
              >
                <i class="ri-play-fill ml-0.5 text-xl" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Hot Search Bar -->
      <div
        v-if="hotSearchList.length > 0"
        class="hot-search flex items-center gap-3 rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800/60"
        :style="{ animationDelay: calculateAnimationDelay(3, 0.08) }"
      >
        <div class="flex flex-shrink-0 items-center gap-1.5 text-rose-500">
          <i class="ri-fire-fill text-base" />
          <span class="text-xs font-bold">热搜</span>
        </div>
        <div class="hot-list flex flex-1 gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="(item, idx) in hotSearchList.slice(0, 10)"
            :key="idx"
            class="hot-item flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-all duration-200 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600 dark:hover:text-white"
            @click="searchHotKeyword(item.searchWord)"
          >
            <span
              class="font-bold"
              :class="idx < 3 ? 'text-rose-500' : 'text-neutral-400 dark:text-neutral-500'"
            >
              {{ idx + 1 }}
            </span>
            <span class="max-w-[80px] truncate">{{ item.searchWord }}</span>
            <i v-if="item.iconType === 1" class="ri-fire-fill text-[10px] text-rose-400" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getHotSearch, getPersonalFM } from '@/api/home';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { useIntelligenceModeStore, useRecommendStore, useUserStore } from '@/store';
import { calculateAnimationDelay, getImgUrl } from '@/utils';

const { t } = useI18n();
const router = useRouter();
const recommendStore = useRecommendStore();
const intelligenceModeStore = useIntelligenceModeStore();
const userStore = useUserStore();

const loading = ref(false);
const personalFmSong = ref<any>(null);
const hotSearchList = ref<any[]>([]);

const dayRecommendSongs = computed(() => recommendStore.dailyRecommendSongs);
const dayRecommendCover = computed(() => dayRecommendSongs.value[0]?.al?.picUrl || '');
const personalFmCover = computed(() => personalFmSong.value?.album?.picUrl || '');
const isIntelligenceMode = computed(() => intelligenceModeStore.isIntelligenceMode);

// Quick Nav Configuration
const quickNavItems = computed(() => {
  const items = [
    {
      key: 'intelligence',
      label: t('comp.homeHero.intelligenceMode'),
      icon: 'ri-heart-pulse-fill',
      iconBg: 'bg-rose-100 dark:bg-rose-900/40',
      iconColor: 'text-rose-500 dark:text-rose-400',
      active: isIntelligenceMode.value,
      badge: isIntelligenceMode.value ? t('comp.homeHero.playing') : null,
      action: toggleIntelligenceMode,
      show: !!userStore.user
    },
    {
      key: 'toplist',
      label: t('comp.toplist'),
      icon: 'ri-trophy-fill',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-500 dark:text-amber-400',
      active: false,
      badge: null,
      action: () => router.push('/toplist'),
      show: true
    },
    {
      key: 'favorite',
      label: t('comp.homeHero.quickNav.myFavorite'),
      icon: 'ri-heart-fill',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconColor: 'text-red-500 dark:text-red-400',
      active: false,
      badge: null,
      action: () => router.push('/favorite'),
      show: true
    },
    {
      key: 'podcast',
      label: t('podcast.podcast'),
      icon: 'ri-radio-2-fill',
      iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
      iconColor: 'text-cyan-500 dark:text-cyan-400',
      active: false,
      badge: null,
      action: () => router.push('/podcast'),
      show: true
    },
    {
      key: 'mv',
      label: t('comp.mv'),
      icon: 'ri-movie-2-fill',
      iconBg: 'bg-violet-100 dark:bg-violet-900/40',
      iconColor: 'text-violet-500 dark:text-violet-400',
      active: false,
      badge: null,
      action: () => router.push('/mv'),
      show: true
    },
    {
      key: 'playlist',
      label: t('comp.list'),
      icon: 'ri-play-list-2-fill',
      iconBg: 'bg-sky-100 dark:bg-sky-900/40',
      iconColor: 'text-sky-500 dark:text-sky-400',
      active: false,
      badge: null,
      action: () => router.push('/list'),
      show: true
    },
    {
      key: 'album',
      label: t('comp.newAlbum.title'),
      icon: 'ri-album-fill',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
      iconColor: 'text-orange-500 dark:text-orange-400',
      active: false,
      badge: null,
      action: () => router.push('/album'),
      show: true
    },
    {
      key: 'history',
      label: t('comp.history'),
      icon: 'ri-history-fill',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      active: false,
      badge: null,
      action: () => router.push('/history'),
      show: true
    }
  ];

  return items.filter((item) => item.show);
});

const fetchHeroData = async () => {
  try {
    loading.value = true;
    const promises: Promise<any>[] = [];

    // 使用 refreshIfStale 检查是否需要刷新每日推荐
    promises.push(recommendStore.refreshIfStale());

    // Fetch Personal FM
    promises.push(
      getPersonalFM()
        .then((res: any) => {
          if (res.data?.[0]) {
            personalFmSong.value = res.data[0];
          }
        })
        .catch(() => {})
    );

    // Fetch Hot Search
    promises.push(
      getHotSearch()
        .then((res: any) => {
          if (res.data) {
            hotSearchList.value = res.data;
          }
        })
        .catch(() => {})
    );

    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to fetch hero data:', error);
  } finally {
    loading.value = false;
  }
};

const showDayRecommend = () => {
  if (dayRecommendSongs.value.length === 0) return;
  navigateToMusicList(router, {
    type: 'dailyRecommend',
    name: t('comp.recommendSinger.songlist'),
    songList: dayRecommendSongs.value,
    canRemove: false
  });
};

const toggleIntelligenceMode = () => {
  if (isIntelligenceMode.value) {
    intelligenceModeStore.clearIntelligenceMode();
  } else {
    intelligenceModeStore.playIntelligenceMode();
  }
};

const playPersonalFm = async () => {
  if (!personalFmSong.value) return;

  try {
    const { usePlayerCoreStore } = await import('@/store/modules/playerCore');
    const { usePlaylistStore } = await import('@/store/modules/playlist');

    const playerCore = usePlayerCoreStore();
    const playlistStore = usePlaylistStore();

    const song = personalFmSong.value;
    const playlist = [
      {
        id: song.id,
        name: song.name,
        picUrl: song.al?.picUrl || song.album?.picUrl,
        source: 'netease',
        song,
        ...song,
        playLoading: false
      }
    ];

    playlistStore.setPlayList(playlist, false, false);
    await playerCore.handlePlayMusic(playlist[0], true);
  } catch (error) {
    console.error('Failed to play Personal FM:', error);
  }
};

const searchHotKeyword = (keyword: string) => {
  router.push({ path: '/search-result', query: { keyword } });
};

onMounted(() => {
  fetchHeroData();
});

// keep-alive 激活时检查是否跨天需要刷新
onActivated(() => {
  recommendStore.refreshIfStale();
});
</script>

<style scoped>
/* Hide scrollbar */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Quick Nav Animation */
.quick-nav-item {
  animation: fadeInUp 0.5s ease-out backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Cards Animation */
.daily-card,
.fm-card {
  animation: fadeInScale 0.6s ease-out backwards;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.96);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Hot Search Animation */
.hot-search {
  animation: fadeInUp 0.5s ease-out backwards;
}

/* FM 波形动画 */
.fm-wave-bar {
  width: 3px;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.6);
  height: 12px;
  animation: fmWave 1s ease-in-out infinite;
}

.fm-wave-bar:nth-child(1) {
  height: 8px;
}

.fm-wave-bar:nth-child(2) {
  height: 16px;
}

.fm-wave-bar:nth-child(3) {
  height: 10px;
}

.fm-wave-bar:nth-child(4) {
  height: 14px;
}

@keyframes fmWave {
  0%,
  100% {
    transform: scaleY(1);
    opacity: 0.6;
  }

  50% {
    transform: scaleY(1.6);
    opacity: 1;
  }
}

/* Play Button Hover Glow */
.play-btn {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.play-btn:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

/* Skeleton Shimmer */
.skeleton-pill,
.skeleton-card {
  background: linear-gradient(
    90deg,
    theme('colors.neutral.200') 25%,
    theme('colors.neutral.100') 50%,
    theme('colors.neutral.200') 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.dark .skeleton-pill,
.dark .skeleton-card {
  background: linear-gradient(
    90deg,
    theme('colors.neutral.800') 25%,
    theme('colors.neutral.700') 50%,
    theme('colors.neutral.800') 75%
  );
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
