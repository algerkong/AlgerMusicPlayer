<template>
  <div class="music-list-page h-full w-full bg-white dark:bg-black page-padding">
    <n-spin :show="loading" class="h-full">
      <div v-if="!songList.length && !loading" class="h-full flex items-center justify-center">
        <n-empty :description="emptyDesc" />
      </div>
      <template v-else-if="songList.length">
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
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { NButton, NEmpty, NScrollbar, NSpin, useMessage } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { mapMsSongToSongResult, msGetPlaylist } from '@/api/musicSource';
import SongItem from '@/components/common/SongItem.vue';
import { useMusicStore, usePlayerStore, useRecommendStore } from '@/store';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils';

defineOptions({ name: 'MusicList' });

const route = useRoute();
const message = useMessage();
const playerStore = usePlayerStore();
const musicStore = useMusicStore();
const recommendStore = useRecommendStore();

const loading = ref(false);

const isDailyRecommend = computed(() => route.query.type === 'dailyRecommend');
const source = computed(() => String(route.query.source || ''));
const listId = computed(() => String(route.params.id || ''));
const listType = computed(() => String(route.query.type || ''));

const name = computed(() => {
  if (isDailyRecommend.value) return '每日推荐';
  return musicStore.currentMusicListName || '';
});

const songList = computed(() => {
  if (isDailyRecommend.value) return recommendStore.dailyRecommendSongs;
  return musicStore.currentMusicList || [];
});

const emptyDesc = computed(() => {
  if (listType.value === 'playlist' && source.value === 'qishui') {
    return '歌单为空或加载失败';
  }
  return '暂无歌曲';
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

const loadRemotePlaylist = async () => {
  if (!isElectron) return;
  if (listType.value !== 'playlist' || source.value !== 'qishui' || !listId.value) return;
  // already have songs for this id
  if (
    musicStore.currentListInfo?.id?.toString() === listId.value &&
    musicStore.currentMusicList?.length
  ) {
    return;
  }

  loading.value = true;
  try {
    const detail = await msGetPlaylist(listId.value);
    const songs = detail.songs.map(mapMsSongToSongResult);
    musicStore.setCurrentMusicList(
      songs,
      detail.playlist.name,
      {
        id: detail.playlist.id,
        name: detail.playlist.name,
        picUrl: detail.playlist.coverUrl,
        source: 'qishui'
      },
      false
    );
  } catch (error: any) {
    console.error('[MusicListPage] getPlaylist failed:', error);
    message.error(error?.message || '加载歌单失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadRemotePlaylist();
});

watch([listId, listType, source], () => {
  void loadRemotePlaylist();
});
</script>
