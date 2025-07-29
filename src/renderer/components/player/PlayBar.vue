<template>
  <div
    class="music-play-bar"
    :class="[
      setAnimationClass('animate__bounceInUp'),
      musicFullVisible ? 'play-bar-opcity' : '',
      musicFullVisible && MusicFullRef?.musicFullRef?.config?.hidePlayBar
        ? 'animate__animated animate__slideOutDown'
        : ''
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
        :src="getImgUrl(playMusic?.picUrl, '100y100')"
        class="play-bar-img"
        lazy
        preview-disabled
      />
      <div v-if="playMusic?.playLoading" class="loading-overlay">
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
          {{ playMusic?.name || '' }}
        </n-ellipsis>
        <span v-if="playbackRate !== 1.0" class="playback-rate-badge"> {{ playbackRate }}x </span>
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
            v-for="(artists, artistsindex) in artistList"
            :key="artistsindex"
            class="cursor-pointer hover:text-green-500"
            @click="handleArtistClick(artists.id)"
          >
            {{ artists.name }}{{ artistsindex < artistList.length - 1 ? ' / ' : '' }}
          </span>
        </n-ellipsis>
      </div>
    </div>
    <div class="music-buttons">
      <div class="music-buttons-prev" @click="handlePrev">
        <i class="iconfont icon-prev"></i>
      </div>
      <div class="music-buttons-play" @click="playMusicEvent">
        <i class="iconfont icon" :class="play ? 'icon-stop' : 'icon-play'"></i>
      </div>
      <div class="music-buttons-next" @click="handleNext">
        <i class="iconfont icon-next"></i>
      </div>
    </div>
    <div class="audio-button">
      <div class="audio-volume custom-slider" @wheel.prevent="handleVolumeWheel">
        <div class="volume-icon" @click="mute">
          <i class="iconfont" :class="getVolumeIcon"></i>
        </div>
        <div class="volume-slider">
          <div class="volume-percentage">{{ Math.round(volumeSlider) }}%</div>
          <n-slider v-model:value="volumeSlider" :step="0.01" :tooltip="false" vertical></n-slider>
        </div>
      </div>
      <n-tooltip v-if="!isMobile" trigger="hover" :z-index="9999999">
        <template #trigger>
          <i class="iconfont" :class="playModeIcon" @click="togglePlayMode"></i>
        </template>
        {{ playModeText }}
      </n-tooltip>
      <n-tooltip v-if="!isMobile" trigger="hover" :z-index="9999999">
        <template #trigger>
          <i
            class="iconfont icon-likefill"
            :class="{ 'like-active': isFavorite }"
            @click="toggleFavorite"
          ></i>
        </template>
        {{ t('player.playBar.like') }}
      </n-tooltip>
      <n-tooltip v-if="isElectron" class="music-lyric" trigger="hover" :z-index="9999999">
        <template #trigger>
          <i
            class="iconfont ri-netease-cloud-music-line"
            :class="{ 'text-green-500': isLyricWindowOpen, 'disabled-icon': !playMusic?.id }"
            @click="playMusic?.id && openLyricWindow()"
          ></i>
        </template>
        {{ playMusic?.id ? t('player.playBar.lyric') : t('player.playBar.noSongPlaying') }}
      </n-tooltip>
      <n-tooltip v-if="playMusic?.id && isElectron" trigger="hover" :z-index="9999999">
        <template #trigger>
          <reparse-popover v-if="playMusic?.id" />
        </template>
        {{ t('player.playBar.reparse') }}
      </n-tooltip>

      <!-- 高级控制菜单按钮（整合了 EQ、定时关闭、播放速度） -->
      <advanced-controls-popover />

      <n-tooltip trigger="hover" :z-index="9999999">
        <template #trigger>
          <i
            class="iconfont icon-list text-2xl hover:text-green-500 transition-colors cursor-pointer"
            @click="openPlayListDrawer"
          ></i>
        </template>
        {{ t('player.playBar.playList') }}
      </n-tooltip>
    </div>
    <!-- 全屏播放器 -->
    <music-full-wrapper ref="MusicFullRef" v-model="musicFullVisible" :background="background" />
  </div>
</template>

