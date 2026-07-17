<template>
  <div
    class="music-play-bar"
    :class="[
      !musicFullVisible && !playBarSettled ? setAnimationClass('animate__bounceInUp') : '',
      musicFullVisible ? 'play-bar-hidden' : ''
    ]"
    :style="{
      color: musicFullVisible
        ? textColors.theme === 'dark'
          ? '#000000'
          : '#ffffff'
        : settingsStore.theme === 'dark'
          ? '#ffffff'
          : '#000000'
    }"
  >
    <div class="music-time custom-slider">
      <n-slider
        v-model:value="timeSlider"
        :step="1"
        :max="allTime"
        :min="0"
        :format-tooltip="formatTooltip"
        :show-tooltip="showSliderTooltip"
        @mouseenter="showSliderTooltip = true"
        @mouseleave="showSliderTooltip = false"
        @dragstart="handleSliderDragStart"
        @dragend="handleSliderDragEnd"
      ></n-slider>
    </div>
    <div class="play-bar-img-wrapper" @click="setMusicFull">
      <n-image
        :src="getImgUrl(nowView?.coverUrl || playMusic?.picUrl, '100y100')"
        class="play-bar-img"
        lazy
        preview-disabled
      />
      <div v-if="nowView?.isLoading || playMusic?.playLoading" class="loading-overlay">
        <i class="ri-loader-4-line loading-icon"></i>
      </div>
      <div class="hover-arrow">
        <div class="hover-content">
          <!-- <i class="ri-arrow-up-s-line text-3xl" :class="{ 'ri-arrow-down-s-line': musicFullVisible }"></i> -->
          <i
            class="text-3xl"
            :class="musicFullVisible ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'"
          ></i>
          <span class="hover-text">{{
            musicFullVisible ? t('player.playBar.collapse') : t('player.playBar.expand')
          }}</span>
        </div>
      </div>
    </div>
    <div class="music-content">
      <div class="music-content-title flex items-center">
        <n-ellipsis class="text-ellipsis" line-clamp="1">
          <p>{{ nowView?.title || playMusic?.name || '' }}</p>
        </n-ellipsis>
      </div>
      <div class="music-content-name">
        <n-ellipsis
          class="text-ellipsis"
          line-clamp="1"
          :tooltip="{
            contentStyle: { maxWidth: '600px' },
            zIndex: 99999
          }"
        >
          <span
            v-for="(artists, artistsindex) in barArtists"
            :key="artistsindex"
            class="cursor-pointer hover:text-primary"
            @click="handleArtistClick(artists.id)"
          >
            {{ artists.name }}{{ artistsindex < barArtists.length - 1 ? ' / ' : '' }}
          </span>
        </n-ellipsis>
      </div>
    </div>
    <div class="music-buttons">
      <button type="button" class="pb-ctrl" :title="t('player.playBar.prev')" @click="handlePrev">
        <i class="ri-skip-back-mini-fill" />
      </button>
      <button
        type="button"
        class="pb-ctrl pb-ctrl--play"
        :title="play ? t('player.playBar.pause') : t('player.playBar.play')"
        @click="playMusicEvent"
      >
        <i :class="play ? 'ri-pause-fill' : 'ri-play-fill'" />
      </button>
      <button type="button" class="pb-ctrl" :title="t('player.playBar.next')" @click="handleNext">
        <i class="ri-skip-forward-mini-fill" />
      </button>
    </div>
    <div class="audio-button">
      <div class="audio-volume custom-slider" @wheel.prevent="handleVolumeWheel">
        <button type="button" class="bar-icon" :title="t('player.playBar.volume')" @click="mute">
          <i :class="getVolumeIcon" />
        </button>
        <div class="volume-slider">
          <div class="volume-percentage" :class="{ 'volume-percentage-disabled': isMuted }">
            {{ Math.round(volumeSlider) }}%
          </div>
          <n-slider
            v-model:value="volumeSlider"
            :step="0.01"
            :tooltip="false"
            :disabled="isMuted"
            vertical
          ></n-slider>
        </div>
      </div>
      <n-tooltip v-if="!isMobile" trigger="hover" :z-index="9999999">
        <template #trigger>
          <button type="button" class="bar-icon" @click="togglePlayMode">
            <i :class="playModeIcon" />
          </button>
        </template>
        {{ playModeText }}
      </n-tooltip>
      <!-- 音质 / 音效已迁到发现页曲目标识；下载入口也去掉（底栏精简） -->

      <n-tooltip trigger="hover" :z-index="9999999">
        <template #trigger>
          <button
            type="button"
            class="bar-icon"
            :title="t('player.playBar.playList')"
            @click="openPlayListDrawer"
          >
            <i class="ri-play-list-2-line" />
          </button>
        </template>
        {{ t('player.playBar.playList') }}
      </n-tooltip>
    </div>
    <!-- 全屏播放器 -->
    <music-full-wrapper v-model="musicFullVisible" :background="background" />
  </div>
