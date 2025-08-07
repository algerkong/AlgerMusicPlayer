<template>
  <div
    class="mini-play-bar"
    :class="{ 'pure-mode': pureModeEnabled, 'mini-mode': settingsStore.isMiniMode }"
  >
    <div class="mini-bar-container">
      <!-- 专辑封面 -->
      <div class="album-cover" @click="setMusicFull">
        <n-image
          :src="getImgUrl(playMusic?.picUrl, '100y100')"
          fallback-src="/placeholder.png"
          class="cover-img"
          preview-disabled
        />
      </div>

      <!-- 歌曲信息 -->
      <div class="song-info" @click="setMusicFull">
        <div class="song-title">{{ playMusic?.name || '未播放' }}</div>
        <div class="song-artist">
          <span
            v-for="(artists, artistsindex) in artistList"
            :key="artistsindex"
            class="cursor-pointer hover:text-green-500"
            @click.stop="handleArtistClick(artists.id)"
          >
            {{ artists.name }}{{ artistsindex < artistList.length - 1 ? ' / ' : '' }}
          </span>
        </div>
      </div>

      <!-- 控制按钮区域 -->
      <div class="control-buttons">
        <div class="control-button previous" @click="handlePrev">
          <i class="iconfont icon-prev"></i>
        </div>
        <div class="control-button play" @click="playMusicEvent">
          <i class="iconfont" :class="play ? 'icon-stop' : 'icon-play'"></i>
        </div>
        <div class="control-button next" @click="handleNext">
          <i class="iconfont icon-next"></i>
        </div>
      </div>

      <!-- 右侧功能按钮 -->
      <div class="function-buttons">
        <div class="function-button">
          <i
            class="iconfont icon-likefill"
            :class="{ 'like-active': isFavorite }"
            @click="toggleFavorite"
          ></i>
        </div>

        <n-popover
          v-if="component"
          trigger="hover"
          :z-index="99999999"
          placement="top"
          :show-arrow="false"
        >
          <template #trigger>
            <div class="function-button" @click="mute" @wheel.prevent="handleVolumeWheel">
              <i class="iconfont" :class="getVolumeIcon"></i>
            </div>
          </template>
          <div class="volume-slider-wrapper transparent-popover">
            <n-slider
              v-model:value="volumeSlider"
              :step="0.01"
              :tooltip="false"
              vertical
              @wheel.prevent="handleVolumeWheel"
            ></n-slider>
          </div>
        </n-popover>

        <!-- 播放列表按钮 -->
        <div v-if="!component" class="function-button" @click="togglePlaylist">
          <i class="iconfont icon-list"></i>
        </div>
      </div>

      <!-- 关闭按钮 -->
      <div v-if="!component" class="close-button" @click="handleClose">
        <i class="iconfont ri-close-line"></i>
      </div>
    </div>

    <!-- 进度条 -->
    <div
      class="progress-bar"
      @click="handleProgressClick"
      @mousemove="handleProgressHover"
      @mouseleave="handleProgressLeave"
    >
      <div class="progress-track"></div>
      <div class="progress-fill" :style="{ width: `${(nowTime / allTime) * 100}%` }"></div>
    </div>

    <!-- 播放列表 - 单独放在外层，不再使用 popover -->
    <div
      v-if="!component"
      v-show="isPlaylistOpen"
      class="playlist-container"
      :class="{ 'mini-mode-list': settingsStore.isMiniMode }"
    >
      <n-scrollbar ref="palyListRef" class="playlist-scrollbar">
        <div class="playlist-items">
          <div v-for="item in playList" :key="item.id" class="music-play-list-content">
            <div class="flex items-center justify-between">
              <song-item :key="item.id" class="flex-1" :item="item" mini></song-item>
              <div class="delete-btn" @click.stop="handleDeleteSong(item)">
                <i
                  class="iconfont ri-delete-bin-line text-gray-400 hover:text-red-500 transition-colors"
                ></i>
              </div>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref, useTemplateRef } from 'vue';

