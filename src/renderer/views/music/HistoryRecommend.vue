<template>
  <div class="history-recommend-page">
    <!-- 头部标题和操作按钮 -->
    <div class="music-header h-12 flex items-center justify-between">
      <n-ellipsis :line-clamp="1" class="flex-shrink-0 mr-3">
        <div class="music-title">
          {{ t('comp.musicList.historyRecommend') }}
        </div>
      </n-ellipsis>

      <!-- 操作按钮组 -->
      <div class="flex-grow flex-1 flex items-center justify-end gap-2">
        <n-tooltip placement="bottom" trigger="hover">
          <template #trigger>
            <div class="action-button hover-green" @click="handlePlayAll">
              <i class="icon iconfont ri-play-fill"></i>
            </div>
          </template>
          {{ t('comp.musicList.playAll') }}
        </n-tooltip>

        <n-tooltip placement="bottom" trigger="hover">
          <template #trigger>
            <div class="action-button hover-green" @click="addToPlaylist">
              <i class="icon iconfont ri-add-line"></i>
            </div>
          </template>
          {{ t('comp.musicList.addToPlaylist') }}
        </n-tooltip>

        <!-- 布局切换按钮 -->
        <div class="layout-toggle" v-if="!isMobile">
          <n-tooltip placement="bottom" trigger="hover">
            <template #trigger>
              <div class="toggle-button hover-green" @click="toggleLayout">
                <i
                  class="icon iconfont"
                  :class="isCompactLayout ? 'ri-list-check-2' : 'ri-grid-line'"
                ></i>
              </div>
            </template>
            {{
              isCompactLayout
                ? t('comp.musicList.switchToNormal')
                : t('comp.musicList.switchToCompact')
            }}
          </n-tooltip>
        </div>
      </div>
    </div>

    <!-- 日期选择标签 -->
    <div v-if="availableDates.length > 0" class="date-tabs-wrapper">
      <n-tabs
        v-model:value="selectedDate"
        type="segment"
        animated
        size="large"
        @update:value="handleDateChange"
      >
        <n-tab
          v-for="date in displayedDates"
          :key="date"
          :name="date"
          :tab="formatDate(date)"
        ></n-tab>
      </n-tabs>
    </div>

    <!-- 歌曲列表内容 -->
    <div class="music-content">
      <n-spin :show="loadingDates || loadingSongs">
        <!-- 歌曲列表 -->
        <div v-if="songs.length > 0" class="music-list-container">
          <div class="music-list">
            <div class="music-list-content">
              <!-- 使用虚拟列表 -->
              <n-virtual-list
                class="song-virtual-list"
                style="max-height: calc(100vh - 200px)"
                :items="songs"
                :item-size="isCompactLayout ? 50 : 70"
                item-resizable
                key-field="id"
              >
                <template #default="{ item, index }">
                  <div>
                    <div class="double-item">
                      <song-item
                        :index="index"
                        :compact="isCompactLayout"
                        :item="formatSong(item)"
                        @play="handlePlay"
                      />
                    </div>
                    <div v-if="index === songs.length - 1" class="h-36"></div>
                  </div>
                </template>
              </n-virtual-list>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loadingSongs && selectedDate" class="empty-state">
          <i class="icon iconfont ri-disc-line"></i>
          <p>{{ t('comp.musicList.noSongs') }}</p>
        </div>
      </n-spin>
    </div>
    <play-bottom />
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getHistoryRecommendDates, getHistoryRecommendSongs } from '@/api/music';
import PlayBottom from '@/components/common/PlayBottom.vue';
import SongItem from '@/components/common/SongItem.vue';
import { usePlayerStore } from '@/store';
import type { SongResult } from '@/types/music';
import { isMobile } from '@/utils';

const { t } = useI18n();
const message = useMessage();
const playerStore = usePlayerStore();

// 状态
const availableDates = ref<string[]>([]);
const selectedDate = ref<string>('');
const songs = ref<SongResult[]>([]);
const loadingDates = ref(false);
const loadingSongs = ref(false);
const isCompactLayout = ref(
  isMobile.value ? false : localStorage.getItem('musicListLayout') === 'compact'
);

// 只显示最近的10个日期
const displayedDates = computed(() => {
  return availableDates.value.slice(0, 10);
});

// 格式化日期显示
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 判断是否是今天或昨天
  if (date.toDateString() === today.toDateString()) {
    return t('common.today');
  } else if (date.toDateString() === yesterday.toDateString()) {
    return t('common.yesterday');
  }

  // 格式化为 MM月DD日
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
};

// 格式化歌曲数据
const formatSong = (item: any) => {
  if (!item) return null;
  return {
    ...item,
    picUrl: item.al?.picUrl || item.album?.picUrl || item.picUrl,
    song: {
      artists: item.ar || item.artists || [],
      name: item.al?.name || item.album?.name || item.name,
      id: item.al?.id || item.album?.id || item.id
    }
  };
};