</template>

<script lang="ts" setup>
import { useThrottleFn } from '@vueuse/core';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import MusicFullWrapper from '@/components/lyric/MusicFullWrapper.vue';
import { allTime, artistList, nowTime, playMusic, textColors } from '@/hooks/MusicHook';
import { usePlaybackControl } from '@/hooks/usePlaybackControl';
import { usePlayBarChrome } from '@/hooks/usePlayBarChrome';
import { usePlayableView } from '@/hooks/usePlayableView';
import { usePlayMode } from '@/hooks/usePlayMode';
import { useVolumeControl } from '@/hooks/useVolumeControl';
import { audioService } from '@/services/audioService';
import { getImgUrl, isMobile, secondToMinute, setAnimationClass } from '@/utils';

const { t } = useI18n();

const { isPlaying: play, playMusicEvent, handleNext, handlePrev } = usePlaybackControl();
const {
  playerStore,
  settingsStore,
  background,
  openPlayListDrawer,
  setMusicFull,
  handleArtistClick
} = usePlayBarChrome({ fullMode: 'toggle' });

/** P4：当前曲展示字段 */
const nowView = usePlayableView(() => playMusic.value);
const barArtists = computed(
  () =>
    nowView.value?.artists || (artistList.value as { id: number | string; name: string }[]) || []
);

const {
  isMuted,
  volumeSlider,
  volumeIcon: getVolumeIcon,
  mute,
  handleVolumeWheel
} = useVolumeControl();

const { playModeIcon, playModeText, togglePlayMode } = usePlayMode();

const throttledSeek = useThrottleFn((value: number) => {
  audioService.seek(value);
  nowTime.value = value;
}, 50);

const dragValue = ref(0);
const isDragging = ref(false);

const timeSlider = computed({
  get: () => (isDragging.value ? dragValue.value : nowTime.value),
  set: (value) => {
    if (isDragging.value) {
      dragValue.value = value;
      return;
    }
    throttledSeek(value);
  }
});

const handleSliderDragStart = () => {
  isDragging.value = true;
  dragValue.value = nowTime.value;
};

const handleSliderDragEnd = () => {
  isDragging.value = false;
  audioService.seek(dragValue.value);
  nowTime.value = dragValue.value;
};

const formatTooltip = (value: number) => {
  return `${secondToMinute(value)} / ${secondToMinute(allTime.value)}`;
};

const showSliderTooltip = ref(false);
/* 进场动画结束后去掉 bounce class，避免盖住下滑 transform */
const playBarSettled = ref(false);
onMounted(() => {
  window.setTimeout(() => {
    playBarSettled.value = true;
  }, 700);
});

const musicFullVisible = computed({
  get: () => playerStore.musicFull,
  set: (value) => {
    playerStore.setMusicFull(value);
  }
});
</script>

<style lang="scss" scoped>
.text-ellipsis {
  width: 100%;
}

