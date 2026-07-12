<template>
  <div
    class="music-list-page h-full w-full min-h-0 flex flex-col bg-white dark:bg-black page-padding"
  >
    <div v-if="loading && !songList.length" class="flex-1 flex items-center justify-center">
      <n-spin size="large" />
    </div>
    <div v-else-if="!songList.length" class="flex-1 flex items-center justify-center">
      <n-empty :description="emptyDesc" />
    </div>
    <template v-else>
      <div class="flex items-center justify-between py-4 gap-4 flex-shrink-0">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white truncate">{{ name }}</h1>
          <p class="text-sm text-gray-500 mt-1">
            {{ displayCount }}
            <span v-if="hasMore" class="opacity-70"> · 滚动加载更多</span>
          </p>
        </div>
        <n-button type="primary" :disabled="!songList.length" @click="handlePlayAll">
          <template #icon><i class="ri-play-fill" /></template>
          播放全部
        </n-button>
      </div>
      <div class="flex-1 min-h-0">
        <n-scrollbar class="h-full" @scroll="onScroll">
          <div class="space-y-1 pb-32">
            <song-item
              v-for="(song, index) in songList"
              :key="song.id"
              :item="formatSong(song)"
              :index="index"
            />
            <div v-if="loadingMore" class="py-6 text-center text-sm text-gray-500">加载中…</div>
            <div
              v-else-if="!hasMore && songList.length"
              class="py-4 text-center text-xs text-gray-400"
            >
              已加载全部
            </div>
          </div>
        </n-scrollbar>
      </div>
    </template>
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

const PAGE_SIZE = 50;

const route = useRoute();
const message = useMessage();
const playerStore = usePlayerStore();
const musicStore = useMusicStore();
const recommendStore = useRecommendStore();

const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const nextCursor = ref<string | undefined>(undefined);
const totalHint = ref(0);

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

const displayCount = computed(() => {
  if (isDailyRecommend.value) return `${songList.value.length} 首`;
  if (totalHint.value > 0) {
    return `已加载 ${songList.value.length} / ${totalHint.value} 首`;
  }
  return `${songList.value.length} 首`;
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
  // 只把已加载的加入播放列表；需要更多请先滚动加载
  const list = songList.value.map(formatSong);
  playerStore.setPlayList(list);
  playerStore.setPlay(list[0]);
};

const isRemotePlaylist = () =>
  listType.value === 'playlist' && source.value === 'qishui' && !!listId.value;

const loadRemotePlaylist = async (reset = true) => {
  if (!isElectron || !isRemotePlaylist()) return;

  if (reset) {
    // 同 id 已有数据且不是强制重载：保留，但仍可继续翻页
    if (
      musicStore.currentListInfo?.id?.toString() === listId.value &&
      musicStore.currentMusicList?.length
    ) {
      return;
    }
    loading.value = true;
    nextCursor.value = undefined;
    hasMore.value = false;
    totalHint.value = 0;
  } else {
    if (!hasMore.value || loadingMore.value || loading.value) return;
    loadingMore.value = true;
  }

  try {
    const detail = await msGetPlaylist(listId.value, {
      limit: PAGE_SIZE,
      cursor: reset ? '0' : nextCursor.value || '0'
    });
    const songs = detail.songs.map(mapMsSongToSongResult);
    totalHint.value = detail.playlist.trackCount || totalHint.value || 0;
    nextCursor.value = detail.nextCursor;
    hasMore.value = !!detail.hasMore && !!detail.nextCursor;

    if (reset) {
      musicStore.setCurrentMusicList(
        songs,
        detail.playlist.name,
        {
          id: detail.playlist.id,
          name: detail.playlist.name,
          picUrl: detail.playlist.coverUrl,
          source: 'qishui',
          trackCount: detail.playlist.trackCount
        },
        false
      );
    } else {
      const merged = [...(musicStore.currentMusicList || []), ...songs];
      // 去重
      const seen = new Set<string>();
      const unique = merged.filter((s) => {
        const k = String(s.id);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      musicStore.setCurrentMusicList(
        unique,
        musicStore.currentMusicListName || detail.playlist.name,
        {
          ...(musicStore.currentListInfo || {}),
          id: detail.playlist.id,
          name: detail.playlist.name || musicStore.currentMusicListName,
          picUrl: detail.playlist.coverUrl || musicStore.currentListInfo?.picUrl,
          source: 'qishui',
          trackCount: detail.playlist.trackCount
        },
        false
      );
    }
  } catch (error: any) {
    console.error('[MusicListPage] getPlaylist failed:', error);
    message.error(error?.message || '加载歌单失败');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const onScroll = (e: Event) => {
  if (!isRemotePlaylist() || !hasMore.value || loadingMore.value) return;
  const el = e.target as HTMLElement;
  if (!el) return;
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (remain < 240) {
    void loadRemotePlaylist(false);
  }
};

onMounted(() => {
  void loadRemotePlaylist(true);
});

watch([listId, listType, source], () => {
  void loadRemotePlaylist(true);
});
</script>