<script lang="ts" setup>
import { useThrottleFn } from '@vueuse/core';
import { useMessage } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import MusicFullWrapper from '@/components/lyric/MusicFullWrapper.vue';
import AdvancedControlsPopover from '@/components/player/AdvancedControlsPopover.vue';
import ReparsePopover from '@/components/player/ReparsePopover.vue';
import {
  allTime,
  artistList,
  isLyricWindowOpen,
  nowTime,
  openLyric,
  playMusic,
  textColors
} from '@/hooks/MusicHook';
import { useArtist } from '@/hooks/useArtist';
import { audioService } from '@/services/audioService';
import { isBilibiliIdMatch, usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { getImgUrl, isElectron, isMobile, secondToMinute, setAnimationClass } from '@/utils';

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const message = useMessage();
// 是否播放
const play = computed(() => playerStore.isPlay);
// 背景颜色
const background = ref('#000');

watch(
  () => playerStore.playMusic,
  async () => {
    if (playMusic && playMusic.value && playMusic.value.backgroundColor) {
      background.value = playMusic.value.backgroundColor as string;
    }
  },
  { immediate: true, deep: true }
);

// 节流版本的 seek 函数
const throttledSeek = useThrottleFn((value: number) => {
  audioService.seek(value);
  nowTime.value = value;
}, 50); // 50ms 的节流延迟

// 拖动时的临时值，避免频繁更新 nowTime 触发重渲染
const dragValue = ref(0);

// 为滑块拖动添加状态跟踪
const isDragging = ref(false);

// 修改 timeSlider 计算属性
const timeSlider = computed({
  get: () => (isDragging.value ? dragValue.value : nowTime.value),
  set: (value) => {
    if (isDragging.value) {
      // 拖动中只更新临时值，不触发 nowTime 更新和 seek 操作
      dragValue.value = value;
      return;
    }

    // 点击操作 (非拖动)，可以直接 seek
    throttledSeek(value);
  }
});

// 添加滑块拖动开始和结束事件处理
const handleSliderDragStart = () => {
  isDragging.value = true;
  // 初始化拖动值为当前时间
  dragValue.value = nowTime.value;
};

const handleSliderDragEnd = () => {
  isDragging.value = false;

  // 直接应用最终的拖动值
  audioService.seek(dragValue.value);
  nowTime.value = dragValue.value;
};

// 格式化提示文本，根据拖动状态显示不同的时间
const formatTooltip = (value: number) => {
  return `${secondToMinute(value)} / ${secondToMinute(allTime.value)}`;
};

// 音量条 - 使用 playerStore 的统一音量管理
const getVolumeIcon = computed(() => {
  // 0 静音 ri-volume-mute-line 0.5 ri-volume-down-line 1 ri-volume-up-line
  if (playerStore.volume === 0) {
    return 'ri-volume-mute-line';
  }
  if (playerStore.volume <= 0.5) {
    return 'ri-volume-down-line';
  }
  return 'ri-volume-up-line';
});

const volumeSlider = computed({
  get: () => playerStore.volume * 100,
  set: (value) => {
    playerStore.setVolume(value / 100);
  }
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

// 播放模式
const playMode = computed(() => playerStore.playMode);
const playModeIcon = computed(() => {
  switch (playMode.value) {
    case 0:
      return 'ri-repeat-2-line';
    case 1:
      return 'ri-repeat-one-line';
    case 2:
      return 'ri-shuffle-line';
    default:
      return 'ri-repeat-2-line';
  }
});
const playModeText = computed(() => {
  switch (playMode.value) {
    case 0:
      return t('player.playBar.playMode.sequence');
    case 1:
      return t('player.playBar.playMode.loop');
    case 2:
      return t('player.playBar.playMode.random');
    default:
      return t('player.playBar.playMode.sequence');
  }
});

// 播放速度控制
const { playbackRate } = storeToRefs(playerStore);
// 切换播放模式
const togglePlayMode = () => {
  playerStore.togglePlayMode();
};

function handleNext() {
  playerStore.nextPlay();
}

function handlePrev() {
  playerStore.prevPlay();
}

const MusicFullRef = ref<any>(null);
const showSliderTooltip = ref(false);

// 播放暂停按钮事件
const playMusicEvent = async () => {
  try {
    const result = await playerStore.setPlay({ ...playMusic.value });
    if (result) {
      playerStore.setPlayMusic(true);
    }
  } catch (error) {
    console.error('重新获取播放链接失败:', error);
    message.error(t('player.playFailed'));
  }
};

const musicFullVisible = computed({
  get: () => playerStore.musicFull,
  set: (value) => {
    playerStore.setMusicFull(value);
  }
});

// 设置musicFull
const setMusicFull = () => {
  musicFullVisible.value = !musicFullVisible.value;
  playerStore.setMusicFull(musicFullVisible.value);
  if (musicFullVisible.value) {
    settingsStore.showArtistDrawer = false;
  }
};

const isFavorite = computed(() => {
  if (!playMusic || !playMusic.value) return false;
  // 对于B站视频，使用ID匹配函数
  if (playMusic.value.source === 'bilibili' && playMusic.value.bilibiliData?.bvid) {
    return playerStore.favoriteList.some((id) => isBilibiliIdMatch(id, playMusic.value.id));
  }

  // 非B站视频直接比较ID
  return playerStore.favoriteList.includes(playMusic.value.id);
});

const toggleFavorite = async (e: Event) => {
  console.log('playMusic.value', playMusic.value);
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

const openLyricWindow = () => {
  openLyric();
};

const { navigateToArtist } = useArtist();

const handleArtistClick = (id: number) => {
  musicFullVisible.value = false;
  navigateToArtist(id);
};

// 打开播放列表抽屉
const openPlayListDrawer = () => {
  playerStore.setPlayListDrawerVisible(true);
};
</script>

<style lang="scss" scoped>
.text-ellipsis {
  width: 100%;
}

.music-play-bar {
  @apply h-20 w-full absolute bottom-0 left-0 flex items-center box-border px-6 py-2 pt-3;
  @apply bg-light dark:bg-dark shadow-2xl shadow-gray-300;
  z-index: 9999;
  animation-duration: 0.5s !important;

  &.play-bar-opcity {
    @apply bg-transparent !important;
    box-shadow: 0 0 20px 5px #0000001d;
  }

  &.animate__slideOutDown {
    animation-duration: 0.3s !important;
    pointer-events: none;
  }

  .music-content {
    width: 200px;
    @apply ml-4;

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

.music-buttons {
  @apply mx-6 flex-1 flex justify-center;

  .iconfont {
    @apply text-2xl transition;
    @apply hover:text-green-500;
  }

  .icon {
    @apply text-3xl;
    @apply hover:text-green-500;
  }

  @apply flex items-center;

  > div {
    @apply cursor-pointer;
  }

  &-play {
    @apply flex justify-center items-center w-20 h-12 rounded-full mx-4 transition text-gray-500;
    @apply bg-gray-100 bg-opacity-60 dark:bg-gray-800 dark:bg-opacity-60 hover:bg-gray-200;
  }
}

.audio-volume {
  @apply flex items-center relative;
  &:hover {
    .volume-slider {
      @apply opacity-100 visible;
    }
  }
  .volume-icon {
    @apply cursor-pointer;
  }

  .iconfont {
    @apply text-2xl transition;
    @apply hover:text-green-500;
  }

  .volume-slider {
    @apply absolute opacity-0 invisible transition-all duration-300 bottom-[30px] left-1/2 -translate-x-1/2 h-[180px] px-2 py-4 rounded-xl;
    @apply bg-light dark:bg-dark-200;
    @apply border border-gray-200 dark:border-gray-700;

    .volume-percentage {
      @apply absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium bg-light dark:bg-dark-200 px-2 py-1 rounded-md;
      @apply border border-gray-200 dark:border-gray-700;
      @apply text-gray-800 dark:text-white;
      white-space: nowrap;
    }
  }
}

.audio-button {
  @apply flex items-center;

  .iconfont {
    @apply text-2xl transition cursor-pointer mx-3;
    @apply hover:text-green-500;
  }
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
  .ri-netease-cloud-music-line {
    display: none;
  }
  .audio-volume {
    display: none;
  }
  .audio-button {
    @apply mx-0;
  }
  .music-buttons {
    @apply m-0;
    &-prev,
    &-next {
      display: none;
    }
    &-play {
      @apply m-0;
    }
  }
  .music-content {
    flex: 1;
  }
}

// 自定义滑块样式
.custom-slider {
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
  @apply ml-2 px-1.5 h-4 flex items-center text-xs rounded bg-green-500 bg-opacity-15 text-green-600 dark:text-green-400;
  font-weight: 500;
  vertical-align: 1px;
}
</style>