.music-play-bar {
  @apply w-full absolute bottom-0 left-0 flex items-center box-border px-6 py-2 pt-3;
  height: var(--play-bar-height, 5rem);
  background: var(--chrome-surface-strong, rgba(24, 24, 27, 0.88));
  border-top: 1px solid var(--chrome-border, rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(var(--chrome-blur, 16px));
  -webkit-backdrop-filter: blur(var(--chrome-blur, 16px));
  color: var(--chrome-text, #f8fafc);
  pointer-events: auto;
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.18);
  /* 高于 .music-full-drawer(9998)，展开时底栏压在抽屉上再下滑 */
  z-index: 9999;
  animation-duration: 0.5s !important;
  transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);

  /* 大屏打开：下滑收起；关掉进场 animation 以免覆盖 transform */
  &.play-bar-hidden {
    animation: none !important;
    transform: translateY(100%) !important;
    pointer-events: none;
  }

  .music-content {
    width: 200px;
    @apply ml-4;
    flex-shrink: 0;
    min-width: 0;

    &-title {
      @apply text-base;
    }

    &-name {
      @apply text-xs mt-1 opacity-80;
    }
  }
}

.play-bar-img {
  @apply w-14 h-14 rounded-2xl;
}

/* 绝对居中：不受左右列宽度不对称影响 */
.music-buttons {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 2;
  pointer-events: auto;
}

/* 中间播放控件：圆润填充 */
.pb-ctrl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--chrome-text, #f8fafc);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    transform 0.12s;
  font-size: 1.55rem;
  line-height: 1;
  padding: 0;
}
.pb-ctrl:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--primary-color, #22c55e);
}
.pb-ctrl:active {
  transform: scale(0.94);
}
.pb-ctrl--play {
  width: 48px;
  height: 48px;
  margin: 0 6px;
  font-size: 1.75rem;
  background: rgba(255, 255, 255, 0.12);
}
.pb-ctrl--play:hover {
  background: rgba(255, 255, 255, 0.2);
}

.audio-volume {
  @apply flex items-center relative;
  &:hover {
    .volume-slider {
      @apply opacity-100 visible;
    }
  }

  .volume-slider {
    @apply absolute opacity-0 invisible transition-all duration-300 bottom-[36px] left-1/2 -translate-x-1/2 h-[180px] px-2 py-4 rounded-2xl;
    @apply bg-light dark:bg-dark-200;
    @apply border border-gray-200 dark:border-gray-700;

    .volume-percentage {
      @apply absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium bg-light dark:bg-dark-200 px-2 py-1 rounded-md;
      @apply border border-gray-200 dark:border-gray-700;
      @apply text-gray-800 dark:text-white;
      white-space: nowrap;

      &.volume-percentage-disabled {
        @apply text-gray-400 dark:text-gray-500;
      }
    }
  }
}

