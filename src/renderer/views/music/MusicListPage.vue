<template>
  <div class="music-list-page h-full w-full bg-white dark:bg-black page-padding">
    <div v-if="!songList.length" class="h-full flex items-center justify-center">
      <n-empty description="暂无歌曲 · 在线音源将接入独立库" />
    </div>
    <template v-else>
      <div class="flex items-center justify-between py-4 gap-4">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white truncate">{{ name }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ songList.length }} 首</p>
        </div>
        <n-button type="primary" @click="handlePlayAll">
          <template #icon><i class="ri-play-fill" /></template>
          播放全部
        </n-button>
      </div>
      <n-scrollbar class="h-[calc(100%-88px)]">
        <div class="space-y-1 pb-32">
          <song-item
            v-for="(song, index) in songList"
            :key="song.id"
            :item="formatSong(song)"
            :index="index"
          />
        </div>
      </n-scrollbar>
    </template>
  </div>
</template>

<script setup lang="ts">
import { NButton, NEmpty, NScrollbar } from 'naive-ui';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import SongItem from '@/components/common/SongItem.vue';
import { useMusicStore, usePlayerStore, useRecommendStore } from '@/store';
import type { SongResult } from '@/types/music';

defineOptions({ name: 'MusicList' });

const route = useRoute();
const playerStore = usePlayerStore();
const musicStore = useMusicStore();
const recommendStore = useRecommendStore();

const isDailyRecommend = computed(() => route.query.type === 'dailyRecommend');

const name = computed(() => {
  if (isDailyRecommend.value) return '每日推荐';
  return musicStore.currentMusicListName || '';
});

const songList = computed(() => {
  if (isDailyRecommend.value) return recommendStore.dailyRecommendSongs;
  return musicStore.currentMusicList || [];
});

const formatSong = (item: any): SongResult => {
  if (!item) return item;
  const picUrl = item.al?.picUrl || item.picUrl || '';
  return {
    ...item,
    picUrl,
    song: {
      artists: item.ar || item.artists,
      name: item.name,
      id: item.id
    }
  };
};

const handlePlayAll = () => {
  if (!songList.value.length) return;
  const list = songList.value.map(formatSong);
  playerStore.setPlayList(list);
  playerStore.setPlay(list[0]);
};
</script>
