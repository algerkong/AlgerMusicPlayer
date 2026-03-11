<template>
  <section class="daily-recommend-section">
    <!-- Section Header -->
    <div class="section-header mb-6 md:mb-8 flex items-end justify-between">
      <div>
        <h2 class="section-title text-neutral-900 dark:text-white">
          {{ title }}
        </h2>
        <div class="mt-1.5 h-1 w-12 rounded-full bg-primary" />
      </div>
      <div class="flex items-center gap-3">
        <!-- Play All Button -->
        <button
          v-if="!loading && songs.length > 0"
          class="play-all-btn flex items-center gap-1.5 text-xs md:text-sm font-bold text-primary dark:text-white hover:text-primary/80 dark:hover:text-white/80 transition-colors"
          @click="playAll"
        >
          <i class="iconfont icon-playfill text-sm" />
          <span>{{ t('comp.musicList.playAll') }}</span>
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div
      v-if="loading"
      class="grid grid-cols-2 gap-4 md:gap-5 lg:gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    >
      <div
        v-for="i in 12"
        :key="i"
        class="aspect-square skeleton-shimmer rounded-2xl md:rounded-3xl"
      />
    </div>

    <!-- Songs Grid -->
    <div
      v-else-if="songs.length > 0"
      class="songs-grid grid grid-cols-2 gap-4 gap-y-8 md:gap-5 md:gap-y-10 lg:gap-6 lg:gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    >
      <div
        v-for="(song, index) in songs.slice(0, limit)"
        :key="song.id"
        class="song-item animate-item group relative flex flex-col cursor-pointer"
        :style="{ animationDelay: calculateAnimationDelay(index, 0.03) }"
        @click="handleSongClick(song, index)"
      >
        <!-- Cover Container -->
        <div class="cover-wrapper relative aspect-square">
          <!-- 背景层 -->
          <div
            class="cover-bg absolute inset-0 rounded-2xl md:rounded-3xl bg-neutral-100 dark:bg-neutral-800 transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-primary/10"
          />

          <!-- 图片层 -->
          <div class="cover-container absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl">
            <img
              :src="getImgUrl(song.album?.picUrl || song.al?.picUrl, '500y500')"
              class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
              :alt="song.name"
            />
          </div>

          <!-- Play Overlay -->
          <div
            class="play-overlay absolute inset-0 flex items-center justify-center rounded-2xl md:rounded-3xl bg-black/0 opacity-0 backdrop-blur-0 transition-all duration-300 group-hover:bg-black/10 group-hover:opacity-100 group-hover:backdrop-blur-[2px]"
          >
            <div
              class="play-button flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-white shadow-2xl transition-all duration-300 scale-90 group-hover:scale-100 hover:scale-110 active:scale-95"
            >
              <i class="iconfont icon-playfill text-lg md:text-2xl text-neutral-900 ml-0.5" />
            </div>
          </div>

          <!-- Recommended Badge -->
          <div
            class="badge absolute top-3 right-3 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold text-white"
          >
            {{ t('comp.dailyRecommend.badge') }}
          </div>
        </div>

        <!-- Info -->
        <div class="song-info mt-3 md:mt-4 px-0.5">
          <h3
            class="song-name line-clamp-2 text-sm md:text-base font-semibold leading-tight text-neutral-800 dark:text-neutral-100 transition-colors duration-200 group-hover:text-primary dark:group-hover:text-white"
          >
            {{ song.name }}
          </h3>
          <p
            class="artist-name mt-1 md:mt-1.5 line-clamp-1 text-[10px] md:text-[11px] font-medium text-neutral-400 dark:text-neutral-500"
          >
            {{ getArtistNames(song) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="empty-state flex flex-col items-center justify-center py-20 text-neutral-400"
    >
      <i class="iconfont icon-music text-6xl mb-4 opacity-30" />
      <p>{{ t('comp.dailyRecommend.empty') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRecommendStore } from '@/store';
import { calculateAnimationDelay, getImgUrl } from '@/utils';

defineProps<{
  title: string;
  limit?: number;
}>();

const { t } = useI18n();
const recommendStore = useRecommendStore();

const songs = computed(() => recommendStore.dailyRecommendSongs);
const loading = computed(() => songs.value.length === 0 && !recommendStore.lastFetchDate);

onMounted(() => {
  recommendStore.refreshIfStale();
});

// keep-alive 激活时检查是否跨天需要刷新
onActivated(() => {
  recommendStore.refreshIfStale();
});

const getArtistNames = (song: any) => {
  if (song.artists) {
    return song.artists.map((ar: any) => ar.name).join(' / ');
  }
  if (song.ar) {
    return song.ar.map((ar: any) => ar.name).join(' / ');
  }
  return 'Unknown Artist';
};

const handleSongClick = async (_song: any, index: number) => {
  const { usePlayerCoreStore } = await import('@/store/modules/playerCore');
  const { usePlaylistStore } = await import('@/store/modules/playlist');

  const playerCore = usePlayerCoreStore();
  const playlistStore = usePlaylistStore();

  const playlist = songs.value.map((s: any) => ({
    id: s.id,
    name: s.name,
    picUrl: s.album?.picUrl || s.al?.picUrl,
    source: 'netease',
    song: s,
    ...s,
    playLoading: false
  }));

  playlistStore.setPlayList(playlist, false, false);
  await playerCore.handlePlayMusic(playlist[index], true);
};

const playAll = async () => {
  if (songs.value.length === 0) return;

  const { usePlayerCoreStore } = await import('@/store/modules/playerCore');
  const { usePlaylistStore } = await import('@/store/modules/playlist');

  const playerCore = usePlayerCoreStore();
  const playlistStore = usePlaylistStore();

  const playlist = songs.value.map((s: any) => ({
    id: s.id,
    name: s.name,
    picUrl: s.album?.picUrl || s.al?.picUrl,
    source: 'netease',
    song: s,
    ...s,
    playLoading: false
  }));

  playlistStore.setPlayList(playlist, false, false);
  await playerCore.handlePlayMusic(playlist[0], true);
};
</script>

<style scoped>
/* 网格 */
.songs-grid {
  grid-auto-rows: auto;
}

/* 确保圆角在任何情况下都保持不变 */
.cover-wrapper {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.cover-container {
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
</style>