.audio-button {
  @apply flex items-center gap-1.5;
  margin-left: auto;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

/* 右侧工具图标：统一圆按钮 */
.bar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--chrome-text, #f8fafc);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    transform 0.12s;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}
.bar-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--primary-color, #22c55e);
}
.bar-icon:active {
  transform: scale(0.94);
}
.bar-icon--liked {
  color: #ec4899;
}
.bar-icon--liked:hover {
  color: #f472b6;
}
.bar-icon--disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* 音质胶囊与音效之间多留空 */
.quality-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 32px;
  padding: 0 10px;
  margin: 0 4px 0 2px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: inherit;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  flex-shrink: 0;
}
.quality-btn:hover {
  color: var(--primary-color, #22c55e);
  border-color: color-mix(in srgb, var(--primary-color, #22c55e) 55%, transparent);
  background: color-mix(in srgb, var(--primary-color, #22c55e) 14%, transparent);
}

.bar-fx-slot {
  margin-left: 6px;
  margin-right: 2px;
}

.music-play {
  &-list {
    height: 50vh;
    width: 300px;
    @apply relative rounded-3xl overflow-hidden py-2;
    &-back {
      backdrop-filter: blur(20px);
      @apply absolute top-0 left-0 w-full h-full;
      @apply bg-light dark:bg-black bg-opacity-75;
    }
    &-content {
      @apply mx-2;
    }
  }
}

.mobile {
  .music-play-bar {
    @apply px-4 bottom-[56px] transition-all duration-300;
  }
  .music-time {
    display: none;
  }
  .ri-music-2-line {
    display: none;
  }
  .audio-volume {
    display: none;
  }
  .audio-button {
    @apply mx-0;
  }
  .music-buttons {
    gap: 0;
    .pb-ctrl:not(.pb-ctrl--play) {
      display: none;
    }
    .pb-ctrl--play {
      margin: 0;
    }
  }
  .music-content {
    flex: 1;
    width: auto;
  }
}

// 自定义滑块样式
.custom-slider {
  :deep(.n-slider) {
    --n-rail-height: 4px;
    --n-rail-color: theme('colors.gray.200');
    --n-rail-color-dark: theme('colors.gray.700');
    --n-fill-color: var(--primary-color, #22c55e);
    --n-handle-size: 12px;
    --n-handle-color: var(--primary-color, #22c55e);

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

    // 确保悬停时提示样式正确
    .n-slider-tooltip {
      @apply bg-dark-200 text-white text-xs py-1 px-2 rounded;
      z-index: 999999;
    }
  }
}

.play-bar-img-wrapper {
  @apply relative cursor-pointer w-14 h-14;

  .hover-arrow {
    @apply absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 rounded-2xl;
    background: rgba(0, 0, 0, 0.5);

    .hover-content {
      @apply flex flex-col items-center justify-center;

      i {
        @apply text-white mb-0.5;
      }

      .hover-text {
        @apply text-white text-xs scale-90;
      }
    }
  }

  &:hover {
    .hover-arrow {
      @apply opacity-100;
    }
  }
}

.tooltip-content {
  @apply text-sm py-1 px-2;
}

.play-bar-img {
  @apply w-14 h-14 rounded-2xl;
}

.like-active {
  @apply text-red-500 hover:text-red-600 !important;
}

.intelligence-active {
  color: var(--primary-color, #22c55e) !important;
}

.disabled-icon {
  @apply opacity-50 cursor-not-allowed !important;
  &:hover {
    @apply text-inherit !important;
  }
}

.icon-loop,
.icon-single-loop {
  font-size: 1.5rem;
}

.music-time .n-slider {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0;
  border-radius: 0;
}

.music-eq {
  @apply p-4 rounded-3xl;
  backdrop-filter: blur(20px);
  @apply bg-light dark:bg-black bg-opacity-75;
}

.music-play-list-content {
  @apply mx-2;

  .delete-btn {
    @apply p-2 rounded-full transition-colors duration-200 cursor-pointer;
    @apply hover:bg-red-50 dark:hover:bg-red-900/20;

    .iconfont {
      @apply text-lg;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-overlay {
  @apply absolute inset-0 flex items-center justify-center rounded-2xl;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.loading-icon {
  font-size: 24px;
  color: white;
  animation: spin 1s linear infinite;
}

.play-speed {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0 8px;
}

.speed-button {
  font-size: 14px;
  color: var(--text-color);
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--hover-color);
}

.speed-button:hover {
  background: var(--hover-color-dark);
}

.playback-rate-badge {
  @apply ml-2 px-1.5 h-4 flex items-center text-xs rounded;
  color: var(--primary-color, #22c55e);
  background: rgba(255, 255, 255, 0.08);
  font-weight: 500;
  vertical-align: 1px;
}

.quality-menu {
  min-width: 11rem;
  padding: 6px;
  border-radius: 14px;
  border: 1px solid var(--chrome-border, rgba(255, 255, 255, 0.12));
  background: var(--chrome-surface-strong, rgba(24, 24, 27, 0.94));
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(16px);
}

.quality-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--chrome-text, #f3f4f6);
  transition: background 0.12s;
}

.quality-menu-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.quality-menu-item.active {
  font-weight: 650;
  color: var(--primary-color, #22c55e);
  background: color-mix(in srgb, var(--primary-color, #22c55e) 14%, transparent);
}

.quality-menu-item.disabled,
.quality-menu-item.locked {
  opacity: 0.48;
  cursor: not-allowed;
}

.quality-menu-item--muted {
  opacity: 0.55;
  cursor: default;
  font-size: 12px;
  justify-content: center;
}

.quality-menu-label {
  min-width: 0;
}

/* 需要 SVIP 的档始终带小标 */
.quality-svip-tag {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #f5e6b8;
  background: linear-gradient(180deg, #2a2210 0%, #141008 100%);
  border: 1px solid rgba(232, 197, 71, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 244, 200, 0.2);
}
</style>