// 获取可用日期列表
const fetchAvailableDates = async () => {
  try {
    loadingDates.value = true;
    const { data } = await getHistoryRecommendDates();
    if (data?.data?.dates) {
      availableDates.value = data.data.dates;
      // 默认选择第一个日期（最近的日期）
      if (availableDates.value.length > 0) {
        selectedDate.value = availableDates.value[0];
        await fetchSongsByDate(selectedDate.value);
      }
    }
  } catch (error) {
    console.error('获取历史日推日期列表失败:', error);
    message.error(t('comp.musicList.fetchDatesFailed'));
  } finally {
    loadingDates.value = false;
  }
};

// 根据日期获取歌曲列表
const fetchSongsByDate = async (date: string) => {
  try {
    loadingSongs.value = true;
    const { data } = await getHistoryRecommendSongs(date);
    if (data?.data?.songs) {
      songs.value = data.data.songs;
    } else {
      songs.value = [];
    }
  } catch (error) {
    console.error('获取历史日推歌曲失败:', error);
    message.error(t('comp.musicList.fetchSongsFailed'));
    songs.value = [];
  } finally {
    loadingSongs.value = false;
  }
};

// 处理日期变化
const handleDateChange = async (date: string) => {
  selectedDate.value = date;
  await fetchSongsByDate(date);
};

// 切换布局
const toggleLayout = () => {
  isCompactLayout.value = !isCompactLayout.value;
  localStorage.setItem('musicListLayout', isCompactLayout.value ? 'compact' : 'normal');
};

// 添加到播放列表末尾
const addToPlaylist = () => {
  if (songs.value.length === 0) return;

  // 获取当前播放列表
  const currentList = playerStore.playList;

  // 添加歌曲到播放列表(避免重复添加)
  const newSongs = songs.value.filter((song) => !currentList.some((item) => item.id === song.id));

  if (newSongs.length === 0) {
    message.info(t('comp.musicList.songsAlreadyInPlaylist'));
    return;
  }

  // 合并到当前播放列表末尾
  const newList = [...currentList, ...newSongs.map(formatSong)];
  playerStore.setPlayList(newList);

  message.success(t('comp.musicList.addToPlaylistSuccess', { count: newSongs.length }));
};

// 播放单首歌曲
const handlePlay = (song: SongResult) => {
  if (songs.value.length === 0) return;
  playerStore.prepareSongPlayback(song, songs.value.map(formatSong));
};

// 播放全部
const handlePlayAll = () => {
  if (songs.value.length === 0) return;
  playerStore.setPlayList(songs.value.map(formatSong));
  playerStore.setPlay(formatSong(songs.value[0]));
};

// 组件挂载时获取数据
onMounted(() => {
  fetchAvailableDates();
});
</script>

<style scoped lang="scss">
.history-recommend-page {
  @apply h-full bg-light-100 dark:bg-dark-100 px-4 mr-2 rounded-2xl;
}

.music {
  &-header {
    @apply h-12 flex items-center justify-between;
  }

  &-title {
    @apply text-xl font-bold text-gray-900 dark:text-white;
  }

  &-content {
    @apply h-[calc(100%-60px)];
  }

  &-list {
    @apply flex-grow min-h-0;
    &-container {
      @apply flex-grow min-h-0 flex flex-col relative w-full;
    }

    &-content {
      @apply min-h-[calc(80vh-60px)];
    }
  }
}

.date-tabs-wrapper {
  @apply px-0 mb-4;
}

.action-button {
  @apply w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-light-300 dark:hover:bg-dark-300 transition-colors text-gray-500 dark:text-gray-400;

  .icon {
    @apply text-lg;
  }

  &.hover-green:hover {
    .icon {
      @apply text-green-500;
    }
  }
}

/* 虚拟列表样式 */
.song-virtual-list {
  @apply w-full;
  :deep(.n-virtual-list__scroll) {
    scrollbar-width: thin;
    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      @apply bg-gray-400 dark:bg-gray-600 rounded;
    }
  }
}

.double-item {
  @apply w-full mb-2 bg-light-200 bg-opacity-30 dark:bg-dark-200 dark:bg-opacity-20 rounded-3xl;
}

.empty-state {
  @apply flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 py-20;

  .icon {
    @apply text-6xl mb-4;
  }

  p {
    @apply text-lg;
  }
}

:deep(.n-tabs-rail) {
  @apply rounded-xl overflow-hidden !important;
  .n-tabs-capsule {
    @apply rounded-xl !important;
  }
}

.date-tabs-wrapper {
  :deep(.n-tabs-rail) {
    @apply rounded-xl overflow-hidden bg-white dark:bg-dark-300 !important;
    .n-tabs-capsule {
      @apply rounded-xl bg-green-500 dark:bg-green-600 !important;
    }
    .n-tabs-tab--active {
      @apply text-white !important;
    }
  }
}

.layout-toggle {
  .toggle-button {
    @apply w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-light-300 dark:hover:bg-dark-300 transition-colors;

    .icon {
      @apply text-lg text-gray-500 dark:text-gray-400 transition-colors;
    }
  }
}
</style>