import SongItem from '@/components/common/SongItem.vue';
import { allTime, artistList, nowTime, playMusic } from '@/hooks/MusicHook';
import { useArtist } from '@/hooks/useArtist';
import { audioService } from '@/services/audioService';
import { isBilibiliIdMatch, usePlayerStore, useSettingsStore } from '@/store';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const { navigateToArtist } = useArtist();

withDefaults(
  defineProps<{
    pureModeEnabled?: boolean;
    component?: boolean;
  }>(),
  {
    component: false
  }
);

// 处理关闭按钮点击
const handleClose = () => {
  if (settingsStore.isMiniMode) {
    window.api.restore();
  }
};

// 是否播放
const play = computed(() => playerStore.play as boolean);
// 播放列表
const playList = computed(() => playerStore.playList as SongResult[]);

// 音量控制
const audioVolume = ref(
  localStorage.getItem('volume') ? parseFloat(localStorage.getItem('volume') as string) : 1
);

const volumeSlider = computed({
  get: () => audioVolume.value * 100,
  set: (value) => {
    localStorage.setItem('volume', (value / 100).toString());
    audioService.setVolume(value / 100);
    audioVolume.value = value / 100;
  }
});

// 音量图标
const getVolumeIcon = computed(() => {
  if (audioVolume.value === 0) return 'ri-volume-mute-line';
  if (audioVolume.value <= 0.5) return 'ri-volume-down-line';
  return 'ri-volume-up-line';
});

// 静音
const mute = () => {
  if (volumeSlider.value === 0) {
    volumeSlider.value = 30;
  } else {
    volumeSlider.value = 0;
  }
};

// 鼠标滚轮调整音量
const handleVolumeWheel = (e: WheelEvent) => {
  // 向上滚动增加音量，向下滚动减少音量
  const delta = e.deltaY < 0 ? 5 : -5;
  const newValue = Math.min(Math.max(volumeSlider.value + delta, 0), 100);
  volumeSlider.value = newValue;
};

// 收藏相关
const isFavorite = computed(() => {
  // 对于B站视频，使用ID匹配函数
  if (playMusic.value.source === 'bilibili' && playMusic.value.bilibiliData?.bvid) {
    return playerStore.favoriteList.some((id) => isBilibiliIdMatch(id, playMusic.value.id));
  }

  // 非B站视频直接比较ID
  return playerStore.favoriteList.includes(playMusic.value.id);
});

const toggleFavorite = async (e: Event) => {
  e.stopPropagation();

  // 处理B站视频的收藏ID
  let favoriteId = playMusic.value.id;
  if (playMusic.value.source === 'bilibili' && playMusic.value.bilibiliData?.bvid) {
    // 如果当前播放的是B站视频，且已有ID不包含--格式，则需要构造完整ID
    if (!String(favoriteId).includes('--')) {
      favoriteId = `${playMusic.value.bilibiliData.bvid}--${playMusic.value.song?.ar?.[0]?.id || 0}--${playMusic.value.bilibiliData.cid}`;
    }
  }

  if (isFavorite.value) {
    playerStore.removeFromFavorite(favoriteId);
  } else {
    playerStore.addToFavorite(favoriteId);
  }
};

// 播放列表相关
const palyListRef = useTemplateRef('palyListRef') as any;
const isPlaylistOpen = ref(false);

// 提供 openPlaylistDrawer 给子组件
provide('openPlaylistDrawer', (songId: number) => {
  console.log('打开歌单抽屉', songId);
  // 由于在迷你模式不处理这个功能，所以只记录日志
});

// 切换播放列表显示/隐藏
const togglePlaylist = () => {
  isPlaylistOpen.value = !isPlaylistOpen.value;
  console.log('切换播放列表状态', isPlaylistOpen.value);

  // 调整窗口大小
  if (settingsStore.isMiniMode) {
    try {
      if (isPlaylistOpen.value) {
        // 打开播放列表时调整DOM
        document.body.style.height = 'auto';
        document.body.style.overflow = 'visible';

        // 使用新的专用 API 调整窗口大小
        if (window.api && typeof window.api.resizeMiniWindow === 'function') {
          window.api.resizeMiniWindow(true);
        }
      } else {
        // 关闭播放列表时强制调整DOM
        document.body.style.height = '64px';
        document.body.style.overflow = 'hidden';

        // 使用新的专用 API 调整窗口大小
        if (window.api && typeof window.api.resizeMiniWindow === 'function') {
          window.api.resizeMiniWindow(false);
        }
      }
    } catch (error) {
      console.error('调整窗口大小失败:', error);
    }
  }

  // 如果打开列表，滚动到当前播放歌曲
  if (isPlaylistOpen.value) {
    scrollToPlayList();
  }
};

