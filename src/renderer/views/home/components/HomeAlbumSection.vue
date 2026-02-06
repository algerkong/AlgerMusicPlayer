<template>
  <section class="album-section">
    <!-- Section Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white">
          {{ title }}
        </h2>
        <div class="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
      <button
        class="group flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition-colors hover:text-primary dark:text-neutral-500 dark:hover:text-white"
        @click="$emit('more')"
      >
        <span>{{ t('comp.more') }}</span>
        <i class="ri-arrow-right-s-line text-base transition-transform group-hover:translate-x-1" />
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      <div v-for="i in displayCount" :key="i" class="space-y-3">
        <div class="aspect-square animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
        <div class="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div class="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>

    <!-- Album Grid -->
    <div
      v-else-if="displayAlbums.length > 0"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
    >
      <home-list-item
        v-for="(album, index) in displayAlbums"
        :key="album.id"
        :cover="album.picUrl"
        :title="album.name"
        :subtitle="getArtistNames(album)"
        :tracks="albumTracksMap[album.id] || []"
        :show-hover-tracks="!isMobile"
        :animation-delay="calculateAnimationDelay(index, 0.04)"
        @click="handleAlbumClick(album)"
        @play="playAlbum(album)"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-neutral-400">
      <i class="ri-album-line mb-4 text-5xl opacity-20" />
      <p class="text-sm font-medium">{{ t('comp.newAlbum.empty') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getTopAlbum } from '@/api/home';
import { getAlbum } from '@/api/list';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { usePlayerCoreStore } from '@/store/modules/playerCore';
import { usePlaylistStore } from '@/store/modules/playlist';
import { calculateAnimationDelay, isElectron, isMobile } from '@/utils';

import HomeListItem from './HomeListItem.vue';

const props = withDefaults(
  defineProps<{
    title: string;
    limit?: number;
    columns?: number;
    rows?: number;
  }>(),
  {
    limit: 10,
    columns: 5,
    rows: 2
  }
);

defineEmits<{
  (e: 'more'): void;
}>();

const { t } = useI18n();
const router = useRouter();
const albums = ref<any[]>([]);
const loading = ref(true);
const albumTracksMap = reactive<Record<number, any[]>>({});

// Calculate display count to fill exactly N rows
const displayCount = computed(() => {
  if (isMobile.value) {
    return 6;
  }
  return props.columns * props.rows;
});

const displayAlbums = computed(() => {
  const count = displayCount.value;
  return albums.value.slice(0, count);
});

const fetchAlbums = async () => {
  try {
    const { data } = await getTopAlbum({ limit: props.limit || displayCount.value + 5 });
    if (data.code === 200) {
      albums.value = data.weekData || data.monthData || data.albums || [];
      // Preload tracks for displayed albums (Electron only)
      if (isElectron && !isMobile.value) {
        preloadAllTracks();
      }
    }
  } catch (error) {
    console.error('Failed to fetch albums:', error);
  } finally {
    loading.value = false;
  }
};

const preloadAllTracks = async () => {
  const albumsToLoad = displayAlbums.value;

  // Load tracks in parallel with concurrency limit
  const batchSize = 4;
  for (let i = 0; i < albumsToLoad.length; i += batchSize) {
    const batch = albumsToLoad.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (album) => {
        if (albumTracksMap[album.id]) return;
        try {
          const { data } = await getAlbum(album.id);
          if (data.code === 200 && data.songs) {
            albumTracksMap[album.id] = data.songs.slice(0, 3).map((s: any) => ({
              id: s.id,
              name: s.name
            }));
          }
        } catch (error) {
          console.debug('Failed to load tracks for album:', album.id, error);
        }
      })
    );
  }
};

const getArtistNames = (album: any) => {
  if (album.artists) {
    return album.artists.map((ar: any) => ar.name).join(' / ');
  }
  if (album.artist) {
    return album.artist.name;
  }
  return '';
};

const handleAlbumClick = async (album: any) => {
  try {
    navigateToMusicList(router, {
      id: album.id,
      type: 'album',
      name: album.name,
      listInfo: {
        ...album,
        coverImgUrl: album.picUrl
      },
      canRemove: false
    });
  } catch (error) {
    console.error('Failed to navigate to album:', error);
  }
};

const playAlbum = async (album: any) => {
  try {
    const { data } = await getAlbum(album.id);
    if (data.code === 200 && data.songs?.length > 0) {
      const playerCore = usePlayerCoreStore();
      const playlistStore = usePlaylistStore();

      const playlist = data.songs.map((s: any) => ({
        id: s.id,
        name: s.name,
        picUrl: s.al?.picUrl || album.picUrl,
        source: 'netease',
        song: s,
        ...s,
        playLoading: false
      }));

      playlistStore.setPlayList(playlist, false, false);
      await playerCore.handlePlayMusic(playlist[0], true);
    }
  } catch (error) {
    console.error('Failed to play album:', error);
  }
};

onMounted(() => {
  fetchAlbums();
});
</script>
