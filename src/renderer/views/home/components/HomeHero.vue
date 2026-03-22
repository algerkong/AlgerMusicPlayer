<template>
  <div class="hero-section mb-6 md:mb-10">
    <!-- Skeleton Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="flex gap-1.5 overflow-hidden md:hidden">
        <div v-for="i in 6" :key="i" class="h-9 w-20 flex-shrink-0 skeleton-shimmer rounded-full" />
      </div>
      <div class="hero-grid grid gap-3">
        <div class="skeleton-shimmer rounded-2xl" style="height: 160px" />
        <div class="skeleton-shimmer rounded-2xl" style="height: 160px" />
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-4">
      <!-- Quick Navigation (mobile only) -->
      <nav class="scrollbar-hide flex gap-1.5 overflow-x-auto pb-0.5 md:hidden">
        <button
          v-for="(item, index) in quickNavItems"
          :key="item.key"
          class="nav-chip flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[13px] font-medium transition-all duration-250 hover:text-neutral-900 dark:hover:text-neutral-100"
          :class="[
            item.active
              ? 'bg-primary text-white'
              : 'bg-neutral-100/60 text-neutral-500 hover:bg-neutral-200/80 dark:bg-white/[0.04] dark:text-neutral-400 dark:hover:bg-white/[0.07]'
          ]"
          :style="{ animationDelay: `${index * 0.03}s` }"
          @click="item.action"
        >
          <i :class="item.icon" class="text-sm" />
          <span class="whitespace-nowrap">{{ item.label }}</span>
          <span v-if="item.active" class="h-[5px] w-[5px] rounded-full bg-white/50" />
        </button>
      </nav>

      <!-- Hero Cards -->
      <div class="hero-grid grid gap-3">
        <!-- ===== 每日推荐 (Left - Large Card) ===== -->
        <div class="hero-card" :style="{ animationDelay: '0.12s' }">
          <!-- Card -->
          <div
            class="daily-card group relative cursor-pointer overflow-hidden rounded-2xl shadow-sm transition-all duration-300 ease-out hover:shadow-xl"
            :style="{ background: dailyCardBg }"
            @click="showDayRecommend"
          >
            <!-- Background Image -->
            <img
              v-if="dayRecommendCover"
              ref="dailyCoverRef"
              :src="getImgUrl(dayRecommendCover, '512y512')"
              alt=""
              class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              crossorigin="anonymous"
              @load="extractDailyColor"
            />
            <!-- Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />

            <!-- Content -->
            <div class="relative flex h-full flex-col justify-between p-5 md:p-6">
              <!-- Top: Title + Badge -->
              <div>
                <h3 class="text-2xl font-black leading-tight tracking-wider text-white md:text-3xl">
                  {{ t('comp.homeHero.dailyRecommend') }}
                </h3>
                <span
                  class="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/80 backdrop-blur-sm"
                >
                  <i class="ri-calendar-check-fill" />
                  {{ dayRecommendSongs.length }} {{ t('comp.homeHero.songs') }}
                </span>
              </div>
              <!-- Bottom: Song List + Play -->
              <div class="flex items-end justify-between gap-4">
                <!-- Song Preview List (bottom-left) -->
                <div
                  v-if="dayRecommendSongs.length > 0"
                  class="hidden min-w-0 flex-1 flex-col gap-0.5 md:flex"
                >
                  <div
                    v-for="(song, idx) in dayRecommendSongs.slice(0, 3)"
                    :key="song.id"
                    class="flex items-center gap-2 py-0.5"
                  >
                    <span class="w-4 flex-shrink-0 text-center text-xs tabular-nums text-white/40">
                      {{ idx + 1 }}
                    </span>
                    <span class="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
                      {{ song.name }}
                    </span>
                    <span class="flex-shrink-0 truncate text-xs text-white/40">
                      {{ song.ar?.[0]?.name }}
                    </span>
                  </div>
                </div>
                <button
                  class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-lg transition-all duration-300 hover:scale-110 hover:bg-white active:scale-95"
                  @click.stop="playDayRecommend"
                >
                  <i class="ri-play-fill ml-0.5 text-xl" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 已登录: 私人FM (Right Card) ===== -->
        <div v-if="isLoggedIn" class="hero-card" :style="{ animationDelay: '0.22s' }">
          <div
            class="fm-card group relative cursor-pointer overflow-hidden rounded-2xl shadow-sm transition-all duration-300 ease-out hover:shadow-xl"
            :style="{ background: fmCardBg }"
            @click="handleFmPlay"
          >
            <!-- Background blur image — flows when playing -->
            <img
              v-if="fmCurrentCover"
              ref="fmCoverRef"
              :src="getImgUrl(fmCurrentCover, '512y512')"
              alt=""
              class="absolute inset-0 h-full w-full scale-150 object-cover opacity-30 blur-2xl"
              :class="isFmPlaying ? 'fm-bg-flow' : ''"
              crossorigin="anonymous"
              @load="extractFmColor"
            />
            <div class="absolute inset-0 bg-gradient-to-br from-black/10 to-black/30" />

            <!-- Content -->
            <div class="relative flex h-full items-center gap-4 p-5">
              <!-- Album Cover -->
              <div
                class="fm-cover relative aspect-square flex-shrink-0 overflow-hidden rounded-xl shadow-lg transition-transform duration-500 group-hover:scale-[1.03]"
              >
                <img
                  v-if="fmCurrentCover"
                  :src="getImgUrl(fmCurrentCover, '256y256')"
                  alt=""
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center bg-white/10">
                  <i class="ri-radio-fill text-3xl text-white/40" />
                </div>
                <!-- Playing equalizer overlay on cover -->
                <div v-if="isFmPlaying" class="absolute bottom-2 right-2 flex items-end gap-[2px]">
                  <span
                    v-for="i in 3"
                    :key="i"
                    class="eq-bar"
                    :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
                  />
                </div>
              </div>

              <!-- Song Info & Controls -->
              <div class="flex min-w-0 flex-1 flex-col justify-between self-stretch py-0.5">
                <div class="min-w-0">
                  <h3 class="truncate text-base font-bold text-white md:text-lg">
                    {{ fmCurrentSong?.name || t('comp.homeHero.discoverMusic') }}
                  </h3>
                  <p class="mt-0.5 truncate text-sm text-white/60">
                    {{ fmCurrentArtist }}
                  </p>
                </div>
                <div class="flex items-center justify-between">
                  <!-- Playback Controls -->
                  <div class="flex items-center gap-3">
                    <button
                      class="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
                      :title="t('comp.homeHero.fmTrash')"
                      @click.stop="handleFmTrash"
                    >
                      <i class="ri-thumb-down-line text-lg" />
                    </button>
                    <button
                      class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-all duration-300 hover:scale-110 hover:bg-white/30 active:scale-95"
                      @click.stop="handleFmPlay"
                    >
                      <i
                        :class="isFmPlaying ? 'ri-pause-fill' : 'ri-play-fill ml-0.5'"
                        class="text-xl"
                      />
                    </button>
                    <button
                      class="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
                      :title="t('comp.homeHero.fmNext')"
                      @click.stop="handleFmNext"
                    >
                      <i class="ri-skip-forward-fill text-lg" />
                    </button>
                  </div>

                  <!-- FM Badge -->
                  <span class="flex items-center gap-1 text-xs font-semibold text-white/50">
                    <i class="ri-radio-fill" />
                    {{ t('comp.homeHero.personalFm') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 未登录: 推荐歌单 (Right Card) ===== -->
        <div
          v-if="!isLoggedIn"
          class="hero-card group cursor-pointer"
          :style="{ animationDelay: '0.22s' }"
          @click="router.push('/list')"
        >
          <div
            class="fm-card relative overflow-hidden rounded-2xl bg-neutral-100 shadow-sm transition-all duration-300 ease-out group-hover:shadow-xl dark:bg-neutral-800"
          >
            <!-- 2x2 Cover Grid -->
            <div class="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <template v-if="hotPlaylists.length > 0">
                <div
                  v-for="(pl, idx) in hotPlaylists.slice(0, 4)"
                  :key="idx"
                  class="overflow-hidden"
                >
                  <img
                    :src="getImgUrl(pl.picUrl, '256y256')"
                    alt=""
                    class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
              </template>
              <template v-else>
                <div
                  v-for="i in 4"
                  :key="`empty-${i}`"
                  class="flex items-center justify-center bg-neutral-200/80 dark:bg-neutral-700/50"
                >
                  <i class="ri-play-list-2-line text-lg text-neutral-300 dark:text-neutral-600" />
                </div>
              </template>
            </div>
            <!-- Overlay -->
            <div class="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/40" />
            <!-- Content -->
            <div class="relative flex h-full flex-col justify-between p-5">
              <span
                class="inline-flex w-fit items-center gap-1 rounded-md bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm"
              >
                <i class="ri-play-list-2-line" />
                {{ t('comp.homeHero.hotPlaylists') }}
              </span>
              <div class="flex items-end justify-between gap-4">
                <div>
                  <h3 class="text-lg font-bold text-white">
                    {{ t('comp.homeHero.hotPlaylists') }}
                  </h3>
                  <p class="mt-0.5 text-sm text-white/70">
                    {{ t('comp.homeHero.discoverNewReleases') }}
                  </p>
                </div>
                <div
                  class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white/30"
                >
                  <i class="ri-arrow-right-s-line text-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getHotSinger, getPersonalFM, getPersonalizedPlaylist } from '@/api/home';
import { fmTrash } from '@/api/music';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import {
  useIntelligenceModeStore,
  usePlayerCoreStore,
  useRecommendStore,
  useUserStore
} from '@/store';
import { getImgUrl } from '@/utils';
import { getImageBackground } from '@/utils/linearColor';

const { t } = useI18n();
const router = useRouter();
const recommendStore = useRecommendStore();
const intelligenceModeStore = useIntelligenceModeStore();
const userStore = useUserStore();
const playerCoreStore = usePlayerCoreStore();

const loading = ref(false);

// FM state — current + preloaded next (YesPlayMusic pattern)
const fmCurrentSong = ref<any>(null);
const fmNextSong = ref<any>(null);
const fmLoading = ref(false);

const hotPlaylists = ref<any[]>([]);
const hotArtistsList = ref<any[]>([]);
const dailyCoverRef = ref<HTMLImageElement | null>(null);
const fmCoverRef = ref<HTMLImageElement | null>(null);
const dailyCardBg = ref('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
const fmCardBg = ref('linear-gradient(135deg, #e91e63 0%, #c2185b 100%)');

const isLoggedIn = computed(() => !!userStore.user);
const dayRecommendSongs = computed(() => recommendStore.dailyRecommendSongs);
const dayRecommendCover = computed(() => dayRecommendSongs.value[0]?.al?.picUrl || '');

const fmCurrentCover = computed(
  () => fmCurrentSong.value?.album?.picUrl || fmCurrentSong.value?.al?.picUrl || ''
);
const fmCurrentArtist = computed(() => {
  const song = fmCurrentSong.value;
  if (!song) return t('comp.homeHero.personalFmDesc');
  const artists = song.artists || song.ar;
  return artists?.map((a: any) => a.name).join(' / ') || '';
});

const isIntelligenceMode = computed(() => intelligenceModeStore.isIntelligenceMode);
const isFmPlaying = computed(
  () =>
    !!fmCurrentSong.value &&
    playerCoreStore.currentSong?.id === fmCurrentSong.value.id &&
    playerCoreStore.isPlaying
);

// ==================== Color extraction ====================

const extractDailyColor = async () => {
  const img = dailyCoverRef.value;
  if (!img) return;
  try {
    const { primaryColor } = await getImageBackground(img);
    if (primaryColor) {
      const tinycolor = (await import('tinycolor2')).default;
      const base = tinycolor(primaryColor);
      const hsl = base.toHsl();
      const c1 = tinycolor({ h: hsl.h, s: Math.min(hsl.s * 1.2, 1), l: 0.35 });
      const c2 = tinycolor({ h: (hsl.h + 30) % 360, s: Math.min(hsl.s * 1.1, 1), l: 0.25 });
      dailyCardBg.value = `linear-gradient(135deg, ${c1.toHexString()} 0%, ${c2.toHexString()} 100%)`;
    }
  } catch {
    // keep default gradient
  }
};

const extractFmColor = async () => {
  const img = fmCoverRef.value;
  if (!img) return;
  try {
    const { primaryColor } = await getImageBackground(img);
    if (primaryColor) {
      const tinycolor = (await import('tinycolor2')).default;
      const base = tinycolor(primaryColor);
      const hsl = base.toHsl();
      const c1 = tinycolor({ h: hsl.h, s: Math.min(hsl.s * 1.3, 1), l: 0.4 });
      const c2 = tinycolor({ h: (hsl.h + 20) % 360, s: Math.min(hsl.s * 1.1, 1), l: 0.3 });
      fmCardBg.value = `linear-gradient(135deg, ${c1.toHexString()} 0%, ${c2.toHexString()} 100%)`;
    }
  } catch {
    // keep default gradient
  }
};

// ==================== FM logic (YesPlayMusic pattern) ====================

/** Fetch FM songs from API, with retry */
const fetchFmSongs = async (retries = 3): Promise<any[]> => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await getPersonalFM();
      // axios response: res.data = { data: [...], code: 200 }
      const songs = res.data?.data;
      if (Array.isArray(songs) && songs.length > 0) return songs;
    } catch {
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return [];
};

/** Load current + preload next FM song */
const loadFmSongs = async () => {
  if (fmLoading.value) return;
  fmLoading.value = true;
  try {
    const songs = await fetchFmSongs();
    if (songs.length > 0) {
      fmCurrentSong.value = songs[0];
      fmNextSong.value = songs[1] || null;
    }
  } finally {
    fmLoading.value = false;
  }
};

/** Preload next FM song in background */
const preloadNextFm = async () => {
  if (fmNextSong.value) return; // already have next
  try {
    const songs = await fetchFmSongs(1);
    if (songs.length > 0) {
      fmNextSong.value = songs[0];
    }
  } catch {
    // silent
  }
};

/** Play/pause current FM song */
const handleFmPlay = async () => {
  if (!fmCurrentSong.value) return;
  // Toggle play/pause if this FM song is already loaded
  if (playerCoreStore.currentSong?.id === fmCurrentSong.value.id) {
    const { usePlaylistStore } = await import('@/store/modules/playlist');
    const playlistStore = usePlaylistStore();
    await playlistStore.setPlay(playerCoreStore.currentSong);
    return;
  }
  try {
    const { usePlayerCoreStore } = await import('@/store/modules/playerCore');
    const { usePlaylistStore } = await import('@/store/modules/playlist');
    const playerCore = usePlayerCoreStore();
    const playlistStore = usePlaylistStore();
    const song = fmCurrentSong.value;
    const playlist = [
      {
        id: song.id,
        name: song.name,
        picUrl: song.al?.picUrl || song.album?.picUrl,
        ar: song.artists || song.ar,
        al: song.al || song.album,
        source: 'netease' as const,
        song,
        ...song,
        playLoading: false
      }
    ];
    playlistStore.setPlayList(playlist, false, false);
    playerCore.isFmPlaying = true;
    await playerCore.handlePlayMusic(playlist[0], true);
  } catch (error) {
    console.error('Failed to play Personal FM:', error);
  }
};

/** Next FM track — promote preloaded, fetch new one in background */
const handleFmNext = async () => {
  if (fmLoading.value) return;
  if (fmNextSong.value) {
    fmCurrentSong.value = fmNextSong.value;
    fmNextSong.value = null;
    preloadNextFm();
  } else {
    await loadFmSongs();
  }
  await handleFmPlay();
};

/** Trash/dislike current FM song — call API then skip to next */
const handleFmTrash = async () => {
  const song = fmCurrentSong.value;
  if (!song) return;
  try {
    await fmTrash(song.id);
  } catch {
    // even if trash API fails, still skip
  }
  await handleFmNext();
};

// ==================== Quick Nav ====================

const quickNavItems = computed(() => {
  const items = [
    {
      key: 'intelligence',
      label: t('comp.homeHero.intelligenceMode'),
      icon: 'ri-heart-pulse-fill',
      active: isIntelligenceMode.value,
      action: toggleIntelligenceMode,
      show: isLoggedIn.value
    },
    {
      key: 'toplist',
      label: t('comp.toplist'),
      icon: 'ri-trophy-line',
      active: false,
      action: () => router.push('/toplist'),
      show: true
    },
    {
      key: 'favorite',
      label: t('comp.homeHero.quickNav.myFavorite'),
      icon: 'ri-heart-3-line',
      active: false,
      action: () => router.push('/favorite'),
      show: true
    },
    {
      key: 'podcast',
      label: t('podcast.podcast'),
      icon: 'ri-radio-2-line',
      active: false,
      action: () => router.push('/podcast'),
      show: true
    },
    {
      key: 'mv',
      label: t('comp.mv'),
      icon: 'ri-movie-2-line',
      active: false,
      action: () => router.push('/mv'),
      show: true
    },
    {
      key: 'playlist',
      label: t('comp.list'),
      icon: 'ri-play-list-2-line',
      active: false,
      action: () => router.push('/list'),
      show: true
    },
    {
      key: 'album',
      label: t('comp.newAlbum.title'),
      icon: 'ri-album-line',
      active: false,
      action: () => router.push('/album'),
      show: true
    },
    {
      key: 'history',
      label: t('comp.history'),
      icon: 'ri-history-line',
      active: false,
      action: () => router.push('/history'),
      show: true
    }
  ];
  return items.filter((item) => item.show);
});

// ==================== Data fetching ====================

const fetchHeroData = async () => {
  try {
    loading.value = true;
    const promises: Promise<any>[] = [];

    promises.push(recommendStore.refreshIfStale());

    promises.push(
      getPersonalizedPlaylist(8)
        .then((res: any) => {
          const list = res.result || res.data;
          if (list && !isLoggedIn.value) hotPlaylists.value = list;
        })
        .catch(() => {})
    );

    if (isLoggedIn.value) {
      promises.push(loadFmSongs());
    } else {
      promises.push(
        getHotSinger({ offset: 0, limit: 6 })
          .then((res: any) => {
            if (res.artists) hotArtistsList.value = res.artists;
          })
          .catch(() => {})
      );
    }

    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to fetch hero data:', error);
  } finally {
    loading.value = false;
  }
};

// ==================== Daily recommend actions ====================

const showDayRecommend = () => {
  if (dayRecommendSongs.value.length === 0) return;
  navigateToMusicList(router, {
    type: 'dailyRecommend',
    name: t('comp.recommendSinger.songlist'),
    songList: dayRecommendSongs.value,
    canRemove: false
  });
};

const playDayRecommend = async () => {
  if (dayRecommendSongs.value.length === 0) return;
  try {
    const { usePlayerCoreStore } = await import('@/store/modules/playerCore');
    const { usePlaylistStore } = await import('@/store/modules/playlist');
    const playerCore = usePlayerCoreStore();
    const playlistStore = usePlaylistStore();
    const songs = dayRecommendSongs.value.map((s: any) => ({
      id: s.id,
      name: s.name,
      picUrl: s.al?.picUrl,
      source: 'netease',
      song: s,
      ...s,
      playLoading: false
    }));
    playlistStore.setPlayList(songs, false, false);
    await playerCore.handlePlayMusic(songs[0], true);
  } catch (error) {
    console.error('Failed to play daily recommend:', error);
  }
};

const toggleIntelligenceMode = () => {
  if (isIntelligenceMode.value) {
    intelligenceModeStore.clearIntelligenceMode();
  } else {
    intelligenceModeStore.playIntelligenceMode();
  }
};

// ==================== Lifecycle ====================

onMounted(() => {
  fetchHeroData();
});

onActivated(() => {
  recommendStore.refreshIfStale();
});
</script>

<style scoped>
/* Scrollbar hide */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Nav chip animation */
.nav-chip {
  animation: chipIn 0.4s ease both;
}
@keyframes chipIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Hero grid — left wider, right narrower, equal row height */
.hero-grid {
  grid-template-columns: 3fr 2fr;
}

/* Cards fill grid row height equally */
.hero-grid > .hero-card {
  height: 100%;
}
.hero-grid > .hero-card > .daily-card,
.hero-grid > .hero-card > .fm-card {
  height: 100%;
  min-height: 140px;
  max-height: 180px;
}

/* Card animation */
.hero-card {
  animation: cardUp 0.5s ease both;
}
@keyframes cardUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* FM background flow animation when playing */
.fm-bg-flow {
  animation: bgFlow 8s ease-in-out infinite alternate;
}
@keyframes bgFlow {
  0% {
    transform: scale(1.5) translate(0, 0);
  }
  33% {
    transform: scale(1.6) translate(-3%, 2%);
  }
  66% {
    transform: scale(1.55) translate(2%, -2%);
  }
  100% {
    transform: scale(1.5) translate(-1%, 1%);
  }
}

/* FM cover — sized relative to card, leaving padding space */
.fm-cover {
  height: calc(100% - 6px);
}

/* FM equalizer bars */
.eq-bar {
  width: 3px;
  border-radius: 9999px;
  background-color: #22c55e;
  animation: eqPulse 0.8s ease-in-out infinite;
}
.eq-bar:nth-child(1) {
  height: 6px;
}
.eq-bar:nth-child(2) {
  height: 12px;
}
.eq-bar:nth-child(3) {
  height: 8px;
}
@keyframes eqPulse {
  0%,
  100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(1.6);
  }
}

/* Skeleton shimmer */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    theme('colors.neutral.200') 25%,
    theme('colors.neutral.100') 50%,
    theme('colors.neutral.200') 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
:deep(.dark) .skeleton-shimmer,
.dark .skeleton-shimmer {
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