const scrollToPlayList = () => {
  setTimeout(() => {
    const currentIndex = playerStore.playListIndex;
    const itemHeight = 69; // 每个列表项的高度
    palyListRef.value?.scrollTo({
      top: currentIndex * itemHeight,
      behavior: 'smooth'
    });
  }, 50);
};

const handleDeleteSong = (song: SongResult) => {
  if (song.id === playMusic.value.id) {
    playerStore.nextPlay();
  }
  playerStore.removeFromPlayList(song.id as number);
};

// 艺术家点击
const handleArtistClick = (id: number) => {
  navigateToArtist(id);
};

// 进度条相关
const handleProgressClick = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audioService.seek(allTime.value * percent);
  nowTime.value = allTime.value * percent;
};

const hoverTime = ref(0);
const isHovering = ref(false);

const handleProgressHover = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  hoverTime.value = allTime.value * percent;
  isHovering.value = true;
};

const handleProgressLeave = () => {
  isHovering.value = false;
};

// 播放控制
const handlePrev = () => playerStore.prevPlay();
const handleNext = () => playerStore.nextPlay();

const playMusicEvent = async () => {
  try {
    playerStore.setPlay(playerStore.playMusic);
  } catch (error) {
    console.error('播放出错:', error);
    playerStore.nextPlay();
  }
};

// 切换到完整播放器
const setMusicFull = () => {
  playerStore.setMusicFull(true);
};
</script>

<style lang="scss" scoped>
.mini-play-bar {
  @apply w-full flex flex-col bg-light-200 dark:bg-dark-200 shadow-md bg-opacity-60 backdrop-blur dark:bg-opacity-60;
  height: 64px;
  border-radius: 8px;
  position: relative;

  &.mini-mode {
    @apply shadow-lg;
    -webkit-app-region: drag;

    .mini-bar-container {
      @apply px-2;
    }

    .song-info {
      width: 120px;

      .song-title {
        @apply text-xs font-medium;
      }

      .song-artist {
        @apply text-xs opacity-50;
      }
    }

    .function-buttons {
      -webkit-app-region: no-drag;
      @apply space-x-1 ml-1;

      .function-button {
        width: 28px;
        height: 28px;

        .iconfont {
          @apply text-base;
        }
      }
    }

    .control-buttons {
      @apply mx-1 space-x-0.5;
      -webkit-app-region: no-drag;
      .control-button {
        width: 28px;
        height: 28px;

        .iconfont {
          @apply text-base;
        }
      }
    }

    .close-button {
      -webkit-app-region: no-drag;
      width: 28px;
      height: 28px;
    }

    .album-cover {
      @apply flex-shrink-0 mr-2;
      width: 36px;
      height: 36px;
      -webkit-app-region: no-drag;
    }

    .progress-bar {
      height: 2px !important;

      &:hover {
        height: 3px !important;

        .progress-track,
        .progress-fill {
          height: 3px !important;
        }
      }
    }
  }
}

.mini-bar-container {
  @apply flex items-center px-3 h-full relative;
}

.album-cover {
  @apply flex-shrink-0 mr-3 cursor-pointer;
  width: 40px;
  height: 40px;

  .cover-img {
    @apply w-full h-full rounded-md object-cover pointer-events-none;
  }
}

