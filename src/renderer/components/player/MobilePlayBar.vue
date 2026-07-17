<template>
  <div
    ref="playBarRef"
    class="mobile-play-bar"
    :class="[
      setAnimationClass('animate__fadeInUp'),
      playerStore.musicFull ? 'play-bar-expanded' : 'play-bar-mini',
      shouldShowMobileMenu ? 'is-menu-show' : 'is-menu-hide'
    ]"
    :style="{
      color: playerStore.musicFull
        ? textColors.theme === 'dark'
          ? '#ffffff'
          : '#ffffff'
        : settingsStore.theme === 'dark'
          ? '#ffffff'
          : '#000000'
    }"
  >
    <!-- 迷你条 -->
    <div v-if="!playerStore.musicFull" class="mobile-mini-controls">
      <!-- 歌曲信息 -->
      <div class="mini-song-info" @click="setMusicFull">
        <n-image
          :src="getImgUrl(nowView?.coverUrl || playMusic?.picUrl, '100y100')"
          class="mini-song-cover"
          lazy
          preview-disabled
        />
        <div class="mini-song-text">
          <n-ellipsis line-clamp="1">
            <span class="mini-song-title">{{ nowView?.title || playMusic.name }}</span>
            <span class="mx-2 text-gray-500 dark:text-gray-400">-</span>
            <span class="mini-song-artist">{{
              nowView?.artistText || artistList.map((a: { name: string }) => a.name).join(' / ')
            }}</span>
          </n-ellipsis>
        </div>
      </div>

      <div class="mini-playback-controls">
        <div class="mini-control-btn play" @click="playMusicEvent">
          <i class="iconfont icon" :class="play ? 'icon-stop' : 'icon-play'"></i>
        </div>
        <i class="iconfont icon-list mini-list-icon" @click="openPlayListDrawer"></i>
      </div>
    </div>

    <!-- 全屏播放器 -->
    <music-full-wrapper v-model="playerStore.musicFull" :background="background" />
  </div>
</template>

<script lang="ts" setup>
import { useSwipe } from '@vueuse/core';
import type { Ref } from 'vue';
import { inject, onMounted, ref } from 'vue';

import MusicFullWrapper from '@/components/lyric/MusicFullWrapper.vue';
import { artistList, playMusic, textColors } from '@/hooks/MusicHook';
import { usePlaybackControl } from '@/hooks/usePlaybackControl';
import { usePlayBarChrome } from '@/hooks/usePlayBarChrome';
import { usePlayableView } from '@/hooks/usePlayableView';
import { getImgUrl, setAnimationClass } from '@/utils';

const shouldShowMobileMenu = inject('shouldShowMobileMenu') as Ref<boolean>;

const { isPlaying: play, playMusicEvent, handleNext, handlePrev } = usePlaybackControl();
const { playerStore, settingsStore, background, openPlayListDrawer, setMusicFull } =
  usePlayBarChrome({
    fullMode: 'toggle'
  });
const nowView = usePlayableView(() => playMusic.value);

// 滑动切歌
const playBarRef = ref<HTMLElement | null>(null);
onMounted(() => {
  if (playBarRef.value) {
    const { direction } = useSwipe(playBarRef, {
      onSwipeEnd: () => {
        if (direction.value === 'left') handleNext();
        if (direction.value === 'right') handlePrev();
      },
      threshold: 30
    });
  }
});
</script>

<style lang="scss" scoped>
.mobile-play-bar {
  @apply fixed bottom-[76px] left-0 w-full flex flex-col;
  z-index: 10000;
  animation-duration: 0.3s !important;
  transition: all 0.3s ease;

  &.is-menu-show {
    bottom: calc(var(--safe-area-inset-bottom, 0) + 66px);
  }
  &.is-menu-hide {
    bottom: calc(var(--safe-area-inset-bottom, 0) + 10px);
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
  }

  &.play-bar-mini {
    @apply h-14 py-0;
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
          --n-fill-color: var(--primary-color, #22c55e);
          --n-handle-size: 0px; /* 隐藏滑块 */
          --n-handle-color: var(--primary-color, #22c55e);

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

  .mobile-mini-controls {
    @apply flex items-center justify-between pr-4 mx-3 h-12 rounded-full shadow-lg;
    background: var(--chrome-surface-strong, rgba(24, 24, 27, 0.85));
    border: 1px solid var(--chrome-border, rgba(255, 255, 255, 0.12));
    backdrop-filter: blur(var(--chrome-blur, 16px));
    -webkit-backdrop-filter: blur(var(--chrome-blur, 16px));
    color: var(--chrome-text, #f8fafc);

    .mini-song-info {
      @apply flex items-center flex-1 min-w-0 cursor-pointer;

      .mini-song-cover {
        @apply w-12 h-12 rounded-full border-8 border-dark-300 dark:border-light-300;
      }

      .mini-song-text {
        @apply ml-3 min-w-0 flex-1 flex items-center;

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
          background: var(--chrome-surface, rgba(255, 255, 255, 0.12));
          border: 1px solid var(--chrome-border, transparent);

          .iconfont {
            @apply text-xl transition;
            color: var(--primary-color, #22c55e);
            &:hover {
              color: var(--primary-color, #22c55e);
            }
          }
        }
      }

      .mini-list-icon {
        @apply text-xl p-1 transition cursor-pointer;
        &:hover {
          color: var(--primary-color, #22c55e);
        }
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
