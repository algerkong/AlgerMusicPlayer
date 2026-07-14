<template>
  <div class="history-page h-full flex flex-col">
    <div class="flex flex-col gap-4 px-6 pt-4 pb-2 flex-shrink-0" v-if="!isMobile">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('history.title') }}</h2>
        <button
          class="h-8 px-3 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors flex items-center gap-1.5"
          @click="router.push('/heatmap')"
        >
          <i class="ri-calendar-2-line"></i>
          {{ t('history.heatmapTitle') }}
        </button>
      </div>

      <scroll-area orientation="horizontal" class="max-w-full">
        <div class="bg-gray-100 dark:bg-neutral-800 p-1 rounded-full inline-flex h-9 items-center">
          <div
            v-for="tab in categoryTabs"
            :key="tab"
            class="px-4 h-7 rounded-full text-xs font-medium cursor-pointer transition-all duration-300 flex items-center justify-center whitespace-nowrap"
            :class="
              currentCategory === tab
                ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            "
            @click="currentCategory = tab"
          >
            {{ t(`history.categoryTabs.${tab}`) }}
          </div>
        </div>
      </scroll-area>
    </div>

    <div class="flex-1 min-h-0 px-6">
      <n-empty
        v-if="!displayList.length"
        class="h-full flex items-center justify-center"
        :description="t('history.noData')"
      />
      <scroll-area v-else class="h-full">
        <div class="space-y-1 pb-32">
          <template v-if="currentCategory === 'songs'">
            <song-item
              v-for="(song, index) in displayList"
              :key="song.id"
              :item="song as any"
              :index="index"
              can-remove
              @remove="handleDelSong(song)"
            />
          </template>
          <template v-else-if="currentCategory === 'playlists'">
            <playlist-item
              v-for="item in displayList"
              :key="item.id"
              :item="item as any"
              @click="handlePlaylistClick(item)"
              @delete="handleDelPlaylist(item)"
            />
          </template>
          <template v-else-if="currentCategory === 'albums'">
            <album-item
              v-for="item in displayList"
              :key="item.id"
              :item="item as any"
              @click="handleAlbumClick(item)"
              @delete="handleDelAlbum(item)"
            />
          </template>
        </div>
      </scroll-area>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NEmpty, useMessage } from 'naive-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AlbumItem from '@/components/common/AlbumItem.vue';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import PlaylistItem from '@/components/common/PlaylistItem.vue';
import SongItem from '@/components/common/SongItem.vue';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlayHistoryStore } from '@/store/modules/playHistory';
import { isMobile } from '@/utils';

defineOptions({ name: 'History' });

const { t } = useI18n();
const message = useMessage();
const router = useRouter();
const playHistoryStore = usePlayHistoryStore();

const categoryTabs = ['songs', 'playlists', 'albums'] as const;
const currentCategory = ref<(typeof categoryTabs)[number]>('songs');

const displayList = computed(() => {
  if (currentCategory.value === 'songs') return playHistoryStore.musicHistory;
  if (currentCategory.value === 'playlists') return playHistoryStore.playlistHistory;
  if (currentCategory.value === 'albums') return playHistoryStore.albumHistory;
  return [];
});

const handleDelSong = (item: any) => {
  playHistoryStore.delMusic(item);
};

const handleDelPlaylist = (item: any) => {
  playHistoryStore.delPlaylist(item);
};

const handleDelAlbum = (item: any) => {
  playHistoryStore.delAlbum(item);
};

const handlePlaylistClick = (item: any) => {
  try {
    navigateToMusicList(router, {
      id: item.id,
      type: 'playlist',
      name: item.name,
      listInfo: item,
      canRemove: false
    });
  } catch {
    message.error('打开歌单失败');
  }
};

const handleAlbumClick = (item: any) => {
  try {
    navigateToMusicList(router, {
      id: item.id,
      type: 'album',
      name: item.name,
      listInfo: { ...item, coverImgUrl: item.picUrl || item.coverImgUrl },
      canRemove: false
    });
  } catch {
    message.error('打开专辑失败');
  }
};
</script>
