<template>
  <div
    class="mobile-play-bar"
    :class="[
      setAnimationClass('animate__fadeInUp'),
      musicFullVisible ? 'play-bar-expanded' : 'play-bar-mini',
      !shouldShowMobileMenu ? 'mobile-play-bar-no-menu' : ''
    ]"
    :style="{
      color: musicFullVisible
        ? textColors.theme === 'dark'
          ? '#ffffff'
          : '#ffffff'
        : settingsStore.theme === 'dark'
          ? '#ffffff'
          : '#000000'
    }"
  >
    <!-- 完整模式 - 在musicFullVisible为true时显示 -->
    <template v-if="false">
      <!-- 顶部信息区域 -->
      <div class="music-info-header">
        <div class="music-info-main">
          <h1 class="music-title">{{ playMusic.name }}</h1>
          <div class="artist-info">
            <span class="artist-name">
              <span v-for="(artists, artistsindex) in artistList" :key="artistsindex">
                {{ artists.name }}{{ artistsindex < artistList.length - 1 ? ' / ' : '' }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="music-progress-bar">
        <span class="current-time">{{ secondToMinute(nowTime) }}</span>
        <div class="progress-wrapper">
          <n-slider
            v-model:value="timeSlider"
            :step="1"
            :max="allTime"
            :min="0"
            :tooltip="false"
            class="progress-slider"
          ></n-slider>
        </div>
        <span class="total-time">{{ secondToMinute(allTime) }}</span>
      </div>

      <!-- 主控制区 -->
      <div class="player-controls">
        <div class="control-btn like" @click="toggleFavorite">
          <i class="iconfont ri-heart-3-fill" :class="{ 'like-active': isFavorite }"></i>
        </div>
        <div class="control-btn prev" @click="handlePrev">
          <i class="iconfont ri-skip-back-fill"></i>
        </div>
        <div class="control-btn play-pause" @click="playMusicEvent">
          <i class="iconfont" :class="play ? 'ri-pause-fill' : 'ri-play-fill'"></i>
        </div>
        <div class="control-btn next" @click="handleNext">
          <i class="iconfont ri-skip-forward-fill"></i>
        </div>
        <div class="control-btn list" @click="openPlayListDrawer">
          <i class="iconfont ri-menu-line"></i>
        </div>
      </div>

      <!-- 定时关闭按钮 -->
      <!-- <SleepTimerPopover mode="mobile" /> -->
    </template>

    <!-- Mini模式 - 在musicFullVisible为false时显示 -->
    <div v-if="!musicFullVisible" class="mobile-mini-controls">
      <!-- 歌曲信息 -->
      <div class="mini-song-info" @click="setMusicFull">
        <n-image
          :src="getImgUrl(playMusic?.picUrl, '100y100')"
          class="mini-song-cover"
          lazy
          preview-disabled
        />
        <div class="mini-song-text">
          <n-ellipsis line-clamp="1">
            <span class="mini-song-title">{{ playMusic.name }}</span>
            <span class="mx-2 text-gray-500 dark:text-gray-400">-</span>
            <span class="mini-song-artist">
              <span v-for="(artists, artistsindex) in artistList" :key="artistsindex">
                {{ artists.name }}{{ artistsindex < artistList.length - 1 ? ' / ' : '' }}
              </span>
            </span>
          </n-ellipsis>
        </div>
      </div>

      <!-- 播放按钮 -->
      <div class="mini-playback-controls">
        <div class="mini-control-btn play" @click="playMusicEvent">
          <i class="iconfont icon" :class="play ? 'icon-stop' : 'icon-play'"></i>
        </div>
        <i class="iconfont icon-list mini-list-icon" @click="openPlayListDrawer"></i>
      </div>
    </div>

    <!-- 全屏播放器 -->
    <music-full-wrapper ref="MusicFullRef" v-model="musicFullVisible" :background="background" />
  </div>
</template>

<script lang="ts" setup>
import { useThrottleFn } from '@vueuse/core';
import { computed, ref, watch } from 'vue';

import MusicFullWrapper from '@/components/lyric/MusicFullWrapper.vue';
import { allTime, artistList, nowTime, playMusic, sound, textColors } from '@/hooks/MusicHook';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { getImgUrl, secondToMinute, setAnimationClass } from '@/utils';

const shouldShowMobileMenu = inject('shouldShowMobileMenu');

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();

// 是否播放
const play = computed(() => playerStore.isPlay);
// 背景颜色
const background = ref('#000');

// 播放进度条
const throttledSeek = useThrottleFn((value: number) => {
  if (!sound.value) return;
  sound.value.seek(value);
  nowTime.value = value;
}, 50);

const timeSlider = computed({
  get: () => nowTime.value,
  set: throttledSeek
});

// 播放控制
function handleNext() {
  playerStore.nextPlay();
}

function handlePrev() {
  playerStore.prevPlay();
}

// 全屏播放器
const MusicFullRef = ref<any>(null);
const musicFullVisible = ref(false);

// 设置musicFull
const setMusicFull = () => {
  musicFullVisible.value = !musicFullVisible.value;
  playerStore.setMusicFull(musicFullVisible.value);
  if (musicFullVisible.value) {
    settingsStore.showArtistDrawer = false;
  }
};

// 打开播放列表抽屉
const openPlayListDrawer = () => {
  playerStore.setPlayListDrawerVisible(true);
};

// 收藏功能
const isFavorite = computed(() => {
  return playerStore.favoriteList.includes(playMusic.value.id as number);
});

const toggleFavorite = () => {
  console.log('isFavorite.value', isFavorite.value);
  if (isFavorite.value) {
    playerStore.removeFromFavorite(playMusic.value.id as number);
  } else {
    playerStore.addToFavorite(playMusic.value.id as number);
  }
};

// 播放暂停按钮事件
const playMusicEvent = async () => {
  try {
    playerStore.setPlay(playMusic.value);
  } catch (error) {
    console.error('播放出错:', error);
    playerStore.nextPlay();
  }
};

watch(
  () => playerStore.playMusic,
  async () => {
    background.value = playMusic.value.backgroundColor as string;
  },
  { immediate: true, deep: true }
);
</script>

<style lang="scss" scoped>
.mobile-play-bar {
  @apply fixed bottom-[56px] left-0 w-full flex flex-col;
  z-index: 10000;
  animation-duration: 0.3s !important;
  transition: all 0.3s ease;

  &.mobile-play-bar-no-menu {
    @apply bottom-[10px];
  }

  &.play-bar-expanded {
    @apply bg-transparent;
    height: auto; /* 自动适应内容高度 */
    max-height: 230px; /* 限制最大高度 */
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0.5) 20%,
      rgba(0, 0, 0, 0.8) 80%,
      rgba(0, 0, 0, 0.9) 100%
    );

    &::before {
      content: '';
      position: absolute;
      top: -50px; /* 延伸到上方 */
      left: 0;
      right: 0;
      bottom: 0;
      background-image: v-bind('`url(${getImgUrl(playMusic?.picUrl, "300y300")})`');
      background-size: cover;
      background-position: center;
      filter: blur(20px);
      opacity: 0.2;
      z-index: -1;
    }
  }

  &.play-bar-mini {
    @apply h-14 py-0;
  }

  // 顶部信息区域
  .music-info-header {
    @apply flex justify-between items-start px-6 pt-3 pb-2 relative z-10;

    .music-info-main {
      @apply flex flex-col;

      .music-title {
        @apply text-xl font-bold text-white mb-1;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .artist-info {
        @apply flex items-center;

        .artist-name {
          @apply text-sm text-white opacity-90;
        }
      }
    }

    .action-stats {
      @apply flex items-center gap-4;

      .like-count,
      .comment-count {
        @apply flex items-center text-white;

        i {
          @apply text-base mr-1;
        }

        span {
          @apply text-xs font-medium;
        }
      }
    }
  }

  // 进度条
  .music-progress-bar {
    @apply flex items-center justify-between px-4 py-2 relative z-10;

    .current-time,
    .total-time {
      @apply text-xs text-white opacity-80;
    }

    .progress-wrapper {
      @apply flex-1 mx-3 flex flex-col items-center;

      .progress-slider {
        @apply w-full;

        :deep(.n-slider) {
          --n-rail-height: 3px;
          --n-rail-color: rgba(255, 255, 255, 0.15);
          --n-rail-color-dark: rgba(255, 255, 255, 0.15);
          --n-fill-color: #1ed760; /* Spotify绿色，可调整为其他绿色 */
          --n-handle-size: 0px; /* 隐藏滑块 */
          --n-handle-color: #1ed760;

          &:hover {
            --n-handle-size: 10px; /* 鼠标悬停时显示滑块 */
          }

          .n-slider-rail {
            @apply rounded-full !important; /* 圆角进度条 */
          }

          .n-slider-fill {
            @apply rounded-full !important;
            box-shadow: 0 0 4px rgba(30, 215, 96, 0.5); /* 发光效果 */
          }

          .n-slider-handle {
            @apply transition-all duration-200;
            opacity: 0;
            box-shadow: 0 0 4px rgba(255, 255, 255, 0.7);
          }

          &:hover .n-slider-handle,
          &:active .n-slider-handle {
            opacity: 1;
          }
        }
      }

      .quality-label {
        @apply text-xs text-white opacity-70 mt-1;
      }
    }
  }

  // 主控制区
  .player-controls {
    @apply flex items-center justify-between px-8 py-3 relative z-10 pb-8;

    .control-btn {
      @apply flex items-center justify-center cursor-pointer transition;

      i {
        @apply text-white transition-all;
      }

      &.like i {
        @apply text-2xl;
      }

      &.prev i,
      &.next i {
        @apply text-3xl;
      }

      &.play-pause {
        @apply w-12 h-12 rounded-full flex items-center justify-center;
        background: rgba(255, 255, 255, 0.2);

        i {
          @apply text-4xl;
        }
      }

      &.list i {
        @apply text-2xl;
      }

      .like-active {
        @apply text-red-500;
      }
    }
  }

  // Mini模式样式
  .mobile-mini-controls {
    @apply flex items-center justify-between pr-4 mx-3 h-12 rounded-full bg-light-100 dark:bg-dark-100 shadow-lg;

    .mini-song-info {
      @apply flex items-center flex-1 min-w-0 cursor-pointer;

      .mini-song-cover {
        @apply w-12 h-12 rounded-full border-8 border-dark-300 dark:border-light-300;
      }

      .mini-song-text {
        @apply ml-3 min-w-0 flex-1;

        .mini-song-title {
          @apply text-sm font-medium;
        }

        .mini-song-artist {
          @apply text-xs text-gray-500 dark:text-gray-400;
        }
      }
    }

    .mini-playback-controls {
      @apply flex items-center;

      .mini-control-btn {
        @apply flex items-center justify-center cursor-pointer transition;

        &.play {
          @apply w-9 h-9 rounded-full flex items-center justify-center mr-2;
          @apply bg-gray-100 dark:bg-gray-800;

          .iconfont {
            @apply text-xl text-green-500 transition hover:text-green-600;
          }
        }
      }

      .mini-list-icon {
        @apply text-xl p-1 transition cursor-pointer;
        @apply hover:text-green-500;
      }
    }
  }
}

.mobile-play-list-container {
  height: 60vh;
  width: 90vw;
  max-width: 400px;
  @apply relative rounded-t-2xl overflow-hidden;

  .mobile-play-list-back {
    backdrop-filter: blur(20px);
    @apply absolute top-0 left-0 w-full h-full;
    @apply bg-light dark:bg-black bg-opacity-90;
  }

  .mobile-play-list-item {
    @apply px-3 py-1;
  }
}
</style>