.song-info {
  @apply flex flex-col justify-center min-w-0 flex-shrink mr-4 cursor-pointer;
  width: 200px;

  .song-title {
    @apply text-sm font-medium truncate;
    color: var(--text-color-1, #000);
  }

  .song-artist {
    @apply text-xs truncate mt-0.5 opacity-60;
    color: var(--text-color-2, #666);
  }
}

.control-buttons {
  @apply flex items-center space-x-1 mx-4;
}

.control-button {
  @apply flex items-center justify-center rounded-full transition-all duration-200 border-0 bg-transparent cursor-pointer text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200;
  width: 32px;
  height: 32px;

  &:hover {
    @apply bg-gray-100 dark:bg-dark-300;
  }

  &.play {
    @apply bg-primary text-white;
    &:hover {
      @apply bg-green-800;
    }
  }

  .iconfont {
    @apply text-lg;
  }
}

.function-buttons {
  @apply flex items-center ml-auto space-x-2;
}

.function-button {
  @apply flex items-center justify-center rounded-full transition-all duration-200 border-0 bg-transparent cursor-pointer text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200;
  width: 32px;
  height: 32px;

  &:hover {
    @apply bg-gray-100 dark:bg-dark-300;
    color: var(--text-color-1, #000);
  }

  .iconfont {
    @apply text-lg;
  }
}

.close-button {
  @apply flex items-center justify-center rounded-full transition-all duration-200 border-0 bg-transparent cursor-pointer ml-2;
  width: 32px;
  height: 32px;
  color: var(--text-color-2, #666);

  &:hover {
    @apply bg-gray-100 dark:bg-dark-300;
    color: var(--text-color-1, #000);
  }
}

.progress-bar {
  @apply relative w-full cursor-pointer;
  height: 2px;

  &:hover {
    height: 4px;

    .progress-track,
    .progress-fill {
      height: 4px;
    }
  }
}

.progress-track {
  @apply absolute inset-x-0 bottom-0 transition-all duration-200;
  height: 2px;
  background: rgba(0, 0, 0, 0.1);

  .dark & {
    background: rgba(255, 255, 255, 0.15);
  }
}

.progress-fill {
  @apply absolute bottom-0 left-0 transition-all duration-200;
  height: 2px;
  background: var(--primary-color, #18a058);
}

.like-active {
  @apply text-red-500 hover:text-red-600 !important;
}

.volume-slider-wrapper {
  @apply p-2 py-4 rounded-xl bg-white dark:bg-dark-100 shadow-lg bg-opacity-90 backdrop-blur;
  height: 160px;

  :deep(.n-slider) {
    --n-rail-height: 4px;
    --n-rail-color: theme('colors.gray.200');
    --n-rail-color-dark: theme('colors.gray.700');
    --n-fill-color: theme('colors.green.500');
    --n-handle-size: 12px;
    --n-handle-color: theme('colors.green.500');

    &.n-slider--vertical {
      height: 100%;

      .n-slider-rail {
        width: 4px;
      }

      &:hover {
        .n-slider-rail {
          width: 6px;
        }

        .n-slider-handle {
          width: 14px;
          height: 14px;
        }
      }
    }

    .n-slider-rail {
      @apply overflow-hidden transition-all duration-200;
      @apply bg-gray-500 dark:bg-dark-300 bg-opacity-10 !important;
    }

    .n-slider-handle {
      @apply transition-all duration-200;
      opacity: 0;
    }

    &:hover {
      .n-slider-handle {
        opacity: 1;
      }
    }
  }
}

// 播放列表样式
.playlist-container {
  @apply fixed left-0 right-0 bg-white dark:bg-dark-100 overflow-hidden;
  top: 64px;
  height: 330px;
  max-height: 330px;

  &.mini-mode-list {
    width: 340px;
    @apply bg-opacity-90 dark:bg-opacity-90;
  }
}

// 播放列表内容样式
.music-play-list-content {
  @apply px-2 py-1;

  .delete-btn {
    @apply p-2 rounded-full transition-colors duration-200 cursor-pointer;
    @apply hover:bg-red-50 dark:hover:bg-red-900/20;

    .iconfont {
      @apply text-lg;
    }
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.playlist-scrollbar {
  height: 100%;
}

.playlist-items {
  padding: 4px 0;
}

.dark {
  .song-info {
    .song-title {
      color: var(--text-color-1, #fff);
    }

    .song-artist {
      color: var(--text-color-2, #fff);
    }
  }
}

:deep(.n-popover) {
  background-color: transparent !important;
}
</style>
