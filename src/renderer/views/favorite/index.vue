<template>
  <div class="favorite-page h-full flex flex-col page-padding">
    <div class="flex items-center justify-between py-4 flex-shrink-0">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('favorite.title') }}</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {{ t('favorite.count', { count: favoriteSongs.length }) }}
        </p>
      </div>
      <n-button v-if="favoriteSongs.length" type="primary" secondary @click="handlePlay">
        <template #icon><i class="ri-play-fill" /></template>
        {{ t('common.play') }}
      </n-button>
    </div>

    <n-empty
      v-if="!favoriteSongs.length"
      class="flex-1 flex items-center justify-center"
      :description="t('favorite.emptyTip')"
    />
    <scroll-area v-else class="flex-1 min-h-0">
      <div class="space-y-1 pb-32">
        <song-item
          v-for="(song, index) in favoriteSongs"
          :key="song.id"
          :item="song"
          :index="index"
        />
      </div>
    </scroll-area>
  </div>
</template>

<script setup lang="ts">
import { NButton, NEmpty } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import SongItem from '@/components/common/SongItem.vue';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVisibleSongPrefetch } from '@/hooks/useVisibleSongPrefetch';
import { usePlayerStore } from '@/store';
import { usePlayHistoryStore } from '@/store/modules/playHistory';
import type { SongResult } from '@/types/music';

defineOptions({ name: 'Favorite' });

const { t } = useI18n();
const playerStore = usePlayerStore();
const playHistoryStore = usePlayHistoryStore();
const favoriteSongs = ref<SongResult[]>([]);

useVisibleSongPrefetch(favoriteSongs, { maxConcurrent: 3, maxPrefetch: 12, auto: true });

const favoriteList = computed(() => playerStore.favoriteList);

/** 仅从本地历史/播放列表中解析收藏歌曲（无云端详情 API） */
const resolveFavoriteSongs = () => {
  const ids = favoriteList.value;
  if (!ids.length) {
    favoriteSongs.value = [];
    return;
  }

  const pool: SongResult[] = [
    ...(playHistoryStore.musicHistory as SongResult[]),
    ...(playerStore.playList as SongResult[])
  ];

  const byId = new Map<string, SongResult>();
  for (const song of pool) {
    if (song?.id != null) byId.set(String(song.id), song);
  }

  favoriteSongs.value = ids.map((id) => byId.get(String(id))).filter((s): s is SongResult => !!s);
};

const handlePlay = () => {
  if (favoriteSongs.value.length) {
    playerStore.setPlayList(favoriteSongs.value);
  }
};

onMounted(async () => {
  await playerStore.initializeFavoriteList();
  resolveFavoriteSongs();
});

watch(favoriteList, () => resolveFavoriteSongs(), { deep: true });
</script>
