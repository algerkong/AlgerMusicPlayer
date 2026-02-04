<template>
  <section class="new-songs-section">
    <!-- Section Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white">
          {{ title }}
        </h2>
        <div class="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
      <button
        class="play-all-btn text-xs md:text-sm font-bold text-primary dark:text-white hover:text-primary/80 dark:hover:text-white/80 transition-colors flex items-center gap-1.5"
        @click="playAll"
      >
        <i class="iconfont icon-playfill text-sm"></i>
        <span>{{ t('common.playAll') }}</span>
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div
      v-if="loading"
      class="songs-grid grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <div
        v-for="i in 10"
        :key="i"
        class="skeleton-item h-20 animate-pulse rounded-xl md:rounded-2xl bg-neutral-100 dark:bg-neutral-800/50"
      />
    </div>

    <!-- Songs Grid (Even columns: 1→2→3→4→5) -->
    <div
      v-else
      class="songs-grid grid grid-cols-1 gap-2 md:gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <song-item
        v-for="(song, index) in songs"
        :key="song.id"
        :item="song"
        home
        :favorite="false"
        :style="{ animationDelay: calculateAnimationDelay(index % 5, 0.05) }"
        class="animate-item"
        @play="playSong(song)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getRecommendMusic } from '@/api/home';
import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store';
import { SongResult } from '@/types/music';
import { calculateAnimationDelay } from '@/utils';

const props = defineProps<{
  title: string;
  limit?: number;
}>();

const { t } = useI18n();
const playerStore = usePlayerStore();
const songs = ref<SongResult[]>([]);
const loading = ref(true);

const fetchSongs = async () => {
  try {
    const { data } = await getRecommendMusic({ limit: props.limit || 12 });
    if (data.code === 200) {
      // 转换数据格式为 SongResult
      songs.value = data.result.slice(0, props.limit || 12).map((item: any) => ({
        ...item,
        source: 'netease',
        picUrl: item.picUrl,
        al: {
          picUrl: item.picUrl,
          name: item.name,
          id: item.id
        },
        ar: item.song.artists
      })) as SongResult[];
    }
  } catch (error) {
    console.error('Failed to fetch new songs:', error);
  } finally {
    loading.value = false;
  }
};

const playSong = (song: SongResult) => {
  playerStore.setPlay(song);
};

const playAll = () => {
  if (songs.value.length > 0) {
    playerStore.setPlayList(songs.value);
    playerStore.setPlay(songs.value[0]);
  }
};

onMounted(() => {
  fetchSongs();
});
</script>

<style scoped>
/* Typography System */
.section-title {
  @apply text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight;
}

/* Optimized grid */
.songs-grid {
  grid-auto-rows: auto;
}
</style>
